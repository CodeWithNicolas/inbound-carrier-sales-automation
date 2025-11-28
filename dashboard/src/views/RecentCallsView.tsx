import { useState } from 'react';
import type { CallLogEntry, Outcome, Sentiment } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const API_KEY = import.meta.env.VITE_INTERNAL_API_KEY as string;

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

interface RecentCallsViewProps {
  calls: CallLogEntry[];
  carrierWarningCache: Map<string, number>;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  booked: 'Booked',
  lost_price: 'Lost – Price',
  no_loads: 'No Loads',
  ineligible: 'Ineligible',
  other: 'Other',
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatCallDuration(seconds: number): string {
  if (seconds === 0) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
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

  if (!carrier.phone || carrier.phone.trim() === '') {
    warnings.push({
      level: 'low',
      title: '📞 Missing Phone Number',
      message:
        'No phone number on file. This may make it difficult to contact the carrier in case of issues.',
    });
  }

  return warnings;
}

export function RecentCallsView({ calls, carrierWarningCache }: RecentCallsViewProps) {
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierDetails | null>(null);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function fetchCarrierDetails(mcNumber: string) {
    try {
      setCarrierLoading(true);
      setShowModal(true);
      setSelectedCarrier(null);

      const response = await fetch(`${API_BASE_URL}/carrier/validate`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mc_number: mcNumber }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setSelectedCarrier({
            mc_number: mcNumber,
            is_valid: 'false',
            status: 'not_found',
            carrier_name: 'Unknown',
            allowed_to_operate: 'N',
            out_of_service: 'N',
            complaint_count: '0',
            percentile: 'N/A',
            total_violations: '0',
            address: '',
            city: '',
            state: '',
            zip_code: '',
            phone: '',
            insurance_on_file: '0',
            insurance_required: '0',
            carrier_operation: '',
            reason: `✗ Carrier MC ${mcNumber} not found in FMCSA database`,
          });
          return;
        }
        throw new Error(`Failed to fetch carrier: ${response.statusText}`);
      }

      const data = (await response.json()) as CarrierDetails;
      setSelectedCarrier(data);
    } catch (err: any) {
      console.error(err);
      setSelectedCarrier({
        mc_number: mcNumber,
        is_valid: 'false',
        status: 'error',
        carrier_name: 'Error',
        allowed_to_operate: 'N',
        out_of_service: 'N',
        complaint_count: '0',
        percentile: 'N/A',
        total_violations: '0',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        insurance_on_file: '0',
        insurance_required: '0',
        carrier_operation: '',
        reason: `✗ Error fetching carrier information: ${err.message || 'Unknown error'}`,
      });
    } finally {
      setCarrierLoading(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setSelectedCarrier(null);
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 10px 30px rgba(15,23,42,0.9)',
    border: '1px solid rgba(148,163,184,0.3)',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 8px',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 8px',
    verticalAlign: 'top',
  };

  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Recent Calls</h1>
        <p style={{ opacity: 0.7, marginTop: '4px' }}>
          Detailed log of recent carrier calls with outcomes and carrier information.
        </p>
      </header>

      {/* Recent calls table */}
      <section style={cardStyle}>
        <h2 style={cardTitleStyle}>Call History</h2>
        {calls.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No calls logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.8 }}>
                  <th style={{ ...thStyle, width: '30px', textAlign: 'center' }}></th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Carrier MC</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Load ID</th>
                  <th style={thStyle}>Outcome</th>
                  <th style={thStyle}>Sentiment</th>
                  <th style={thStyle}>Initial / Final rate</th>
                  <th style={thStyle}>Rounds</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {calls.slice(0, 25).map((c, idx) => {
                  const warningCount = carrierWarningCache.get(c.carrier_mc) || 0;
                  const hasIneligibleOutcome = c.outcome === 'ineligible';
                  const showWarning = warningCount > 0 || hasIneligibleOutcome;

                  return (
                    <tr
                      key={idx}
                      onClick={() => fetchCarrierDetails(c.carrier_mc)}
                      style={{
                        borderTop: '1px solid rgba(148, 163, 184, 0.3)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = showWarning
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', width: '30px' }}>
                        {showWarning ? (
                          <span
                            style={{
                              color: '#ef4444',
                              fontSize: '16px',
                              display: 'inline-block',
                            }}
                            title={
                              warningCount > 0
                                ? `${warningCount} warning${
                                    warningCount > 1 ? 's' : ''
                                  } - click for details`
                                : 'Carrier marked as ineligible - click for details'
                            }
                          >
                            ⚠️
                          </span>
                        ) : (
                          <span style={{ opacity: 0.3, fontSize: '14px' }}>ℹ️</span>
                        )}
                      </td>
                      <td style={tdStyle}>{formatDateTime(c.created_at)}</td>
                      <td style={tdStyle}>{c.carrier_mc}</td>
                      <td style={tdStyle}>
                        {c.outcome === 'booked' ? (
                          <span style={{ color: '#10b981' }}>✓ Booked</span>
                        ) : c.outcome === 'lost_price' ? (
                          <span style={{ opacity: 0.7 }}>Price</span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>{c.load_id ?? '—'}</td>
                      <td style={tdStyle}>{OUTCOME_LABELS[c.outcome]}</td>
                      <td style={tdStyle}>{SENTIMENT_LABELS[c.sentiment]}</td>
                      <td style={tdStyle}>
                        {c.initial_rate != null ? `$${parseFloat(c.initial_rate).toFixed(0)}` : '—'}{' '}
                        →{' '}
                        {c.final_rate != null ? `$${parseFloat(c.final_rate).toFixed(0)}` : '—'}
                      </td>
                      <td style={tdStyle}>{c.num_rounds}</td>
                      <td style={tdStyle}>
                        {c.call_duration_seconds != null
                          ? formatCallDuration(c.call_duration_seconds)
                          : '—'}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 260 }}>{c.notes ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Carrier Details Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...cardStyle,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(148, 163, 184, 0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '20px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
              Carrier Details
            </h2>

            {carrierLoading && <p>Loading carrier information...</p>}

            {!carrierLoading && selectedCarrier && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Status Banner */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor:
                      selectedCarrier.is_valid === 'true'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                    border: `2px solid ${
                      selectedCarrier.is_valid === 'true' ? '#10b981' : '#ef4444'
                    }`,
                  }}
                >
                  <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {selectedCarrier.reason}
                  </p>
                </div>

                {/* Warnings Section */}
                {(() => {
                  const warnings = evaluateCarrierWarnings(selectedCarrier);
                  if (warnings.length === 0) return null;

                  return (
                    <div>
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '12px',
                          color: '#ef4444',
                        }}
                      >
                        ⚠️ Warnings ({warnings.length})
                      </h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              backgroundColor:
                                warning.level === 'high'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : warning.level === 'medium'
                                  ? 'rgba(251, 146, 60, 0.15)'
                                  : 'rgba(250, 204, 21, 0.15)',
                              border: `2px solid ${
                                warning.level === 'high'
                                  ? '#ef4444'
                                  : warning.level === 'medium'
                                  ? '#fb923c'
                                  : '#facc15'
                              }`,
                            }}
                          >
                            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                              {warning.title}
                            </p>
                            <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                              {warning.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Basic Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailField label="MC Number" value={selectedCarrier.mc_number} />
                  <DetailField label="Status" value={selectedCarrier.status} />
                  <DetailField
                    label="Carrier Name"
                    value={selectedCarrier.carrier_name}
                    fullWidth
                  />
                </div>

                {/* Address */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Address
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <DetailField label="Street" value={selectedCarrier.address} fullWidth />
                    <DetailField label="City" value={selectedCarrier.city} />
                    <DetailField label="State" value={selectedCarrier.state} />
                    <DetailField label="ZIP Code" value={selectedCarrier.zip_code} />
                    <DetailField label="Phone" value={selectedCarrier.phone} />
                  </div>
                </div>

                {/* Operation */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Operations
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <DetailField
                      label="Allowed to Operate"
                      value={selectedCarrier.allowed_to_operate === 'Y' ? 'Yes' : 'No'}
                    />
                    <DetailField
                      label="Out of Service"
                      value={selectedCarrier.out_of_service === 'Y' ? 'Yes' : 'No'}
                    />
                    <DetailField
                      label="Carrier Operation"
                      value={selectedCarrier.carrier_operation || 'N/A'}
                      fullWidth
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Insurance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <DetailField
                      label="Insurance on File"
                      value={`$${parseInt(selectedCarrier.insurance_on_file).toLocaleString()}`}
                    />
                    <DetailField
                      label="Insurance Required"
                      value={`$${parseInt(selectedCarrier.insurance_required).toLocaleString()}`}
                    />
                  </div>
                </div>

                {/* Safety & Compliance */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Safety & Compliance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <DetailField label="Complaint Count" value={selectedCarrier.complaint_count} />
                    <DetailField
                      label="Total Violations"
                      value={selectedCarrier.total_violations}
                    />
                    <DetailField
                      label="Safety Percentile"
                      value={selectedCarrier.percentile}
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
  fullWidth?: boolean;
}

function DetailField({ label, value, fullWidth }: DetailFieldProps) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '16px', fontWeight: 500 }}>{value || '—'}</p>
    </div>
  );
}

