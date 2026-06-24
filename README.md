# SliceMatic — Pizza Ordering System

> FDE Academy Group 9 | Team Project | Single-outlet pizza delivery for SliceMatic, New Ashok Nagar, Delhi

---

## Project Overview

SliceMatic is a cart-based pizza ordering application built for a single-outlet delivery business. The project is delivered in stages — this README covers **Stage 1 (PRD)** and **Stage 2 (Gradio MVP)**.

| Stage | Deliverable | Status |
|-------|-------------|--------|
| 1 — PRD + Business Economics | PDF document | Done |
| 2 — Gradio MVP | Python app + menu files + order log | Done |

---

## Stage 2 Architecture

![Architecture Diagram](documents/architecture_stage2.png)

### Data Flow

![Data Flow Diagram](documents/dataflow_stage2.png)

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `Decimal` with `ROUND_HALF_UP` | Avoid floating-point money errors; rounding only at display/log |
| Named constants (`GST_RATE`, `DISCOUNT_RATE`, etc.) | No magic numbers; easy to audit |
| Menu loaded from `.txt` at runtime | Grader swaps files before testing — defensive parsing required |
| Cart-based (multi-line) vs single-pizza | Supports realistic orders; discount triggers on total qty across cart |
| GST calculated AFTER discount | `gst = (subtotal - discount) * 0.18` — matches PRD spec |
| Validation rejects without exception | All 8 edge cases return user-friendly error, never crash |

---

## Repository Structure

```
Slicematic/
├── README.md                          ← you are here
├── Requirements/
│   ├── PizzaFlow_Assignment_Brief_FDE.pdf
│   ├── SliceMatic_Business_Economics.pdf
│   └── Types_of_*.txt                 (reference menus)
├── documents/
│   ├── SliceMatic_PRD_Business_Economics.pdf   (Stage 1 deliverable)
│   └── Our Team.xlsx
├── gradio-MVP/                        (Stage 2 deliverable)
│   ├── app.py                         (main application ~1650 lines)
│   ├── Types_of_Base.txt              (5 items)
│   ├── Types_of_Pizza.txt             (8 items)
│   ├── Types_of_Toppings.txt          (16 items)
│   ├── requirements.txt               (gradio>=4.44)
│   ├── assets/
│   │   ├── pizza-hero.jpg
│   │   └── menu/                      (generated pizza images)
│   └── scripts/
│       ├── generate_menu_assets.py
│       └── download_pizza_photos.py
└── db/                                (Stage 3 prep — schema drafted)
    ├── master schema & data_entry.sql
    ├── transactions.sql
    ├── slicematic_full_seed_data.sql
    └── supabase.md
```

---

## Running the MVP

```bash
cd gradio-MVP
pip install -r requirements.txt
python app.py
```

The app launches on `http://localhost:7860` by default.

---

## Business Rules (Locked)

| Rule | Value |
|------|-------|
| GST rate | 18% (applied after discount) |
| Bulk discount | 10% when total qty ≥ 5 |
| Max quantity per line | 10 |
| Customer name | Alphabets + spaces, 2–40 chars |
| Phone | Exactly 10 digits, starts with 6/7/8/9 |
| Payment modes | Cash, Card, UPI |
| Menu format | `ID;Name;Price` per line in `.txt` |

---

## Stage 1 Summary

Delivered a Product Requirements Document covering:
- 21 functional requirements for the ordering flow
- Business economics: AOV Rs.850, contribution margin 69.3%, break-even 12 orders/day
- Complete pricing model with GST and discount rules
- Edge-case specifications (8 mandatory rejection scenarios)

---

## Team

See `documents/Our Team.xlsx` for roles and contributors.
