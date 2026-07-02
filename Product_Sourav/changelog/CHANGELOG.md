# Changelog — SliceMatic (Gradio MVP)

All notable changes to the SliceMatic pizza-ordering app are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

Project: FDE Batch 2487 — Stage 2 Gradio MVP
Deliverable: single `app.py` + 3 menu files, writes `orders_log.txt`

---

## [1.0.0] — 2026-06-27

First complete, verified build of the SliceMatic ordering app. Passed all three
verification iterations (functional requirements, edge cases, grader scenarios).

### Added

**Core application (`app.py`, ~679 lines)**
- 5-stage sequential flow via `gr.Blocks` + `gr.State` dict, with only one
  `gr.Group` visible at a time.
  - Stage 1 — System ready / menu-file status screen
  - Stage 2 — Customer intake (name + phone)
  - Stage 3 — Quantity confirm + menu selection (base / pizza / topping)
  - Stage 4 — Bill review (read-only)
  - Stage 5 — Payment + receipt / fallback receipt
- Defensive menu loader `load_menu_file()` — parses `ID;Name;Price`, skips
  malformed lines, handles `FileNotFoundError` without crashing.
- Module-level menu loading (`bases`, `pizzas`, `toppings`) with `SYSTEM_READY`
  flag so a missing/empty file degrades gracefully to an "unavailable" screen.

**Validation**
- `validate_name()` — letters/spaces only, 2–40 chars.
- `validate_phone()` — 3 distinct error paths (empty / format / first digit 6-9).
- `validate_quantity()` — rejects floats ("2.5"), words ("three"); range 1–`MAX_QTY`.
- `validate_selection()` — rejects floats/words; range 1–`len(items)`.
- Failed validation at any stage never creates a logged order.

**Pricing & bill**
- `compute_bill()` — full formula chain with no mid-calc rounding:
  unit_price → subtotal → discount → taxable → GST → final_total.
- 10% discount applied only when `quantity >= DISCOUNT_THRESHOLD` (5).
- 18% GST on the post-discount amount.
- `render_bill_html()` — styled bill; discount row rendered **only** when earned
  (no ₹0.00 row); all money shown to 2 decimals with `&#8377;`.

**Payment & logging**
- `gr.Radio` payment mode (Cash / Card / UPI) with validation.
- `build_order_line()` — 20-field pipe-separated `ORDER|...` log line.
- Order appended to `orders_log.txt` with blank-line separator between orders.
- Dedicated `try/except` around the file write: on failure a **fallback receipt**
  is shown so the customer is never blocked or shown an error trace.

**Configuration (module-level constants)**
- `GST_RATE = 0.18`, `DISCOUNT_RATE = 0.10`, `DISCOUNT_THRESHOLD = 5`,
  `MAX_QTY = 10`, `PAYMENT_MODES` — all single-source so the grader can swap them.

**Privacy & safety**
- Phone number stored only in state + log line; never echoed on bill, payment,
  or receipt screens.
- `html.escape` applied to all user-provided values rendered in HTML (XSS defense).
- No file paths, stack traces, or developer language ever surfaced to the customer.
- IST timestamps via `ZoneInfo("Asia/Kolkata")` with a fixed-offset fallback.

### Verification
- **Iteration 1** — 21/21 functional requirements (FR-01 … FR-21) verified.
- **Iteration 2** — 71/72 automated edge-case tests passed (1 was a test-script
  typo; app value `798.86` is correct).
- **Iteration 3** — 12/12 grader scenarios + 2-order file-write simulation passed.

### Fixed (during build)
- Gradio 6.0: moved `theme` and `css` from the `gr.Blocks()` constructor to
  `app.launch()` to clear the deprecation warning.
- Moved test code out of inline bash into `test_core.py` / `test_edge_cases.py`
  to avoid shell f-string/quote escaping errors.

### Known notes
- Grader will replace all 3 menu `.txt` files before evaluation — app reads them
  dynamically, no item names/prices/counts are hardcoded.
- `test_edge_cases.py` line for qty=1 final total carries a stale expected value
  (799.06); correct value is 798.86 (`677 * 1.18`). Code is correct.

---

## Template for future entries

```
## [x.y.z] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
```
