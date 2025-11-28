"""
Metrics calculation service for call analytics.
"""
from typing import Dict, List
from .models import CallLogEntry


class MetricsService:
    """Service for calculating metrics from call logs."""

    @staticmethod
    def calculate_summary(calls: List[CallLogEntry]) -> Dict:
        """
        Calculate summary metrics from call log entries.
        
        Args:
            calls: List of call log entries
            
        Returns:
            Dictionary with summary metrics:
            - total_calls: Total number of calls
            - booked: Number of booked loads
            - booking_rate: Percentage of booked loads (0-1)
            - avg_rounds: Average negotiation rounds
            - sentiment_breakdown: Count by sentiment
            - total_revenue: Sum of final rates for booked loads
            - revenue_per_call: Average revenue per call
            - avg_call_duration: Average call duration in seconds
        """
        total = len(calls)

        # Handle empty case
        if total == 0:
            return {
                "total_calls": 0,
                "booked": 0,
                "booking_rate": 0.0,
                "avg_rounds": 0.0,
                "sentiment_breakdown": {},
                "total_revenue": 0.0,
                "revenue_per_call": 0.0,
                "avg_call_duration": 0.0,
            }

        # Count booked calls
        booked = sum(1 for c in calls if c.outcome == "booked")

        # Calculate average negotiation rounds
        total_rounds = sum(
            int(c.num_rounds) if c.num_rounds else 0 
            for c in calls
        )

        # Build sentiment breakdown
        sentiments = {}
        for c in calls:
            sentiments[c.sentiment] = sentiments.get(c.sentiment, 0) + 1

        # Calculate total revenue (sum of final_rate for booked calls)
        total_revenue = 0.0
        for c in calls:
            if c.outcome == "booked" and c.final_rate:
                try:
                    total_revenue += float(c.final_rate)
                except (ValueError, TypeError):
                    # Skip invalid rates
                    pass

        # Calculate average call duration
        call_durations = [
            c.call_duration_seconds 
            for c in calls 
            if c.call_duration_seconds is not None
        ]
        avg_call_duration = (
            sum(call_durations) / len(call_durations) 
            if call_durations 
            else 0.0
        )

        return {
            "total_calls": total,
            "booked": booked,
            "booking_rate": booked / total,
            "avg_rounds": total_rounds / total,
            "sentiment_breakdown": sentiments,
            "total_revenue": total_revenue,
            "revenue_per_call": total_revenue / total if total > 0 else 0.0,
            "avg_call_duration": avg_call_duration,
        }

