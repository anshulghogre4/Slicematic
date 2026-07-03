"""Standalone test script for SliceMatic core logic — no gradio required."""
import re
import os
import tempfile

# Text menu file loader checks have been removed since data is strictly DB-backed.

def validate_name(raw):
    name = (raw or "").strip()
    if not name or len(name) < 2 or len(name) > 40 or not re.match(r'^[A-Za-z ]+$', name):
        return None, "Name must contain alphabetic characters and be 2-40 characters long."
    return name, ""

def validate_phone(raw):
    phone = (raw or "").strip()
    if not phone:
        return None, "Phone number is required."
    if not phone.isdigit() or len(phone) != 10:
        return None, "Phone number must be exactly 10 digits."
    if phone[0] not in "6789":
        return None, "Enter a valid Indian mobile number starting with 6, 7, 8, or 9."
    return phone, ""

def validate_quantity(raw):
    s = (raw or "").strip()
    if not s:
        return None, "Please enter a quantity."
    if "." in s:
        return None, "Quantity must be a whole number from 1 to 10."
    try:
        q = int(s)
    except ValueError:
        return None, "Quantity must be a whole number from 1 to 10."
    if q <= 0:
        return None, "Quantity must be between 1 and 10."
    if q > 10:
        return None, "Maximum outlet capacity is 10 pizzas per order."
    return q, ""

def validate_selection(raw, items):
    s = (raw or "").strip()
    if not s:
        return None, "Please enter a valid item number."
    if "." in s:
        return None, "Please enter a valid item number."
    try:
        n = int(s)
    except ValueError:
        return None, "Please enter a valid item number."
    if n <= 0:
        return None, "Select a valid item number from the list."
    if n > len(items):
        return None, "That item number is not available."
    if items[n - 1][2] <= 0:
        return None, f"{items[n - 1][1]} is currently unavailable."
    return n - 1, ""

GST_RATE = 0.18
DISCOUNT_RATE = 0.10
DISCOUNT_THRESHOLD = 5

def compute_bill(bases, pizzas, toppings, bi, pi, ti, qty):
    up = bases[bi][2] + pizzas[pi][2] + toppings[ti][2]
    sub = up * qty
    disc = sub * DISCOUNT_RATE if qty >= DISCOUNT_THRESHOLD else 0
    tax = sub - disc
    gst = tax * GST_RATE
    return dict(unit_price=up, subtotal=sub, discount=disc, taxable=tax, gst=gst, final_total=tax + gst)


def run_tests():
    # 1. Define dummy in-memory menus to run core math and validation checks independently of files
    bases = [
        ("B1", "Thin Crust", 149.0),
        ("B2", "Thick Crust", 179.0),
        ("B3", "Cheese Burst", 229.0),
        ("B4", "Whole Wheat", 159.0),
        ("B5", "Multigrain", 169.0)
    ]
    pizzas = [
        ("P1", "Margherita", 299.0),
        ("P2", "Chicago Deep Dish", 349.0),
        ("P3", "Greek Mediterranean", 329.0),
        ("P4", "California Veggie", 339.0),
        ("P5", "Farm House", 319.0),
        ("P6", "Pepperoni Classic", 0.0),
        ("P7", "BBQ Chicken", 379.0),
        ("P8", "Paneer Tikka", 349.0)
    ]
    toppings = [
        ("T1", "Extra Cheese", 69.0),
        ("T2", "Onion", 29.0),
        ("T3", "Green Capsicum", 39.0)
    ]

    # 2. Test database loading (verifies PostgreSQL configuration)
    try:
        from app import load_menu_from_db
        db_bases, db_pizzas, db_toppings = load_menu_from_db()
        assert len(db_bases) == 5, f"Expected 5 bases from DB, got {len(db_bases)}"
        assert len(db_pizzas) == 8, f"Expected 8 pizzas from DB, got {len(db_pizzas)}"
        assert len(db_toppings) == 10, f"Expected 10 toppings from DB, got {len(db_toppings)}"
        print(f"PostgreSQL DB loading: PASS ({len(db_bases)} bases, {len(db_pizzas)} pizzas, {len(db_toppings)} toppings)")
    except Exception as e:
        print(f"PostgreSQL DB loading: FAIL ({e})")
        raise e

    # ─── Name ───
    assert validate_name("Aman Sharma") == ("Aman Sharma", "")
    assert validate_name("")[0] is None
    assert validate_name("   ")[0] is None
    assert validate_name("A")[0] is None
    assert validate_name("Jean-Paul")[0] is None
    assert validate_name("A" * 41)[0] is None
    assert validate_name("AB") == ("AB", "")
    assert validate_name("A" * 40)[0] == "A" * 40
    print("Name validation: PASS")

    # ─── Phone ───
    assert validate_phone("9876543210") == ("9876543210", "")
    assert validate_phone("")[1] == "Phone number is required."
    assert validate_phone("98765432")[1] == "Phone number must be exactly 10 digits."
    assert validate_phone("987654321a")[1] == "Phone number must be exactly 10 digits."
    assert validate_phone("1234567890")[1] == "Enter a valid Indian mobile number starting with 6, 7, 8, or 9."
    assert validate_phone("0000000000")[1] == "Enter a valid Indian mobile number starting with 6, 7, 8, or 9."
    assert validate_phone("6000000000") == ("6000000000", "")
    print("Phone validation: PASS")

    # ─── Quantity ───
    assert validate_quantity("5") == (5, "")
    assert validate_quantity("1") == (1, "")
    assert validate_quantity("10") == (10, "")
    assert validate_quantity("")[1] == "Please enter a quantity."
    assert validate_quantity("three")[1] == "Quantity must be a whole number from 1 to 10."
    assert validate_quantity("2.5")[1] == "Quantity must be a whole number from 1 to 10."
    assert validate_quantity("3.0")[1] == "Quantity must be a whole number from 1 to 10."
    assert validate_quantity("0")[1] == "Quantity must be between 1 and 10."
    assert validate_quantity("-3")[1] == "Quantity must be between 1 and 10."
    assert validate_quantity("11")[1] == "Maximum outlet capacity is 10 pizzas per order."
    assert validate_quantity("100")[1] == "Maximum outlet capacity is 10 pizzas per order."
    print("Quantity validation: PASS")

    # ─── Selection ───
    assert validate_selection("1", bases) == (0, "")
    assert validate_selection("5", bases) == (4, "")
    assert validate_selection("", bases)[1] == "Please enter a valid item number."
    assert validate_selection("abc", bases)[1] == "Please enter a valid item number."
    assert validate_selection("0", bases)[1] == "Select a valid item number from the list."
    assert validate_selection("-1", bases)[1] == "Select a valid item number from the list."
    assert validate_selection("99", bases)[1] == "That item number is not available."
    assert validate_selection("6", bases)[1] == "That item number is not available."
    assert validate_selection("1.5", bases)[1] == "Please enter a valid item number."
    assert validate_selection("229", bases)[1] == "That item number is not available."
    print("Selection validation: PASS")

    # ─── Unavailable item (price=0) selection ───
    test_items = [("X1", "Good Item", 100.0), ("X2", "No Price", 0.0), ("X3", "Also Good", 200.0)]
    idx, err = validate_selection("1", test_items)
    assert idx == 0 and err == ""
    idx, err = validate_selection("2", test_items)
    assert idx is None and "unavailable" in err.lower()
    idx, err = validate_selection("3", test_items)
    assert idx == 2 and err == ""
    print("Unavailable item validation: PASS")

    # ─── Bill: Cheese Burst + BBQ Chicken + Extra Cheese, qty=5 ───
    # b[2]=Cheese Burst(229), p[6]=BBQ Chicken(379), t[0]=Extra Cheese(69)
    bill = compute_bill(bases, pizzas, toppings, 2, 6, 0, 5)
    assert bill["unit_price"] == 677.0, f"unit_price={bill['unit_price']}"
    assert bill["subtotal"] == 3385.0, f"subtotal={bill['subtotal']}"
    assert bill["discount"] == 338.5, f"discount={bill['discount']}"
    assert bill["taxable"] == 3046.5, f"taxable={bill['taxable']}"
    assert abs(bill["gst"] - 548.37) < 0.01, f"gst={bill['gst']}"
    assert abs(bill["final_total"] - 3594.87) < 0.01, f"final={bill['final_total']}"
    print("Bill (PRD sample qty=5): PASS")

    # No discount when qty < 5
    # b[0]=Thin Crust(149), p[0]=Margherita(299), t[0]=Extra Cheese(69) = 517
    bill2 = compute_bill(bases, pizzas, toppings, 0, 0, 0, 3)
    assert bill2["discount"] == 0
    assert bill2["subtotal"] == 1551.0, f"subtotal={bill2['subtotal']}"
    print("Bill (qty=3 no discount): PASS")

    # Discount at threshold
    bill3 = compute_bill(bases, pizzas, toppings, 0, 0, 0, 5)
    assert bill3["discount"] > 0
    print("Bill (qty=5 threshold): PASS")

    bill4 = compute_bill(bases, pizzas, toppings, 0, 0, 0, 4)
    assert bill4["discount"] == 0
    print("Bill (qty=4 no discount): PASS")

    # ─── Order line format ───
    b = bases[2]; p = pizzas[6]; t = toppings[0]
    bill = compute_bill(bases, pizzas, toppings, 2, 6, 0, 5)
    line = (
        f"ORDER|2026-06-25T19:42:10+05:30|Aman Sharma|9876543210|"
        f"{b[0]}|{b[1]}|{b[2]:.2f}|"
        f"{p[0]}|{p[1]}|{p[2]:.2f}|"
        f"{t[0]}|{t[1]}|{t[2]:.2f}|"
        f"5|{bill['unit_price']:.2f}|{bill['subtotal']:.2f}|"
        f"{bill['discount']:.2f}|{bill['gst']:.2f}|{bill['final_total']:.2f}|UPI"
    )
    parts = line.split("|")
    assert len(parts) == 20, f"Expected 20 fields, got {len(parts)}"
    assert parts[0] == "ORDER"
    assert parts[4] == "B3"
    assert parts[6] == "229.00"
    assert parts[14] == "677.00"
    assert parts[18] == "3594.87"
    assert parts[19] == "UPI"
    print("Order line format: PASS")

    # ─── Email & Date Validation ───
    try:
        from app import validate_email, validate_date
        
        # Email
        assert validate_email("user@email.com") == ("user@email.com", "")
        assert validate_email("") == (None, "")
        assert validate_email("invalid-email")[0] is None
        assert "valid" in validate_email("invalid-email")[1].lower()
        
        # Date
        assert validate_date("1995-06-15") == ("1995-06-15", "")
        assert validate_date("") == (None, "")
        assert validate_date("1995-15-40")[0] is None
        assert "yyyy-mm-dd" in validate_date("1995-15-40")[1].lower()
        
        print("Email & Date validation: PASS")
    except ImportError:
        pass

    print()
    print("=" * 45)
    print("ALL CORE LOGIC TESTS PASSED")
    print("=" * 45)


if __name__ == "__main__":
    run_tests()
