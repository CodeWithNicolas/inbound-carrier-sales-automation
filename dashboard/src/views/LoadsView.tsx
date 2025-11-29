import { useEffect, useState } from 'react';
import type { Load } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface LoadsViewProps {
  apiKey: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LoadsView({ apiKey }: LoadsViewProps) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchLoads();

    // Set up auto-refresh every 1 minute for loads
    const refreshInterval = setInterval(() => {
      fetchLoads();
    }, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = loads;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (load) =>
          load.load_id.toLowerCase().includes(term) ||
          load.origin.toLowerCase().includes(term) ||
          load.destination.toLowerCase().includes(term) ||
          load.commodity_type.toLowerCase().includes(term)
      );
    }

    if (equipmentFilter !== 'all') {
      filtered = filtered.filter((load) => load.equipment_type === equipmentFilter);
    }

    setFilteredLoads(filtered);
  }, [loads, searchTerm, equipmentFilter]);

  async function fetchLoads() {
    try {
      // Only show loading spinner on initial load
      if (loads.length === 0) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_BASE_URL}/loads`, {
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch loads: ${response.statusText}`);
      }

      const data = await response.json();
      setLoads(data.loads || []);
    } catch (err: any) {
      console.error('Error fetching loads:', err);
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setLoading(false);
    }
  }

  const equipmentTypes = Array.from(new Set(loads.map((l) => l.equipment_type))).sort();

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
    marginBottom: 12,
  };

  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Available Loads</h1>
        <p style={{ opacity: 0.7, marginTop: '4px' }}>
          Browse and manage freight loads available for carrier booking.
        </p>
      </header>

      {/* Filters */}
      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
          <input
            type="text"
            placeholder="Search by Load ID, Origin, Destination, or Commodity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              outline: 'none',
              minWidth: 150,
            }}
          >
            <option value="all">All Equipment</option>
            {equipmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Loads Table */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={cardTitleStyle}>
            {filteredLoads.length} Load{filteredLoads.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={fetchLoads}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: 8,
              color: '#3b82f6',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ opacity: 0.7, textAlign: 'center', padding: 32 }}>Loading loads...</p>
        ) : error ? (
      <div
        style={{
              padding: 16,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
            }}
          >
            Error: {error}
          </div>
        ) : filteredLoads.length === 0 ? (
          <p style={{ opacity: 0.7, textAlign: 'center', padding: 32 }}>
            No loads found matching your filters.
          </p>
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
                  <th style={{ padding: '8px' }}>Load ID</th>
                  <th style={{ padding: '8px' }}>Origin → Destination</th>
                  <th style={{ padding: '8px' }}>Pickup</th>
                  <th style={{ padding: '8px' }}>Delivery</th>
                  <th style={{ padding: '8px' }}>Equipment</th>
                  <th style={{ padding: '8px' }}>Rate</th>
                  <th style={{ padding: '8px' }}>Miles</th>
                  <th style={{ padding: '8px' }}>$/Mile</th>
                  <th style={{ padding: '8px' }}>Weight</th>
                  <th style={{ padding: '8px' }}>Commodity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoads.map((load, idx) => {
                  const ratePerMile = load.miles > 0 ? load.loadboard_rate / load.miles : 0;
                  
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedLoad(load)}
                      style={{
                        borderTop: '1px solid rgba(148, 163, 184, 0.3)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{load.load_id}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div>{load.origin}</div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>↓</div>
                        <div>{load.destination}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>
                        {formatDateTime(load.pickup_datetime)}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>
                        {formatDateTime(load.delivery_datetime)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            backgroundColor:
                              load.equipment_type === 'Reefer'
                                ? 'rgba(59, 130, 246, 0.2)'
                                : load.equipment_type === 'Flatbed'
                                ? 'rgba(251, 146, 60, 0.2)'
                                : 'rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {load.equipment_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: '#10b981' }}>
                        ${load.loadboard_rate.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{load.miles.toLocaleString()} mi</td>
                      <td style={{ padding: '12px 8px', opacity: 0.8 }}>
                        ${ratePerMile.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {load.weight.toLocaleString()} lbs
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13, opacity: 0.8 }}>
                        {load.commodity_type}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Load Details Modal */}
      {selectedLoad && (
        <div
          onClick={() => setSelectedLoad(null)}
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
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedLoad(null)}
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
              Load Details - {selectedLoad.load_id}
        </h2>

            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Route Info */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
                  Route Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailField label="Origin" value={selectedLoad.origin} />
                  <DetailField label="Destination" value={selectedLoad.destination} />
                  <DetailField label="Pickup" value={formatDateTime(selectedLoad.pickup_datetime)} />
                  <DetailField
                    label="Delivery"
                    value={formatDateTime(selectedLoad.delivery_datetime)}
                  />
                  <DetailField label="Distance" value={`${selectedLoad.miles.toLocaleString()} miles`} />
                  <DetailField
                    label="Rate per Mile"
                    value={`$${(selectedLoad.loadboard_rate / selectedLoad.miles).toFixed(2)}`}
                  />
                </div>
              </div>

              {/* Load Details */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
                  Load Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailField label="Equipment Type" value={selectedLoad.equipment_type} />
                  <DetailField
                    label="Rate"
                    value={`$${selectedLoad.loadboard_rate.toLocaleString()}`}
                  />
                  <DetailField
                    label="Weight"
                    value={`${selectedLoad.weight.toLocaleString()} lbs`}
                  />
                  <DetailField
                    label="Pieces"
                    value={selectedLoad.num_of_pieces.toString()}
                  />
                  <DetailField label="Commodity" value={selectedLoad.commodity_type} />
                  <DetailField label="Dimensions" value={selectedLoad.dimensions} />
                </div>
              </div>

              {/* Notes */}
              {selectedLoad.notes && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    Notes
                  </h3>
                  <p
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedLoad.notes}
        </p>
      </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div>
      <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '16px', fontWeight: 500 }}>{value || '—'}</p>
    </div>
  );
}
