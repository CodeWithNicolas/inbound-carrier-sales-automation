import { useEffect, useState } from 'react';
import type { MetricsSummary, CallLogEntry } from './types';
import { Sidebar, AcmeLogo } from './components/Sidebar';
import { LoadsView } from './views/LoadsView';
import { RecentCallsView } from './views/RecentCallsView';
import { RoutesView } from './views/RoutesView';
import { AnalyticsView } from './views/AnalyticsView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface CarrierDetails {
  mc_number: string;
  is_valid: string;
  status: string;
  carrier_name: string;
  allowed_to_operate: string;
  out_of_service: string;
  complaint_count: string;
  percentile: string;
  total_violations: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  insurance_on_file: string;
  insurance_required: string;
  carrier_operation: string;
  reason: string;
}

interface CarrierWarning {
  level: 'high' | 'medium' | 'low';
  title: string;
  message: string;
}

function evaluateCarrierWarnings(carrier: CarrierDetails): CarrierWarning[] {
  const warnings: CarrierWarning[] = [];

  if (carrier.allowed_to_operate !== 'Y') {
    warnings.push({
      level: 'high',
      title: '🚫 Not Authorized to Operate',
      message:
        'This carrier is not currently authorized to operate by FMCSA. Do not book loads with this carrier.',
    });
  }

  if (carrier.out_of_service === 'Y') {
    warnings.push({
      level: 'high',
      title: '⛔ Out of Service',
      message:
        'This carrier has been placed out of service by FMCSA. This is a critical safety violation. Do not book loads.',
    });
  }

  const insuranceOnFile = parseInt(carrier.insurance_on_file) || 0;
  const insuranceRequired = parseInt(carrier.insurance_required) || 0;

  if (insuranceRequired > 0 && insuranceOnFile < insuranceRequired) {
    const shortfall = insuranceRequired - insuranceOnFile;
    warnings.push({
      level: 'high',
      title: '💰 Insufficient Insurance',
      message: `Carrier has $${insuranceOnFile.toLocaleString()} insurance on file but requires $${insuranceRequired.toLocaleString()}. Shortfall: $${shortfall.toLocaleString()}. This carrier may not be adequately insured for cargo liability.`,
    });
  }

  if (insuranceOnFile === 0 && insuranceRequired > 0) {
    warnings.push({
      level: 'high',
      title: '❌ No Insurance on File',
      message: `Carrier has no insurance on file but requires $${insuranceRequired.toLocaleString()}. Do not book until insurance is verified.`,
    });
  }

  const complaints = parseInt(carrier.complaint_count) || 0;
  if (complaints >= 5) {
    warnings.push({
      level: 'high',
      title: '⚠️ High Complaint Count',
      message: `This carrier has ${complaints} complaints filed with FMCSA. This indicates potential issues with service quality, reliability, or business practices.`,
    });
  } else if (complaints >= 3) {
    warnings.push({
      level: 'medium',
      title: '⚠️ Multiple Complaints',
      message: `This carrier has ${complaints} complaints filed with FMCSA. Review complaint details before booking.`,
    });
  }

  const violations = parseInt(carrier.total_violations) || 0;
  if (violations >= 10) {
    warnings.push({
      level: 'high',
      title: '🚨 High Violation Count',
      message: `This carrier has ${violations} total violations. High violation counts indicate poor compliance with safety regulations.`,
    });
  } else if (violations >= 5) {
    warnings.push({
      level: 'medium',
      title: '⚠️ Multiple Violations',
      message: `This carrier has ${violations} total violations. Review safety record before booking.`,
    });
  }

  if (carrier.percentile && carrier.percentile !== 'N/A') {
    const percentile = parseInt(carrier.percentile);
    if (!isNaN(percentile) && percentile >= 75) {
      warnings.push({
        level: 'medium',
        title: '📊 Poor Safety Percentile',
        message: `Safety percentile of ${percentile}% indicates this carrier is in the bottom 25% for safety performance compared to similar carriers.`,
      });
    }
  }

  return warnings;
}

function App() {
  const [activeView, setActiveView] = useState<'loads' | 'calls' | 'routes' | 'analytics'>('analytics');
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carrierWarningCache, setCarrierWarningCache] = useState<Map<string, number>>(new Map());
  
  // API Key authentication state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyInput.trim()) {
      setAuthError(true);
      return;
    }
    
    setIsAuthenticating(true);
    setAuthError(false);
    
    // Validate the API key by making a test request
    try {
      const testResponse = await fetch(`${API_BASE_URL}/metrics/summary`, {
        headers: { 'x-api-key': apiKeyInput.trim() },
      });
      
      if (testResponse.ok) {
        setApiKey(apiKeyInput.trim());
        setAuthError(false);
      } else {
        setAuthError(true);
        setApiKey(null);
      }
    } catch (err) {
      console.error('API key validation error:', err);
      setAuthError(true);
      setApiKey(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!apiKey) return;
    
    const validApiKey = apiKey; // Capture for closure
    
    async function fetchData() {
      try {
        // Only show loading on initial fetch
        if (calls.length === 0) {
        setLoading(true);
        }

        const [summaryRes, callsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/metrics/summary`, {
            headers: { 'x-api-key': validApiKey },
          }),
          fetch(`${API_BASE_URL}/metrics/calls`, {
            headers: { 'x-api-key': validApiKey },
          }),
        ]);

        if (!summaryRes.ok) {
          throw new Error(`Summary error: ${summaryRes.statusText}`);
        }
        if (!callsRes.ok) {
          throw new Error(`Calls error: ${callsRes.statusText}`);
        }

        const summaryJson = (await summaryRes.json()) as MetricsSummary;
        const callsJson = (await callsRes.json()) as CallLogEntry[];

        setSummary(summaryJson);
        setCalls(callsJson);
        setError(null);

        // Pre-fetch carrier warnings for visible calls (top 25)
        prefetchCarrierWarnings(callsJson.slice(0, 25));
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    // Initial fetch
    fetchData();

    // Set up auto-refresh every 1 minute
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [apiKey]);

  async function prefetchCarrierWarnings(callsList: CallLogEntry[]) {
    if (!apiKey) return;
    
    // Get unique carrier MC numbers
    const uniqueCarriers = Array.from(new Set(callsList.map((c) => c.carrier_mc)));

    // Fetch carrier details for each unique MC number
    const warningPromises = uniqueCarriers.map(async (mcNumber) => {
      try {
        const response = await fetch(`${API_BASE_URL}/carrier/validate`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mc_number: mcNumber }),
        });

        if (response.ok) {
          const data = (await response.json()) as CarrierDetails;
          const warnings = evaluateCarrierWarnings(data);
          return { mcNumber, warningCount: warnings.length };
        }
      } catch (err) {
        console.error(`Failed to fetch carrier ${mcNumber}:`, err);
      }
      return { mcNumber, warningCount: 0 };
    });

    // Wait for all requests to complete
    const results = await Promise.all(warningPromises);

    // Update cache with warning counts
    const newCache = new Map(carrierWarningCache);
    results.forEach(({ mcNumber, warningCount }) => {
      newCache.set(mcNumber, warningCount);
    });
    setCarrierWarningCache(newCache);
  }

  // Show login page if not authenticated
  if (!apiKey) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#0f172a',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '48px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '450px',
            width: '100%',
            margin: '0 24px',
          }}
        >
          {/* Logo/Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <AcmeLogo />
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0 0 8px 0',
                color: 'white',
              }}
            >
              Acme Logistics
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                margin: 0,
              }}
            >
              Enter your API key to access the dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="api-key"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#e2e8f0',
                }}
              >
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setAuthError(false);
                }}
                placeholder="Enter your API key"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: authError ? '2px solid #ef4444' : '2px solid #334155',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  if (!authError) {
                    e.target.style.borderColor = '#3b82f6';
                  }
                }}
                onBlur={(e) => {
                  if (!authError) {
                    e.target.style.borderColor = '#334155';
                  }
                }}
                disabled={isAuthenticating}
              />
              {authError && (
                <p
                  style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#ef4444',
                    margin: '8px 0 0 0',
                  }}
                >
                  ❌ Invalid API key. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isAuthenticating ? '#475569' : '#3b82f6',
                color: 'white',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isAuthenticating) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAuthenticating) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isAuthenticating ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #334155',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#64748b',
                margin: 0,
              }}
            >
              🔒 Your API key is never stored and must be entered each session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
      }}
    >
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <main
            style={{
          marginLeft: '80px',
          flex: 1,
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {activeView === 'loads' && <LoadsView apiKey={apiKey} />}
        {activeView === 'calls' && (
          <RecentCallsView calls={calls} carrierWarningCache={carrierWarningCache} apiKey={apiKey} />
        )}
        {activeView === 'routes' && <RoutesView calls={calls} />}
        {activeView === 'analytics' && (
          <AnalyticsView summary={summary} calls={calls} loading={loading} error={error} />
        )}
      </main>
    </div>
  );
}

export default App;
