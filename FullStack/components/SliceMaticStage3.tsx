"use client";

import { createClient } from "@supabase/supabase-js";
import {
  BadgePercent,
  Brain,
  Check,
  ChefHat,
  CreditCard,
  Download,
  Flame,
  Gauge,
  Lock,
  Phone,
  Pizza,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Utensils
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BULK_DISCOUNT_QTY, MAX_ORDER_QTY, calculateBill, getLineUnitPrice, money, moneyExact, validateCustomer } from "../lib/pricing";
import { buildSeedSummary, seedMenu } from "../lib/seed-data";
import { AdminSummary, CartLine, CustomerDetails, MenuItem, MenuPayload, PaymentMode, Recommendation, SavedOrder } from "../lib/types";

type Step = "intake" | "recommendation" | "menu" | "checkout" | "tracking";
type AdminTab = "overview" | "orders" | "forecast" | "menu" | "ai" | "settings";

const paymentModes: Array<{ mode: PaymentMode; icon: React.ReactNode; copy: string }> = [
  { mode: "UPI", icon: <Phone />, copy: "Confirm receipt before fulfillment." },
  { mode: "Card", icon: <CreditCard />, copy: "Process on POS or payment link." },
  { mode: "Cash", icon: <ReceiptText />, copy: "Collect at delivery or counter." }
];

const demoAdminEmail = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "admin@slicematic.in";
const demoAdminPassword = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "slicematic-demo";

export default function SliceMaticStage3() {
  const [menu, setMenu] = useState<MenuPayload>(seedMenu);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<Step>("intake");
  const [customer, setCustomer] = useState<CustomerDetails>({ name: "", phone: "", address: "", deliveryZone: "2-4", note: "" });
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [builder, setBuilder] = useState({ baseId: seedMenu.bases[0].id, sizeId: seedMenu.sizes[0].id, toppingIds: [] as number[], quantity: 1 });
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [lastOrder, setLastOrder] = useState<SavedOrder | null>(null);
  const [toast, setToast] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [adminEmail, setAdminEmail] = useState(demoAdminEmail);
  const [adminPassword, setAdminPassword] = useState(demoAdminPassword);
  const [adminSummary, setAdminSummary] = useState<AdminSummary>(buildSeedSummary());
  const [adminPaymentFilter, setAdminPaymentFilter] = useState("All");
  const [adminDateFilter, setAdminDateFilter] = useState("");
  const [brand, setBrand] = useState({
    name: "SliceMatic",
    outlet: "New Ashok Nagar",
    hero: "Pizza delivery with a sharper kitchen, smarter recommendations, and a calmer checkout.",
    subhero: "Order from a live menu, build the exact pizza you want, and let the outlet control demand, revenue, and fulfilment from one polished screen."
  });

  useEffect(() => {
    fetch("/api/menu")
      .then((response) => response.json())
      .then((payload: MenuPayload) => setMenu(payload))
      .catch(() => setMenu(seedMenu));
    refreshAdminSummary();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const activePizzas = useMemo(() => menu.pizzas.filter((item) => item.available), [menu.pizzas]);
  const activeBases = useMemo(() => menu.bases.filter((item) => item.available), [menu.bases]);
  const activeSizes = useMemo(() => menu.sizes.filter((item) => item.available), [menu.sizes]);
  const activeToppings = useMemo(() => menu.toppings.filter((item) => item.available), [menu.toppings]);
  const totals = useMemo(() => calculateBill(cart, menu), [cart, menu]);

  const filteredPizzas = activePizzas.filter((pizza) => {
    const matchesCategory = category === "All" || pizza.tags?.includes(category);
    const haystack = `${pizza.name} ${pizza.description} ${pizza.tags?.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });

  const filteredOrders = adminSummary.recentOrders.filter((order) => {
    const matchesPayment = adminPaymentFilter === "All" || order.paymentMode === adminPaymentFilter;
    const matchesDate = !adminDateFilter || order.createdAt.slice(0, 10) === adminDateFilter;
    return matchesPayment && matchesDate;
  });

  function showToast(message: string) {
    setToast(message);
  }

  async function refreshAdminSummary(token = adminAccessToken) {
    try {
      const response = await fetch("/api/admin/orders", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) throw new Error("Admin summary unavailable");
      setAdminSummary(await response.json());
    } catch {
      setAdminSummary(buildSeedSummary());
    }
  }

  function customerValidation() {
    return validateCustomer(customer.name, customer.phone, customer.address, customer.deliveryZone);
  }

  function ensureCustomerReady() {
    const errors = customerValidation();
    setCustomerErrors(errors);
    if (Object.keys(errors).length) {
      setStep("intake");
      showToast("Complete customer intake before choosing pizzas.");
      return false;
    }
    return true;
  }

  function goToStep(nextStep: Step) {
    if (nextStep !== "intake" && !ensureCustomerReady()) return;
    if (nextStep === "checkout" && !cart.length) {
      showToast("Add at least one pizza before checkout.");
      return;
    }
    if (nextStep === "tracking" && !lastOrder) {
      showToast("Place an order before tracking.");
      return;
    }
    setStep(nextStep);
  }

  async function submitCustomer() {
    const errors = customerValidation();
    setCustomerErrors(errors);
    if (Object.keys(errors).length) {
      showToast("Fix the highlighted customer details.");
      return;
    }
    setStep("recommendation");
    setRecommendation(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: customer.name, phone: customer.phone })
      });
      setRecommendation(await response.json());
    } catch {
      setRecommendation({
        pizzaId: 8,
        toppingId: 2,
        pizzaName: "Paneer Tikka",
        toppingName: "Extra Cheese",
        reason: "A reliable first pick with strong repeat-order appeal.",
        confidence: 0.76,
        source: "fallback",
        customerTier: "new"
      });
    }
  }

  function openBuilder(pizza: MenuItem, fromRecommendation = false) {
    if (!ensureCustomerReady()) return;
    const base = activeBases[0];
    const size = activeSizes[0];
    if (!base || !size) {
      showToast("Admin must enable at least one crust and size.");
      return;
    }
    setSelectedPizza(pizza);
    setBuilder({
      baseId: base.id,
      sizeId: size.id,
      toppingIds: fromRecommendation && recommendation ? [recommendation.toppingId] : [],
      quantity: 1
    });
  }

  function addBuilderToCart() {
    if (!selectedPizza) return;
    if (!Number.isInteger(builder.quantity)) {
      showToast("Quantity must be a whole number from 1 to 10.");
      return;
    }
    if (builder.quantity < 1) {
      showToast("Quantity must be between 1 and 10.");
      return;
    }
    if (builder.quantity > MAX_ORDER_QTY) {
      showToast(`Maximum outlet capacity is ${MAX_ORDER_QTY} pizzas per order.`);
      return;
    }
    const existingQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);
    if (existingQuantity + builder.quantity > MAX_ORDER_QTY) {
      showToast(`Maximum outlet capacity is ${MAX_ORDER_QTY} pizzas per order.`);
      return;
    }
    setCart((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        pizzaId: selectedPizza.id,
        baseId: builder.baseId,
        sizeId: builder.sizeId,
        toppingIds: builder.toppingIds,
        quantity: builder.quantity
      }
    ]);
    setSelectedPizza(null);
    setStep("menu");
    showToast(`${selectedPizza.name} added to cart.`);
  }

  function removeCartLine(id: string) {
    setCart((current) => current.filter((line) => line.id !== id));
  }

  async function placeOrder() {
    if (!ensureCustomerReady()) return;
    if (!cart.length) {
      showToast("Add at least one pizza before checkout.");
      return;
    }
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customer,
        lines: cart,
        paymentMode,
        recommendationId: recommendation?.recommendationId ?? null
      })
    });
    const result = await response.json();
    if (!result.ok) {
      showToast(Object.values(result.errors ?? { server: "Could not place order." })[0] as string);
      return;
    }
    setLastOrder(result.order);
    setCart([]);
    setStep("tracking");
    refreshAdminSummary();
    showToast(paymentConfirmation(result.order.paymentMode));
  }

  async function adminLogin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createClient(url, anon);
      const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (error) {
        showToast(error.message);
        return;
      }
      const token = data.session?.access_token ?? "";
      setAdminAccessToken(token);
      setAdminLoggedIn(true);
      refreshAdminSummary(token);
      return;
    }
    if (adminEmail === demoAdminEmail && adminPassword === demoAdminPassword) {
      setAdminLoggedIn(true);
      refreshAdminSummary();
      showToast("Demo admin session opened.");
    } else {
      showToast("Use the demo admin credentials or configure Supabase Auth.");
    }
  }

  async function downloadCsv() {
    try {
      const response = await fetch("/api/admin/orders?format=csv", {
        headers: adminAccessToken ? { authorization: `Bearer ${adminAccessToken}` } : undefined
      });
      if (!response.ok) throw new Error("CSV export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "slicematic-orders.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("CSV export ready.");
    } catch {
      showToast("CSV export needs a valid admin session.");
    }
  }

  function paymentConfirmation(mode: PaymentMode) {
    if (mode === "UPI") return "UPI selected. Confirm receipt before dispatch.";
    if (mode === "Card") return "Card selected. Process POS or payment link before dispatch.";
    return "Cash selected. Collect payment at delivery or counter.";
  }

  function updatePizza(id: number, field: keyof MenuItem, value: string | number | boolean) {
    setMenu((current) => ({
      ...current,
      pizzas: current.pizzas.map((pizza) => pizza.id === id ? { ...pizza, [field]: value } : pizza)
    }));
  }

  function updateMenuItem(section: "bases" | "toppings", id: number, field: keyof MenuItem, value: string | number | boolean) {
    setMenu((current) => ({
      ...current,
      [section]: current[section].map((item) => item.id === id ? { ...item, [field]: value } : item)
    }));
  }

  function renderLine(line: CartLine) {
    const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
    const base = menu.bases.find((item) => item.id === line.baseId);
    const size = menu.sizes.find((item) => item.id === line.sizeId);
    const toppings = line.toppingIds.map((id) => menu.toppings.find((item) => item.id === id)?.name).filter(Boolean);
    return (
      <article className="cart-line" key={line.id}>
        <div>
          <strong>{line.quantity} x {pizza?.name}</strong>
          <span>{base?.name} / {size?.name} / {toppings.length ? toppings.join(", ") : "No extra toppings"}</span>
        </div>
        <div>
          <b>{money(getLineUnitPrice(line, menu) * line.quantity)}</b>
          <button type="button" onClick={() => removeCartLine(line.id)} aria-label="Remove line"><Trash2 /></button>
        </div>
      </article>
    );
  }

  return (
    <main className="app-frame">
      <header className="topbar">
        <a className="brand" href="#order">
          <span><Pizza /></span>
          <div>
            <strong>{brand.name}</strong>
            <small>{brand.outlet}</small>
          </div>
        </a>
        <nav>
          <a href="#order"><Utensils /> Order</a>
          <a href="#admin"><Settings2 /> Admin</a>
          <a href="#ai"><Brain /> AI</a>
        </nav>
        <div className="top-search">
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pizza, topping, base" />
        </div>
      </header>

      <section className="hero-shell" id="order">
        <aside className="status-rail">
          <div className="rail-card open">
            <span />
            <div><strong>Open now</strong><small>30-40 min delivery</small></div>
          </div>
          <div className="rail-card">
            <p className="eyebrow">Operating signals</p>
            <ul>
              <li><Check /> Live menu control</li>
              <li><Check /> Verified billing rules</li>
              <li><Check /> AI pairings</li>
              <li><Check /> Demand forecast</li>
            </ul>
          </div>
          <div className="rail-card metric">
            <ReceiptText /><strong>18%</strong><span>GST after discount</span>
            <BadgePercent /><strong>10%</strong><span>off on {BULK_DISCOUNT_QTY}+ pizzas</span>
            <Gauge /><strong>{MAX_ORDER_QTY}</strong><span>max pizzas/order</span>
          </div>
        </aside>

        <section className="order-stage">
          <div className="hero-card">
            <div>
              <p className="eyebrow">Elite delivery OS</p>
              <h1>{brand.hero}</h1>
              <p>{brand.subhero}</p>
              <div className="hero-actions">
                <button type="button" onClick={() => setStep("intake")}><Flame /> Start order</button>
                <a href="#admin"><ShieldCheck /> Admin dashboard</a>
              </div>
            </div>
            <img src="/assets/pizza-hero.jpg" alt="Fresh pizza" />
          </div>

          <div className="flow-tabs">
            {["intake", "recommendation", "menu", "checkout", "tracking"].map((item) => (
              <button key={item} className={step === item ? "active" : ""} onClick={() => goToStep(item as Step)} type="button">
                {item}
              </button>
            ))}
          </div>

          {step === "intake" && (
            <section className="glass-panel intake-grid">
              <div>
                <p className="eyebrow">Customer intake</p>
                <h2>Validated contact details before AI recommendation.</h2>
                <p className="muted">Stage 2 rules are preserved: name is alphabets/spaces only, phone must be Indian mobile format, and every failure gets a specific message.</p>
              </div>
              <div className="form-grid">
                <label>Name<input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Aarav Sharma" />{customerErrors.name && <em>{customerErrors.name}</em>}</label>
                <label>Phone<input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="9876543210" />{customerErrors.phone && <em>{customerErrors.phone}</em>}</label>
                <label>Delivery radius<select value={customer.deliveryZone ?? ""} onChange={(event) => setCustomer({ ...customer, deliveryZone: event.target.value as CustomerDetails["deliveryZone"] })}><option value="">Choose radius</option><option value="0-2">0-2 km priority zone</option><option value="2-4">2-4 km launch radius</option><option value="4-6">4-6 km expansion waitlist</option></select>{customerErrors.deliveryZone && <em>{customerErrors.deliveryZone}</em>}</label>
                <label className="wide">Delivery address<textarea value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} placeholder="Flat, landmark, street, New Ashok Nagar" />{customerErrors.address && <em>{customerErrors.address}</em>}</label>
                <label className="wide">Delivery note<input value={customer.note ?? ""} onChange={(event) => setCustomer({ ...customer, note: event.target.value })} placeholder="Ring bell once, leave with security..." /></label>
                <button className="primary wide" type="button" onClick={submitCustomer}><Brain /> Get AI recommendation</button>
              </div>
            </section>
          )}

          {step === "recommendation" && (
            <section className="glass-panel ai-recommendation" id="ai">
              <div>
                <p className="eyebrow">OpenRouter recommendation</p>
                <h2>{recommendation ? `${recommendation.pizzaName} + ${recommendation.toppingName}` : "Reading order history..."}</h2>
                <p>{recommendation?.reason ?? "The backend queries Supabase history, sends a compact profile to OpenRouter, validates menu IDs, and logs the recommendation event."}</p>
                {recommendation && <small>{recommendation.source === "openrouter" ? "OpenRouter response" : "Demo fallback"} / confidence {Math.round(recommendation.confidence * 100)}% / {recommendation.customerTier} customer</small>}
              </div>
              <div className="recommendation-actions">
                <button className="primary" type="button" disabled={!recommendation} onClick={() => {
                  const pizza = menu.pizzas.find((item) => item.id === recommendation?.pizzaId);
                  if (pizza) openBuilder(pizza, true);
                }}><Sparkles /> Build this combo</button>
                <button type="button" onClick={() => goToStep("menu")}><Utensils /> Browse menu</button>
              </div>
            </section>
          )}

          {step !== "intake" && (
          <section className="menu-section">
            <div className="section-head">
              <div><p className="eyebrow">Menu loaded from DB</p><h2>Signature pizzas</h2></div>
              <div className="category-row">
                {["All", "Veg", "Chicken", "Cheese", "Spicy"].map((item) => (
                  <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} type="button">{item}</button>
                ))}
              </div>
            </div>
            <div className="menu-grid">
              {filteredPizzas.map((pizza) => (
                <article className="pizza-card" key={pizza.id}>
                  <div className="pizza-media">
                    <img src={pizza.image} alt={pizza.name} />
                    <span><Sparkles /> {pizza.badge}</span>
                    <b><Star /> 4.{pizza.id}</b>
                  </div>
                  <div className="pizza-body">
                    <div><h3>{pizza.name}</h3><strong>{money(pizza.price)}</strong></div>
                    <p>{pizza.description}</p>
                    <div className="chips"><span><ChefHat /> Fresh</span><span>{pizza.prepMinutes} min</span>{pizza.tags?.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  </div>
                  <div className="pizza-actions">
                    <button className="primary" onClick={() => openBuilder(pizza)} type="button"><SlidersHorizontal /> Customize</button>
                    <button onClick={() => openBuilder(pizza)} type="button" aria-label={`Add ${pizza.name}`}><Plus /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          )}
        </section>

        <aside className="cart-panel">
          <div className="cart-head"><div><p className="eyebrow">Your order</p><h2>Cart</h2></div><ShoppingBag /></div>
          {cart.length ? cart.map(renderLine) : <div className="empty-cart">Your cart is waiting.<br /><span>Build a pizza to see live totals.</span></div>}
          <div className="summary">
            <div><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
            <div><span>Quantity discount</span><b>- {money(totals.discount)}</b></div>
            <div><span>GST 18%</span><b>{money(totals.gst)}</b></div>
            <div><span>Delivery</span><b>Included</b></div>
            <div className="total"><span>Total</span><b>{moneyExact(totals.finalTotal)}</b></div>
          </div>
          <button className="primary" disabled={!cart.length} onClick={() => goToStep("checkout")} type="button">Continue to checkout <Send /></button>
        </aside>
      </section>

      {step === "checkout" && (
        <section className="checkout-panel">
          <div><p className="eyebrow">Checkout</p><h2>Confirm payment and bill</h2></div>
          <div className="payment-grid">
            {paymentModes.map((payment) => (
              <button key={payment.mode} className={paymentMode === payment.mode ? "active" : ""} onClick={() => setPaymentMode(payment.mode)} type="button">
                {payment.icon}<strong>{payment.mode}</strong><span>{payment.copy}</span>
              </button>
            ))}
          </div>
          <button className="primary" onClick={placeOrder} type="button"><Send /> Place order</button>
        </section>
      )}

      {step === "tracking" && lastOrder && (
        <section className="tracking-grid">
          <div className="map-card"><div className="route-line" /><span className="pin store">S</span><span className="pin home">H</span><div className="rider-card">Ravi assigned<br /><small>Arrives in 34 min</small></div></div>
          <div className="tracking-card">
            <p className="eyebrow">Live tracking</p><h2>Order {lastOrder.id.slice(0, 8)} confirmed</h2>
            <div className="payment-confirmation">{paymentConfirmation(lastOrder.paymentMode)}</div>
            {["Order accepted", "In the oven", "Quality check", "Out for delivery", "At doorstep"].map((item, index) => (
              <div className="timeline-item" key={item}><span className={index < 2 ? "done" : ""}>{index < 2 ? <Check /> : index + 1}</span><div><strong>{item}</strong><small>{index === 1 ? "Kitchen is baking selected crust and toppings." : "Tracked in the order lifecycle."}</small></div></div>
            ))}
          </div>
          <div className="tracking-card final-bill">
            <p className="eyebrow">Final bill</p><h2>{moneyExact(lastOrder.finalTotal)}</h2>
            <div className="bill-lines">
              {lastOrder.lines.map((line, index) => (
                <div key={`${line.pizzaName}-${index}`}>
                  <span>{line.quantity} x {line.baseName} / {line.pizzaName} / {line.sizeName}</span>
                  <b>{moneyExact(line.lineTotal)}</b>
                  <small>{line.toppings.length ? line.toppings.join(", ") : "No extra toppings"}</small>
                </div>
              ))}
            </div>
            <div className="summary">
              <div><span>Subtotal</span><b>{moneyExact(lastOrder.subtotal)}</b></div>
              <div><span>Quantity discount</span><b>- {moneyExact(lastOrder.discount)}</b></div>
              <div><span>GST 18%</span><b>{moneyExact(lastOrder.gst)}</b></div>
              <div><span>Payment mode</span><b>{lastOrder.paymentMode}</b></div>
              <div className="total"><span>Final payable</span><b>{moneyExact(lastOrder.finalTotal)}</b></div>
            </div>
            <small>Delivery zone {lastOrder.deliveryZone ?? customer.deliveryZone} km / {lastOrder.address ?? customer.address}</small>
          </div>
        </section>
      )}

      <section className="admin-section" id="admin">
        <div className="admin-hero">
          <div><p className="eyebrow">Admin + analytics</p><h2>Supabase-backed control room for revenue, orders, AI and forecast operations.</h2></div>
          <button className="primary" type="button" onClick={downloadCsv}><Download /> Export CSV</button>
        </div>
        {!adminLoggedIn ? (
          <div className="login-card">
            <Lock /><h3>Admin login</h3><p>Use Supabase Auth in production. Local demo credentials are prefilled.</p>
            <input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
            <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            <button className="primary" onClick={adminLogin} type="button"><ShieldCheck /> Sign in</button>
          </div>
        ) : (
          <>
            <div className="admin-tabs">
              {(["overview", "orders", "forecast", "menu", "ai", "settings"] as AdminTab[]).map((tab) => <button key={tab} className={adminTab === tab ? "active" : ""} onClick={() => setAdminTab(tab)} type="button">{tab}</button>)}
            </div>
            {adminTab === "overview" && <AdminOverview summary={adminSummary} />}
            {adminTab === "orders" && (
              <section className="admin-card">
                <div className="filters"><input type="date" value={adminDateFilter} onChange={(event) => setAdminDateFilter(event.target.value)} /><select value={adminPaymentFilter} onChange={(event) => setAdminPaymentFilter(event.target.value)}><option>All</option><option>UPI</option><option>Card</option><option>Cash</option></select></div>
                <OrderTable orders={filteredOrders} />
              </section>
            )}
            {adminTab === "forecast" && <ForecastPanel summary={adminSummary} />}
            {adminTab === "menu" && (
              <section className="admin-card menu-editor">
                <div className="menu-editor-section wide"><p className="eyebrow">Pizza catalogue</p></div>
                {menu.pizzas.map((pizza) => (
                  <article key={pizza.id}>
                    <img src={pizza.image} alt="" />
                    <input value={pizza.name} onChange={(event) => updatePizza(pizza.id, "name", event.target.value)} />
                    <input type="number" min={0} value={pizza.price} onChange={(event) => updatePizza(pizza.id, "price", Number(event.target.value))} />
                    <label><input type="checkbox" checked={pizza.available} onChange={(event) => updatePizza(pizza.id, "available", event.target.checked)} /> Available</label>
                  </article>
                ))}
                <div className="menu-editor-section wide"><p className="eyebrow">Bases</p></div>
                {menu.bases.map((base) => (
                  <article className="compact" key={base.id}>
                    <strong>{base.code}</strong>
                    <input value={base.name} onChange={(event) => updateMenuItem("bases", base.id, "name", event.target.value)} />
                    <input type="number" min={0} value={base.price} onChange={(event) => updateMenuItem("bases", base.id, "price", Number(event.target.value))} />
                    <label><input type="checkbox" checked={base.available} onChange={(event) => updateMenuItem("bases", base.id, "available", event.target.checked)} /> Available</label>
                  </article>
                ))}
                <div className="menu-editor-section wide"><p className="eyebrow">Toppings</p></div>
                {menu.toppings.map((topping) => (
                  <article className="compact" key={topping.id}>
                    <strong>{topping.code}</strong>
                    <input value={topping.name} onChange={(event) => updateMenuItem("toppings", topping.id, "name", event.target.value)} />
                    <input type="number" min={0} value={topping.price} onChange={(event) => updateMenuItem("toppings", topping.id, "price", Number(event.target.value))} />
                    <label><input type="checkbox" checked={topping.available} onChange={(event) => updateMenuItem("toppings", topping.id, "available", event.target.checked)} /> Available</label>
                  </article>
                ))}
              </section>
            )}
            {adminTab === "ai" && <AIPanel />}
            {adminTab === "settings" && (
              <section className="admin-card settings-grid">
                <label>Brand<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label>
                <label>Outlet<input value={brand.outlet} onChange={(event) => setBrand({ ...brand, outlet: event.target.value })} /></label>
                <label>Hero headline<textarea value={brand.hero} onChange={(event) => setBrand({ ...brand, hero: event.target.value })} /></label>
                <label>Hero copy<textarea value={brand.subhero} onChange={(event) => setBrand({ ...brand, subhero: event.target.value })} /></label>
              </section>
            )}
          </>
        )}
      </section>

      {selectedPizza && (
        <div className="builder-overlay" onClick={() => setSelectedPizza(null)}>
          <section className="builder-panel" onClick={(event) => event.stopPropagation()}>
            <img src={selectedPizza.image} alt={selectedPizza.name} />
            <div>
              <p className="eyebrow">Customize pizza</p><h2>{selectedPizza.name}</h2><p>{selectedPizza.description}</p>
              <div className="builder-group"><h3>Crust</h3>{activeBases.map((base) => <button className={builder.baseId === base.id ? "active" : ""} onClick={() => setBuilder({ ...builder, baseId: base.id })} key={base.id} type="button">{base.name}<span>{money(base.price)}</span></button>)}</div>
              <div className="builder-group"><h3>Size</h3>{activeSizes.map((size) => <button className={builder.sizeId === size.id ? "active" : ""} onClick={() => setBuilder({ ...builder, sizeId: size.id })} key={size.id} type="button">{size.name}<span>{size.extra ? `+ ${money(size.extra)}` : "Included"}</span></button>)}</div>
              <div className="builder-group toppings"><h3>Toppings</h3>{activeToppings.map((topping) => <label key={topping.id}><input type="checkbox" checked={builder.toppingIds.includes(topping.id)} onChange={(event) => setBuilder((current) => ({ ...current, toppingIds: event.target.checked ? [...current.toppingIds, topping.id] : current.toppingIds.filter((id) => id !== topping.id) }))} />{topping.name}<span>+ {money(topping.price)}</span></label>)}</div>
              <div className="builder-footer"><input type="number" min={1} max={10} value={builder.quantity} onChange={(event) => setBuilder({ ...builder, quantity: Number(event.target.value) })} /><strong>{money(getLineUnitPrice({ id: "preview", pizzaId: selectedPizza.id, baseId: builder.baseId, sizeId: builder.sizeId, toppingIds: builder.toppingIds, quantity: 1 }, menu) * builder.quantity)}</strong><button className="primary" onClick={addBuilderToCart} type="button"><ShoppingBag /> Add to cart</button></div>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function AdminOverview({ summary }: { summary: AdminSummary }) {
  return (
    <section className="admin-card">
      <div className="kpi-grid">
        <div><span>Total revenue</span><strong>{moneyExact(summary.totalRevenue)}</strong></div>
        <div><span>Orders</span><strong>{summary.orderCount}</strong></div>
        <div><span>AOV</span><strong>{moneyExact(summary.avgOrderValue)}</strong></div>
        <div><span>Top pizza</span><strong>{summary.topPizza}</strong></div>
      </div>
      <div className="chart-grid">
        <div><h3>Hourly demand</h3><ResponsiveContainer width="100%" height={260}><BarChart data={summary.hourlyDemand}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Bar dataKey="orders" fill="#d33f2f" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div><h3>Payment mix</h3><ResponsiveContainer width="100%" height={260}><AreaChart data={summary.paymentMix}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mode" /><YAxis /><Tooltip /><Area dataKey="revenue" fill="#166d45" stroke="#166d45" /></AreaChart></ResponsiveContainer></div>
      </div>
    </section>
  );
}

function ForecastPanel({ summary }: { summary: AdminSummary }) {
  return (
    <section className="admin-card forecast-card">
      <div><p className="eyebrow">Demand intelligence</p><h2>Next 7 peak windows</h2><p>Lightweight regression-style forecast from historical hourly demand. This supports staffing, rider planning, and prep batching.</p></div>
      <ResponsiveContainer width="100%" height={310}><AreaChart data={summary.forecast}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Area dataKey="predictedOrders" fill="#2f6f98" stroke="#2f6f98" /></AreaChart></ResponsiveContainer>
      <div className="forecast-list">{summary.forecast.slice(0, 3).map((item) => <div key={item.label}><strong>{item.label}</strong><span>{item.predictedOrders} orders / {Math.round(item.confidence * 100)}% confidence</span></div>)}</div>
    </section>
  );
}

function OrderTable({ orders }: { orders: SavedOrder[] }) {
  return (
    <div className="order-table">
      <div className="order-row head"><span>Order</span><span>Customer</span><span>Payment</span><span>Total</span><span>Status</span></div>
      {orders.map((order) => <div className="order-row" key={order.id}><span>{order.id.slice(0, 8)}</span><span>{order.customerName}<small>{order.phone}</small></span><span>{order.paymentMode}</span><span>{moneyExact(order.finalTotal)}</span><span>{order.status}</span></div>)}
    </div>
  );
}

function AIPanel() {
  return (
    <section className="admin-card ai-panel">
      <Brain /><h2>OpenRouter AI Recommendation Engine</h2>
      <p>Triggered after name and phone, before menu selection. The API builds a customer feature profile from Supabase history, sends grounded menu IDs to OpenRouter, validates returned IDs, logs `recommendation_event`, and falls back safely during rate limits.</p>
      <pre>{`System prompt summary:
Only recommend from provided menu IDs.
Personalize with favourite pizza, topping, AOV, quantity, veg/spicy lean, and recency.
Use local favourites and high-value topping signals for new customers.
Prefer customer fit and contribution margin without forcing discounts.
Return strict JSON: pizza_id, topping_id, reason, confidence.
Model: OPENROUTER_MODEL (default openai/gpt-oss-20b).`}</pre>
    </section>
  );
}
