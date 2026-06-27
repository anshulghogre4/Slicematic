# SliceMatic Gradio MVP

This folder contains the original Gradio MVP deliverable. It is still useful as a lightweight prototype for menu-file parsing, validation, billing, and order-log evidence.

For the full Stage 3 application experience, use the Next.js full-stack app in `../FullStack`. That is the production-style customer/admin application with authentication screens, page navigation, admin configuration, APIs, and AI workflows.

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

The app loads menu files at runtime and supports a tabbed MVP flow: menu preview, cart builder, checkout, saved order evidence, and a read-only MVP admin snapshot. It covers pizza, base, one or more toppings, quantity per line, customer validation, delivery address validation, checkout, GST, discount, payment confirmation, and parseable order logging. If the grader swaps the three `.txt` files with new valid files using the same `ID;Name;Price` format, the UI will display the new menu without code changes.

Use this Gradio app as the MVP/prototype proof. Use the full-stack app for the final customer and admin review.
