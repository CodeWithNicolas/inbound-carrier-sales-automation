import React from 'react';
import type { CallLogEntry } from '../types';
import { USMap } from '../components/USMap';

interface RoutesViewProps {
  calls: CallLogEntry[];
}

interface Lane {
  origin: string;
  destination: string;
  count: number;
  avgRate: number;
  totalRevenue: number;
  bookingRate: number;
}

export function RoutesView({ calls }: RoutesViewProps) {
  // Extract and analyze lanes from calls
  const lanes = analyzeLanes(calls);
  const topLanes = lanes.slice(0, 10);
  
  // Regional statistics
  const regionalStats = analyzeRegionalPerformance(calls);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 10px 30px rgba(15,23,42,0.9)',
    border: '1px solid rgba(148,163,184,0.3)',
  };

  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>
          Routes & Lanes
        </h1>
        <p style={{ opacity: 0.7, marginTop: '4px' }}>
          Geographic analytics, popular shipping lanes, and route performance metrics.
        </p>
      </header>

      {/* Summary Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          label="Total Lanes"
          value={lanes.length.toString()}
          icon="🛣️"
        />
        <StatCard
          label="Most Active Lane"
          value={topLanes[0]?.origin || 'N/A'}
          subtitle={topLanes[0] ? `→ ${topLanes[0].destination}` : ''}
          icon="⭐"
        />
        <StatCard
          label="Avg Rate per Mile"
          value={calculateAvgRatePerMile(calls)}
          icon="💵"
        />
        <StatCard
          label="Regions Served"
          value={regionalStats.length.toString()}
          icon="🗺️"
        />
      </section>

      {/* Map Placeholder & Regional Stats */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        {/* Interactive Map */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Route Map
          </h2>
          <div style={{ width: '100%', height: '400px' }}>
            <USMap
              lanes={topLanes.map((lane) => ({
                origin: lane.origin,
                destination: lane.destination,
                count: lane.count,
                revenue: lane.totalRevenue,
              }))}
            />
          </div>
        </div>

        {/* Regional Performance */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Regional Performance
          </h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {regionalStats.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No regional data available.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {regionalStats.map((region, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>
                        {region.name}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          borderRadius: '4px',
                          color: '#3b82f6',
                        }}
                      >
                        {region.count} calls
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <span style={{ opacity: 0.7 }}>Revenue: </span>
                        <span style={{ fontWeight: 500 }}>${region.revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ opacity: 0.7 }}>Booking Rate: </span>
                        <span style={{ fontWeight: 500 }}>{region.bookingRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Top Lanes Table */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Top Shipping Lanes
        </h2>
        {topLanes.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No lane data available yet.</p>
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
                <tr style={{ textAlign: 'left', opacity: 0.8, borderBottom: '1px solid rgba(148, 163, 184, 0.3)' }}>
                  <th style={{ padding: '12px 8px' }}>Rank</th>
                  <th style={{ padding: '12px 8px' }}>Origin</th>
                  <th style={{ padding: '12px 8px' }}>Destination</th>
                  <th style={{ padding: '12px 8px' }}>Calls</th>
                  <th style={{ padding: '12px 8px' }}>Avg Rate</th>
                  <th style={{ padding: '12px 8px' }}>Total Revenue</th>
                  <th style={{ padding: '12px 8px' }}>Booking Rate</th>
                  <th style={{ padding: '12px 8px' }}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {topLanes.map((lane, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: idx < 3 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                          color: idx < 3 ? '#f43f5e' : 'rgba(148, 163, 184, 0.7)',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{lane.origin}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ opacity: 0.5, marginRight: '4px' }}>→</span>
                      {lane.destination}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{lane.count}</td>
                    <td style={{ padding: '12px 8px' }}>
                      ${lane.avgRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                      ${lane.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          color: lane.bookingRate >= 50 ? '#10b981' : lane.bookingRate >= 25 ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {lane.bookingRate.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {getPerformanceIndicator(lane.bookingRate, lane.avgRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

function analyzeLanes(calls: CallLogEntry[]): Lane[] {
  const laneMap = new Map<string, Lane>();

  calls.forEach((call) => {
    if (!call.load_id) return; // Skip calls without loads
    
    // For demo purposes, we'll extract origin/destination from notes or load_id
    // In production, you'd have actual origin/destination data
    const key = `${call.load_id}`; // Simplified for now
    
    if (!laneMap.has(key)) {
      laneMap.set(key, {
        origin: extractOrigin(call),
        destination: extractDestination(call),
        count: 0,
        avgRate: 0,
        totalRevenue: 0,
        bookingRate: 0,
      });
    }

    const lane = laneMap.get(key)!;
    lane.count++;
    
    if (call.final_rate) {
      const rate = parseFloat(call.final_rate);
      if (!isNaN(rate)) {
      lane.totalRevenue += rate;
      }
    }
    
    if (call.outcome === 'booked') {
      lane.bookingRate = ((lane.bookingRate * (lane.count - 1)) + 100) / lane.count;
    } else {
      lane.bookingRate = (lane.bookingRate * (lane.count - 1)) / lane.count;
    }
  });

  // Calculate average rates
  laneMap.forEach((lane) => {
    if (lane.count > 0) {
      lane.avgRate = lane.totalRevenue / lane.count;
    }
  });

  // Sort by count (most popular lanes first)
  return Array.from(laneMap.values()).sort((a, b) => b.count - a.count);
}

function extractOrigin(call: CallLogEntry): string {
  // Try to extract from notes or use placeholder
  if (call.notes && call.notes.includes('from')) {
    const match = call.notes.match(/from\s+([A-Z]{2})/i);
    if (match) return match[1].toUpperCase();
  }
  // Generate based on load_id hash for demo
  const origins = ['TX', 'CA', 'FL', 'NY', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI'];
  const hash = call.load_id ? call.load_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
  return origins[hash % origins.length];
}

function extractDestination(call: CallLogEntry): string {
  // Try to extract from notes or use placeholder
  if (call.notes && call.notes.includes('to')) {
    const match = call.notes.match(/to\s+([A-Z]{2})/i);
    if (match) return match[1].toUpperCase();
  }
  // Generate based on load_id hash for demo
  const destinations = ['NY', 'CA', 'TX', 'FL', 'WA', 'AZ', 'NV', 'OR', 'CO', 'UT'];
  const hash = call.load_id ? call.load_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
  return destinations[(hash + 5) % destinations.length]; // Offset to get different destination
}

function analyzeRegionalPerformance(calls: CallLogEntry[]) {
  const regionMap = new Map<string, { count: number; revenue: number; booked: number }>();

  calls.forEach((call) => {
    const region = extractOrigin(call);
    
    if (!regionMap.has(region)) {
      regionMap.set(region, { count: 0, revenue: 0, booked: 0 });
    }

    const data = regionMap.get(region)!;
    data.count++;
    
    if (call.final_rate) {
      const rate = parseFloat(call.final_rate);
      if (!isNaN(rate)) {
        data.revenue += rate;
      }
    }
    
    if (call.outcome === 'booked') {
      data.booked++;
    }
  });

  return Array.from(regionMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      revenue: data.revenue,
      bookingRate: data.count > 0 ? (data.booked / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateAvgRatePerMile(calls: CallLogEntry[]): string {
  // Simplified calculation - in production you'd have actual distances
  const totalRate = calls.reduce((sum, call) => {
    if (call.final_rate) {
      const rate = parseFloat(call.final_rate);
      return !isNaN(rate) ? sum + rate : sum;
    }
    return sum;
  }, 0);

  const estimatedMiles = calls.length * 500; // Assume avg 500 miles per load
  const ratePerMile = totalRate / estimatedMiles;

  return `$${ratePerMile.toFixed(2)}`;
}

function getPerformanceIndicator(bookingRate: number, avgRate: number): string {
  if (bookingRate >= 50 && avgRate >= 2000) return '🔥 Hot';
  if (bookingRate >= 30) return '✅ Good';
  if (bookingRate >= 15) return '⚠️ Fair';
  return '❌ Poor';
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
}

function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#020617',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 10px 30px rgba(15,23,42,0.9)',
        border: '1px solid rgba(148,163,184,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, marginBottom: 4 }}>{value}</p>
      {subtitle && (
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</p>
      )}
    </div>
  );
}

