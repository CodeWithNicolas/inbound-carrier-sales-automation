"""Data models for negotiation evaluation."""
from typing import Optional, Literal
from pydantic import BaseModel


class NegotiationRequest(BaseModel):
    """Request for a negotiation evaluation."""
    loadboard_rate: float      # Your target rate for the load
    carrier_offer: float       # What the carrier is asking
    round_number: int          # Current negotiation round (1, 2, 3...)


class NegotiationResponse(BaseModel):
    """Response for a negotiation evaluation."""
    decision: Literal["accept", "counter", "reject"]
    counter_rate: Optional[float] = None
    reason: str

