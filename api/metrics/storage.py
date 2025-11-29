"""Storage for call log entries."""
from typing import List
import json
import os
from pathlib import Path
from .models import CallLogEntry


class CallStorage:
    """In-memory storage for call log entries."""
    
    def __init__(self):
        """Initialize call log with demo data."""
        self._calls: List[CallLogEntry] = []
        self._load_demo_calls()
    
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
    
    def _load_demo_calls(self) -> None:
        """Load demo calls from JSON file."""
        try:
            # Get path to demo_calls.json (relative to this file)
            current_dir = Path(__file__).parent.parent  # Go up to api directory
            demo_file = current_dir.parent / "database" / "demo_calls.json"
            
            if demo_file.exists():
                with open(demo_file, 'r', encoding='utf-8') as f:
                    demo_data = json.load(f)
                    
                # Convert dict data to CallLogEntry objects
                for call_dict in demo_data:
                    entry = CallLogEntry(**call_dict)
                    self._calls.append(entry)
                    
                print(f"✓ Loaded {len(demo_data)} demo calls from {demo_file}")
            else:
                print(f"⚠ Demo calls file not found: {demo_file}")
        except Exception as e:
            print(f"⚠ Failed to load demo calls: {e}")

