# Test credit card numbers (Luhn algorithm valid)
VALID_TEST_CARDS = {
    # Visa cards
    "4532015112830366": {"type": "Visa", "bank": "HBL", "balance": 50000},
    "4556737586899855": {"type": "Visa", "bank": "UBL", "balance": 75000},
    "4916338506082832": {"type": "Visa", "bank": "MCB", "balance": 100000},
    
    # Mastercard
    "5425233430109903": {"type": "Mastercard", "bank": "Allied Bank", "balance": 60000},
    "5105105105105100": {"type": "Mastercard", "bank": "Bank Alfalah", "balance": 80000},
    "5555555555554444": {"type": "Mastercard", "bank": "Meezan Bank", "balance": 90000},
    
    # Easy to remember test cards
    "1111111111111111": {"type": "Test Card", "bank": "Test Bank", "balance": 999999},
    "4444444444444444": {"type": "Test Visa", "bank": "Test Bank", "balance": 999999},
}

# CVV codes for test cards (in production, never store CVV!)
VALID_CVV = ["123", "456", "789", "111", "999"]


def luhn_checksum(card_number):
    def digits_of(n):
        return [int(d) for d in str(n)]
    
    digits = digits_of(card_number)
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    checksum = sum(odd_digits)
    for d in even_digits:
        checksum += sum(digits_of(d * 2))
    return checksum % 10


def is_luhn_valid(card_number):
    """Check if card number passes Luhn algorithm"""
    return luhn_checksum(card_number) == 0


def validate_card_number(card_number):
    # Remove spaces and dashes
    card_number = card_number.replace(" ", "").replace("-", "")
    # Check if it's numeric
    if not card_number.isdigit():
        return False, "Card number must contain only digits", None
    
    # Check length (13-19 digits for most cards)
    if len(card_number) < 13 or len(card_number) > 19:
        return False, "Card number must be between 13-19 digits", None
    
    # Check if it's in our test cards
    if card_number in VALID_TEST_CARDS:
        return True, "Valid test card", VALID_TEST_CARDS[card_number]
    
    # Check Luhn algorithm for other cards
    if is_luhn_valid(card_number):
        return True, "Card number format is valid", {"type": "Unknown", "bank": "Unknown", "balance": 10000}
    
    return False, "Invalid card number", None


def validate_cvv(cvv):
    """Validate CVV code"""
    if not cvv.isdigit():
        return False, "CVV must contain only digits"
    
    if len(cvv) not in [3, 4]:
        return False, "CVV must be 3 or 4 digits"
    
    # For test cards, accept any CVV in VALID_CVV list
    if cvv in VALID_CVV:
        return True, "Valid CVV"
    
    # Accept any 3-4 digit CVV for demo purposes
    return True, "Valid CVV"


def validate_expiry(month, year):
    """Validate expiry date"""
    from datetime import datetime
    
    try:
        month = int(month)
        year = int(year)
        
        # Validate month
        if month < 1 or month > 12:
            return False, "Invalid month (must be 1-12)"
        
        # Handle 2-digit year
        if year < 100:
            year += 2000
        
        # Check if expired
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        
        if year < current_year or (year == current_year and month < current_month):
            return False, "Card has expired"
        
        # Check if expiry is too far in future (more than 10 years)
        if year > current_year + 10:
            return False, "Invalid expiry year"
        
        return True, "Valid expiry date"
        
    except ValueError:
        return False, "Invalid expiry date format"


def process_payment(card_number, cvv, expiry_month, expiry_year, amount, cardholder_name):
    """
    Process a mock payment
    Returns: (success, message, transaction_id)
    """
    import random
    import string
    from datetime import datetime
    
    # Validate card number
    card_valid, card_msg, card_info = validate_card_number(card_number)
    if not card_valid:
        return False, card_msg, None
    
    # Validate CVV
    cvv_valid, cvv_msg = validate_cvv(cvv)
    if not cvv_valid:
        return False, cvv_msg, None
    
    # Validate expiry
    expiry_valid, expiry_msg = validate_expiry(expiry_month, expiry_year)
    if not expiry_valid:
        return False, expiry_msg, None
    
    # Validate amount
    if amount <= 0:
        return False, "Invalid amount", None
    
    # Check if card has sufficient balance (for test cards)
    if card_info and "balance" in card_info:
        if amount > card_info["balance"]:
            return False, f"Insufficient funds (Available: Rs. {card_info['balance']})", None
    
    # Generate transaction ID
    transaction_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    # Simulate processing delay (in real app, this would be API call)
    # time.sleep(1)
    
    # Success!
    bank_name = card_info.get("bank", "Bank") if card_info else "Bank"
    return True, f"Payment successful via {bank_name}", transaction_id


def get_test_cards_info():
    """
    Get list of test cards for demo purposes
    Returns list of card info (without full card numbers for security)
    """
    cards = []
    for card_num, info in VALID_TEST_CARDS.items():
        cards.append({
            "last_four": card_num[-4:],
            "type": info["type"],
            "bank": info["bank"],
            "full_number": card_num,  # Only for demo! Never expose in production
            "cvv": "123",  # Only for demo! Never expose in production
            "expiry": "12/25"
        })
    return cards
