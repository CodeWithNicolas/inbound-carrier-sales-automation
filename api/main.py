"""
Simple API for searching loads from a CSV file.
"""
import os
import csv
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fmcsa_api import FMCSAClient
from search_load import LoadSearchService
from evaluate_negotiation import NegotiationService, NegotiationRequest, NegotiationResponse
from metrics import CallLogEntry, MetricsService, CallStorage

load_dotenv()

# CSV path is relative to the api folder
CSV_PATH = Path(__file__).parent.parent / "database" / "database_of_loads.csv"
FMCSA_API_KEY = os.getenv("FMCSA_API_KEY")
API_KEY = os.getenv("INTERNAL_API_KEY")
API_KEY_HEADER_NAME = "x-api-key"

app = FastAPI(title="Acme Logistics Load API")

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://carrier-dashboard-660702485520.us-central1.run.app",  # Deployed dashboard
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

# Initialize call storage
call_storage = CallStorage()

@app.get("/loads/search")
def search_loads(
    origin: str = Query(..., description="Origin city or state (required, substring match)"),
    equipment_type: str = Query(..., description="Equipment type (required, e.g. Dry Van, Reefer, Flatbed)"),
    destination: Optional[str] = Query(None, description="Destination city or state (optional, substring match)"),
    pickup_datetime: Optional[str] = Query(None, description="Pickup date (optional, YYYY-MM-DD format)"),
    _authorized: bool = Depends(verify_api_key),
):
    """
    Search for available loads.
    
    Required parameters:
    - origin: City or state to search in (e.g. "Chicago", "IL", "Texas")
    - equipment_type: Type of equipment needed (e.g. "Dry Van", "Reefer", "Flatbed")
    
    Optional parameters:
    - destination: Destination city or state (e.g. "Dallas", "TX", "Florida")
    - pickup_datetime: Filter by pickup date (YYYY-MM-DD format, e.g. "2025-11-25")
    
    Returns loads sorted by rate (highest first).
    """
    # Create search service and execute search
    search_service = LoadSearchService(ALL_LOADS)
    results = search_service.search(
        origin=origin,
        equipment_type=equipment_type,
        destination=destination,
        pickup_datetime=pickup_datetime
    )
    
    return {"count": len(results), "loads": results}

@app.post("/negotiation/evaluate", response_model=NegotiationResponse)
def evaluate_negotiation(req: NegotiationRequest, _authorized: bool = Depends(verify_api_key)):
    """
    Evaluate a carrier's rate offer and decide whether to accept, counter, or reject.

    Policy:
    - Accept if carrier offers <= loadboard_rate * 1.05 (within 5%)
    - Counter if offer is up to +15% above loadboard_rate and rounds remaining
    - Reject if too expensive or max rounds (3) reached

    Request body:
    - loadboard_rate: Your target rate for the load
    - carrier_offer: What the carrier is asking
    - round_number: Current negotiation round (1, 2, 3...)
    """
    return NegotiationService.evaluate(req)

@app.post("/calls/log")
def log_call(entry: CallLogEntry, _authorized: bool = Depends(verify_api_key)):
    """
    Store the outcome of a call so we can build metrics & a dashboard.

    This endpoint is what the HappyRobot agent should call at the end of each conversation.
    """
    call_storage.add(entry)
    return {"status": "ok", "stored_calls": call_storage.count()}

@app.get("/metrics/summary")
def metrics_summary(_authorized: bool = Depends(verify_api_key)):
    """
    Get summary metrics for all negotiation calls.
    
    Returns:
    - total_calls: Total number of calls
    - booked: Number of booked loads
    - booking_rate: Percentage of booked loads (0-1)
    - avg_rounds: Average negotiation rounds
    - sentiment_breakdown: Count by sentiment
    - total_revenue: Sum of final rates for booked loads
    - revenue_per_call: Average revenue per call
    - avg_call_duration: Average call duration in seconds
    """
    calls = call_storage.get_all()
    return MetricsService.calculate_summary(calls)

class CarrierValidationRequest(BaseModel):
    """Request for carrier validation."""
    mc_number: str


class CarrierValidationResponse(BaseModel):
    """Response for carrier validation with detailed FMCSA data - all fields as strings."""
    mc_number: str
    is_valid: str                            # "true" or "false"
    status: str                              # "active", "inactive", "not_found", "error"
    carrier_name: str
    allowed_to_operate: str                  # "Y" or "N"
    out_of_service: str                      # "Y" or "N"
    complaint_count: str                     # Number as string
    percentile: str                          # BASICs percentile or "N/A"
    total_violations: str                    # Number as string
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    insurance_on_file: str                   # Dollar amount as string
    insurance_required: str                  # Dollar amount as string
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
    return call_storage.get_reversed()