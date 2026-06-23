# SliceMatic Gradio MVP

This folder contains the Gradio MVP deliverable:

- `app.py`
- `Types_of_Base.txt`
- `Types_of_Pizza.txt`
- `Types_of_Toppings.txt`
- `orders_log.txt`

Run locally:

```bash
pip install -r requirements.txt
python app.py
```

The app loads menu files at runtime and supports a cart-based flow: pizza, base, one or more toppings, quantity per line, checkout, GST, discount, payment confirmation, and parseable order logging. If the grader swaps the three `.txt` files with new valid files using the same `ID;Name;Price` format, the UI will display the new menu without code changes.
