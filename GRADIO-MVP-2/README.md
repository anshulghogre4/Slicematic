# SliceMatic — Gradio MVP (Stage 2)

Sequential 5-stage pizza-ordering web app built with Gradio.

## Files

- `app.py` — the application (single file)
- `Types_of_Base.txt`, `Types_of_Pizza.txt`, `Types_of_Toppings.txt` — menus, format `ID;Name;Price` (one per line)
- `orders_log.txt` — created/appended at runtime on each confirmed order
- `requirements.txt` — Python dependencies (`gradio 6.x`)
- `test_core.py`, `test_edge_cases.py` — verification tests

Tested on Python 3.13 / Gradio 6.19.

## Run

From inside this folder (so the menu files and order log resolve next to `app.py`):

### Using the included virtual environment

```bash
# Windows
.venv\Scripts\python.exe app.py

# macOS / Linux
.venv/bin/python app.py
```

### Or with your own environment

```bash
pip install -r requirements.txt
python app.py
```

The app launches at **http://localhost:7860**.

## Tests

```bash
python test_core.py        # file loading, validation, bill math, log format
python test_edge_cases.py  # ~72 edge cases with exact error-message checks
```

> Note: `test_edge_cases.py` reports 71/72. The one "failure" is a stale expected
> value in the test (qty=1 final `799.06`); the correct value is `798.86`
> (`677 * 1.18`). The app is correct.

## How it works

Five stages shown one at a time: **system check → customer details → quantity + menu selection → bill review → payment + receipt**.

- Menus are read from the three `.txt` files **at startup** — swap them with valid
  files in the same `ID;Name;Price` format and the UI adapts with no code changes.
- Business rules are module-level constants in `app.py`: GST 18% (applied after
  discount), 10% discount at quantity ≥ 5, max quantity 10.
- Every confirmed order is appended to `orders_log.txt`. If the write fails, an
  on-screen fallback receipt is shown instead of an error.
