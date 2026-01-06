import unittest
from datetime import datetime, timedelta
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from admin.trips import _parse_iso_dt

class TestTimeHandling(unittest.TestCase):
    def test_parse_iso_dt_naive(self):
        # Test naive datetime input
        dt_str = "2023-10-27T10:00:00"
        dt = _parse_iso_dt(dt_str, "test")
        self.assertIsNone(dt.tzinfo)
        self.assertEqual(dt.isoformat(), dt_str)

    def test_parse_iso_dt_aware(self):
        # Test aware datetime input (should be converted to naive)
        dt_str = "2023-10-27T10:00:00+05:00"
        dt = _parse_iso_dt(dt_str, "test")
        self.assertIsNone(dt.tzinfo)
        # The time should remain the same, just stripped of timezone
        self.assertEqual(dt.hour, 10)

if __name__ == '__main__':
    unittest.main()
