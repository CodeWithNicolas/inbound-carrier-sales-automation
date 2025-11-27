"""
Simple API for searching loads from a CSV file.
"""
import os
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Literal
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fmcsa_api import FMCSAClient

load_dotenv()

CSV_PATH = Path("database/database_of_loads.csv")
FMCSA_API_KEY = os.getenv("FMCSA_API_KEY")
API_KEY = os.getenv("INTERNAL_API_KEY")
API_KEY_HEADER_NAME = "x-api-key"

app = FastAPI(title="Acme Logistics Load API")

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_loads() -> List[dict]:
    """Loads from the CSV file into a list of dictionaries."""
    loads = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Keep all values as strings - dashboard will handle conversion
            loads.append(row)
    return loads

def verify_api_key(x_api_key: str = Header(..., alias="x-api-key")):
    """
    Simple API key check for requests coming from HappyRobot.

    Every request must include header:
        x-api-key: <your INTERNAL_API_KEY value>
    """
    if API_KEY is None:
        # Fail closed if we forgot to set it
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="INTERNAL_API_KEY not configured on server",
        )

    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

    return True

# Load into memory at startup (simple & fine for this project)
ALL_LOADS = load_loads()

@app.get("/loads/search")
def search_loads(
    origin: Optional[str] = Query(None, description="Origin city (substring match)"),
    destination: Optional[str] = Query(None, description="Destination city (substring match)"),
    equipment_type: Optional[str] = Query(None, description="Equipment type (e.g. Dry Van)"),
    _authorized: bool = Depends(verify_api_key),
):
    """Simple search over the in-memory loads."""
    results = ALL_LOADS

    if origin:
        o = origin.lower()
        results = [l for l in results if o in str(l.get("origin", "")).lower()]

    if destination:
        d = destination.lower()
        results = [l for l in results if d in str(l.get("destination", "")).lower()]

    if equipment_type:
        e = equipment_type.lower()
        results = [l for l in results if e == str(l.get("equipment_type", "")).lower()]

    # later: filter by pickup_datetime range, etc.
    return {"count": len(results), "loads": results}

class NegotiationRequest(BaseModel):
    """Request for a negotiation evaluation."""
    loadboard_rate: float      # your target rate for the load
    carrier_offer: float       # what the carrier is asking
    round_number: int          # 1, 2, 3...


class NegotiationResponse(BaseModel):
    """Response for a negotiation evaluation."""
    decision: Literal["accept", "counter", "reject"]
    counter_rate: Optional[float] = None
    reason: str

@app.post("/negotiation/evaluate", response_model=NegotiationResponse)
def evaluate_negotiation(req: NegotiationRequest, _authorized: bool = Depends(verify_api_key)):
    """
    Decide whether to accept, counter, or reject a carrier's offer.

    Policy:
    - If the carrier offers <= loadboard_rate * 1.05 -> accept.
    - If the offer is up to +15% above loadboard_rate and we have rounds left -> counter.
    - Else -> reject.
    - Max 3 rounds.
    """
    lb = req.loadboard_rate
    offer = req.carrier_offer
    round_no = req.round_number

    if lb <= 0:
        return NegotiationResponse(
            decision="reject",
            counter_rate=None,
            reason="Invalid loadboard rate",
        )

    delta = (offer - lb) / lb

    # 1) If the offer is at or below +5%, just accept
    if delta <= 0.05:
        return NegotiationResponse(
            decision="accept",
            counter_rate=offer,
            reason="Offer within acceptable range",
        )

    # 2) If it's moderately high (+5% to +15%) and we still have rounds, counter
    if delta <= 0.15 and round_no < 3:
        # counter somewhere between lb and offer, capped at +5%
        target = lb * 1.05
        counter = (offer + lb) / 2
        counter_rate = min(counter, target)

        return NegotiationResponse(
            decision="counter",
            counter_rate=counter_rate,
            reason="Countering within allowed margin",
        )

    # 3) If we reached max rounds and it's still too high, reject
    if round_no >= 3 and delta > 0.05:
        return NegotiationResponse(
            decision="reject",
            counter_rate=None,
            reason="Max negotiation rounds reached",
        )

    # 4) Too expensive overall
    return NegotiationResponse(
        decision="reject",
        counter_rate=None,
        reason="Offer exceeds allowed margin",
    )

class CallLogEntry(BaseModel):
    """Log entry for a negotiation call."""
    carrier_mc: str                        # carrier's MC number
    load_id: Optional[str] = None          # load that was pitched/booked
    initial_rate: Optional[str] = None     # first rate discussed (as string)
    final_rate: Optional[str] = None       # final agreed/last offered rate (as string)
    num_rounds: str = "0"                  # how many negotiation rounds (as string)
    outcome: Literal[
        "booked",
        "lost_price",
        "no_loads",
        "ineligible",
        "other",
    ]
    sentiment: Literal["positive", "neutral", "negative"]
    notes: Optional[str] = None            # free text summary / reason
    created_at: datetime = Field(default_factory=datetime.utcnow)

CALL_LOG: List[CallLogEntry] = []

@app.post("/calls/log")
def log_call(entry: CallLogEntry, _authorized: bool = Depends(verify_api_key)):
    """
    Store the outcome of a call so we can build metrics & a dashboard.

    This endpoint is what the HappyRobot agent should call at the end of each conversation.
    """
    CALL_LOG.append(entry)
    return {"status": "ok", "stored_calls": len(CALL_LOG)}

@app.get("/metrics/summary")
def metrics_summary(_authorized: bool = Depends(verify_api_key)):
    """
    Summary metrics for the negotiation calls.
    """
    total = len(CALL_LOG)
    if total == 0:
        return {
            "total_calls": 0,
            "booked": 0,
            "booking_rate": 0.0,
            "avg_rounds": 0.0,
            "sentiment_breakdown": {},
        }

    booked = sum(1 for c in CALL_LOG if c.outcome == "booked")
    # Convert num_rounds from string to int for calculation
    total_rounds = sum(int(c.num_rounds) if c.num_rounds else 0 for c in CALL_LOG)

    sentiments = {}
    for c in CALL_LOG:
        sentiments[c.sentiment] = sentiments.get(c.sentiment, 0) + 1

    return {
        "total_calls": total,
        "booked": booked,
        "booking_rate": booked / total,
        "avg_rounds": total_rounds / total,
        "sentiment_breakdown": sentiments,
    }

class CarrierValidationRequest(BaseModel):
    """Request for carrier validation."""
    mc_number: str


class CarrierValidationResponse(BaseModel):
    """Response for carrier validation with detailed FMCSA data."""
    mc_number: str
    is_valid: bool
    status: str
    carrier_name: str
    allowed_to_operate: str
    out_of_service: str
    complaint_count: int
    percentile: Optional[str] = None
    total_violations: int
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    insurance_on_file: int
    insurance_required: int
    carrier_operation: str
    reason: str

def _validate_mc_with_fmcsa(mc_number: str) -> CarrierValidationResponse:
    """
    Validate carrier using FMCSA API with comprehensive data extraction.
    """
    if not FMCSA_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="FMCSA_API_KEY not configured on the server",
        )

    # Create FMCSA client and fetch carrier info
    client = FMCSAClient(api_key=FMCSA_API_KEY)
    result = client.get_carrier_info(mc_number)
    
    # Handle API errors with HTTP exceptions
    if result["status"] == "error":
        raise HTTPException(
            status_code=502,
            detail=result["reason"]
        )
    
    # Return structured response
    return CarrierValidationResponse(**result)


@app.post("/carrier/validate", response_model=CarrierValidationResponse)
def validate_carrier(req: CarrierValidationRequest, _authorized: bool = Depends(verify_api_key)):
    """
    Validate a carrier by MC number using the real FMCSA mobile API.
    """
    return _validate_mc_with_fmcsa(req.mc_number)

@app.get("/metrics/calls", response_model=List[CallLogEntry])
def metrics_calls(_authorized: bool = Depends(verify_api_key)):
    """
    Return the raw call log entries (most recent first).
    """
    return list(reversed(CALL_LOG))