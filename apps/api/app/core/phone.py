"""
Indian mobile number normalisation.

Accepts: 9876543210 | 09876543210 | +919876543210 | 919876543210 | "98765 43210"
Returns: +919876543210 (E.164). Only Indian mobiles (10 digits starting 6–9) for now.
"""
import re

_DIGITS = re.compile(r"\D")


def normalize_indian_phone(raw: str) -> str:
    digits = _DIGITS.sub("", raw or "")
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    elif len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return f"+91{digits}"
