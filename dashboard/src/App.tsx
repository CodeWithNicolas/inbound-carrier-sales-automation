import { useEffect, useState } from "react";
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
} from "recharts";
import type { MetricsSummary, CallLogEntry, Outcome, Sentiment } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const API_KEY = import.meta.env.VITE_INTERNAL_API_KEY as string;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  booked: "Booked",
  lost_price: "Lost – Price",
  no_loads: "No Loads",
  ineligible: "Ineligible",
  other: "Other",
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

function App() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [summaryRes, callsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/metrics/summary`, {
            headers: { "x-api-key": API_KEY },
          }),
          fetch(`${API_BASE_URL}/metrics/calls`, {
            headers: { "x-api-key": API_KEY },
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
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const outcomeData = Object.values<Outcome>([
    "booked",
    "lost_price",
    "no_loads",
    "ineligible",
    "other",
  ]).map((o) => ({
    outcome: OUTCOME_LABELS[o],
    count: calls.filter((c) => c.outcome === o).length,
  }));

  const sentimentData = summary
    ? (Object.entries(summary.sentiment_breakdown) as [
        Sentiment,
        number
      ][]).map(([k, v]) => ({
        sentiment: SENTIMENT_LABELS[k],
        value: v,
      }))
    : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0f172a",
        color: "white",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>
          Acme Logistics – Inbound Carrier Sales Dashboard
        </h1>
        <p style={{ opacity: 0.7, marginTop: "4px" }}>
          Live view of negotiation performance and call outcomes from the HappyRobot
          agent.
        </p>
      </header>

      {loading && <p>Loading metrics…</p>}
      {error && (
        <p style={{ color: "#f87171", marginBottom: "16px" }}>{error}</p>
      )}

      {summary && !loading && !error && (
        <>
          {/* KPI cards */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <KpiCard
              label="Total calls"
              value={summary.total_calls.toString()}
            />
            <KpiCard
              label="Booked loads"
              value={summary.booked.toString()}
              subtitle={`Booking rate: ${(summary.booking_rate * 100).toFixed(
                1
              )}%`}
            />
            <KpiCard
              label="Avg negotiation rounds"
              value={summary.avg_rounds.toFixed(2)}
            />
          </section>

          {/* Charts */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}>Outcomes by count</h2>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={outcomeData}>
                    <XAxis dataKey="outcome" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={cardTitleStyle}>Sentiment breakdown</h2>
              {sentimentData.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No sentiment data yet.</p>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
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
                            fill={["#10b981", "#6b7280", "#ef4444"][idx % 3]}
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

          {/* Recent calls table */}
          <section style={cardStyle}>
            <h2 style={cardTitleStyle}>Recent calls</h2>
            {calls.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No calls logged yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.8 }}>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Carrier MC</th>
                      <th style={thStyle}>Load ID</th>
                      <th style={thStyle}>Outcome</th>
                      <th style={thStyle}>Sentiment</th>
                      <th style={thStyle}>Initial / Final rate</th>
                      <th style={thStyle}>Rounds</th>
                      <th style={thStyle}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.slice(0, 25).map((c, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderTop: "1px solid rgba(148, 163, 184, 0.3)",
                        }}
                      >
                        <td style={tdStyle}>{formatDateTime(c.created_at)}</td>
                        <td style={tdStyle}>{c.carrier_mc}</td>
                        <td style={tdStyle}>{c.load_id ?? "—"}</td>
                        <td style={tdStyle}>{OUTCOME_LABELS[c.outcome]}</td>
                        <td style={tdStyle}>{SENTIMENT_LABELS[c.sentiment]}</td>
                        <td style={tdStyle}>
                          {c.initial_rate != null ? `$${parseFloat(c.initial_rate).toFixed(0)}` : "—"}{" "}
                          →{" "}
                          {c.final_rate != null ? `$${parseFloat(c.final_rate).toFixed(0)}` : "—"}
                        </td>
                        <td style={tdStyle}>{c.num_rounds}</td>
                        <td style={{ ...tdStyle, maxWidth: 260 }}>
                          {c.notes ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#020617",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.3)",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 8,
};

const thStyle: React.CSSProperties = {
  padding: "8px 8px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 8px",
  verticalAlign: "top",
};

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

function KpiCard({ label, value, subtitle }: KpiCardProps) {
  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 12, opacity: 0.7 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</p>
      {subtitle && (
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</p>
      )}
    </div>
  );
}

export default App;
