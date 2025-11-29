"""
Load search service with filtering and sorting capabilities.
"""
from typing import List, Dict, Optional
from datetime import datetime


class LoadSearchService:
    """Service for searching and filtering loads."""

    def __init__(self, loads: List[Dict]):
        """Initialize with load data."""
        self.loads = loads

    @staticmethod
    def _generate_pitch(load: Dict) -> str:
        """
        Generate a compelling pitch for the voice agent to use.
        
        Creates a natural-sounding pitch highlighting key selling points.
        """
        origin = load.get("origin", "Unknown")
        destination = load.get("destination", "Unknown")
        rate = load.get("loadboard_rate", "")
        miles = load.get("miles", "")
        equipment = load.get("equipment_type", "")
        commodity = load.get("commodity_type", "")
        weight = load.get("weight", "")
        pickup = load.get("pickup_datetime", "")
        notes = load.get("notes", "")
        
        # Build the pitch dynamically
        pitch_parts = []
        
        # Start with route and rate
        if rate:
            try:
                rate_float = float(rate)
                pitch_parts.append(f"I have a great load paying ${rate_float:,.0f}")
            except (ValueError, TypeError):
                pitch_parts.append(f"I have a great load paying ${rate}")
        else:
            pitch_parts.append("I have a load available")
        
        # Add route
        pitch_parts.append(f"from {origin} to {destination}")
        
        # Add miles if available
        if miles:
            try:
                miles_int = int(float(miles))
                pitch_parts[-1] += f", that's {miles_int} miles"
            except (ValueError, TypeError):
                pass
        
        # Add equipment
        if equipment:
            pitch_parts.append(f"You'll need a {equipment}")
        
        # Add pickup date/time
        if pickup:
            try:
                if "T" in pickup:
                    dt = datetime.fromisoformat(pickup)
                    date_str = dt.strftime("%A, %B %d")
                    time_str = dt.strftime("%I:%M %p").lstrip("0")
                    pitch_parts.append(f"Pickup is {date_str} at {time_str}")
                else:
                    dt = datetime.strptime(pickup, "%Y-%m-%d")
                    date_str = dt.strftime("%A, %B %d")
                    pitch_parts.append(f"Pickup is {date_str}")
            except (ValueError, TypeError):
                pass
        
        # Add commodity and weight
        cargo_info = []
        if commodity:
            cargo_info.append(commodity)
        if weight:
            try:
                weight_int = int(float(weight))
                cargo_info.append(f"{weight_int:,} pounds")
            except (ValueError, TypeError):
                cargo_info.append(f"{weight} pounds")
        
        if cargo_info:
            pitch_parts.append(f"You'll be hauling {', '.join(cargo_info)}")
        
        # Add special features from notes
        if notes:
            notes_lower = notes.lower()
            special_features = []
            
            if "drop" in notes_lower and "hook" in notes_lower:
                special_features.append("it's drop and hook")
            if "live load" in notes_lower:
                special_features.append("it's a live load")
            if "fcfs" in notes_lower or "first come" in notes_lower:
                special_features.append("first come first served")
            if "tarp" in notes_lower:
                special_features.append("tarping required")
            if "frozen" in notes_lower or "reefer" in notes_lower:
                special_features.append("temperature controlled")
            
            if special_features:
                pitch_parts.append(f"Please note, {' and '.join(special_features)}")
        
        # Join all parts into a natural pitch
        pitch = ". ".join(pitch_parts) + "."
        
        return pitch

    def search(
        self,
        origin: str,
        equipment_type: str,
        destination: Optional[str] = None,
        pickup_datetime: Optional[str] = None
    ) -> List[Dict]:
        """
        Search loads with required and optional filters.

        Args:
            origin: Origin city/state (required, substring match)
            equipment_type: Equipment type (required, exact match)
            destination: Destination city/state (optional, substring match)
            pickup_datetime: Pickup date (optional, YYYY-MM-DD format)

        Returns:
            List of matching loads sorted by rate (highest first)
        """
        results = self.loads

        # Filter by origin (substring match, case-insensitive)
        origin_lower = origin.strip().lower()
        results = [
            load for load in results
            if origin_lower in str(load.get("origin", "")).lower()
        ]

        # Filter by equipment type (exact match, case-insensitive)
        equipment_lower = equipment_type.strip().lower()
        results = [
            load for load in results
            if equipment_lower == str(load.get("equipment_type", "")).lower()
        ]

        # Filter by destination if provided (substring match, case-insensitive)
        if destination:
            destination_lower = destination.strip().lower()
            results = [
                load for load in results
                if destination_lower in str(load.get("destination", "")).lower()
            ]

        # Filter by pickup date if provided
        if pickup_datetime:
            results = self._filter_by_pickup_date(results, pickup_datetime)

        # Sort by rate (highest first)
        results = self._sort_by_rate(results)

        # Add pitch to each load
        for load in results:
            load["pitch"] = self._generate_pitch(load)

        return results

    def _filter_by_pickup_date(self, loads: List[Dict], target_date: str) -> List[Dict]:
        """
        Filter loads by pickup date.

        Matches loads whose pickup_datetime starts with the target date.
        Handles both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats.
        """
        try:
            # Parse target date to validate format
            target = datetime.strptime(target_date, "%Y-%m-%d").date()

            filtered = []
            for load in loads:
                pickup = load.get("pickup_datetime", "")
                if not pickup:
                    continue

                try:
                    # Extract date portion (handles both date and datetime)
                    if "T" in pickup:
                        load_date = datetime.fromisoformat(pickup).date()
                    else:
                        load_date = datetime.strptime(pickup, "%Y-%m-%d").date()

                    # Match exact date
                    if load_date == target:
                        filtered.append(load)
                except (ValueError, TypeError):
                    # Skip loads with invalid date formats
                    continue

            return filtered

        except ValueError:
            # Invalid target date format - return empty results
            return []

    def _sort_by_rate(self, loads: List[Dict]) -> List[Dict]:
        """
        Sort loads by loadboard_rate (highest first).

        Handles both numeric and string rate values.
        """
        def get_rate(load: Dict) -> float:
            """Extract rate as float, return 0 if invalid."""
            try:
                rate = load.get("loadboard_rate", 0)
                return float(rate)
            except (ValueError, TypeError):
                return 0.0

        # Sort descending by rate
        return sorted(loads, key=get_rate, reverse=True)

