"""Standalone test script for SliceMatic core logic — no gradio required."""
import re
import os
import tempfile

def load_menu_file(filepath):
    """Mirror of app.py's loader — items with bad name/price kept as unavailable."""
    items = []
    seen = set()
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(";")
                if len(parts) != 3:
                    continue
                item_id, name, price_str = [p.strip() for p in parts]
                if not name:
                    items.append((item_id, "Unnamed", 0.0))
                    continue
                if not price_str:
                    items.append((item_id, name, 0.0))
                    continue
                try:
                    price = float(price_str)
                except ValueError:
                    items.append((item_id, name, 0.0))
                    continue
                if price < 0:
                    items.append((item_id, name, 0.0))
                    continue
                row_key = (item_id, name, price)
                if row_key in seen:
                    continue
                seen.add(row_key)
                items.append((item_id, name, price))
    except Exception:
        pass
    return items

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
    # 1. Test local files loading (keeps core bill math assertions working)
    bases = load_menu_file("Types_of_Base.txt")
    pizzas = load_menu_file("Types_of_Pizza.txt")
    toppings = load_menu_file("Types_of_Toppings.txt")

    assert len(bases) in (5, 6), f"Expected 5 or 6 bases from files, got {len(bases)}"
    assert len(pizzas) in (8, 9), f"Expected 8 or 9 pizzas from files, got {len(pizzas)}"
    assert len(toppings) in (10, 16, 17), f"Expected 10, 16, or 17 toppings from files, got {len(toppings)}"
    print(f"File loading: PASS ({len(bases)} bases, {len(pizzas)} pizzas, {len(toppings)} toppings)")

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

    # ─── Loader: empty/bad names and prices kept as unavailable ───
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as tmp:
        tmp.write("X1;Good;100\n")
        tmp.write("X2;Empty;\n")
        tmp.write("X3;Bad;abc\n")
        tmp.write("X4;Negative;-50\n")
        tmp.write("X5;Zero;0\n")
        tmp.write("X6;Also Good;200\n")
        tmp.write("X7;;150\n")
        tmp.write("X8;  ;300\n")
        tmp_path = tmp.name
    try:
        loaded = load_menu_file(tmp_path)
        assert len(loaded) == 8, f"Expected 8 items, got {len(loaded)}"
        assert loaded[0] == ("X1", "Good", 100.0)
        assert loaded[1][2] == 0.0, f"Empty price should be 0, got {loaded[1][2]}"
        assert loaded[2][2] == 0.0, f"Bad price should be 0, got {loaded[2][2]}"
        assert loaded[3][2] == 0.0, f"Negative price should be 0, got {loaded[3][2]}"
        assert loaded[4][2] == 0.0, f"Zero price should stay 0, got {loaded[4][2]}"
        assert loaded[5] == ("X6", "Also Good", 200.0)
        assert loaded[6][1] == "Unnamed" and loaded[6][2] == 0.0, f"Empty name should be Unnamed+unavailable, got {loaded[6]}"
        assert loaded[7][1] == "Unnamed" and loaded[7][2] == 0.0, f"Blank name should be Unnamed+unavailable, got {loaded[7]}"
    finally:
        os.unlink(tmp_path)
    print("Loader (unavailable items): PASS")

    # ─── Bill: Cheese Burst + BBQ Chicken + Extra Cheese, qty=5 ───
    # b[2]=Cheese Burst(229), p[6]=BBQ Chicken(379), t[0]=Extra Cheese(69)
    # Patch bases[2] because in Types_of_Base.txt B3 name is empty and thus loaded as price 0
    bases[2] = ("B3", "Cheese Burst", 229.0)
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
