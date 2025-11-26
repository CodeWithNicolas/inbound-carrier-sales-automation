export type Outcome =
  | "booked"
  | "lost_price"
  | "no_loads"
  | "ineligible"
  | "other";

export type Sentiment = "positive" | "neutral" | "negative";

export interface MetricsSummary {
  total_calls: number;
  booked: number;
  booking_rate: number; // 0–1
  avg_rounds: number;
  sentiment_breakdown: Record<Sentiment, number>;
}

export interface CallLogEntry {
  carrier_mc: string;
  load_id: string | null;
  initial_rate: number | null;
  final_rate: number | null;
  num_rounds: number;
  outcome: Outcome;
  sentiment: Sentiment;
  notes: string | null;
  created_at: string; // ISO timestamp
}
