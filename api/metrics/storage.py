"""Storage for call log entries."""
from typing import List
from .models import CallLogEntry


class CallStorage:
    """In-memory storage for call log entries."""
    
    def __init__(self):
        """Initialize empty call log."""
        self._calls: List[CallLogEntry] = []
    
    def add(self, entry: CallLogEntry) -> None:
        """Add a call log entry to storage."""
        self._calls.append(entry)
    
    def get_all(self) -> List[CallLogEntry]:
        """Get all call log entries."""
        return self._calls
    
    def get_reversed(self) -> List[CallLogEntry]:
        """Get all call log entries in reverse order (most recent first)."""
        return list(reversed(self._calls))
    
    def count(self) -> int:
        """Get total number of calls."""
        return len(self._calls)

