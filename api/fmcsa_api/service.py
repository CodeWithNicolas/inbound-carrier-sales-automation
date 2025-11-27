"""
FMCSA API Client for carrier verification.
"""
from typing import Dict, Optional
import requests


class FMCSAClient:
    """Simple client for FMCSA carrier verification."""

    def __init__(self, api_key: str):
        """Initialize FMCSA client with API key."""
        self.api_key = api_key
        self.base_url = "https://mobile.fmcsa.dot.gov/qc/services/carriers"
        self.timeout = 10

    def get_carrier_info(self, mc_number: str) -> Dict:
        """
        Fetch carrier information from FMCSA database.
        
        Args:
            mc_number: Motor Carrier (MC) number to look up
            
        Returns:
            Dictionary with carrier information and validation status
        """
        mc_number = mc_number.strip()

        # Build API request
        url = f"{self.base_url}/docket-number/{mc_number}"
        params = {"webKey": self.api_key}

        try:
            response = requests.get(url, params=params, timeout=self.timeout)

            # Handle not found
            if response.status_code == 404:
                return self._build_not_found_result(mc_number)

            # Handle other errors
            if response.status_code != 200:
                return self._build_error_result(f"API returned status {response.status_code}")

            # Parse JSON response
            data = response.json()

            # Extract carrier data from response
            return self._parse_carrier_data(mc_number, data)

        except requests.Timeout:
            return self._build_error_result("Request timed out")
        except requests.RequestException as e:
            return self._build_error_result(f"Network error: {str(e)}")
        except ValueError:
            return self._build_error_result("Invalid JSON response")
        except Exception as e: # pylint: disable=broad-exception-caught
            return self._build_error_result(f"Unexpected error: {str(e)}")

    def _parse_carrier_data(self, mc_number: str, data: Dict) -> Dict:
        """Parse carrier data from FMCSA API response."""

        # Validate response structure
        content = data.get("content")
        if not content or not isinstance(content, list) or len(content) == 0:
            return self._build_not_found_result(mc_number)

        # Extract carrier object
        carrier_info = content[0].get("carrier", {})

        # Get basic fields
        legal_name = carrier_info.get("legalName", "Unknown")
        allowed = carrier_info.get("allowedToOperate", "N")
        out_of_service = carrier_info.get("outOfService", "N")
        complaint_count = self._parse_int(carrier_info.get("complaintCount", "0"))

        # Get address info
        city = carrier_info.get("phyCity", "")
        state = carrier_info.get("phyState", "")
        street = carrier_info.get("phyStreet", "")
        zip_code = carrier_info.get("phyZip", "")
        phone = carrier_info.get("telephone", "")

        # Get insurance info (dollar amounts)
        insurance_on_file = self._parse_int(carrier_info.get("bipdInsuranceOnFile", "0"))
        insurance_required = self._parse_int(carrier_info.get("bipdRequiredAmount", "0"))

        # Get carrier operation description
        carrier_op = carrier_info.get("carrierOperation", {})
        operation_desc = carrier_op.get("carrierOperationDesc", "") if isinstance(carrier_op, dict) else ""

        # Check BASICs data (may not be present for all carriers)
        percentile = self._extract_percentile(content[0])
        total_violations = self._extract_total_violations(content[0])

        # Determine eligibility: must be allowed to operate AND not out of service
        is_eligible = (allowed == "Y" and out_of_service != "Y")

        # Build status message
        if is_eligible:
            status_msg = f"✓ {legal_name} is authorized to operate"
        else:
            reasons = []
            if allowed != "Y":
                reasons.append("not authorized")
            if out_of_service == "Y":
                reasons.append("out of service")
            status_msg = f"✗ {legal_name}: {', '.join(reasons)}"

        # Return structured result (all fields as strings for HappyRobot compatibility)
        return {
            "mc_number": mc_number,
            "is_valid": "true" if is_eligible else "false",
            "status": "active" if is_eligible else "inactive",
            "carrier_name": legal_name,
            "allowed_to_operate": allowed,
            "out_of_service": out_of_service,
            "complaint_count": str(complaint_count),
            "percentile": percentile if percentile else "N/A",
            "total_violations": str(total_violations),
            "address": street,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "phone": phone,
            "insurance_on_file": str(insurance_on_file),
            "insurance_required": str(insurance_required),
            "carrier_operation": operation_desc,
            "reason": status_msg
        }

    def _extract_percentile(self, content_item: Dict) -> Optional[str]:
        """Extract percentile from BASICs data if available (returns None if not available)."""
        basics = content_item.get("basics", [])
        if not isinstance(basics, list) or len(basics) == 0:
            return None

        # Get first BASIC percentile (could aggregate multiple BASICs)
        first_basic = basics[0]
        percentile = first_basic.get("percentile")

        # Return None if percentile is not a useful value (will be converted to "N/A" by caller)
        if percentile in ["inconclusive", "no violations", "insufficient data", None, ""]:
            return None

        return str(percentile)

    def _extract_total_violations(self, content_item: Dict) -> int:
        """Extract total violations from BASICs data if available."""
        basics = content_item.get("basics", [])
        if not isinstance(basics, list):
            return 0

        # Sum up violations across all BASICs
        total = 0
        for basic in basics:
            violations = self._parse_int(basic.get("totalViolation", "0"))
            total += violations

        return total

    def _parse_int(self, value: any) -> int:
        """Safely parse integer from string or return 0."""
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    def _build_not_found_result(self, mc_number: str) -> Dict:
        """Build result for carrier not found (all fields as strings)."""
        return {
            "mc_number": mc_number,
            "is_valid": "false",
            "status": "not_found",
            "carrier_name": "Unknown",
            "allowed_to_operate": "N",
            "out_of_service": "N",
            "complaint_count": "0",
            "percentile": "N/A",
            "total_violations": "0",
            "address": "",
            "city": "",
            "state": "",
            "zip_code": "",
            "phone": "",
            "insurance_on_file": "0",
            "insurance_required": "0",
            "carrier_operation": "",
            "reason": f"MC {mc_number} not found in FMCSA database"
        }

    def _build_error_result(self, error_message: str) -> Dict:
        """Build result for API errors (all fields as strings)."""
        return {
            "mc_number": "",
            "is_valid": "false",
            "status": "error",
            "carrier_name": "Unknown",
            "allowed_to_operate": "N",
            "out_of_service": "N",
            "complaint_count": "0",
            "percentile": "N/A",
            "total_violations": "0",
            "address": "",
            "city": "",
            "state": "",
            "zip_code": "",
            "phone": "",
            "insurance_on_file": "0",
            "insurance_required": "0",
            "carrier_operation": "",
            "reason": f"FMCSA API error: {error_message}"
        }
