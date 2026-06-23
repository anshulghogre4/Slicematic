from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from html import escape
import importlib
import os
from pathlib import Path
import re
from urllib.parse import quote
from typing import Any

gr = None


APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent
ORDER_LOG = APP_DIR / "orders_log.txt"
HERO_IMAGE = APP_DIR / "assets" / "pizza-hero.jpg"
MENU_IMAGE_DIR = APP_DIR / "assets" / "menu"
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

MENU_FILES = {
    "bases": "Types_of_Base.txt",
    "pizzas": "Types_of_Pizza.txt",
    "toppings": "Types_of_Toppings.txt",
}

PAYMENT_MODES = {
    "1": "Cash",
    "cash": "Cash",
    "2": "Card",
    "card": "Card",
    "3": "UPI",
    "upi": "UPI",
}


class MenuLoadError(Exception):
    """Raised when a required menu source file cannot be safely used."""


@dataclass(frozen=True)
class MenuItem:
    item_id: str
    name: str
    price: Decimal


@dataclass(frozen=True)
class CartLine:
    base: MenuItem
    pizza: MenuItem
    toppings: tuple[MenuItem, ...]
    quantity: int
    unit_price: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class Bill:
    unit_price: Decimal
    subtotal: Decimal
    discount: Decimal
    taxable_amount: Decimal
    gst: Decimal
    final_total: Decimal


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def money_text(value: Decimal) -> str:
    return f"Rs.{money(value):,.2f}"


def now_ist_iso() -> str:
    return datetime.now(IST).replace(microsecond=0).isoformat()


def resolve_menu_dir() -> Path:
    if all((APP_DIR / filename).exists() for filename in MENU_FILES.values()):
        return APP_DIR

    requirements_dir = REPO_ROOT / "Requirements"
    if all((requirements_dir / filename).exists() for filename in MENU_FILES.values()):
        return requirements_dir

    return APP_DIR


def parse_menu_file(path: Path, label: str) -> list[MenuItem]:
    if not path.exists():
        raise MenuLoadError(f"{path.name} is missing. Add the file and restart the app.")

    items: list[MenuItem] = []
    seen_ids: set[str] = set()
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue

        parts = [part.strip() for part in line.split(";")]
        if len(parts) != 3:
            raise MenuLoadError(
                f"{path.name} line {line_number} is malformed. Expected ID;Name;Price."
            )

        item_id, name, raw_price = parts
        if not item_id or not name:
            raise MenuLoadError(f"{path.name} line {line_number} has an empty ID or name.")
        if item_id in seen_ids:
            raise MenuLoadError(f"{path.name} line {line_number} repeats menu ID {item_id}.")

        try:
            price = Decimal(raw_price)
        except InvalidOperation as exc:
            raise MenuLoadError(f"{path.name} line {line_number} has a non-numeric price.") from exc

        if price < 0:
            raise MenuLoadError(f"{path.name} line {line_number} has a negative price.")

        seen_ids.add(item_id)
        items.append(MenuItem(item_id=item_id, name=name, price=money(price)))

    if not items:
        raise MenuLoadError(f"{path.name} does not contain any {label}.")

    return items


def load_menus(menu_dir: Path | None = None) -> dict[str, list[MenuItem]]:
    source_dir = menu_dir or resolve_menu_dir()
    return {
        "bases": parse_menu_file(source_dir / MENU_FILES["bases"], "bases"),
        "pizzas": parse_menu_file(source_dir / MENU_FILES["pizzas"], "pizzas"),
        "toppings": parse_menu_file(source_dir / MENU_FILES["toppings"], "toppings"),
    }


def validate_customer_name(value: str) -> tuple[bool, str]:
    name = value.strip()
    if not name or len(name) < 2 or len(name) > 40:
        return False, "Name must contain alphabetic characters and be 2-40 characters long."
    if not re.fullmatch(r"[A-Za-z ]+", name):
        return False, "Name can contain alphabets and spaces only."
    if not re.search(r"[A-Za-z]", name):
        return False, "Name must contain alphabetic characters and be 2-40 characters long."
    return True, name


def validate_phone(value: str) -> tuple[bool, str]:
    phone = value.strip()
    if not phone:
        return False, "Phone number is required."
    if not phone.isdigit() or len(phone) != 10 or phone[0] not in "6789":
        return False, "Enter a valid Indian mobile number starting with 6, 7, 8, or 9."
    return True, phone


def validate_quantity(value: Any) -> tuple[bool, int | str]:
    if isinstance(value, float) and value.is_integer():
        raw = str(int(value))
    else:
        raw = "" if value is None else str(value).strip()

    if not raw:
        return False, "Quantity is required."
    if not re.fullmatch(r"[+-]?\d+", raw):
        return False, "Quantity must be a whole number from 1 to 10."

    quantity = int(raw)
    if quantity <= 0:
        return False, "Quantity must be between 1 and 10."
    if quantity > 10:
        return False, "Maximum outlet capacity is 10 pizzas per order."
    return True, quantity


def validate_payment(value: Any) -> tuple[bool, str]:
    raw = "" if value is None else str(value).strip().lower()
    if not raw:
        return False, "Payment mode is required. Enter 1 for Cash, 2 for Card, or 3 for UPI."
    if raw not in PAYMENT_MODES:
        return False, "Invalid payment mode. Choose 1. Cash, 2. Card, or 3. UPI."
    return True, PAYMENT_MODES[raw]


def normalize_toppings(toppings: MenuItem | list[MenuItem] | tuple[MenuItem, ...]) -> tuple[MenuItem, ...]:
    if isinstance(toppings, MenuItem):
        return (toppings,)
    return tuple(toppings)


def calculate_bill(
    base: MenuItem,
    pizza: MenuItem,
    toppings: MenuItem | list[MenuItem] | tuple[MenuItem, ...],
    quantity: int,
) -> Bill:
    selected_toppings = normalize_toppings(toppings)
    unit_price = base.price + pizza.price + sum((item.price for item in selected_toppings), Decimal("0"))
    subtotal = unit_price * quantity
    discount = subtotal * Decimal("0.10") if quantity >= 5 else Decimal("0")
    taxable_amount = subtotal - discount
    gst = taxable_amount * Decimal("0.18")
    final_total = taxable_amount + gst
    return Bill(
        unit_price=money(unit_price),
        subtotal=money(subtotal),
        discount=money(discount),
        taxable_amount=money(taxable_amount),
        gst=money(gst),
        final_total=money(final_total),
    )


def calculate_cart_bill(cart: list[CartLine]) -> Bill:
    subtotal = sum((line.line_total for line in cart), Decimal("0"))
    total_quantity = cart_quantity(cart)
    discount = subtotal * Decimal("0.10") if total_quantity >= 5 else Decimal("0")
    taxable_amount = subtotal - discount
    gst = taxable_amount * Decimal("0.18")
    final_total = taxable_amount + gst
    return Bill(
        unit_price=Decimal("0.00"),
        subtotal=money(subtotal),
        discount=money(discount),
        taxable_amount=money(taxable_amount),
        gst=money(gst),
        final_total=money(final_total),
    )


def cart_quantity(cart: list[CartLine]) -> int:
    return sum(line.quantity for line in cart)


def choice_label(index: int, item: MenuItem) -> str:
    return f"{index}. {item.name} - {money_text(item.price)}"


def choice_index(value: Any) -> int | None:
    if not value:
        return None
    match = re.match(r"^\s*(\d+)\.", str(value))
    return int(match.group(1)) - 1 if match else None


def item_from_choice(value: Any, items: list[MenuItem], label: str) -> tuple[bool, MenuItem | str]:
    index = choice_index(value)
    if index is None:
        return False, f"{label} selection is required."
    if index < 0:
        return False, "Select a valid item number from the list."
    if index >= len(items):
        return False, "That item number is not available."
    return True, items[index]


def items_from_choices(values: list[str] | None, items: list[MenuItem]) -> tuple[bool, tuple[MenuItem, ...] | str]:
    if not values:
        return True, tuple()

    selected: list[MenuItem] = []
    for value in values:
        ok, result = item_from_choice(value, items, "Topping")
        if not ok:
            return False, str(result)
        selected.append(result)
    return True, tuple(selected)


def make_cart_line(base: MenuItem, pizza: MenuItem, toppings: tuple[MenuItem, ...], quantity: int) -> CartLine:
    bill = calculate_bill(base, pizza, toppings, quantity)
    return CartLine(
        base=base,
        pizza=pizza,
        toppings=toppings,
        quantity=quantity,
        unit_price=bill.unit_price,
        line_total=bill.subtotal,
    )


def cart_rows(cart: list[CartLine]) -> list[list[str]]:
    rows: list[list[str]] = []
    for index, line in enumerate(cart, start=1):
        toppings = ", ".join(item.name for item in line.toppings) if line.toppings else "No extra toppings"
        rows.append(
            [
                str(index),
                line.pizza.name,
                line.base.name,
                toppings,
                str(line.quantity),
                money_text(line.unit_price),
                money_text(line.line_total),
            ]
        )
    return rows


def cart_lines_html(cart: list[CartLine]) -> str:
    if not cart:
        return ""

    blocks: list[str] = []
    for index, line in enumerate(cart, start=1):
        toppings = ", ".join(item.name for item in line.toppings) if line.toppings else "No extra toppings"
        blocks.append(
            f"""
            <article class="cart-line-card">
              <div class="cart-line-index">{index:02d}</div>
              <div class="cart-line-main">
                <strong>{escape(line.pizza.name)}</strong>
                <span>{escape(line.base.name)} · {escape(toppings)}</span>
              </div>
              <div class="cart-line-meta">
                <span>Qty {line.quantity}</span>
                <strong>{money_text(line.line_total)}</strong>
              </div>
            </article>
            """
        )
    return f'<div class="cart-lines">{"".join(blocks)}</div>'


def cart_summary_html(cart: list[CartLine]) -> str:
    if not cart:
        return """
        <div class="empty-cart">
          <strong>Your cart is empty</strong>
          <span>Add a pizza combination to begin.</span>
        </div>
        """

    bill = calculate_cart_bill(cart)
    total_quantity = cart_quantity(cart)
    discount_line = ""
    if total_quantity >= 5:
        discount_line = f"""
          <div class="summary-row positive">
            <span>10% quantity discount</span>
            <strong>- {money_text(bill.discount)}</strong>
          </div>
        """

    return f"""
    <div class="summary-box">
      <div class="summary-row"><span>Total pizzas</span><strong>{total_quantity}/10</strong></div>
      <div class="summary-row"><span>Subtotal</span><strong>{money_text(bill.subtotal)}</strong></div>
      {discount_line}
      <div class="summary-row"><span>Taxable amount</span><strong>{money_text(bill.taxable_amount)}</strong></div>
      <div class="summary-row"><span>GST at 18%</span><strong>{money_text(bill.gst)}</strong></div>
      <div class="summary-row total"><span>Final payable</span><strong>{money_text(bill.final_total)}</strong></div>
    </div>
    """


def item_image_url(item_id: str) -> str:
    image_path = MENU_IMAGE_DIR / f"{item_id}.jpg"
    if not image_path.exists():
        return ""
    return f"/gradio_api/file={quote(str(image_path))}?v={int(image_path.stat().st_mtime)}"


def menu_item_tag(item: MenuItem, kind: str) -> tuple[str, str]:
    if kind == "base":
        return "Crust", "neutral"
    if kind == "pizza":
        return "Signature", "neutral"
    if item.item_id in {"T14", "T15", "T16"}:
        return "Non-veg", "nonveg"
    if item.item_id in {"T1", "T10", "T13"}:
        return "Premium veg", "premium"
    return "Veg", "veg"


def menu_card_html(item: MenuItem, index: int, kind: str) -> str:
    image_url = item_image_url(item.item_id)
    if image_url:
        media = f'<img src="{image_url}" alt="{escape(item.name)}" loading="lazy" />'
    else:
        media = '<div class="item-card-fallback"></div>'
    tag_text, tag_kind = menu_item_tag(item, kind)

    return f"""
    <article class="item-card item-card-{kind}">
      <div class="item-card-image">
        {media}
        <span class="item-code">{escape(item.item_id)}</span>
      </div>
      <div class="item-card-copy">
        <div class="item-card-title">
          <span>{index:02d}</span>
          <h3>{escape(item.name)}</h3>
        </div>
        <div class="item-card-price">
          <span class="item-tag item-tag-{tag_kind}">{escape(tag_text)}</span>
          <strong>{money_text(item.price)}</strong>
        </div>
      </div>
    </article>
    """


def menu_preview_html(menus: dict[str, list[MenuItem]]) -> str:
    sections = [
        ("bases", "Crusts", "base"),
        ("pizzas", "Signature Pizzas", "pizza"),
    ]
    blocks: list[str] = []
    for key, title, kind in sections:
        cards = "".join(
            menu_card_html(item, index, kind) for index, item in enumerate(menus[key], start=1)
        )
        blocks.append(
            f"""
            <section class="visual-section">
              <div class="visual-section-head">
                <h2>{title}</h2>
                <span>{len(menus[key])} options</span>
              </div>
              <div class="visual-grid visual-grid-{kind}">
                {cards}
              </div>
            </section>
            """
        )
    return f'<div class="visual-menu">{"".join(blocks)}</div>'


def order_context_html() -> str:
    return """
    <section class="order-context">
      <div class="outlet-meta">
        <span class="brand-mark">SM</span>
        <div>
          <h2>SliceMatic - New Ashok Nagar</h2>
          <p>Open now - 30 min prep - Custom pizza counter</p>
        </div>
      </div>
      <div class="service-tabs" aria-label="Order type">
        <span class="active">Delivery</span>
        <span>Pick up</span>
        <span>Dine in</span>
      </div>
      <div class="menu-filters" aria-label="Menu filters">
        <span>Veg</span>
        <span>Non veg</span>
        <span>Customisable</span>
        <span>5+ discount</span>
      </div>
    </section>
    """


def hero_image_url() -> str:
    if not HERO_IMAGE.exists():
        return ""
    return f"/gradio_api/file={quote(str(HERO_IMAGE))}"


def alert_html(message: str, kind: str = "error") -> str:
    return f'<div class="alert {kind}">{escape(message)}</div>'


def ui_update(**kwargs: Any) -> Any:
    if gr is None:
        return kwargs
    return gr.update(**kwargs)


def add_cart_line_ui(
    base_choice: Any,
    pizza_choice: Any,
    topping_choices: list[str] | None,
    quantity_value: Any,
    cart: list[CartLine] | None,
) -> tuple[str, list[CartLine], str, str]:
    if STARTUP_ERROR:
        return alert_html(STARTUP_ERROR), cart or [], cart_lines_html(cart or []), cart_summary_html(cart or [])

    current_cart = list(cart or [])
    quantity_ok, quantity_result = validate_quantity(quantity_value)
    if not quantity_ok:
        return alert_html(str(quantity_result)), current_cart, cart_lines_html(current_cart), cart_summary_html(current_cart)
    quantity = int(quantity_result)

    if cart_quantity(current_cart) + quantity > 10:
        remaining = 10 - cart_quantity(current_cart)
        return (
            alert_html(f"Maximum outlet capacity is 10 pizzas per order. You can add {remaining} more."),
            current_cart,
            cart_lines_html(current_cart),
            cart_summary_html(current_cart),
        )

    base_ok, base_result = item_from_choice(base_choice, MENUS["bases"], "Base")
    if not base_ok:
        return alert_html(str(base_result)), current_cart, cart_lines_html(current_cart), cart_summary_html(current_cart)

    pizza_ok, pizza_result = item_from_choice(pizza_choice, MENUS["pizzas"], "Pizza")
    if not pizza_ok:
        return alert_html(str(pizza_result)), current_cart, cart_lines_html(current_cart), cart_summary_html(current_cart)

    toppings_ok, toppings_result = items_from_choices(topping_choices, MENUS["toppings"])
    if not toppings_ok:
        return alert_html(str(toppings_result)), current_cart, cart_lines_html(current_cart), cart_summary_html(current_cart)

    line = make_cart_line(base_result, pizza_result, toppings_result, quantity)
    current_cart.append(line)
    toppings_text = ", ".join(item.name for item in line.toppings) if line.toppings else "no extra toppings"
    message = f"Added {quantity} x {line.pizza.name} with {line.base.name} and {toppings_text}."
    return alert_html(message, "success"), current_cart, cart_lines_html(current_cart), cart_summary_html(current_cart)


def clear_cart_ui() -> tuple[str, list[CartLine], str, str]:
    return alert_html("Cart cleared.", "success"), [], "", cart_summary_html([])


def payment_message(payment_mode: str) -> str:
    messages = {
        "Cash": "Cash payment selected; collect at delivery/counter.",
        "Card": "Card payment selected; process on POS.",
        "UPI": "UPI payment selected; confirm receipt before fulfillment.",
    }
    return messages[payment_mode]


def line_log_value(index: int, line: CartLine) -> str:
    toppings = ",".join(f"{item.item_id}:{item.name}:{money(item.price):.2f}" for item in line.toppings)
    return (
        f"LINE{index}="
        f"base:{line.base.item_id}:{line.base.name}:{money(line.base.price):.2f};"
        f"pizza:{line.pizza.item_id}:{line.pizza.name}:{money(line.pizza.price):.2f};"
        f"toppings:{toppings};"
        f"quantity:{line.quantity};"
        f"unit_price:{money(line.unit_price):.2f};"
        f"line_total:{money(line.line_total):.2f}"
    )


def order_log_line(
    customer_name: str,
    phone: str,
    cart: list[CartLine],
    payment_mode: str,
    timestamp: str | None = None,
) -> str:
    bill = calculate_cart_bill(cart)
    parts = [
        "ORDER",
        timestamp or now_ist_iso(),
        customer_name,
        phone,
        f"line_count:{len(cart)}",
    ]
    parts.extend(line_log_value(index, line) for index, line in enumerate(cart, start=1))
    parts.extend(
        [
            f"total_quantity:{cart_quantity(cart)}",
            f"subtotal:{money(bill.subtotal):.2f}",
            f"discount:{money(bill.discount):.2f}",
            f"gst:{money(bill.gst):.2f}",
            f"final_total:{money(bill.final_total):.2f}",
            f"payment_mode:{payment_mode}",
        ]
    )
    return "|".join(parts)


def persist_order(
    customer_name: str,
    phone: str,
    cart: list[CartLine],
    payment_mode: str,
    log_path: Path = ORDER_LOG,
) -> str:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    line = order_log_line(customer_name, phone, cart, payment_mode)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n\n")
    return line


def checkout_ui(
    customer_name: str,
    phone: str,
    payment_value: Any,
    cart: list[CartLine] | None,
) -> tuple[str, str]:
    current_cart = list(cart or [])
    if not current_cart:
        return alert_html("Add at least one pizza before checkout."), ""

    name_ok, name_result = validate_customer_name(customer_name)
    if not name_ok:
        return alert_html(str(name_result)), ""

    phone_ok, phone_result = validate_phone(phone)
    if not phone_ok:
        return alert_html(str(phone_result)), ""

    payment_ok, payment_mode = validate_payment(payment_value)
    if not payment_ok:
        return alert_html(str(payment_mode)), ""

    log_line = persist_order(name_result, phone_result, current_cart, payment_mode)
    bill = calculate_cart_bill(current_cart)
    message = (
        f"{payment_message(payment_mode)} Order saved for {name_result}. "
        f"Final payable: {money_text(bill.final_total)}."
    )
    return alert_html(message, "success"), f"<div class='log-line'>{escape(log_line)}</div>"


def initialize_menu() -> tuple[dict[str, list[MenuItem]] | None, str | None]:
    try:
        return load_menus(), None
    except MenuLoadError as exc:
        return None, str(exc)


MENUS, STARTUP_ERROR = initialize_menu()


def build_app():
    global gr
    gr = importlib.import_module("gradio")
    hero_image = hero_image_url()
    backdrop_css = (
        f"""
    body::before {{
      content: "";
      position: fixed;
      inset: 0;
      z-index: -2;
      pointer-events: none;
      background-image:
        linear-gradient(90deg, rgba(10, 8, 6, 0.38), transparent 28%, transparent 72%, rgba(10, 8, 6, 0.34)),
        linear-gradient(180deg, rgba(18, 13, 9, 0.9) 0%, rgba(34, 23, 15, 0.62) 20%, rgba(238, 223, 201, 0.9) 44%, rgba(248, 243, 234, 0.98) 74%, rgba(242, 232, 216, 1) 100%),
        url('{hero_image}');
      background-size: cover;
      background-position: center top;
      background-repeat: no-repeat;
      filter: saturate(1.08) contrast(1.02);
    }}
        """
        if hero_image
        else """
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: -2;
      pointer-events: none;
      background: linear-gradient(180deg, #18120e 0%, #2b2018 24%, #f6f1e8 52%, #f6f1e8 100%);
    }
        """
    )

    css = """
    <style>
    :root {
      --ink: #171717;
      --muted: #5f6368;
      --line: #ddd7ce;
      --surface: #ffffff;
      --soft: #f8f6f2;
      --tomato: #d23822;
      --tomato-dark: #8f2116;
      --basil: #176b4d;
      --gold: #f4b942;
      --charcoal: #17130f;
      --paper: #f6f1e8;
      --paper-deep: #ebe0d1;
      --shadow-soft: 0 18px 48px rgba(35, 23, 13, 0.12);
      --shadow-card: 0 12px 26px rgba(35, 23, 13, 0.1);
    }
    html {
      background: #f2e8d8;
      overflow-x: hidden;
    }
    body, .gradio-container {
      background: transparent !important;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    gradio-app,
    .main,
    .app {
      background: transparent !important;
    }
    body {
      min-height: 100vh;
      isolation: isolate;
      overflow-x: hidden;
    }
    __PAGE_BACKDROP__
    body::after {
      content: "";
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background-image:
        linear-gradient(115deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 34%),
        repeating-linear-gradient(0deg, rgba(112, 82, 43, 0.032) 0, rgba(112, 82, 43, 0.032) 1px, transparent 1px, transparent 7px),
        repeating-linear-gradient(90deg, rgba(112, 82, 43, 0.024) 0, rgba(112, 82, 43, 0.024) 1px, transparent 1px, transparent 9px),
        linear-gradient(180deg, transparent 0%, rgba(255, 249, 239, 0.72) 43%, rgba(237, 224, 203, 0.52) 100%);
      background-size: auto, auto, auto, auto;
      mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.18) 25%, rgba(0, 0, 0, 0.5) 100%);
    }
    .gradio-container {
      max-width: 1240px !important;
      padding: 22px 18px 44px !important;
      position: relative;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .gradio-container::before {
      content: "";
      position: absolute;
      z-index: -1;
      top: 0;
      left: -100vw;
      right: -100vw;
      height: 430px;
      border-radius: 0 0 18px 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, rgba(13, 9, 7, 0.54), rgba(13, 9, 7, 0.12) 48%, rgba(13, 9, 7, 0.5));
      box-shadow: inset 0 -1px rgba(255, 255, 255, 0.14), 0 28px 90px rgba(37, 24, 13, 0.14);
    }
    .hero {
      min-height: 220px;
      border-radius: 8px;
      overflow: hidden;
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: flex-end;
      box-shadow: 0 24px 70px rgba(18, 12, 8, 0.42);
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.22);
    }
    .hero-content {
      width: 100%;
      padding: 28px 34px;
      color: white;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.42);
    }
    .hero h1 {
      font-size: 40px !important;
      line-height: 1;
      margin: 0 0 10px;
      letter-spacing: 0;
      color: #ffffff !important;
    }
    .hero p {
      max-width: 640px;
      margin: 0;
      font-size: 15px;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.94) !important;
    }
    .hero-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .hero-chips span {
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.34);
      border-radius: 999px;
      padding: 7px 11px;
      color: white !important;
      font-size: 13px;
      backdrop-filter: blur(10px);
      text-shadow: none;
    }
    .order-context {
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0)),
        var(--charcoal);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      padding: 16px;
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto auto;
      gap: 14px;
      align-items: center;
      box-shadow: 0 18px 46px rgba(18, 12, 8, 0.26);
      margin: 0 0 18px;
    }
    .outlet-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: #d23822;
      color: white;
      font-weight: 900;
      letter-spacing: 0;
      flex: 0 0 auto;
    }
    .outlet-meta h2 {
      margin: 0;
      color: white !important;
      font-size: 18px;
      line-height: 1.2;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    .outlet-meta p {
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: 13px;
    }
    .service-tabs,
    .menu-filters {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .service-tabs span,
    .menu-filters span {
      border-radius: 999px;
      padding: 8px 11px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
    }
    .service-tabs span {
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.24);
      color: rgba(255, 255, 255, 0.94) !important;
    }
    .service-tabs span.active {
      background: white;
      color: var(--charcoal) !important;
    }
    .menu-filters span {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.88) !important;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    #menu-panel,
    #builder-panel,
    #cart-panel,
    #checkout-panel,
    #status-panel {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 251, 244, 0.97)),
        var(--surface);
      border: 1px solid rgba(129, 109, 82, 0.22);
      border-radius: 8px;
      padding: 18px;
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(14px);
    }
    #builder-panel,
    #cart-panel,
    #checkout-panel,
    #status-panel {
      position: relative;
      overflow: hidden;
    }
    #builder-panel::before,
    #cart-panel::before,
    #checkout-panel::before,
    #status-panel::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 4px;
      pointer-events: none;
    }
    #builder-panel {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 246, 235, 0.97)),
        linear-gradient(90deg, rgba(210, 56, 34, 0.1), rgba(244, 185, 66, 0.08) 42%, transparent),
        var(--surface);
      border-color: rgba(210, 56, 34, 0.2);
      box-shadow: 0 18px 46px rgba(98, 56, 28, 0.13);
    }
    #builder-panel::before {
      background: linear-gradient(90deg, var(--tomato), #f4b942 48%, rgba(23, 107, 77, 0.62));
    }
    #cart-panel {
      background:
        linear-gradient(180deg, rgba(255, 254, 251, 0.98), rgba(246, 239, 229, 0.97)),
        linear-gradient(90deg, rgba(23, 19, 15, 0.045), transparent 48%),
        var(--surface);
      border-color: rgba(91, 75, 53, 0.22);
      box-shadow: 0 18px 48px rgba(47, 35, 22, 0.13);
    }
    #cart-panel::before {
      background: linear-gradient(90deg, #17130f, rgba(91, 75, 53, 0.58), rgba(210, 56, 34, 0.72));
    }
    #checkout-panel,
    #status-panel {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 248, 242, 0.96)),
        linear-gradient(90deg, rgba(23, 107, 77, 0.085), transparent 46%),
        var(--surface);
      border-color: rgba(23, 107, 77, 0.2);
      box-shadow: 0 18px 46px rgba(25, 84, 62, 0.1);
    }
    #checkout-panel::before,
    #status-panel::before {
      background: linear-gradient(90deg, var(--basil), rgba(244, 185, 66, 0.72), rgba(210, 56, 34, 0.58));
    }
    #menu-panel h2,
    #menu-panel h3,
    #builder-panel h2,
    #builder-panel h3,
    #cart-panel h2,
    #cart-panel h3,
    #checkout-panel h2,
    #checkout-panel h3,
    #status-panel h2,
    #status-panel h3 {
      margin-top: 0;
      letter-spacing: 0;
    }
    #builder-panel h2,
    #cart-panel h2,
    #checkout-panel h2,
    #status-panel h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 2px 0 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(129, 109, 82, 0.16);
    }
    #builder-panel h2::before,
    #cart-panel h2::before,
    #checkout-panel h2::before,
    #status-panel h2::before {
      content: "";
      width: 9px;
      height: 24px;
      border-radius: 999px;
      display: inline-block;
      box-shadow: 0 6px 14px rgba(35, 23, 13, 0.12);
    }
    #builder-panel h2::before {
      background: linear-gradient(180deg, var(--tomato), #f4b942);
    }
    #cart-panel h2::before {
      background: linear-gradient(180deg, #17130f, #7a6850);
    }
    #checkout-panel h2::before,
    #status-panel h2::before {
      background: linear-gradient(180deg, var(--basil), #f4b942);
    }
    #builder-panel label,
    #checkout-panel label {
      color: #4d453a !important;
      font-weight: 650 !important;
      letter-spacing: 0;
    }
    #builder-panel input,
    #builder-panel textarea,
    #builder-panel select,
    #checkout-panel input,
    #checkout-panel textarea,
    #checkout-panel select {
      background: rgba(255, 255, 255, 0.92) !important;
      border: 1px solid rgba(129, 109, 82, 0.24) !important;
      border-radius: 8px !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 8px 18px rgba(35, 23, 13, 0.055) !important;
      color: var(--ink) !important;
    }
    #builder-panel input:focus,
    #builder-panel textarea:focus,
    #builder-panel select:focus,
    #checkout-panel input:focus,
    #checkout-panel textarea:focus,
    #checkout-panel select:focus {
      border-color: rgba(210, 56, 34, 0.5) !important;
      box-shadow: 0 0 0 3px rgba(210, 56, 34, 0.1), 0 10px 24px rgba(35, 23, 13, 0.08) !important;
      outline: none !important;
    }
    #checkout-panel input:focus,
    #checkout-panel textarea:focus,
    #checkout-panel select:focus {
      border-color: rgba(23, 107, 77, 0.45) !important;
      box-shadow: 0 0 0 3px rgba(23, 107, 77, 0.1), 0 10px 24px rgba(35, 23, 13, 0.08) !important;
    }
    #selection-row {
      align-items: stretch;
    }
    #pizza-selector,
    #base-selector {
      border: 1px solid rgba(129, 109, 82, 0.18);
      border-radius: 8px;
      padding: 12px;
      max-height: 286px;
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(210, 56, 34, 0.42) rgba(255, 255, 255, 0.55);
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 247, 236, 0.86)),
        repeating-linear-gradient(90deg, rgba(210, 56, 34, 0.018) 0, rgba(210, 56, 34, 0.018) 1px, transparent 1px, transparent 12px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 10px 22px rgba(98, 56, 28, 0.06);
    }
    #pizza-selector::-webkit-scrollbar,
    #base-selector::-webkit-scrollbar {
      width: 8px;
    }
    #pizza-selector::-webkit-scrollbar-track,
    #base-selector::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.55);
      border-radius: 999px;
    }
    #pizza-selector::-webkit-scrollbar-thumb,
    #base-selector::-webkit-scrollbar-thumb {
      background: rgba(210, 56, 34, 0.42);
      border-radius: 999px;
    }
    #pizza-selector .wrap,
    #base-selector .wrap {
      gap: 8px !important;
    }
    #pizza-selector label,
    #base-selector label {
      border: 1px solid rgba(129, 109, 82, 0.2) !important;
      border-radius: 8px !important;
      padding: 9px 34px 9px 10px !important;
      background: rgba(255, 255, 255, 0.9) !important;
      box-shadow: 0 6px 14px rgba(35, 23, 13, 0.055);
      min-height: 39px;
      align-items: center !important;
      position: relative;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }
    #pizza-selector label:hover,
    #base-selector label:hover {
      transform: translateY(-1px);
      border-color: rgba(210, 56, 34, 0.32) !important;
      box-shadow: 0 10px 20px rgba(98, 56, 28, 0.09);
    }
    #pizza-selector input[type="radio"],
    #base-selector input[type="radio"] {
      accent-color: var(--tomato);
    }
    #pizza-selector label:has(input:checked),
    #base-selector label:has(input:checked) {
      border-color: rgba(210, 56, 34, 0.58) !important;
      background: linear-gradient(135deg, #fff6f2, #fffaf0) !important;
      box-shadow: 0 12px 24px rgba(199, 53, 33, 0.13);
    }
    #pizza-selector label:has(input:checked)::after,
    #base-selector label:has(input:checked)::after {
      content: "\\2713";
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--tomato);
      color: white;
      font-size: 12px;
      font-weight: 900;
      box-shadow: 0 6px 12px rgba(210, 56, 34, 0.24);
    }
    #base-selector {
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 248, 242, 0.86)),
        repeating-linear-gradient(90deg, rgba(23, 107, 77, 0.02) 0, rgba(23, 107, 77, 0.02) 1px, transparent 1px, transparent 12px);
    }
    #base-selector label:has(input:checked) {
      border-color: rgba(23, 107, 77, 0.48) !important;
      background: linear-gradient(135deg, #f1fbf5, #fffaf0) !important;
      box-shadow: 0 12px 24px rgba(23, 107, 77, 0.1);
    }
    #base-selector label:has(input:checked)::after {
      background: var(--basil);
      box-shadow: 0 6px 12px rgba(23, 107, 77, 0.2);
    }
    .alert {
      padding: 12px 14px;
      border-radius: 8px;
      margin: 8px 0;
      font-weight: 650;
      border: 1px solid;
    }
    .alert.error {
      background: #fff1ef;
      color: var(--tomato-dark);
      border-color: #f0b6ae;
    }
    .alert.success {
      background: #edf8f3;
      color: #0d5138;
      border-color: #a9d9c5;
    }
    .visual-menu {
      display: grid;
      gap: 22px;
    }
    .visual-section {
      display: grid;
      gap: 12px;
    }
    .visual-section-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
    }
    .visual-section-head h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      letter-spacing: 0;
    }
    .visual-section-head span {
      color: var(--muted);
      font-size: 13px;
      font-weight: 650;
      white-space: nowrap;
    }
    .visual-grid {
      display: grid;
      gap: 14px;
    }
    .visual-grid-base {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
    .visual-grid-pizza {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .item-card {
      min-width: 0;
      background: #fffdfa;
      border: 1px solid rgba(129, 109, 82, 0.22);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }
    .item-card:hover {
      transform: translateY(-2px);
      border-color: rgba(199, 53, 33, 0.36);
      box-shadow: 0 18px 34px rgba(35, 23, 13, 0.14);
    }
    .item-card-pizza .item-card-image {
      aspect-ratio: 16 / 10;
    }
    .item-card-image {
      position: relative;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #eee8de;
    }
    .item-card-image img,
    .item-card-fallback {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      transition: transform 220ms ease;
    }
    .item-card:hover .item-card-image img {
      transform: scale(1.035);
    }
    .item-card-fallback {
      background: linear-gradient(135deg, #f4d48f, #d94d32 46%, #176b4d);
    }
    .item-code {
      position: absolute;
      left: 10px;
      top: 10px;
      background: rgba(18, 18, 18, 0.88);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
    }
    .item-card-copy {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px 13px;
      min-height: 74px;
    }
    .item-card-title {
      min-width: 0;
    }
    .item-card-title span {
      display: block;
      font-size: 11px;
      color: var(--muted);
      font-weight: 750;
      line-height: 1;
    }
    .item-card-title h3 {
      margin: 5px 0 0;
      color: var(--ink);
      font-size: 15px;
      line-height: 1.22;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    .item-card-price {
      display: grid;
      justify-items: end;
      gap: 7px;
      padding-top: 2px;
    }
    .item-card-price strong {
      color: var(--ink);
      white-space: nowrap;
      font-size: 13px;
      line-height: 1.15;
    }
    .item-tag {
      border-radius: 999px;
      padding: 4px 7px;
      font-size: 10px;
      line-height: 1;
      font-weight: 800;
      white-space: nowrap;
      border: 1px solid transparent;
    }
    .item-tag-neutral {
      color: #5a4a35;
      background: #fff2d8;
      border-color: #ead3a2;
    }
    .item-tag-veg {
      color: #0f5a3f;
      background: #eaf7ef;
      border-color: #aad8bd;
    }
    .item-tag-premium {
      color: #7a4213;
      background: #fff0d7;
      border-color: #f1c27b;
    }
    .item-tag-nonveg {
      color: #8f2116;
      background: #fff1ef;
      border-color: #f0b6ae;
    }
    #topping-selector {
      border: 1px solid rgba(210, 56, 34, 0.18);
      border-radius: 8px;
      padding: 14px;
      background:
        linear-gradient(135deg, rgba(255, 246, 235, 0.96), rgba(255, 255, 255, 0.82)),
        repeating-linear-gradient(90deg, rgba(210, 56, 34, 0.025) 0, rgba(210, 56, 34, 0.025) 1px, transparent 1px, transparent 10px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 10px 24px rgba(98, 56, 28, 0.07);
    }
    #topping-selector label {
      border: 1px solid #ddd8cf !important;
      border-radius: 8px !important;
      padding: 10px 11px !important;
      background: rgba(255, 255, 255, 0.88) !important;
      box-shadow: 0 6px 14px rgba(35, 23, 13, 0.055);
      min-height: 44px;
      align-items: center !important;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }
    #topping-selector label:hover {
      transform: translateY(-1px);
      border-color: rgba(210, 56, 34, 0.28) !important;
      box-shadow: 0 10px 20px rgba(98, 56, 28, 0.09);
    }
    #topping-selector input[type="checkbox"] {
      accent-color: var(--tomato);
    }
    #topping-selector label:has(input:checked) {
      border-color: rgba(199, 53, 33, 0.54) !important;
      background:
        linear-gradient(135deg, #fff6f2, #fffaf0) !important;
      box-shadow: 0 12px 24px rgba(199, 53, 33, 0.13);
    }
    #topping-selector label span {
      line-height: 1.2;
    }
    #cart-panel {
      align-self: start;
    }
    .empty-cart {
      border: 1px dashed rgba(129, 109, 82, 0.42);
      border-radius: 8px;
      padding: 20px;
      display: grid;
      gap: 4px;
      color: var(--muted);
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(246, 239, 229, 0.88)),
        repeating-linear-gradient(0deg, rgba(91, 75, 53, 0.04) 0, rgba(91, 75, 53, 0.04) 1px, transparent 1px, transparent 8px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
    }
    .empty-cart strong {
      color: #2d261e;
      font-size: 16px;
    }
    .summary-box {
      border: 1px solid rgba(129, 109, 82, 0.22);
      border-radius: 8px;
      overflow: hidden;
      background: linear-gradient(180deg, #fffdfa, #fbf4e9);
      margin-top: 12px;
      box-shadow: 0 10px 22px rgba(47, 35, 22, 0.08);
    }
    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #eceef2;
      gap: 16px;
    }
    .summary-row span {
      color: var(--muted);
    }
    .summary-row.positive strong {
      color: var(--basil);
    }
    .summary-row.total {
      background: linear-gradient(90deg, #14231d, #173d2d);
      color: white;
      border-bottom: 0;
    }
    .summary-row.total span {
      color: rgba(255, 255, 255, 0.78);
    }
    .summary-row.total strong {
      color: #fffaf0;
    }
    .cart-lines {
      display: grid;
      gap: 10px;
      margin: 4px 0 14px;
    }
    .cart-line-card {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      border: 1px solid rgba(129, 109, 82, 0.2);
      border-radius: 8px;
      padding: 12px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(252, 246, 237, 0.94)),
        repeating-linear-gradient(0deg, rgba(91, 75, 53, 0.03) 0, rgba(91, 75, 53, 0.03) 1px, transparent 1px, transparent 8px);
      box-shadow: 0 9px 20px rgba(47, 35, 22, 0.07);
    }
    .cart-line-index {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #17130f, #2b2118);
      color: #ffffff !important;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 8px 16px rgba(23, 19, 15, 0.18);
    }
    .cart-line-main {
      min-width: 0;
      display: grid;
      gap: 4px;
    }
    .cart-line-main strong {
      color: var(--ink);
      line-height: 1.2;
    }
    .cart-line-main span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .cart-line-meta {
      display: grid;
      justify-items: end;
      gap: 4px;
      white-space: nowrap;
    }
    .cart-line-meta span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
    }
    .cart-line-meta strong {
      color: var(--ink);
      font-size: 15px;
    }
    .log-line {
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
      background: linear-gradient(135deg, #111827, #14231d);
      color: #f9fafb;
      border-radius: 8px;
      padding: 12px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    #builder-panel button,
    #checkout-panel button {
      border-radius: 8px !important;
      min-height: 46px;
      font-weight: 850 !important;
      letter-spacing: 0;
      transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
    }
    #builder-panel button:hover,
    #checkout-panel button:hover {
      transform: translateY(-1px);
    }
    button.primary {
      background: linear-gradient(135deg, #d23822, #a92b1b) !important;
      border-color: rgba(143, 33, 22, 0.84) !important;
      box-shadow: 0 12px 24px rgba(210, 56, 34, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
    }
    #checkout-panel button.primary {
      background: linear-gradient(135deg, #176b4d, #0f4b36) !important;
      border-color: rgba(15, 75, 54, 0.86) !important;
      box-shadow: 0 12px 24px rgba(23, 107, 77, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
    }
    table {
      border-radius: 8px;
    }
    @media (max-width: 900px) {
      body::before {
        background-attachment: scroll;
      }
      .hero {
        min-height: 230px;
      }
      .hero-content {
        padding: 26px;
      }
      .hero h1 {
        font-size: 34px !important;
      }
      .order-context {
        grid-template-columns: 1fr;
      }
      .service-tabs,
      .menu-filters {
        justify-content: flex-start;
      }
      .visual-grid-base,
      .visual-grid-pizza {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 901px) and (max-width: 1120px) {
      .visual-grid-base {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .visual-grid-pizza {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 560px) {
      .visual-grid-base,
      .visual-grid-pizza {
        grid-template-columns: 1fr;
      }
      .hero-chips span {
        font-size: 12px;
      }
      .gradio-container {
        padding: 12px 10px 30px !important;
      }
      .gradio-container::before {
        top: 0;
        left: -100vw;
        right: -100vw;
        height: 390px;
      }
      .cart-line-card {
        grid-template-columns: 34px minmax(0, 1fr);
      }
      .cart-line-meta {
        grid-column: 2;
        justify-items: start;
      }
      .item-card-copy {
        min-height: 62px;
      }
    }
    </style>
    """.replace("__PAGE_BACKDROP__", backdrop_css)
    hero_style = (
        f"background-image: linear-gradient(90deg, rgba(10,10,10,.92), rgba(10,10,10,.5) 46%, rgba(10,10,10,.12)), url('{hero_image}');"
        if hero_image
        else "background: #171717;"
    )
    base_choices = [choice_label(index, item) for index, item in enumerate(MENUS["bases"], start=1)] if MENUS else []
    pizza_choices = [choice_label(index, item) for index, item in enumerate(MENUS["pizzas"], start=1)] if MENUS else []
    topping_choices = [choice_label(index, item) for index, item in enumerate(MENUS["toppings"], start=1)] if MENUS else []

    with gr.Blocks(title="SliceMatic Gradio MVP") as demo:
        gr.HTML(css)
        gr.HTML(
            f"""
            <section class="hero" style="{hero_style}">
              <div class="hero-content">
                <h1>SliceMatic</h1>
                <p>Build India-ready custom pizza orders with clear add-ons, GST, payment confirmation, and a cart that respects kitchen capacity.</p>
                <div class="hero-chips">
                  <span>New Ashok Nagar</span>
                  <span>Max 10 pizzas/order</span>
                  <span>10% off at 5+ pizzas</span>
                  <span>GST billed at checkout</span>
                </div>
              </div>
            </section>
            """
        )

        if STARTUP_ERROR:
            gr.HTML(alert_html(f"Startup blocked: {STARTUP_ERROR}"))

        gr.HTML(order_context_html())
        cart_state = gr.State([])

        if MENUS:
            with gr.Column(elem_id="menu-panel"):
                gr.HTML(menu_preview_html(MENUS))

        with gr.Row(equal_height=False):
            with gr.Column(scale=6, elem_id="builder-panel"):
                gr.Markdown("## Build order")
                with gr.Row(elem_id="selection-row"):
                    pizza_choice = gr.Radio(
                        label="Pizza",
                        choices=pizza_choices,
                        value=pizza_choices[0] if pizza_choices else None,
                        interactive=STARTUP_ERROR is None,
                        elem_id="pizza-selector",
                    )
                    base_choice = gr.Radio(
                        label="Base",
                        choices=base_choices,
                        value=base_choices[0] if base_choices else None,
                        interactive=STARTUP_ERROR is None,
                        elem_id="base-selector",
                    )
                topping_choice = gr.CheckboxGroup(
                    label="Add toppings",
                    choices=topping_choices,
                    value=[],
                    interactive=STARTUP_ERROR is None,
                    elem_id="topping-selector",
                )
                quantity = gr.Slider(
                    label="Quantity for this pizza",
                    minimum=1,
                    maximum=10,
                    step=1,
                    value=1,
                    interactive=STARTUP_ERROR is None,
                    buttons=[],
                )
                add_message = gr.HTML()
                with gr.Row():
                    add_button = gr.Button("Add to cart", variant="primary", interactive=STARTUP_ERROR is None)
                    clear_button = gr.Button("Clear cart")

            with gr.Column(scale=5, elem_id="cart-panel"):
                gr.Markdown("## Cart")
                cart_table = gr.HTML(cart_lines_html([]))
                cart_summary = gr.HTML(cart_summary_html([]))

        with gr.Row(equal_height=False):
            with gr.Column(scale=7, elem_id="checkout-panel"):
                gr.Markdown("## Checkout")
                with gr.Row():
                    customer_name = gr.Textbox(label="Customer name", placeholder="Aman Sharma")
                    phone = gr.Textbox(label="Phone number", placeholder="9876543210")
                payment_choice = gr.Radio(
                    label="Payment mode",
                    choices=["Cash", "Card", "UPI"],
                    value="UPI",
                    interactive=STARTUP_ERROR is None,
                )
                checkout_button = gr.Button("Confirm and save order", variant="primary", interactive=STARTUP_ERROR is None)
            with gr.Column(scale=5, elem_id="status-panel"):
                gr.Markdown("## Order status")
                checkout_message = gr.HTML()
                saved_log_line = gr.HTML()

        add_button.click(
            fn=add_cart_line_ui,
            inputs=[base_choice, pizza_choice, topping_choice, quantity, cart_state],
            outputs=[add_message, cart_state, cart_table, cart_summary],
        )
        clear_button.click(
            fn=clear_cart_ui,
            inputs=[],
            outputs=[add_message, cart_state, cart_table, cart_summary],
        )
        checkout_button.click(
            fn=checkout_ui,
            inputs=[customer_name, phone, payment_choice, cart_state],
            outputs=[checkout_message, saved_log_line],
        )

    return demo


def main() -> None:
    app = build_app()
    server_name = os.getenv("GRADIO_SERVER_NAME", "127.0.0.1")
    server_port = int(os.getenv("GRADIO_SERVER_PORT", "7860"))
    app.launch(server_name=server_name, server_port=server_port, allowed_paths=[str(APP_DIR)])


if __name__ == "__main__":
    main()
