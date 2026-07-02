# SliceMatic GRADIO-MVP-2 — Detailed Sprint Plan

## Summary of References Analyzed

| Source | Key Takeaways |
|--------|---------------|
| PRD (48afaa83) | 21 functional requirements (FR-01 to FR-21), 11 edge cases, pricing formula, order log format, acceptance criteria |
| UI Screens (order_management_system) | 7 screens: service_unavailable, customer_details_step_1, menu_selection_step_2, bill_summary_step_3, payment_step_4, order_confirmation_receipt, order_confirmation_system_log |
| UI Screens (design_system_variations) | 3 screens: zomato_system_ready, zomato_system_error, zomato_customer_intake |
| Design System (SliceMatic) | Primary red #b7102a, Inter font family, Material Symbols icons, 5-step progress indicator |
| Data Files | 5 bases (B1-B5), 8 pizzas (P1-P8), 10 toppings (T1-T10) in ID;Name;Price format |

---

## Architecture Decision

**Single file: `app.py`** using `gr.Blocks` with `gr.State` for stage management.

**Why not Tabs/Pages:** The spec requires sequential progression (no skipping) with visibility toggling. `gr.Group(visible=True/False)` is the correct Gradio primitive.

**Stage Mapping (from spec + UI screens):**
| Internal Stage | UI Label | Screen Reference |
|----------------|----------|-----------------|
| Stage 1 | System Readiness | zomato_system_ready / service_unavailable |
| Stage 2 | Customer Intake (Step 1 of 5) | customer_details_step_1 |
| Stage 3 | Quantity + Menu (Step 2 of 5) | menu_selection_step_2 |
| Stage 4 | Bill Review (Step 3 of 5) | bill_summary_step_3 |
| Stage 5 | Payment + Confirm (Step 4-5 of 5) | payment_step_4 + order_confirmation |

---

## Sprint Breakdown

### SPRINT 1: Foundation & Stage 1 (System Readiness)
**Estimated: 45 min**

#### Task 1.1 — Module-Level Constants & Imports
```
Constants to define (module-level, named variables):
  GST_RATE = 0.18
  DISCOUNT_RATE = 0.10
  DISCOUNT_THRESHOLD = 5
  MAX_QTY = 10
  MIN_QTY = 1
  PAYMENT_MODES = ["Cash", "Card", "UPI"]
  LOG_FILE = "orders_log.txt"
  BASE_FILE = "Types_of_Base.txt"
  PIZZA_FILE = "Types_of_Pizza.txt"
  TOPPING_FILE = "Types_of_Toppings.txt"
```

#### Task 1.2 — Menu File Loader Function
```python
def load_menu_file(filepath: str) -> list[tuple]:
    """
    Returns list of (id, name, price_float) tuples.
    - Strip whitespace per line
    - Split on ";"
    - Require exactly 3 fields
    - Price must cast to float and be >= 0
    - Skip malformed lines (log to console: print(f"Skipping malformed line in {filepath}: {line}"))
    - If file missing/unreadable: return empty list
    - If file produces zero valid items: return empty list
    """
```

#### Task 1.3 — Startup Validation
```python
# At module level (runs once when app.py loads):
bases = load_menu_file(BASE_FILE)
pizzas = load_menu_file(PIZZA_FILE)
toppings = load_menu_file(TOPPING_FILE)
SYSTEM_READY = len(bases) > 0 and len(pizzas) > 0 and len(toppings) > 0
```

#### Task 1.4 — Stage 1 UI
- If `SYSTEM_READY = False`: Show ONLY a centered message:
  - "SliceMatic ordering is temporarily unavailable. Please try again shortly."
  - No inputs, no buttons, no file paths, no stack traces
  - Reference: `service_unavailable/screen.png`
- If `SYSTEM_READY = True`: Show system ready screen with:
  - Checkmark icon + "All systems ready."
  - "Menu files loaded successfully."
  - Initialization log showing 3 files with checkmarks
  - "Start Ordering" button to advance to Stage 2
  - Reference: `zomato_system_ready/screen.png`

#### Edge Cases to Handle (Stage 1):
- [ ] File does not exist at all → graceful empty list
- [ ] File exists but is empty → zero valid items → system unavailable
- [ ] File has some valid lines and some malformed → skip bad, keep good
- [ ] File has non-numeric price ("Cheese Burst;abc") → skip that line
- [ ] Grader swaps files with different items/counts → code adapts dynamically

---

### SPRINT 2: Stage 2 (Customer Intake)
**Estimated: 40 min**

#### Task 2.1 — UI Layout
Reference: `customer_details_step_1/screen.png`
- Step indicator: "Step 1 of 5" with numbered circles (1-5)
- Header: "Let's get started"
- Subtitle: "We need a few details to process your order."
- Field 1: "Your Name" — gr.Textbox with placeholder "e.g. Aman Sharma"
- Field 2: "Mobile Number" — gr.Textbox with "+91" prefix label, placeholder "10-digit number"
- Each field has its own inline error message (gr.Markdown, initially hidden)
- "Continue" button at bottom

#### Task 2.2 — Name Validation (FR-05)
```
Rules:
  - Strip whitespace from both ends
  - Allow ONLY alphabets (a-z, A-Z) and spaces
  - Length must be 2-40 characters AFTER trim
  
Error messages (per edge case):
  - "" (empty) → "Name must contain alphabetic characters and be 2-40 characters long."
  - "   " (only spaces, trims to "") → same message
  - "A" (1 char) → same message
  - "Jean-Paul" (hyphen) → same message (reject: alphabets + spaces ONLY)
  - 41+ chars → same message
```

#### Task 2.3 — Phone Validation (FR-06)
```
Rules:
  - Strip whitespace
  - Must be exactly 10 digits
  - First digit must be 6, 7, 8, or 9
  
Error messages (distinct per failure type):
  - "" (empty) → "Phone number is required."
  - "98765432" (8 digits) → "Phone number must be exactly 10 digits."
  - "987654321a" (non-digits) → "Phone number must be exactly 10 digits."
  - "1234567890" (starts with 1) → "Enter a valid Indian mobile number starting with 6, 7, 8, or 9."
```

#### Task 2.4 — Session Timestamp (FR-01)
```python
from datetime import datetime
from zoneinfo import ZoneInfo

# On successful validation of both fields:
timestamp = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
# Store in state dict, travels with order to Stage 5
```

#### Task 2.5 — Stage Transition
- Validate both fields independently on "Continue" click
- Show per-field error messages (not a single generic banner)
- Only advance to Stage 3 if BOTH pass
- Store name, phone, timestamp in gr.State

---

### SPRINT 3: Stage 3 (Quantity + Menu Selection)
**Estimated: 60 min**

#### Task 3.1 — UI Layout
Reference: `menu_selection_step_2/screen.png`
- Step indicator: "Step 2 of 5"
- Header: "Quantity & Menu Selection"
- Divided into two visual blocks:
  1. **Quantity Block** (top) — validated independently
  2. **Menu Selection Block** (below, disabled until quantity valid)

#### Task 3.2 — Quantity Validation (FR-07)
```
Input: gr.Textbox (NOT gr.Number — need to catch floats/text ourselves)
Rules:
  - Must be a whole integer
  - Range: 1-10 inclusive
  
Error messages:
  - "" (empty) → "Please enter a quantity."
  - "three" / "abc" → "Quantity must be a whole number from 1 to 10."
  - "2.5" / "3.0" → "Quantity must be a whole number from 1 to 10." (reject floats explicitly)
  - 0 → "Quantity must be between 1 and 10."
  - -3 → "Quantity must be between 1 and 10."
  - 11 → "Maximum outlet capacity is 10 pizzas per order."
  - 12+ → "Maximum outlet capacity is 10 pizzas per order."

On valid: Lock quantity, enable menu block. Set state["quantity_locked"] = True.
NOTE: Quantity >= 5 triggers 10% discount but DO NOT mention it here.
```

#### Task 3.3 — Menu Display (FR-08)
For each of the 3 categories (Base, Pizza, Topping):
```
Render as numbered list using gr.Markdown:
  1. Thin Crust — ₹149
  2. Thick Crust — ₹179
  3. Cheese Burst — ₹229
  ...

Display number = position in list (1-indexed), NOT the raw ID from file.
Show name + price in ₹ format.
```

#### Task 3.4 — Menu Selection Validation (FR-09)
For each category (3 independent gr.Textbox inputs):
```
Rules:
  - Must be a valid integer
  - Range: 1 to len(category_list)
  
Error messages:
  - "" / letters → "Please enter a valid item number."
  - 0 → "Select a valid item number from the list."
  - > len(list) → "That item number is not available."
  
NOTE: If customer types price value (e.g., "229") it's rejected naturally by range check.
Do NOT special-case detect this.
```

#### Task 3.5 — Enable/Disable Logic
- Menu selection inputs start DISABLED (greyed out)
- Only enable when quantity passes validation
- "Continue to Bill" button only works when ALL 4 validations pass:
  - Quantity (locked) ✓
  - Base selection ✓
  - Pizza selection ✓
  - Topping selection ✓
- Validation blocks are independent — passing menu selection does NOT bypass invalid quantity

---

### SPRINT 4: Stage 4 (Bill Review)
**Estimated: 35 min**

#### Task 4.1 — UI Layout
Reference: `bill_summary_step_3/screen.png`
- Step indicator: "Step 3 of 5"
- Header: "Your Order"
- Receipt-style card (use gr.HTML for precise formatting)
- "Proceed to Payment" button at bottom

#### Task 4.2 — Bill Calculation (FR-10 to FR-14)
```python
# EXACT formula chain — no reordering, no rounding mid-calculation:
unit_price = base_price + pizza_price + topping_price
subtotal = unit_price * quantity
discount = subtotal * DISCOUNT_RATE if quantity >= DISCOUNT_THRESHOLD else 0
taxable_amt = subtotal - discount
gst = taxable_amt * GST_RATE
final_total = taxable_amt + gst

# Round ONLY at display/log time to 2 decimals
```

#### Task 4.3 — Bill Display (FR-15)
Table rows to show:
```
┌─────────────────────────────────┬──────────┐
│ {base_name}                     │ ₹{price} │
│ {pizza_name}                    │ ₹{price} │
│ {topping_name}                  │ ₹{price} │
├─────────────────────────────────┼──────────┤
│ Unit Price                      │ ₹{xxx}   │
│ Quantity                        │ x{n}     │
│ Subtotal                        │ ₹{xxx}   │
│ Discount (10% OFF)              │ -₹{xxx}  │  ← ONLY if qty >= 5
│ GST (18%)                       │ ₹{xxx}   │
├─────────────────────────────────┼──────────┤
│ Final Payable                   │ ₹{xxx}   │  ← Bold, highlighted
│ Includes all taxes and charges  │          │
└─────────────────────────────────┴──────────┘
```

**CRITICAL:** Discount row is HIDDEN entirely when qty < 5 (don't show ₹0.00).

#### Task 4.4 — No Input Fields
- This screen has NO inputs — read-only bill only
- Single button: "Proceed to Payment"
- Phone number NOT shown on bill (privacy rule)

---

### SPRINT 5: Stage 5 (Payment + Persistence)
**Estimated: 50 min**

#### Task 5.1 — Payment UI
Reference: `payment_step_4/screen.png`
- Step indicator: "Step 4 of 5"
- Header: "How would you like to pay?"
- Three radio/button options: Cash, Card, UPI
- Confirmation message area below
- "Confirm Order" button

#### Task 5.2 — Payment Validation (FR-16, FR-17)
```
Only accept: "Cash", "Card", "UPI"
Error: "Please select a valid payment mode: Cash, Card, or UPI."
```

#### Task 5.3 — Payment Confirmation Messages (FR-18)
```
Cash → "Cash payment selected. Please collect payment at delivery/counter."
Card → "Card payment selected. Please process on POS."
UPI  → "UPI payment selected. Please confirm receipt before fulfillment."
```

#### Task 5.4 — Order Persistence (FR-19, FR-20, FR-21)
```python
# CRITICAL: File write in its OWN try/except, separate from validation

order_line = (
    f"ORDER|{timestamp}|{name}|{phone}|"
    f"{base_id}|{base_name}|{base_price:.2f}|"
    f"{pizza_id}|{pizza_name}|{pizza_price:.2f}|"
    f"{topping_id}|{topping_name}|{topping_price:.2f}|"
    f"{quantity}|{unit_price:.2f}|{subtotal:.2f}|"
    f"{discount:.2f}|{gst:.2f}|{final_total:.2f}|{payment_mode}"
)

try:
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(order_line + "\n\n")
    # SUCCESS → Show order confirmed screen
except Exception as e:
    # FAILURE → Show fallback receipt (see Task 5.5)
```

#### Task 5.5 — Write Failure Handling (THE CRITICAL EDGE CASE)
```
If file write fails:
  - Do NOT show success/receipt screen
  - Do NOT silently swallow
  - Show: "Your order total and payment mode were confirmed, but we could not 
    save your order record. Please show this screen to staff:"
  - Render full bill + payment mode as fallback receipt on screen
  - This ensures no order is lost — escalated to human

Only show "Order Confirmed ✅" if log write ACTUALLY succeeded.
```

#### Task 5.6 — Success Screen
Reference: `order_confirmation_receipt/screen.png` + `order_confirmation_system_log/screen.png`
- Header: "Order Confirmed" with checkmark
- "Your pizza is on its way. Thank you for choosing SliceMatic."
- Order summary card showing customer name, items, total
- System log entry preview (the pipe-separated line)
- "Return to Home" button (resets state to Stage 1/2)

---

### SPRINT 6: Global Rules & Hardening
**Estimated: 30 min**

#### Task 6.1 — Global Error Wrapping
- Every button callback wrapped in try/except
- No unhandled exception surfaces to customer
- Specific user-facing message for every failure type
- Failed validation NEVER creates a logged order

#### Task 6.2 — Business Constants Verification
- All constants at module level, not magic numbers in formulas
- Grader can change DISCOUNT_THRESHOLD from 5 to 3 and demo immediately

#### Task 6.3 — Dynamic Menu Adaptation
- No hardcoded item names, prices, or counts ANYWHERE
- If grader swaps files with 20 toppings and different prices → app adapts
- Display indices always 1 to len(list), regardless of file content

#### Task 6.4 — Phone Privacy
- Phone shown ONLY in:
  - Stage 2 intake confirmation (briefly)
  - orders_log.txt file
- NOT echoed on bill, payment screen, or receipt UI

#### Task 6.5 — Stage Independence
- Quantity block and menu block: independent validation
- Passing menu selection CANNOT bypass invalid quantity
- Passing quantity CANNOT bypass invalid menu selections

---

## Iteration Checklist (3 Passes After Build)

### ITERATION 1: Functional Requirements Verification
Check each FR against the built code:

| FR | Check | Pass? |
|----|-------|-------|
| FR-01 | Session timestamp created in IST on entering Stage 2 | |
| FR-02 | Files loaded at runtime with ID;Name;Price format | |
| FR-03 | Each row validated: 3 fields, numeric price >= 0 | |
| FR-04 | Missing/malformed → controlled "temporarily unavailable" message | |
| FR-05 | Name: alphabets+spaces, 2-40 chars after trim | |
| FR-06 | Phone: exactly 10 digits, starts with 6/7/8/9 | |
| FR-07 | Quantity: integer 1-10, rejects floats/text/zero/negatives/>10 | |
| FR-08 | Menu shown as numbered lists with name + ₹price | |
| FR-09 | Selection by display number only, validates range | |
| FR-10 | unit_price = base + pizza + topping | |
| FR-11 | subtotal = unit_price * quantity | |
| FR-12 | discount = subtotal * 0.10 if qty >= 5 else 0 | |
| FR-13 | GST = 18% of (subtotal - discount) | |
| FR-14 | final = (subtotal - discount) + GST, round only at display | |
| FR-15 | Bill table with all components, discount row ONLY if qty >= 5 | |
| FR-16 | Three payment options: Cash, Card, UPI | |
| FR-17 | Invalid payment selection rejected | |
| FR-18 | Mode-specific confirmation text matches spec exactly | |
| FR-19 | Completed order appended to orders_log.txt | |
| FR-20 | One pipe-separated line + blank line between records | |
| FR-21 | Failed attempts never create order records | |

### ITERATION 2: Edge Cases Verification
Test each edge case from the PRD:

| Edge Case | Input | Expected Message | Pass? |
|-----------|-------|------------------|-------|
| Name: only spaces | "   " | "Name must contain alphabetic characters and be 2-40 characters long." | |
| Phone: starts with 1 | "1234567890" | "Enter a valid Indian mobile number starting with 6, 7, 8, or 9." | |
| Quantity: 0 | "0" | "Quantity must be between 1 and 10." | |
| Quantity: 11 | "11" | "Maximum outlet capacity is 10 pizzas per order." | |
| Quantity: text | "three" | "Quantity must be a whole number from 1 to 10." | |
| Quantity: float | "2.5" | "Quantity must be a whole number from 1 to 10." | |
| Selection: 0 | "0" | "Select a valid item number from the list." | |
| Selection: > length | "99" | "That item number is not available." | |
| Selection: price value | "229" | Rejected by range if > list length | |
| Empty at any prompt | "" | Field-specific message (not generic) | |
| Name: hyphen | "Jean-Paul" | "Name must contain alphabetic characters and be 2-40 characters long." | |
| Phone: 8 digits | "98765432" | "Phone number must be exactly 10 digits." | |
| Phone: has letter | "987654321a" | "Phone number must be exactly 10 digits." | |
| Phone: empty | "" | "Phone number is required." | |
| Quantity: empty | "" | "Please enter a quantity." | |
| Selection: letters | "abc" | "Please enter a valid item number." | |
| File write fails | (simulate) | Fallback receipt shown, no success screen | |
| All files missing | (delete files) | "SliceMatic ordering is temporarily unavailable..." | |
| Partial malformed file | (corrupt 1 line) | App works with valid lines, skips bad ones | |

### ITERATION 3: Cross-Cutting & Grader Scenarios
| Scenario | Verification | Pass? |
|----------|-------------|-------|
| Swap all 3 files with different items/prices/counts | App adapts, no crash | |
| Change DISCOUNT_THRESHOLD to 3 | Discount applies at qty 3+ | |
| Change GST_RATE to 0.12 | Bill recalculates correctly | |
| Change MAX_QTY to 5 | Rejects qty 6+ with correct message | |
| orders_log.txt is read-only (permission denied) | Fallback receipt shown | |
| orders_log.txt path deleted after app starts | Fallback receipt shown | |
| Complete 2 orders back-to-back | Both logged with blank line between | |
| No phone number on bill or payment screen | Privacy check | |
| All monetary values display 2 decimal places | ₹229.00, not ₹229 | |
| Discount row hidden when qty < 5 | Bill doesn't show ₹0.00 row | |
| Stage 3: valid menu but invalid qty → cannot proceed | Independence check | |
| Stage 3: valid qty but no menu selections → cannot proceed | Independence check | |

---

## File Structure

```
GRADIO-MVP-2/
├── app.py                  ← Single application file (all logic)
├── Types_of_Base.txt       ← Copied from Project_Requirements/
├── Types_of_Pizza.txt      ← Copied from Project_Requirements/
├── Types_of_Toppings.txt   ← Copied from Project_Requirements/
├── orders_log.txt          ← Created at runtime on first completed order
└── SPRINT_PLAN.md          ← This file
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| gr.Textbox for quantity (not gr.Number) | Need to catch "2.5" and "three" ourselves, gr.Number silently floors |
| gr.HTML for bill (not gr.Dataframe) | Better control over hiding discount row, bold formatting, ₹ symbol |
| gr.Radio for payment (not gr.Dropdown) | Matches UI reference — large clickable options |
| Module-level file loading | Runs once at startup per spec; no re-reading per request |
| ZoneInfo("Asia/Kolkata") for IST | Python 3.9+ standard, no external dependency |
| try/except specifically around file write | Spec's critical edge case — separate from validation errors |
| State dict pattern | Single gr.State holding all order fields across stages |

---

## Build Order

1. **Sprint 1** → Run app, verify system ready/unavailable screens work
2. **Sprint 2** → Test all name/phone validation edge cases
3. **Sprint 3** → Test quantity + menu selection independence
4. **Sprint 4** → Verify bill math with the PRD's sample bill
5. **Sprint 5** → Complete flow end-to-end, verify log output matches PRD format
6. **Sprint 6** → Harden, then run all 3 iteration checklists

**PRD Sample Bill Verification Target:**
```
Base: Cheese Burst (B3) = ₹229.00
Pizza: BBQ Chicken (P7) = ₹379.00
Topping: Extra Cheese (T2) = ₹69.00
Unit Price = ₹677.00
Quantity = 5
Subtotal = ₹3,385.00
Discount (10%) = ₹338.50
Post-discount = ₹3,046.50
GST (18%) = ₹548.37
Final Payable = ₹3,594.87
```
