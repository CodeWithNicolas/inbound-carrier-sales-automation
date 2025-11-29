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
  total_revenue: number;
  revenue_per_call: number;
  avg_call_duration: number; // in seconds
}

export interface CallLogEntry {
  carrier_mc: string;
  load_id: string | null;
  initial_rate: string | null;
  final_rate: string | null;
  num_rounds: string;
  outcome: Outcome;
  sentiment: Sentiment;
  call_duration_seconds: number | null;
  notes: string | null;
  created_at: string; // ISO timestamp
}

export interface Load {
  load_id: string;
  origin: string;
  destination: string;
  pickup_datetime: string;
  delivery_datetime: string;
  equipment_type: string;
  loadboard_rate: number;
  notes: string;
  weight: number;
  commodity_type: string;
  num_of_pieces: number;
  miles: number;
  dimensions: string;
}
