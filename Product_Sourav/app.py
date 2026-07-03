import streamlit as st
import os
import math
from datetime import datetime
from html import escape as html_escape
from pathlib import Path
from urllib.parse import quote
import re

try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))

# ═══════════════════════════════════════════════════════════
# BUSINESS CONSTANTS (module-level, named variables)
# ═══════════════════════════════════════════════════════════

# Sentinel strings that mean "no value" — matched case-insensitively after strip
NULL_LIKE = {"na", "nan", "none", "null", "n/a", "undefined", ""}

GST_RATE = 0.18
DISCOUNT_RATE = 0.10
DISCOUNT_THRESHOLD = 5
MAX_QTY = 10
MIN_QTY = 1
PAYMENT_MODES = ["Cash", "Card", "UPI"]
DB_PARAMS = {
    "host": "aws-1-ap-northeast-1.pooler.supabase.com",
    "port": 5432,
    "database": "postgres",
    "user": "postgres.bhblbrdplosmsrkoazdn",
    "password": "Fde#gr9@2026"
}

# Asset directory — resolved next to app.py so the folder is portable
APP_DIR = Path(__file__).resolve().parent
MENU_IMAGE_DIR = APP_DIR / "assets" / "menu"

PAYMENT_MESSAGES = {
    "Cash": "Cash payment selected. Please collect payment at delivery/counter.",
    "Card": "Card payment selected. Please process on POS.",
    "UPI": "UPI payment selected. Please confirm receipt before fulfillment.",
}


def item_image_url(item_id, fallback_id=None):
    """Return a Gradio-served URL for an item's menu image.

    Keyed by item ID (e.g. 'B1', 'P3'). If no image is found for `item_id`,
    tries `fallback_id` before giving up and returning ''. This handles cases
    where menu files are extended with new IDs that have no dedicated image.
    """
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = MENU_IMAGE_DIR / f"{item_id}.{ext}"
        if p.exists():
            return f"/gradio_api/file={quote(str(p))}"
    if fallback_id and fallback_id != item_id:
        for ext in ("png", "jpg", "jpeg", "webp"):
            p = MENU_IMAGE_DIR / f"{fallback_id}.{ext}"
            if p.exists():
                return f"/gradio_api/file={quote(str(p))}"
    return ""


def base_image_url(item_id):
    """Return image URL for a base item, falling back to B1 (Thin Crust) if no specific image exists."""
    return item_image_url(item_id, fallback_id="B1")


def pizza_image_url(item_id):
    """Return image URL for a pizza item, falling back to P1 (Margherita) if no specific image exists."""
    return item_image_url(item_id, fallback_id="P1")



# ═══════════════════════════════════════════════════════════
# MENU FILE LOADER
# ═══════════════════════════════════════════════════════════
def _is_null_like(value: str) -> bool:
    """Return True if a stripped string field represents a missing/sentinel value.

    Catches: empty string, bare quotes (\'\' or "\"\""), NA, NaN, None, Null, N/A,
    undefined — all matched case-insensitively.
    """
    v = value.strip().strip("'\"")
    return v.lower() in NULL_LIKE


# Menu items are strictly loaded from database at startup.


def load_menu_from_db():
    import psycopg2
    bases = []
    pizzas = []
    toppings = []
    
    conn = psycopg2.connect(**DB_PARAMS)
    cursor = conn.cursor()
    try:
        # load bases
        cursor.execute('SELECT base_id, base_name, price FROM "slicematic"."pizza_bases" ORDER BY base_id')
        seen_bases = set()
        for bid_raw, name_raw, price_raw in cursor.fetchall():
            bid = str(bid_raw).strip()
            name = str(name_raw or "Unnamed").strip()
            price = float(price_raw) if price_raw is not None else 0.0
            if not bid or _is_null_like(bid) or _is_null_like(name) or price < 0:
                bases.append((f"B{bid or '?'}", "Unnamed", 0.0))
                continue
            row_key = (f"B{bid}", name, price)
            if row_key in seen_bases:
                continue
            seen_bases.add(row_key)
            bases.append((f"B{bid}", name, price))
            
        # load pizzas
        cursor.execute('SELECT pizza_type_id, pizza_name, price FROM "slicematic"."pizza_types" ORDER BY pizza_type_id')
        seen_pizzas = set()
        for pid_raw, name_raw, price_raw in cursor.fetchall():
            pid = str(pid_raw).strip()
            name = str(name_raw or "Unnamed").strip()
            price = float(price_raw) if price_raw is not None else 0.0
            if not pid or _is_null_like(pid) or _is_null_like(name) or price < 0:
                pizzas.append((f"P{pid or '?'}", "Unnamed", 0.0))
                continue
            row_key = (f"P{pid}", name, price)
            if row_key in seen_pizzas:
                continue
            seen_pizzas.add(row_key)
            pizzas.append((f"P{pid}", name, price))
            
        # load toppings
        cursor.execute('SELECT topping_id, topping_name, price FROM "slicematic"."toppings" ORDER BY topping_id')
        seen_toppings = set()
        for tid_raw, name_raw, price_raw in cursor.fetchall():
            tid = str(tid_raw).strip()
            name = str(name_raw or "Unnamed").strip()
            price = float(price_raw) if price_raw is not None else 0.0
            if not tid or _is_null_like(tid) or _is_null_like(name) or price < 0:
                toppings.append((f"T{tid or '?'}", "Unnamed", 0.0))
                continue
            row_key = (f"T{tid}", name, price)
            if row_key in seen_toppings:
                continue
            seen_toppings.add(row_key)
            toppings.append((f"T{tid}", name, price))
    finally:
        cursor.close()
        conn.close()
        
    return bases, pizzas, toppings

# Load at startup — strictly load from PostgreSQL database
try:
    print("[INFO] Attempting to load menu from PostgreSQL database...")
    bases, pizzas, toppings = load_menu_from_db()
    print(f"[INFO] Loaded from DB: {len(bases)} bases, {len(pizzas)} pizzas, {len(toppings)} toppings.")
    SYSTEM_READY = (
        any(p > 0 for _, _, p in bases)
        and any(p > 0 for _, _, p in pizzas)
        and any(p > 0 for _, _, p in toppings)
    )
except Exception as db_err:
    print(f"[ERROR] Failed to load menu from DB: {db_err}")
    bases, pizzas, toppings = [], [], []
    SYSTEM_READY = False


# ═══════════════════════════════════════════════════════════
# VALIDATION FUNCTIONS
# ═══════════════════════════════════════════════════════════
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


def validate_email(raw):
    s = (raw or "").strip()
    if not s:
        return None, ""
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", s):
        return None, "Please enter a valid email address (e.g. user@example.com)."
    return s, ""


def validate_date(raw):
    s = (raw or "").strip()
    if not s:
        return None, ""
    try:
        dt = datetime.strptime(s, "%Y-%m-%d").date()
        return s, ""
    except ValueError:
        return None, "Birth Date must be in YYYY-MM-DD format (e.g. 1995-06-15)."


def validate_quantity(raw):
    if isinstance(raw, (int, float)):
        q = int(raw)
        if q <= 0:
            return None, "Quantity must be between 1 and 10."
        if q > MAX_QTY:
            return None, "Maximum outlet capacity is 10 pizzas per order."
        return q, ""
    s = str(raw or "").strip()
    if not s:
        return None, "Please enter a quantity."
    if "." in s:
        return None, "Quantity must be a whole number."
    try:
        q = int(s)
    except ValueError:
        return None, "Quantity must be a whole number."
    if q <= 0:
        return None, "Quantity must be greater than 0."
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


def validate_toppings_checkbox(selected, items):
    if not selected:
        return [], "Please select at least one topping."
    indices = []
    for s in selected:
        try:
            n = int(s.split(".")[0])
            indices.append(n - 1)
        except Exception:
            pass
    if not indices:
        return [], "Please select at least one topping."
    return indices, ""


def _render_cart_item_html(item):
    """Render a single cart item's detail block (no wrapper)."""
    b = bases[item["base_idx"]]
    p = pizzas[item["pizza_idx"]]
    topping_list = [toppings[t] for t in item["topping_idx"]]
    unit = b[2] + p[2] + sum(t[2] for t in topping_list)
    qty = item["quantity"]
    sub = unit * qty

    topping_lines = "".join(
        f'<div style="display:flex;justify-content:space-between;">'
        f'<span style="color:#64748b;">&nbsp;&nbsp;+ {html_escape(t[1])}</span>'
        f'<span style="color:#64748b;">&#8377;{t[2]:.2f}</span></div>'
        for t in topping_list
    )
    if not topping_lines:
        topping_lines = '<div style="color:#94a3b8;font-style:italic;">&nbsp;&nbsp;No toppings</div>'

    return f"""
    <div style="padding-bottom:8px; margin-bottom:4px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong class="sm-cart-title">{qty}x {html_escape(p[1])}</strong>
            <span class="sm-cart-title" style="font-weight:700;">&#8377;{sub:.2f}</span>
        </div>
        <div style="font-size:13px; margin-top:4px;">
            <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748b;">Base: {html_escape(b[1])}</span>
                <span style="color:#64748b;">&#8377;{b[2]:.2f}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748b;">Pizza: {html_escape(p[1])}</span>
                <span style="color:#64748b;">&#8377;{p[2]:.2f}</span>
            </div>
            {topping_lines}
            <div style="display:flex;justify-content:space-between; border-top:1px dotted #e2e8f0; margin-top:4px; padding-top:4px;">
                <span style="font-weight:600;color:#334155;">Unit price</span>
                <span style="font-weight:600;color:#334155;">&#8377;{unit:.2f}</span>
            </div>
        </div>
    </div>"""


def _render_cart_totals_html(cart):
    """Render the cart totals row (or empty-cart placeholder)."""
    if not cart:
        return (
            '<div style="padding:20px; border:1px dashed #cbd5e1; border-radius:8px;'
            ' text-align:center; color:#64748b;">Your cart is empty<br>'
            '<span style="font-size:12px;">Add a pizza combination to begin.</span></div>'
        )
    total = 0
    total_qty = 0
    for item in cart:
        b = bases[item["base_idx"]]
        p = pizzas[item["pizza_idx"]]
        unit = b[2] + p[2] + sum(toppings[t][2] for t in item["topping_idx"])
        total += unit * item["quantity"]
        total_qty += item["quantity"]
    return f"""
    <div style="margin-top:16px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-weight:700; color:var(--body-text-color);">
        <span>Cart Total <span style="font-size:12px;font-weight:normal;color:#64748b;">(Excl. GST)</span></span>
        <span>&#8377;{total:.2f}</span>
    </div>
    <div style="text-align:center; font-size:12px; color:#64748b; margin-top:8px;">{total_qty}/10 pizzas selected</div>"""


def render_cart_html(cart):
    if not cart:
        return '<div style="padding:20px; border:1px dashed #cbd5e1; border-radius:8px; text-align:center; color:#64748b;">Your cart is empty<br><span style="font-size:12px;">Add a pizza combination to begin.</span></div>'
        
    lines = []
    total = 0
    total_qty = 0
    for i, item in enumerate(cart):
        b = bases[item["base_idx"]]
        p = pizzas[item["pizza_idx"]]
        topping_list = [toppings[t] for t in item["topping_idx"]]
        unit = b[2] + p[2] + sum(t[2] for t in topping_list)
        qty = item["quantity"]
        sub = unit * qty
        total += sub
        total_qty += qty

        topping_lines = "".join(
            f'<div style="display:flex;justify-content:space-between;">'
            f'<span style="color:#64748b;">&nbsp;&nbsp;+ {html_escape(t[1])}</span>'
            f'<span style="color:#64748b;">&#8377;{t[2]:.2f}</span></div>'
            for t in topping_list
        )
        if not topping_lines:
            topping_lines = '<div style="color:#94a3b8;font-style:italic;">&nbsp;&nbsp;No toppings</div>'

        lines.append(f"""
        <div class="sm-cart-item" style="padding-bottom:8px; border-bottom:1px dashed #e2e8f0; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <strong class="sm-cart-title">{qty}x {html_escape(p[1])}</strong>
                <span class="sm-cart-title" style="font-weight:700;">&#8377;{sub:.2f}</span>
            </div>
            <div style="font-size:13px; margin-top:4px;">
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:#64748b;">Base: {html_escape(b[1])}</span>
                    <span style="color:#64748b;">&#8377;{b[2]:.2f}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:#64748b;">Pizza: {html_escape(p[1])}</span>
                    <span style="color:#64748b;">&#8377;{p[2]:.2f}</span>
                </div>
                {topping_lines}
                <div style="display:flex;justify-content:space-between; border-top:1px dotted #e2e8f0; margin-top:4px; padding-top:4px;">
                    <span style="font-weight:600;color:#334155;">Unit price</span>
                    <span style="font-weight:600;color:#334155;">&#8377;{unit:.2f}</span>
                </div>
            </div>
        </div>
        """)
        
    lines.append(f"""
    <div style="margin-top:16px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-weight:700; color:var(--body-text-color);">
        <span>Cart Total <span style="font-size:12px;font-weight:normal;color:#64748b;">(Excl. GST)</span></span>
        <span>&#8377;{total:.2f}</span>
    </div>
    <div style="text-align:center; font-size:12px; color:#64748b; margin-top:8px;">{total_qty}/10 pizzas selected</div>
    """)
    return '<div class="sm-cart-scroll">' + "".join(lines) + '</div>'


# ═══════════════════════════════════════════════════════════
# BILL COMPUTATION & RENDERING
# ═══════════════════════════════════════════════════════════
def compute_bill(cart):
    subtotal = 0
    total_qty = 0
    for item in cart:
        unit = bases[item["base_idx"]][2] + pizzas[item["pizza_idx"]][2]
        for t_idx in item["topping_idx"]:
            unit += toppings[t_idx][2]
        subtotal += unit * item["quantity"]
        total_qty += item["quantity"]
        
    discount = subtotal * DISCOUNT_RATE if total_qty >= DISCOUNT_THRESHOLD else 0
    taxable = subtotal - discount
    gst = taxable * GST_RATE
    final_total = taxable + gst
    return dict(
        subtotal=subtotal, discount=discount,
        taxable=taxable, gst=gst, final_total=final_total,
        total_qty=total_qty
    )


def render_bill_html(state, show_payment=False):
    cart = state.get("cart", [])
    if not cart:
        return ""
    bill = compute_bill(cart)
    qty = bill["total_qty"]

    discount_row = ""
    if qty >= DISCOUNT_THRESHOLD:
        discount_row = f"""
        <tr>
          <td class="sm-bill-cell sm-bill-discount">Discount (10% OFF)</td>
          <td class="sm-bill-val sm-bill-discount">
            -&#8377;{bill['discount']:,.2f}
          </td>
        </tr>"""

    payment_badge = ""
    if show_payment and state.get("payment_mode"):
        payment_badge = f"""
        <tr>
          <td colspan="2" style="padding:8px 16px; text-align:right;">
            <span class="sm-bill-badge">
              Paid via {html_escape(state['payment_mode'])}
            </span>
          </td>
        </tr>"""

    items_html = ""
    for item in cart:
        b = bases[item["base_idx"]]
        p = pizzas[item["pizza_idx"]]
        t_names = ", ".join([toppings[t][1] for t in item["topping_idx"]])
        unit = b[2] + p[2] + sum([toppings[t][2] for t in item["topping_idx"]])
        item_qty = item["quantity"]
        
        items_html += f"""
        <tr class="sm-bill-row">
          <td class="sm-bill-cell"><strong>{html_escape(p[1])}</strong> ({html_escape(b[1])})<br><span style="font-size:12px;color:#64748b;">+ {html_escape(t_names)}</span></td>
          <td class="sm-bill-val">x{item_qty}<br>&#8377;{unit * item_qty:,.2f}</td>
        </tr>
        """

    return f"""
    <div class="sm-bill-wrapper">
      <table class="sm-bill-table">
        {items_html}
        <tr>
          <td class="sm-bill-cell">Total Items</td>
          <td class="sm-bill-val">{qty}</td>
        </tr>
        <tr class="sm-bill-row-top">
          <td class="sm-bill-cell sm-bill-bold">Subtotal</td>
          <td class="sm-bill-val sm-bill-bold">&#8377;{bill['subtotal']:,.2f}</td>
        </tr>
        {discount_row}
        <tr>
          <td class="sm-bill-cell">GST (18%)</td>
          <td class="sm-bill-val">&#8377;{bill['gst']:,.2f}</td>
        </tr>
        <tr class="sm-bill-total-row">
          <td class="sm-bill-total-cell">
            Final Payable<br>
            <span class="sm-bill-tax-note">Includes all taxes and charges</span>
          </td>
          <td class="sm-bill-total-val">
            &#8377;{bill['final_total']:,.2f}
          </td>
        </tr>
        {payment_badge}
      </table>
    </div>"""


# ═══════════════════════════════════════════════════════════
# ORDER LOG
# ═══════════════════════════════════════════════════════════
def build_order_line(state):
    cart = state.get("cart", [])
    if not cart:
        return ""
    bill = compute_bill(cart)
    lines = []
    for item in cart:
        b = bases[item["base_idx"]]
        p = pizzas[item["pizza_idx"]]
        t_ids = ",".join([toppings[t][0] for t in item["topping_idx"]])
        t_names = ",".join([toppings[t][1] for t in item["topping_idx"]])
        t_prices = sum([toppings[t][2] for t in item["topping_idx"]])
        unit = b[2] + p[2] + t_prices
        
        lines.append(
            f"ORDER|{state['timestamp']}|{state['name']}|{state['phone']}|"
            f"{b[0]}|{b[1]}|{b[2]:.2f}|"
            f"{p[0]}|{p[1]}|{p[2]:.2f}|"
            f"{t_ids}|{t_names}|{t_prices:.2f}|"
            f"{item['quantity']}|{unit:.2f}|{unit * item['quantity']:.2f}|"
            f"{bill['discount']:.2f}|{bill['gst']:.2f}|{bill['final_total']:.2f}|"
            f"{state['payment_mode']}"
        )
    return "\n".join(lines)


def save_order_to_db(st, bill):
    import psycopg2
    import uuid
    from datetime import datetime
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return False
        
    try:
        # 1. Split name into first and last name
        name_parts = st["name"].strip().split(maxsplit=1)
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Check if customer already exists by mobile number
        cursor.execute('SELECT customer_id FROM "slicematic"."customer" WHERE mobile_number = %s LIMIT 1', (st["phone"],))
        row = cursor.fetchone()
        if row:
            customer_id = row[0]
        else:
            customer_id = str(uuid.uuid4())
            bd = st.get("birth_date")
            if bd:
                bd = bd.strip()
            if not bd:
                bd = None
            cursor.execute('''
                INSERT INTO "slicematic"."customer" (
                    customer_id, first_name, last_name, email, mobile_number, birth_date,
                    gender, city, state, country, registration_date, preferred_contact_channel, marketing_opt_in
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                customer_id, first_name, last_name, st.get("email") or None, st["phone"], bd,
                st.get("gender") or None, st.get("city") or None, st.get("state") or None, st.get("country") or None,
                datetime.now(), st.get("preferred_contact_channel") or None, st.get("marketing_opt_in")
            ))
            
        # 2. Insert into orders table
        order_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO "slicematic"."orders" (
                order_id, customer_id, order_datetime, order_status, payment_method,
                subtotal_amount, discount_amount, tax_amount, delivery_charge, final_amount,
                city, coupon_code
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            order_id, customer_id, datetime.now(), 'Confirmed', st["payment_mode"],
            bill["subtotal"], bill["discount"], bill["gst"], 0.00, bill["final_total"],
            None, None
        ))
        
        # 3. Insert items and toppings
        for item in st["cart"]:
            order_item_id = str(uuid.uuid4())
            
            # Extract database integer IDs from prefixed string IDs (e.g. 'B1' -> 1)
            base_id = int(bases[item["base_idx"]][0][1:])
            pizza_type_id = int(pizzas[item["pizza_idx"]][0][1:])
            
            base_price = bases[item["base_idx"]][2]
            pizza_price = pizzas[item["pizza_idx"]][2]
            
            topping_prices = 0.0
            for t_idx in item["topping_idx"]:
                topping_prices += toppings[t_idx][2]
                
            item_subtotal = (base_price + pizza_price + topping_prices) * item["quantity"]
            
            cursor.execute('''
                INSERT INTO "slicematic"."order_item" (
                    order_item_id, order_id, pizza_type_id, base_id, quantity,
                    base_price, pizza_price, line_total
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                order_item_id, order_id, pizza_type_id, base_id, item["quantity"],
                base_price, pizza_price, item_subtotal
            ))
            
            for t_idx in item["topping_idx"]:
                t_id = int(toppings[t_idx][0][1:])
                t_price = toppings[t_idx][2]
                cursor.execute('''
                    INSERT INTO "slicematic"."order_item_topping" (
                        order_item_id, topping_id, topping_price
                    ) VALUES (%s, %s, %s)
                ''', (
                    order_item_id, t_id, t_price
                ))
                
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Failed to save order transaction: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════
def format_menu(items, label):
    lines = [f"**{label}**\n"]
    for i, (_, name, price) in enumerate(items, 1):
        lines.append(f"{i}. {name} — ₹{price:.2f}")
    return "\n".join(lines)


def render_steps(active):
    """Render the 5-circle step indicator. `active` is 1..5; earlier steps marked done."""
    parts = ['<div class="sm-steps">']
    for n in range(1, 6):
        if n < active:
            cls = "sm-step-dot sm-step-done"
        elif n == active:
            cls = "sm-step-dot sm-step-active"
        else:
            cls = "sm-step-dot sm-step-pending"
        parts.append(f'<div class="{cls}">{n}</div>')
        if n < 5:
            line_cls = "sm-step-line sm-step-line-done" if n < active else "sm-step-line"
            parts.append(f'<div class="{line_cls}"></div>')
    parts.append('</div>')
    parts.append(f'<div class="sm-step-label">Step {active} of 5</div>')
    return "".join(parts)


def _img_block(item_id, kind="square", fallback_id=None):
    """Image tile for an item — uses item_image_url with optional fallback; falls back to pizza emoji on miss."""
    url = item_image_url(item_id, fallback_id=fallback_id)
    cls = "sm-img" if kind == "square" else "sm-thumb"
    if url:
        return f'<div class="{cls}"><img src="{url}" alt=""></div>'
    return f'<div class="{cls}"><span class="sm-img-placeholder">🍕</span></div>'


def render_base_cards(items):
    """3-column grid of base cards: square image + name + price + selection number."""
    cards = []
    for i, (item_id, name, price) in enumerate(items, 1):
        if price <= 0:
            cards.append(
                '<div class="sm-card-item sm-card-unavailable">'
                + _img_block(item_id, "square", fallback_id="B1")
                + f'<div class="sm-item-name"><span class="sm-num sm-num-disabled">{i}</span>{html_escape(name)}</div>'
                + '<div class="sm-item-price" style="color:#94a3b8;">Unavailable</div>'
                + '</div>'
            )
            continue
        cards.append(
            '<div class="sm-card-item">'
            + _img_block(item_id, "square", fallback_id="B1")
            + f'<div class="sm-item-name"><span class="sm-num">{i}</span>{html_escape(name)}</div>'
            + f'<div class="sm-item-price">₹{price:.2f}</div>'
            + '</div>'
        )
    return (
        '<div class="sm-primary-text" style="font-weight:600;margin:8px 0 4px;">Choose your base</div>'
        '<div class="sm-base-grid">' + "".join(cards) + '</div>'
    )


def render_pizza_cards(items):
    """Grid of pizza cards — same vertical layout as base cards."""
    cards = []
    for i, (item_id, name, price) in enumerate(items, 1):
        if price <= 0:
            cards.append(
                '<div class="sm-card-item sm-card-unavailable">'
                + _img_block(item_id, "square", fallback_id="P1")
                + f'<div class="sm-item-name"><span class="sm-num sm-num-disabled">{i}</span>{html_escape(name)}</div>'
                + '<div class="sm-item-price" style="color:#94a3b8;">Unavailable</div>'
                + '</div>'
            )
            continue
        cards.append(
            '<div class="sm-card-item">'
            + _img_block(item_id, "square", fallback_id="P1")
            + f'<div class="sm-item-name"><span class="sm-num">{i}</span>{html_escape(name)}</div>'
            + f'<div class="sm-item-price">₹{price:.2f}</div>'
            + '</div>'
        )
    return (
        '<div class="sm-primary-text" style="font-weight:600;margin:8px 0 4px;">Choose your pizza</div>'
        '<div class="sm-base-grid">' + "".join(cards) + '</div>'
    )


def render_topping_pills(items):
    """Numbered pills (no image — matches the design's Stage 3 toppings row).

    Items with price <= 0 (unavailable/null-like name or price) are hidden entirely,
    consistent with how they are excluded from the CheckboxGroup choices.
    """
    pills = []
    for i, (_id, name, price) in enumerate(items, 1):
        if price <= 0:
            continue  # hide unavailable toppings — do not show greyed pill
        pills.append(
            f'<span class="sm-pill"><span class="sm-num">{i}</span>'
            f'{html_escape(name)} <span class="sm-topping-price">+₹{price:.2f}</span></span>'
        )
    return (
        '<div class="sm-primary-text" style="font-weight:600;margin:8px 0 4px;">Choose your topping</div>'
        '<div class="sm-topping-pills">' + "".join(pills) + '</div>'
    )


def render_sidebar(step):
    steps = [
        (1, "Customer Details", "◎"),
        (2, "Menu Selection", "🍕"),
        (3, "Bill Summary", "🧾"),
        (4, "Payment", "💳"),
        (5, "Receipt", "✅"),
    ]
    
    subtitle = {
        1: "Tell us who you are",
        2: "Pick your base, pizza & toppings",
        3: "Review your order total",
        4: "Choose how to pay",
        5: "Order confirmed!"
    }[step]
    
    html = (
        f'<div class="sm-sidebar">'
        f'<div class="sm-step-text" style="font-size:14px; font-weight:700; margin-left:12px;">Step {step} of 5</div>'
        f'<div class="sm-subtitle" style="font-size:12px; margin-left:12px; margin-bottom:24px;">{subtitle}</div>'
        f'<div style="display:flex; flex-direction:column; gap:8px;">'
    )
    
    for s_num, s_name, s_icon in steps:
        active_class = "sm-sidebar-active" if s_num == step else ""
        html += (
            f'<div class="sm-sidebar-item {active_class}">'
            f'<span style="margin-right:12px; font-size:16px;">{s_icon}</span> {s_name}'
            f'</div>'
        )
        
    html += "</div></div>"
    return html


def err(msg):
    if not msg:
        return ""
    return f"<p class='sm-error-text' style='font-size:13px; margin:4px 0; color:#dc2626 !important;'>* {html_escape(msg)}</p>"


def get_base_gallery_items():
    items = []
    for i, (bid, name, price) in enumerate(bases, 1):
        img_path = ""
        for ext in ("png", "jpg", "jpeg", "webp"):
            p = MENU_IMAGE_DIR / f"{bid}.{ext}"
            if p.exists():
                img_path = str(p)
                break
        if not img_path:
            p = MENU_IMAGE_DIR / "B1.png"
            if p.exists():
                img_path = str(p)
        status = f"₹{price:.2f}" if price > 0 else "Unavailable"
        items.append((img_path, f"{i}. {name} ({status})"))
    return items


def get_pizza_gallery_items():
    items = []
    for i, (pid, name, price) in enumerate(pizzas, 1):
        img_path = ""
        for ext in ("png", "jpg", "jpeg", "webp"):
            p = MENU_IMAGE_DIR / f"{pid}.{ext}"
            if p.exists():
                img_path = str(p)
                break
        if not img_path:
            p = MENU_IMAGE_DIR / "P1.jpg"
            if p.exists():
                img_path = str(p)
        status = f"₹{price:.2f}" if price > 0 else "Unavailable"
        items.append((img_path, f"{i}. {name} ({status})"))
    return items


def initial_state():
    return {
        "stage": 2,
        "name": "",
        "phone": "",
        "timestamp": datetime.now(IST).isoformat(),
        "cart": [],
        "payment_mode": "",
        "email": "",
        "birth_date": None,
        "gender": "",
        "city": "",
        "state": "",
        "country": "",
        "preferred_contact_channel": "",
        "marketing_opt_in": True,
    }


def check_customer_exists(phone):
    import psycopg2
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()
        cursor.execute('SELECT first_name, last_name FROM "slicematic"."customer" WHERE mobile_number = %s LIMIT 1', (phone,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            first = row[0] or ""
            last = row[1] or ""
            name = (first + " " + last).strip() or "Valued Customer"
            return True, name
    except Exception as e:
        print(f"[WARN] Database connection failed while checking customer: {e}")
    return False, None


# ═══════════════════════════════════════════════════════════
# STREAMLIT APPLICATION
# ═══════════════════════════════════════════════════════════
import streamlit as st
DESIGN_CSS = ""

# Initialize Session State
if "state" not in st.session_state:
    st.session_state["state"] = initial_state()
if "selected_base_idx" not in st.session_state:
    st.session_state["selected_base_idx"] = None
if "selected_pizzas" not in st.session_state:
    st.session_state["selected_pizzas"] = {}
if "selected_toppings" not in st.session_state:
    st.session_state["selected_toppings"] = []
if "order_quantity" not in st.session_state:
    st.session_state["order_quantity"] = 1
if "show_first_timer" not in st.session_state:
    st.session_state["show_first_timer"] = False
if "receipt_html" not in st.session_state:
    st.session_state["receipt_html"] = ""

# Text input state persistence keys
state = st.session_state["state"]
if "name_input" not in st.session_state:
    st.session_state["name_input"] = state["name"]
if "phone_input" not in st.session_state:
    st.session_state["phone_input"] = state["phone"]
if "email_input" not in st.session_state:
    st.session_state["email_input"] = state["email"]
if "birth_date_input" not in st.session_state:
    st.session_state["birth_date_input"] = state["birth_date"] or ""
if "city_input" not in st.session_state:
    st.session_state["city_input"] = state["city"]
if "state_input" not in st.session_state:
    st.session_state["state_input"] = state["state"]
if "country_input" not in st.session_state:
    st.session_state["country_input"] = state["country"]

# Page Config
st.set_page_config(page_title="SliceMatic", page_icon="🍕", layout="wide")

# Styling system css injection
st.html(f"<style>{DESIGN_CSS}</style>")

state = st.session_state["state"]

# Sidebar column
with st.sidebar:
    st.markdown(
        '<div style="display:flex;align-items:center;gap:10px;padding:16px 8px;margin-bottom:24px;">'
        '<span style="font-size:28px;">🍕</span>'
        '<span class="sm-logo-text" style="font-size:22px;font-weight:700;color:#0F172A;">SliceMatic</span>'
        '</div>',
        unsafe_allow_html=True
    )
    
    step = 1
    if state["stage"] == 2:
        step = 1
    elif state["stage"] == 3:
        step = 2
    elif state["stage"] == 4:
        step = 3
    elif state["stage"] == 5:
        step = 4
    elif state["stage"] >= 6:
        step = 5
        
    st.markdown(render_sidebar(step), unsafe_allow_html=True)

# Main Stage Router
if not SYSTEM_READY:
    missing_lines = []
    for fname, items, label in [
        ("pizza_bases", bases, "bases"),
        ("pizza_types", pizzas, "pizzas"),
        ("toppings", toppings, "toppings"),
    ]:
        if not items:
            missing_lines.append(
                f'<div style="font-size:14px;margin:6px 0;color:#dc2626;">'
                f'<span style="font-weight:700;">✗</span> '
                f'<strong>{html_escape(fname)}</strong> — table missing or empty</div>'
            )
        else:
            missing_lines.append(
                f'<div style="font-size:14px;margin:6px 0;color:#24963F;">'
                f'<span style="font-weight:700;">✓</span> '
                f'<strong>{html_escape(fname)}</strong> — {len(items)} {label} loaded</div>'
            )
    
    st.markdown(
        '<div style="text-align:center; padding:80px 20px;">'
        '  <div style="width:96px; height:96px; background:#fee2e2; border-radius:50%;'
        '              margin:0 auto 32px; display:flex; align-items:center;'
        '              justify-content:center; font-size:44px;">⚠️</div>'
        '  <h1 class="sm-headline" style="font-size:28px; line-height:1.2;">'
        '    SliceMatic could not start</h1>'
        '  <p class="sm-subtitle" style="margin-bottom:24px;">One or more menu files are missing or empty.</p>'
        '  <div class="sm-card" style="max-width:480px;margin:0 auto;text-align:left;padding:20px;">'
        + "".join(missing_lines) +
        '  </div>'
        '</div>',
        unsafe_allow_html=True
    )
    st.stop()

else:
    # ── Stage 2: Customer details intake ──
    if state["stage"] == 2:
        st.html(
            '<div style="text-align:center;margin:24px 0 8px;">'
            '<h1 class="sm-headline">Let\'s get started</h1>'
            '<p class="sm-subtitle">We need a few details to process your order.</p>'
            '</div>'
        )
        
        _, center_col, _ = st.columns([1, 2, 1])
        with center_col:
            st.text_input("Your Name", placeholder="e.g. Aman Sharma", key="name_input")
            st.text_input("Mobile Number (+91)", placeholder="10-digit number", key="phone_input")
            
            if st.session_state["show_first_timer"]:
                st.html("<div style='margin:16px 0 8px; border-left:4px solid #b7102a; padding-left:8px;'><h3 style='margin:0;font-weight:600;'>First-time Customer Details</h3><p style='margin:0;font-size:12px;color:#64748b;'>Welcome to SliceMatic! Since this is your first order, please help us complete your profile.</p></div>")
                
                st.text_input("Email Address", placeholder="e.g. yourname@domain.com", key="email_input")
                st.text_input("Birth Date (YYYY-MM-DD)", placeholder="e.g. 1995-06-15", key="birth_date_input")
                
                g_idx = None if not state["gender"] else ["Male", "Female", "Other"].index(state["gender"])
                gender_val = st.radio("Gender", options=["Male", "Female", "Other"], index=g_idx)
                st.text_input("City", placeholder="e.g. Bangalore", key="city_input")
                st.text_input("State", placeholder="e.g. Karnataka", key="state_input")
                st.text_input("Country", placeholder="e.g. India", key="country_input")
                
                channel_choices = ["Email", "SMS", "Phone"]
                c_idx = channel_choices.index(state["preferred_contact_channel"]) if state["preferred_contact_channel"] else 0
                channel_val = st.selectbox("Preferred Contact Channel", options=channel_choices, index=c_idx)
                opt_in_val = st.checkbox("I would like to receive marketing communications", value=state["marketing_opt_in"])
                
                if st.button("Submit Profile & Continue →", type="primary", use_container_width=True):
                    name, ne = validate_name(st.session_state["name_input"])
                    phone, pe = validate_phone(st.session_state["phone_input"])
                    email, ee = validate_email(st.session_state["email_input"])
                    birth_date, de = validate_date(st.session_state["birth_date_input"])
                    
                    has_error = False
                    if not name:
                        st.error(ne)
                        has_error = True
                    if not phone:
                        st.error(pe)
                        has_error = True
                    if st.session_state["email_input"] and email is None:
                        st.error(ee)
                        has_error = True
                    if st.session_state["birth_date_input"] and birth_date is None:
                        st.error(de)
                        has_error = True
                        
                    if not has_error:
                        state["name"] = name
                        state["phone"] = phone
                        state["email"] = email
                        state["birth_date"] = birth_date
                        state["gender"] = gender_val
                        state["city"] = st.session_state["city_input"]
                        state["state"] = st.session_state["state_input"]
                        state["country"] = st.session_state["country_input"]
                        state["preferred_contact_channel"] = channel_val
                        state["marketing_opt_in"] = opt_in_val
                        state["stage"] = 3
                        st.session_state["show_first_timer"] = False
                        st.rerun()
            else:
                if st.button("Continue →", type="primary", use_container_width=True):
                    name, ne = validate_name(st.session_state["name_input"])
                    phone, pe = validate_phone(st.session_state["phone_input"])
                    
                    has_error = False
                    if not name:
                        st.error(ne)
                        has_error = True
                    if not phone:
                        st.error(pe)
                        has_error = True
                        
                    if not has_error:
                        state["name"] = name
                        state["phone"] = phone
                        exists, db_name = check_customer_exists(phone)
                        if exists:
                            state["stage"] = 3
                            st.rerun()
                        else:
                            st.session_state["show_first_timer"] = True
                            st.rerun()

    # ── Stage 3: Build Order & Cart ──
    elif state["stage"] == 3:
        st.html('<h1 class="sm-headline" style="text-align:center;">Build Your Order</h1>')
        
        # 1. Base selection
        st.html('<div class="sm-primary-text" style="font-weight:600;margin:16px 0 4px;">Choose your base</div>')
        base_cols = st.columns(3)
        for idx, (bid, name, price) in enumerate(bases):
            col = base_cols[idx % 3]
            with col:
                with st.container(border=True):
                    img_path = MENU_IMAGE_DIR / f"{bid}.png"
                    if not img_path.exists():
                        img_path = MENU_IMAGE_DIR / "B1.png"
                    st.image(str(img_path), width=150)
                    st.markdown(f"<div style='font-weight:600; text-align:center; font-size:14px; padding:4px 8px 0 8px;'>{name}</div>", unsafe_allow_html=True)
                    price_str = f"₹{price:.2f}" if price > 0 else "Unavailable"
                    st.markdown(f"<div style='color:#b7102a; font-weight:700; text-align:center; font-size:12px; margin-bottom:8px; padding:0 8px;'>{price_str}</div>", unsafe_allow_html=True)
                    
                    if price > 0:
                        if st.session_state["selected_base_idx"] == idx:
                            st.button("✓ Selected", key=f"base_sel_{idx}", type="primary", use_container_width=True)
                        else:
                            if st.button("Select", key=f"base_sel_{idx}", use_container_width=True):
                                st.session_state["selected_base_idx"] = idx
                                st.rerun()
                    else:
                        st.button("Unavailable", key=f"base_sel_{idx}", disabled=True, use_container_width=True)

        sel_base_idx = st.session_state["selected_base_idx"]
        if sel_base_idx is not None:
            name, price = bases[sel_base_idx][1], bases[sel_base_idx][2]
            st.html(f"<div style='padding:8px 12px; background:#dcf5e0; border-left:4px solid #22c55e; border-radius:6px; font-weight:600; color:#15803d; margin:12px 0;'>Selected Base: {name} (₹{price:.2f})</div>")
        else:
            st.html("<div style='padding:8px 12px; background:#f1f5f9; border-radius:6px; font-weight:600; color:#334155; margin:12px 0;'>Selected Base: None</div>")

        # 2. Pizza selection
        st.html('<div class="sm-primary-text" style="font-weight:600;margin:16px 0 4px;">Choose your pizza</div>')
        
        if "selected_pizzas" not in st.session_state:
            st.session_state["selected_pizzas"] = {}
        selected_pizzas = st.session_state["selected_pizzas"]
        
        pizza_cols = st.columns(3)
        for idx, (pid, name, price) in enumerate(pizzas):
            col = pizza_cols[idx % 3]
            with col:
                with st.container(border=True):
                    img_path = MENU_IMAGE_DIR / f"{pid}.jpg"
                    if not img_path.exists():
                        img_path = MENU_IMAGE_DIR / "P1.jpg"
                    st.image(str(img_path), width=150)
                    st.markdown(f"<div style='font-weight:600; text-align:center; font-size:14px; padding:4px 8px 0 8px;'>{name}</div>", unsafe_allow_html=True)
                    price_str = f"₹{price:.2f}" if price > 0 else "Unavailable"
                    st.markdown(f"<div style='color:#b7102a; font-weight:700; text-align:center; font-size:12px; margin-bottom:8px; padding:0 8px;'>{price_str}</div>", unsafe_allow_html=True)
                    
                    if price > 0:
                        is_selected = idx in selected_pizzas
                        if is_selected:
                            qty = selected_pizzas[idx]
                            
                            # Row with decrement, count, increment
                            col1, col2, col3 = st.columns([1, 2, 1])
                            with col1:
                                if st.button("—", key=f"p_dec_{idx}", use_container_width=True):
                                    selected_pizzas[idx] -= 1
                                    if selected_pizzas[idx] <= 0:
                                        del selected_pizzas[idx]
                                    st.rerun()
                            with col2:
                                st.markdown(f"<div style='text-align:center; font-weight:700; font-size:12px; margin-top:6px;'>Qty: {qty}</div>", unsafe_allow_html=True)
                            with col3:
                                if st.button("+", key=f"p_inc_{idx}", use_container_width=True):
                                    selected_pizzas[idx] += 1
                                    st.rerun()
                        else:
                            if st.button("Select", key=f"p_sel_{idx}", use_container_width=True):
                                selected_pizzas[idx] = 1
                                st.rerun()
                    else:
                        st.button("Unavailable", key=f"p_sel_{idx}", disabled=True, use_container_width=True)

        if selected_pizzas:
            sel_pizza_names = [f"{pizzas[p_idx][1]} (x{qty})" for p_idx, qty in selected_pizzas.items()]
            pizza_summary = ", ".join(sel_pizza_names)
            st.html(f"<div style='padding:8px 12px; background:#dcf5e0; border-left:4px solid #22c55e; border-radius:6px; font-weight:600; color:#15803d; margin:12px 0;'>Selected Pizzas: {pizza_summary}</div>")
        else:
            st.html("<div style='padding:8px 12px; background:#f1f5f9; border-radius:6px; font-weight:600; color:#334155; margin:12px 0;'>Selected Pizzas: None</div>")

        # 3. Toppings Checklist
        st.html('<div class="sm-primary-text" style="font-weight:600;margin:16px 0 4px;">Choose your toppings</div>')
        topping_choices = [f"{i}. {name} (+₹{price:.2f})" for i, (_, name, price) in enumerate(toppings, 1) if price > 0]
        
        selected_toppings_list = st.multiselect("Toppings", options=topping_choices, default=st.session_state["selected_toppings"], label_visibility="collapsed")
        st.session_state["selected_toppings"] = selected_toppings_list

        st.html('<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">')

        # 4. Action buttons
        _, action_col, _ = st.columns([1, 2, 1])
        with action_col:
            btn_cols = st.columns(2)
            with btn_cols[0]:
                if st.button("Add to cart", type="primary", use_container_width=True):
                    bi = st.session_state["selected_base_idx"]
                    
                    has_error = False
                    if bi is None:
                        st.error("Please select a base.")
                        has_error = True
                    if not selected_pizzas:
                        st.error("Please select at least one pizza.")
                        has_error = True
                    if not selected_toppings_list:
                        st.error("Please select at least one topping.")
                        has_error = True
                        
                    if not has_error:
                        ti = []
                        for selected in selected_toppings_list:
                            t_idx = int(selected.split(".")[0]) - 1
                            ti.append(t_idx)
                            
                        cart = state.get("cart", [])
                        total_qty_in_cart = sum(item["quantity"] for item in cart)
                        total_qty_to_add = sum(qty for qty in selected_pizzas.values())
                        
                        if total_qty_in_cart + total_qty_to_add > 10:
                            st.error(f"Cannot add {total_qty_to_add} pizzas. Maximum order capacity is 10. Cart has {total_qty_in_cart}.")
                        else:
                            for p_idx, p_qty in selected_pizzas.items():
                                cart.append({
                                    "base_idx": bi,
                                    "pizza_idx": p_idx,
                                    "topping_idx": ti,
                                    "quantity": p_qty
                                })
                            state["cart"] = cart
                            
                            st.session_state["selected_base_idx"] = None
                            st.session_state["selected_pizzas"] = {}
                            st.session_state["selected_toppings"] = []
                            st.success("✓ Added to cart")
                            st.rerun()
                            
            with btn_cols[1]:
                if st.button("Clear selection", use_container_width=True):
                    st.session_state["selected_base_idx"] = None
                    st.session_state["selected_pizzas"] = {}
                    st.session_state["selected_toppings"] = []
                    st.rerun()

        st.html('<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">')

        # 5. Cart section
        st.html('<h2 class="sm-headline" style="font-size:20px; border-left: 4px solid #b7102a; padding-left: 8px;">Your Cart</h2>')
        cart = state.get("cart", [])
        if not cart:
            st.html('<div style="padding:20px; border:1px dashed #cbd5e1; border-radius:8px; text-align:center; color:#64748b;">Your cart is empty<br><span style="font-size:12px;">Add a pizza combination to begin.</span></div>')
        else:
            for idx, item in enumerate(cart):
                with st.container(border=True):
                    cols = st.columns([4, 1])
                    with cols[0]:
                        st.html(_render_cart_item_html(item))
                    with cols[1]:
                        if st.button("Remove", key=f"del_cart_{idx}", use_container_width=True):
                            cart.pop(idx)
                            state["cart"] = cart
                            st.rerun()
                
            st.html(_render_cart_totals_html(cart))
            
            _, checkout_col, _ = st.columns([1, 2, 1])
            with checkout_col:
                if st.button("Checkout → Proceed to Bill Summary", type="primary", use_container_width=True):
                    state["stage"] = 4
                    st.rerun()

    # ── Stage 4: Bill Summary ──
    elif state["stage"] == 4:
        st.html('<h1 class="sm-headline" style="text-align:center;">Review Your Order</h1>')
        
        _, center_col, _ = st.columns([1, 2, 1])
        with center_col:
            st.html(render_bill_html(state))
            
            btn_cols = st.columns(2)
            with btn_cols[0]:
                if st.button("← Back to Menu", use_container_width=True):
                    state["stage"] = 3
                    st.rerun()
            with btn_cols[1]:
                if st.button("Proceed to Payment →", type="primary", use_container_width=True):
                    state["stage"] = 5
                    st.rerun()

    # ── Stage 5: Payment Selection ──
    elif state["stage"] == 5:
        st.html('<h1 class="sm-headline" style="text-align:center;">Payment</h1>')
        
        _, center_col, _ = st.columns([1, 2, 1])
        with center_col:
            st.html("<h3 style='margin:0 0 12px;font-weight:600;'>Choose Payment Mode</h3>")
            pay_mode = st.radio("Payment Mode", options=["Cash", "Card", "UPI"], index=["Cash", "Card", "UPI"].index(state["payment_mode"]) if state["payment_mode"] else 0, label_visibility="collapsed")
            state["payment_mode"] = pay_mode
            
            st.html(f"<p class='sm-pay-info'>ℹ {html_escape(PAYMENT_MESSAGES[pay_mode])}</p>")
            
            btn_cols = st.columns(2)
            with btn_cols[0]:
                if st.button("← Back to Bill", use_container_width=True):
                    state["stage"] = 4
                    st.rerun()
            with btn_cols[1]:
                if st.button("Confirm Order ✓", type="primary", use_container_width=True):
                    bill = compute_bill(state.get("cart", []))
                    write_ok = save_order_to_db(state, bill)
                    
                    bill_html = render_bill_html(state, show_payment=True)
                    safe_name = html_escape(state["name"])
                    safe_ts = html_escape(state["timestamp"])
                    safe_mode = html_escape(state["payment_mode"])
                    order_line = build_order_line(state)
                    
                    if write_ok:
                        receipt = f"""
                        <div class="sm-receipt-wrapper" style="text-align:center; font-family:Inter,system-ui,sans-serif;">
                          <div class="sm-success-icon">✅</div>
                          <h2 class="sm-success-title">Order Confirmed</h2>
                          <p class="sm-receipt-msg">
                            Your pizza is on its way. Thank you for choosing SliceMatic.
                          </p>
                          <div class="sm-receipt-details">
                            <p><strong>Customer:</strong> {safe_name}</p>
                            <p><strong>Order Time:</strong> {safe_ts}</p>
                            <p><strong>Payment:</strong> {safe_mode}</p>
                          </div>
                          {bill_html}
                          <div class="sm-dev-log">
                            <div class="sm-dev-log-header">
                              <div style="display:flex; align-items:center;">
                                <span style="font-family:monospace;font-size:14px;color:#94a3b8;margin-right:6px;">>_</span> DEVELOPER TRACE LOG
                              </div>
                            </div>
                            <div class="sm-dev-log-content">{html_escape(order_line)}</div>
                          </div>
                        </div>"""
                    else:
                        receipt = f"""
                        <div class="sm-receipt-wrapper" style="text-align:center; font-family:Inter,system-ui,sans-serif;">
                          <div class="sm-error-icon">⚠️</div>
                          <h2 class="sm-error-title">Order Recording Failed</h2>
                          <p class="sm-receipt-msg">
                            Your order total and payment mode were confirmed, but we could not
                            save your order record. Please show this screen to staff:
                          </p>
                          <div class="sm-receipt-details">
                            <p><strong>Customer:</strong> {safe_name}</p>
                            <p><strong>Order Time:</strong> {safe_ts}</p>
                            <p><strong>Payment:</strong> {safe_mode}</p>
                          </div>
                          {bill_html}
                          <div class="sm-dev-log">
                            <div class="sm-dev-log-header">
                              <div style="display:flex; align-items:center;">
                                <span style="font-family:monospace;font-size:14px;color:#94a3b8;margin-right:6px;">>_</span> DEVELOPER TRACE LOG
                              </div>
                            </div>
                            <div class="sm-dev-log-content">{html_escape(order_line)}</div>
                          </div>
                        </div>"""
                        
                    st.session_state["receipt_html"] = receipt
                    state["stage"] = 6
                    st.rerun()

    # ── Stage 6: Receipt & Reset ──
    elif state["stage"] == 6:
        st.html(st.session_state.get("receipt_html", ""))
        
        _, center_col, _ = st.columns([1, 2, 1])
        with center_col:
            if st.button("Place New Order 🍕", type="primary", use_container_width=True):
                st.session_state["state"] = {
                    "stage": 2,
                    "name": "",
                    "phone": "",
                    "timestamp": datetime.now(IST).isoformat(),
                    "cart": [],
                    "payment_mode": "",
                    "email": "",
                    "birth_date": None,
                    "gender": "",
                    "city": "",
                    "state": "",
                    "country": "",
                    "preferred_contact_channel": "",
                    "marketing_opt_in": True,
                }
                st.session_state["selected_base_idx"] = None
                st.session_state["selected_pizzas"] = {}
                st.session_state["selected_toppings"] = []
                st.session_state["order_quantity"] = 1
                st.session_state["show_first_timer"] = False
                st.session_state["receipt_html"] = ""
                
                # Clear text input session keys
                st.session_state["name_input"] = ""
                st.session_state["phone_input"] = ""
                st.session_state["email_input"] = ""
                st.session_state["birth_date_input"] = ""
                st.session_state["city_input"] = ""
                st.session_state["state_input"] = ""
                st.session_state["country_input"] = ""
                st.rerun()

# Module-level stylesheet
    # Design-system stylesheet — applies Stitch tokens to native Gradio
    # components AND defines classes used by our gr.HTML blocks.
DESIGN_CSS = """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* Fonts & Core styling */
    body, [data-testid="stAppViewContainer"], .gradio-container, .gradio-container * {
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        background-color: #f8fafc !important;
        color: #0f172a !important;
    }
    
    /* Center main container */
    [data-testid="stMainBlockContainer"] {
        max-width: 1200px !important;
        padding-top: 40px !important;
        padding-bottom: 60px !important;
        margin: 0 auto !important;
    }

    /* Headings */
    .sm-headline, h1, h2, h3 {
        color: #0f172a !important;
        font-weight: 700 !important;
        letter-spacing: -0.02em !important;
    }
    .sm-subtitle, p {
        color: #475569 !important;
        line-height: 1.6 !important;
    }

    /* Text inputs and numbers */
    .stTextInput input, .stNumberInput input {
        border-radius: 10px !important;
        border: 1px solid #cbd5e1 !important;
        padding: 10px 14px !important;
        font-size: 15px !important;
        background-color: #ffffff !important;
        color: #0f172a !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    .stTextInput input:focus, .stNumberInput input:focus {
        border-color: #b7102a !important;
        box-shadow: 0 0 0 3px rgba(183,16,42,0.12) !important;
        outline: none !important;
    }

    /* Premium Container Card (used for Bases, Pizzas, and Cart Rows) */
    div[data-testid="stVerticalBlockBorderWrapper"] {
        border: 1px solid #e2e8f0 !important;
        border-radius: 16px !important;
        background: #ffffff !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        padding: 20px !important;
    }
    /* Target card containers specifically inside 3-column layouts of bases and pizzas */
    div[data-testid="column"] div[data-testid="stVerticalBlockBorderWrapper"] {
        width: 150px !important;
        min-width: 150px !important;
        max-width: 150px !important;
        padding: 0px !important;
        margin: 0 auto !important;
        overflow: hidden !important;
    }
    /* Select button padding inside the card container */
    div[data-testid="column"] div[data-testid="stVerticalBlockBorderWrapper"] .stButton {
        padding: 0 8px 8px 8px !important;
    }
    /* Small square selectors for card quantity increment/decrement buttons */
    div[data-testid="stVerticalBlockBorderWrapper"] div[data-testid="stHorizontalBlock"] .stButton > button {
        padding: 2px !important;
        height: 28px !important;
        font-size: 13px !important;
        border-radius: 4px !important;
    }
    /* Adjust inner columns block inside the cards */
    div[data-testid="column"] div[data-testid="stVerticalBlockBorderWrapper"] div[data-testid="stHorizontalBlock"] {
        padding: 0 8px 8px 8px !important;
    }
    div[data-testid="stVerticalBlockBorderWrapper"]:hover {
        border-color: #b7102a !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 12px 24px -3px rgba(183, 16, 42, 0.08), 0 4px 12px -2px rgba(183, 16, 42, 0.03) !important;
    }
    div[data-testid="column"] div[data-testid="stVerticalBlockBorderWrapper"] img {
        display: block !important;
        margin: 0px !important;
        border-radius: 12px 12px 0 0 !important;
        object-fit: cover !important;
        height: 120px !important;
        width: 150px !important;
        min-width: 150px !important;
        max-width: 150px !important;
        transition: transform 0.3s ease !important;
    }
    div[data-testid="stVerticalBlockBorderWrapper"]:hover img {
        transform: scale(1.04) !important;
    }

    /* Streamlit buttons custom styling */
    .stButton > button {
        border-radius: 8px !important;
        border: 1px solid #cbd5e1 !important;
        background-color: #ffffff !important;
        color: #334155 !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        padding: 8px 16px !important;
        transition: all 0.2s ease !important;
        width: 100% !important;
    }
    .stButton > button:hover {
        border-color: #b7102a !important;
        color: #b7102a !important;
        background-color: #fef2f2 !important;
    }
    .stButton > button[kind="primary"] {
        background-color: #b7102a !important;
        color: #ffffff !important;
        border: none !important;
        box-shadow: 0 4px 6px -1px rgba(183, 16, 42, 0.2) !important;
    }
    .stButton > button[kind="primary"]:hover {
        background-color: #9b0d23 !important;
        box-shadow: 0 6px 12px -1px rgba(183, 16, 42, 0.3) !important;
    }

    /* Multiselect overrides */
    div[data-baseweb="select"] {
        border-radius: 8px !important;
        border-color: #cbd5e1 !important;
    }

    /* Sidebar custom styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #e2e8f0 !important;
    }
    .sm-sidebar {
        padding: 10px;
    }
    .sm-sidebar-item {
        padding: 12px 16px;
        margin-bottom: 6px;
        border-radius: 10px;
        color: #475569;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
    }
    .sm-sidebar-active {
        background-color: #fef2f2 !important;
        color: #b7102a !important;
        font-weight: 600 !important;
        box-shadow: inset 4px 0 0 0 #b7102a !important;
    }
    .sm-logo-text {
        font-family: 'Inter', sans-serif !important;
        font-size: 22px !important;
        font-weight: 800 !important;
        color: #0f172a !important;
        letter-spacing: -0.03em !important;
    }

    /* Bill summary styling */
    .sm-bill-wrapper {
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        background: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }
    .sm-bill-table {
        width: 100%;
        border-collapse: collapse;
    }
    .sm-bill-row {
        border-bottom: 1px solid #f1f5f9;
    }
    .sm-bill-cell {
        padding: 12px 0;
        color: #334155;
    }
    .sm-bill-val {
        padding: 12px 0;
        text-align: right;
        font-weight: 600;
        color: #0f172a;
    }
    .sm-bill-bold {
        font-weight: 700;
    }
    .sm-bill-total-row {
        border-top: 2px solid #b7102a;
        background: #fff8f8;
    }
    .sm-bill-total-cell {
        padding: 16px 12px;
        font-weight: 700;
        color: #0f172a;
    }
    .sm-bill-total-val {
        padding: 16px 12px;
        text-align: right;
        font-weight: 800;
        font-size: 1.3em;
        color: #b7102a;
    }
    .sm-dev-log {
        background: #0B192C;
        border-radius: 8px;
        padding: 16px;
        margin: 24px auto 0 auto;
        max-width: 720px;
        text-align: left;
    }
    .sm-dev-log-header {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #e2e8f0 !important;
    }
    .sm-dev-log-content {
        background: #4C2E2A !important; 
        color: #fca5a5 !important;
        padding: 12px; 
        border-radius: 6px; 
        font-size: 13px; 
        word-break: break-all;
        font-family: monospace !important;
    }
    .sm-success-icon { color: #24963F; font-size: 48px; }
    .sm-success-title { color: #24963F; margin: 12px 0; }
    .sm-error-icon { color: #ba1a1a; font-size: 48px; }
    .sm-error-title { color: #ba1a1a; margin: 12px 0; }
    .sm-pay-info { color: #336366; }
    .sm-receipt-msg { color: #5b403f; }
    .sm-receipt-details { margin: 20px auto; text-align: left; max-width: 720px; color: #0F172A; }
"""

st.markdown(f"<style>{DESIGN_CSS}</style>", unsafe_allow_html=True)
