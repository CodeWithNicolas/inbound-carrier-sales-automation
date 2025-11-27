"""Data models for metrics and call logging."""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class CallLogEntry(BaseModel):
    """Log entry for a negotiation call."""
    carrier_mc: str                        # Carrier's MC number
    load_id: Optional[str] = None          # Load that was pitched/booked
    initial_rate: Optional[str] = None     # First rate discussed (as string)
    final_rate: Optional[str] = None       # Final agreed/last offered rate (as string)
    num_rounds: str = "0"                  # How many negotiation rounds (as string)
    outcome: Literal[
        "booked",
        "lost_price",
        "no_loads",
        "ineligible",
        "other",
    ]
    sentiment: Literal["positive", "neutral", "negative"]
    call_duration_seconds: Optional[int] = None  # Duration of the call in seconds
    notes: Optional[str] = None            # Free text summary / reason
    created_at: datetime = Field(default_factory=datetime.utcnow)

