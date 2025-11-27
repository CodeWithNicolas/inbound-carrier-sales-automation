"""
Negotiation evaluation service.

Implements business logic for deciding whether to accept, counter, or reject
carrier rate offers during negotiation.
"""
from .models import NegotiationRequest, NegotiationResponse


class NegotiationService:
    """Service for evaluating negotiation offers."""

    # Configuration constants
    MAX_ROUNDS = 3
    ACCEPTABLE_MARGIN = 0.05  # Accept if within 5% of loadboard rate
    COUNTER_THRESHOLD = 0.15  # Counter if within 15% of loadboard rate

    @classmethod
    def evaluate(cls, request: NegotiationRequest) -> NegotiationResponse:
        """
        Evaluate a carrier's offer and decide on action.

        Policy:
        - If carrier offers <= loadboard_rate * 1.05 (5%) -> accept
        - If offer is up to +15% above loadboard_rate and rounds left -> counter
        - Otherwise -> reject
        - Maximum 3 negotiation rounds

        Args:
            request: Negotiation request with rates and round number

        Returns:
            NegotiationResponse with decision and optional counter rate
        """
        lb_rate = request.loadboard_rate
        offer = request.carrier_offer
        round_num = request.round_number

        # Validate loadboard rate
        if lb_rate <= 0:
            return NegotiationResponse(
                decision="reject",
                counter_rate=None,
                reason="Invalid loadboard rate"
            )

        # Calculate percentage difference
        delta = (offer - lb_rate) / lb_rate

        # Decision 1: Accept if within acceptable margin (≤ 5%)
        if delta <= cls.ACCEPTABLE_MARGIN:
            return NegotiationResponse(
                decision="accept",
                counter_rate=offer,
                reason="Offer within acceptable range"
            )

        # Decision 2: Counter if moderately high and rounds remaining
        if delta <= cls.COUNTER_THRESHOLD and round_num < cls.MAX_ROUNDS:
            # Calculate counter offer (midpoint between loadboard and offer, capped at +5%)
            target = lb_rate * (1 + cls.ACCEPTABLE_MARGIN)
            counter = (offer + lb_rate) / 2
            counter_rate = min(counter, target)

            return NegotiationResponse(
                decision="counter",
                counter_rate=counter_rate,
                reason="Countering within allowed margin"
            )

        # Decision 3: Reject if max rounds reached
        if round_num >= cls.MAX_ROUNDS and delta > cls.ACCEPTABLE_MARGIN:
            return NegotiationResponse(
                decision="reject",
                counter_rate=None,
                reason="Max negotiation rounds reached"
            )

        # Decision 4: Reject if too expensive
        return NegotiationResponse(
            decision="reject",
            counter_rate=None,
            reason="Offer exceeds allowed margin"
        )