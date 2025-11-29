import React from 'react';
import type { MetricsSummary, CallLogEntry, Outcome } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsViewProps {
  summary: MetricsSummary | null;
  calls: CallLogEntry[];
  loading: boolean;
  error: string | null;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  booked: 'Booked',
  lost_price: 'Lost – Price',
  no_loads: 'No Loads',
  ineligible: 'Ineligible',
  other: 'Other',
};

function formatCallDuration(seconds: number): string {
  if (seconds === 0) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

const SENTIMENT_LABELS = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
} as const;

export function AnalyticsView({ summary, calls, loading, error }: AnalyticsViewProps) {
  const sentimentData = summary
    ? (Object.entries(summary.sentiment_breakdown) as [keyof typeof SENTIMENT_LABELS, number][]).map(
        ([k, v]) => ({
          sentiment: SENTIMENT_LABELS[k],
          value: v,
        })
      )
    : [];

  const outcomeData = ['booked', 'lost_price', 'no_loads', 'ineligible', 'other'].map((o) => ({
    outcome: OUTCOME_LABELS[o as Outcome],
    count: calls.filter((c) => c.outcome === o).length,
  }));

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
          Analytics & Performance
        </h1>
        <p style={{ opacity: 0.7, marginTop: '4px' }}>
          Key performance indicators and negotiation analytics from the HappyRobot agent.
        </p>
      </header>

      {loading && <p>Loading metrics…</p>}
      {error && <p style={{ color: '#f87171', marginBottom: '16px' }}>{error}</p>}

      {summary && !loading && !error && (
        <>
          {/* KPI cards */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <KpiCard label="Total calls" value={summary.total_calls.toString()} />
            <KpiCard
              label="Booked loads"
              value={summary.booked.toString()}
              subtitle={`Booking rate: ${(summary.booking_rate * 100).toFixed(1)}%`}
            />
            <KpiCard
              label="Total revenue"
              value={`$${summary.total_revenue.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
              subtitle={`Per call: $${summary.revenue_per_call.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
            />
            <KpiCard
              label="Avg call time"
              value={formatCallDuration(summary.avg_call_duration)}
            />
            <KpiCard
              label="Avg negotiation rounds"
              value={summary.avg_rounds.toFixed(2)}
            />
          </section>

          {/* Charts */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Outcomes by count
              </h2>
              {outcomeData.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No outcome data yet.</p>
              ) : (
                <div style={{ width: '100%', height: 320, minHeight: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outcomeData}>
                      <XAxis dataKey="outcome" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Sentiment breakdown
              </h2>
              {sentimentData.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No sentiment data yet.</p>
              ) : (
                <div style={{ width: '100%', height: 320, minHeight: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        dataKey="value"
                        nameKey="sentiment"
                        outerRadius={110}
                        label
                      >
                        {sentimentData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={['#10b981', '#6b7280', '#ef4444'][idx % 3]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

function KpiCard({ label, value, subtitle }: KpiCardProps) {
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
      <p style={{ fontSize: 12, opacity: 0.7 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</p>
      {subtitle && (
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</p>
      )}
    </div>
  );
}

