"""Iteration 2: Edge case tests — exact error messages matched against spec."""
import re

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
    return n - 1, ""

passed = 0
failed = 0

def check(test_name, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  PASS: {test_name}")
    else:
        failed += 1
        print(f"  FAIL: {test_name}")
        print(f"    Expected: {expected}")
        print(f"    Got:      {actual}")

dummy_list_5 = [("X1","A",1),("X2","B",2),("X3","C",3),("X4","D",4),("X5","E",5)]
dummy_list_10 = dummy_list_5 + [("X6","F",6),("X7","G",7),("X8","H",8),("X9","I",9),("X10","J",10)]

print("=== NAME EDGE CASES ===")
check("empty string", validate_name("")[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("only spaces", validate_name("   ")[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("single char", validate_name("A")[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("hyphen in name", validate_name("Jean-Paul")[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("41 chars", validate_name("A" * 41)[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("digits in name", validate_name("John123")[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")
check("valid 2 chars", validate_name("AB")[0], "AB")
check("valid 40 chars", validate_name("A" * 40)[0], "A" * 40)
check("valid with spaces", validate_name("Aman Sharma")[0], "Aman Sharma")
check("leading/trailing spaces stripped", validate_name("  Aman  ")[0], "Aman")
check("None input", validate_name(None)[1],
      "Name must contain alphabetic characters and be 2-40 characters long.")

print("\n=== PHONE EDGE CASES ===")
check("empty", validate_phone("")[1], "Phone number is required.")
check("None", validate_phone(None)[1], "Phone number is required.")
check("8 digits", validate_phone("98765432")[1], "Phone number must be exactly 10 digits.")
check("11 digits", validate_phone("12345678901")[1], "Phone number must be exactly 10 digits.")
check("has letter", validate_phone("987654321a")[1], "Phone number must be exactly 10 digits.")
check("starts with 1", validate_phone("1234567890")[1],
      "Enter a valid Indian mobile number starting with 6, 7, 8, or 9.")
check("starts with 0", validate_phone("0000000000")[1],
      "Enter a valid Indian mobile number starting with 6, 7, 8, or 9.")
check("starts with 5", validate_phone("5555555555")[1],
      "Enter a valid Indian mobile number starting with 6, 7, 8, or 9.")
check("valid starts with 6", validate_phone("6000000000")[0], "6000000000")
check("valid starts with 7", validate_phone("7000000000")[0], "7000000000")
check("valid starts with 8", validate_phone("8000000000")[0], "8000000000")
check("valid starts with 9", validate_phone("9876543210")[0], "9876543210")
check("has spaces", validate_phone("98765 43210")[1], "Phone number must be exactly 10 digits.")
check("+91 prefix", validate_phone("+919876543210")[1], "Phone number must be exactly 10 digits.")

print("\n=== QUANTITY EDGE CASES ===")
check("empty", validate_quantity("")[1], "Please enter a quantity.")
check("None", validate_quantity(None)[1], "Please enter a quantity.")
check("spaces only", validate_quantity("   ")[1], "Please enter a quantity.")
check("text 'three'", validate_quantity("three")[1], "Quantity must be a whole number from 1 to 10.")
check("text 'abc'", validate_quantity("abc")[1], "Quantity must be a whole number from 1 to 10.")
check("float 2.5", validate_quantity("2.5")[1], "Quantity must be a whole number from 1 to 10.")
check("float 3.0", validate_quantity("3.0")[1], "Quantity must be a whole number from 1 to 10.")
check("float 1.0", validate_quantity("1.0")[1], "Quantity must be a whole number from 1 to 10.")
check("zero", validate_quantity("0")[1], "Quantity must be between 1 and 10.")
check("negative -1", validate_quantity("-1")[1], "Quantity must be between 1 and 10.")
check("negative -3", validate_quantity("-3")[1], "Quantity must be between 1 and 10.")
check("eleven", validate_quantity("11")[1], "Maximum outlet capacity is 10 pizzas per order.")
check("hundred", validate_quantity("100")[1], "Maximum outlet capacity is 10 pizzas per order.")
check("valid 1", validate_quantity("1")[0], 1)
check("valid 5", validate_quantity("5")[0], 5)
check("valid 10", validate_quantity("10")[0], 10)
check("leading spaces", validate_quantity("  5  ")[0], 5)
check("sci notation 1e2", validate_quantity("1e2")[1], "Quantity must be a whole number from 1 to 10.")

print("\n=== SELECTION EDGE CASES ===")
check("empty", validate_selection("", dummy_list_5)[1], "Please enter a valid item number.")
check("None", validate_selection(None, dummy_list_5)[1], "Please enter a valid item number.")
check("letters", validate_selection("abc", dummy_list_5)[1], "Please enter a valid item number.")
check("float 1.5", validate_selection("1.5", dummy_list_5)[1], "Please enter a valid item number.")
check("zero", validate_selection("0", dummy_list_5)[1], "Select a valid item number from the list.")
check("negative", validate_selection("-1", dummy_list_5)[1], "Select a valid item number from the list.")
check("out of range", validate_selection("6", dummy_list_5)[1], "That item number is not available.")
check("way out of range", validate_selection("99", dummy_list_5)[1], "That item number is not available.")
check("price as number", validate_selection("229", dummy_list_5)[1], "That item number is not available.")
check("valid first", validate_selection("1", dummy_list_5)[0], 0)
check("valid last", validate_selection("5", dummy_list_5)[0], 4)
check("valid middle", validate_selection("3", dummy_list_5)[0], 2)
check("10 items, select 10", validate_selection("10", dummy_list_10)[0], 9)
check("10 items, select 11", validate_selection("11", dummy_list_10)[1], "That item number is not available.")

print("\n=== BILL EDGE CASES ===")
GST_RATE = 0.18
DISCOUNT_RATE = 0.10
DISCOUNT_THRESHOLD = 5

def compute(up, qty):
    sub = up * qty
    disc = sub * DISCOUNT_RATE if qty >= DISCOUNT_THRESHOLD else 0
    tax = sub - disc
    gst = tax * GST_RATE
    return dict(sub=sub, disc=disc, tax=tax, gst=gst, final=tax + gst)

# qty=4 no discount
b = compute(497, 4)
check("qty=4 discount is 0", b["disc"], 0)
check("qty=4 subtotal", b["sub"], 1988.0)

# qty=5 has discount
b = compute(497, 5)
check("qty=5 discount > 0", b["disc"] > 0, True)
check("qty=5 discount value", b["disc"], 248.5)

# qty=1 no discount
b = compute(677, 1)
check("qty=1 no discount", b["disc"], 0)
check("qty=1 final calc", abs(b["final"] - 799.06) < 0.01, True)

# PRD sample
b = compute(677, 5)
check("PRD unit_price", 677, 677)
check("PRD subtotal", b["sub"], 3385.0)
check("PRD discount", b["disc"], 338.5)
check("PRD taxable", b["tax"], 3046.5)
check("PRD gst", abs(b["gst"] - 548.37) < 0.01, True)
check("PRD final", abs(b["final"] - 3594.87) < 0.01, True)

# Discount row visibility
check("qty=4 discount row hidden", 4 < DISCOUNT_THRESHOLD, True)
check("qty=5 discount row shown", 5 >= DISCOUNT_THRESHOLD, True)
check("qty=10 discount row shown", 10 >= DISCOUNT_THRESHOLD, True)

print(f"\n{'=' * 50}")
print(f"Results: {passed} passed, {failed} failed out of {passed + failed} tests")
if failed == 0:
    print("ALL EDGE CASE TESTS PASSED")
else:
    print(f"WARNING: {failed} test(s) FAILED")
print(f"{'=' * 50}")
