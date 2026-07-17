"use client";

/**
 * CustomerShell — the customer-facing application shell.
 * Replaces SliceMaticStage3.tsx. Contains NO admin code.
 * Admin lives exclusively at /admin-dashboard.
 */

import { BadgePercent, Check, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CustomerDetails } from "../lib/types";
import { useRouter } from "next/navigation";
import { calculateBill, money, validateCustomer } from "../lib/pricing";
import { fetchOutletPricingConfig } from "../lib/customer-flow";
import { seedMenu } from "../lib/seed-data";
import { applyOrderToSession, syncSessionCustomerId } from "../lib/session-customer";
import type { MenuItem, MenuPayload, PricingConfig } from "../lib/types";
import { useStore } from "../lib/store";

// ── Feature components ────────────────────────────────────────────────────────
import { AppHeader } from "./AppHeader";
import { MenuCatalog, PizzaBuilderDialog } from "../features/menu/components";
import {
  CartRail,
  CustomerFlowTabs,
  CustomerIntakeForm,
  RecommendationLane,
} from "../features/customer-ordering/components";
import { CustomerAccountPanel } from "../features/customer-ordering/components/CustomerAccountPanel";

// ── Feature hooks ─────────────────────────────────────────────────────────────
import { useCustomerAuth } from "../features/customer-ordering/hooks/useCustomerAuth";
import { useOrderHistory } from "../features/customer-ordering/hooks/useOrderHistory";

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = "intake" | "recommendation" | "menu" | "checkout" | "tracking";
type Workspace = "customer" | "account";

function snapshotMenuBaseline(payload: MenuPayload) {
  const baseline: Record<string, Pick<MenuItem, "name" | "price" | "available">> = {};
  (["pizzas", "bases", "toppings"] as const).forEach((section) => {
    payload[section].forEach((item) => {
      baseline[`${section}:${item.id}`] = { name: item.name, price: item.price, available: item.available };
    });
  });
  return baseline;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerShell({ onUnauthorize }: { onUnauthorize?: () => void }) {
  const router = useRouter();
  const {
    cart, setCart, customer, setCustomer,
    pricingConfig, setPricingConfig,
    paymentMode, setPaymentMode,
    lastOrder,
    recommendation, setRecommendation,
    recommendations, setRecommendations,
  } = useStore();

  // ── UI shell state ────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("menu");
  const [workspace, setWorkspace] = useState<Workspace>("customer");
  const [toast, setToast] = useState("");
  // true when an admin is using 'View as Customer' — keeps Admin console tab visible
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});

  // ── Menu state ────────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuPayload>(seedMenu);
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [builder, setBuilder] = useState({
    baseId: seedMenu.bases[0].id,
    sizeId: seedMenu.sizes[0].id,
    toppingIds: [] as number[],
    quantity: 1,
  });
  const [cartInsight, setCartInsight] = useState<null | {
    headline: string; message: string; nextAction: string;
    suggestedPizzaId?: number; suggestedPizzaName?: string;
    suggestedToppingId?: number; suggestedToppingName?: string;
    expectedImpact: string; confidence: number;
  }>(null);
  const [cartInsightLoading, setCartInsightLoading] = useState(false);
  const [brand] = useState({
    name: "SliceMatic", outlet: "New Ashok Nagar",
    openStatus: "Open now", deliveryPromise: "30-40 min delivery",
    hero: "Pizza delivery with a sharper kitchen, smarter recommendations, and a calmer checkout.",
    subhero: "Order from a live menu, build the exact pizza you want, and let the outlet control demand, revenue, and fulfilment from one polished screen.",
  });

  // ── Feature hooks ─────────────────────────────────────────────────────────
  const { customerOrders, customerOrdersLoading, customerOrdersError, refreshCustomerOrders, clearOrders } =
    useOrderHistory();
  const customerAuth = useCustomerAuth(
    (_email) => {
      setWorkspace("customer");
      setStep("menu");
      void refreshCustomerOrders(true);
    },
    () => { clearOrders(); setStep("intake"); }
  );

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = useStore.getState();
    if (!s.customer.address || s.customer.address === "Delhi NCR") {
      s.setCustomer({ ...s.customer, address: "New Ashok Nagar, Delhi NCR" });
    }
    fetch("/api/menu")
      .then((r) => r.json())
      .then((payload: MenuPayload) => { setMenu(payload); })
      .catch(() => setMenu(seedMenu));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cfReturnOrderId = params.get("order_id");
    const cfPending = localStorage.getItem("cf_pending");
    if (cfReturnOrderId && cfPending) {
      localStorage.removeItem("cf_pending");
      window.history.replaceState({}, "", window.location.pathname);
    }
    const isCustomerRecovery = params.get("customerReset") === "true";
    if (isCustomerRecovery) { setWorkspace("account"); customerAuth.showCustomerAuthView("reset"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Admin users without preview flag → redirect to admin-dashboard
    const adminViewCustomer = window.sessionStorage.getItem("slicematic_admin_view_customer") === "true";
    const isAdmin = window.sessionStorage.getItem("slicematic_is_admin") === "true";
    if (isAdmin && !adminViewCustomer) {
      router.replace("/admin-dashboard"); return;
    }
    // Admin in View-as-Customer mode: keep the Admin console tab visible so they can return
    if (isAdmin && adminViewCustomer) setIsAdminSession(true);
    const loggedInValue = window.sessionStorage.getItem("slicematic_customer_logged_in");
    if (loggedInValue === "true") {
      const email = window.sessionStorage.getItem("slicematic_customer_email") ?? "";
      const customerJson = window.sessionStorage.getItem("slicematic_customer");
      let phoneFromSession = "";
      let nameFromSession = "";
      if (customerJson) {
        try {
          const parsed = JSON.parse(customerJson) as Partial<CustomerDetails>;
          phoneFromSession = parsed.phone ?? "";
          nameFromSession = parsed.name ?? "";
          setCustomer((c) => ({
            ...c,
            name: parsed.name ?? c.name,
            phone: parsed.phone ?? c.phone,
            address: (!parsed.address || parsed.address === "Delhi NCR") ? "New Ashok Nagar, Delhi NCR" : parsed.address,
            deliveryZone: parsed.deliveryZone ?? c.deliveryZone,
            note: parsed.note ?? c.note,
          }));
        } catch { /* ignore */ }
      }
      customerAuth.setCustomerLoggedIn(true);
      customerAuth.setCustomerSessionEmail(email || phoneFromSession || "");
      const reopenAccount = window.sessionStorage.getItem("slicematic_workspace") === "account";
      setWorkspace(reopenAccount ? "account" : "customer");
      void refreshCustomerOrders(true);
      if (phoneFromSession || email) {
        setStep("recommendation");
        const hasCached = useStore.getState().recommendations.length > 0;
        if (!hasCached) void submitCustomer(nameFromSession || undefined, phoneFromSession || undefined, false, email);
      } else {
        setStep("menu");
      }
    } else if (loggedInValue === "false") {
      customerAuth.setCustomerLoggedIn(false);
      customerAuth.setCustomerSessionEmail("");
      setStep("intake");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (workspace === "account") window.sessionStorage.setItem("slicematic_workspace", "account");
    else window.sessionStorage.removeItem("slicematic_workspace");
  }, [workspace]);

  useEffect(() => {
    if (workspace !== "account" || !customerAuth.customerLoggedIn) return;
    void refreshCustomerOrders(true);
  }, [workspace, customerAuth.customerLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchOutletPricingConfig().then((c) => { if (c) setPricingConfig(c); });
    const interval = window.setInterval(() => {
      void fetchOutletPricingConfig().then((c) => { if (c) setPricingConfig(c); });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [setPricingConfig]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setCartInsight(null); }, [cart]);

  useEffect(() => {
    if (!customerAuth.customerLoggedIn && !pricingConfig.guestCashAllowed && paymentMode === "Cash") {
      setPaymentMode("UPI");
    }
  }, [customerAuth.customerLoggedIn, paymentMode, pricingConfig.guestCashAllowed, setPaymentMode]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const activePizzas = useMemo(() => menu.pizzas.filter((i) => i.available), [menu.pizzas]);
  const activeBases = useMemo(() => menu.bases.filter((i) => i.available), [menu.bases]);
  const activeSizes = useMemo(() => menu.sizes.filter((i) => i.available), [menu.sizes]);
  const activeToppings = useMemo(() => menu.toppings.filter((i) => i.available), [menu.toppings]);
  const totals = useMemo(() => calculateBill(cart, menu, pricingConfig), [cart, menu, pricingConfig]);
  const customerOrderMode = customerAuth.customerLoggedIn ? "Member order" : "Guest order";

  function showToast(message: string) { setToast(message); }

  // ── Navigation ────────────────────────────────────────────────────────────
  function openCustomer() { setWorkspace("customer"); }
  function openAccount() {
    if (!customerAuth.customerLoggedIn) {
      // Not logged in → always route to EntryPortal (single source of truth for login)
      if (onUnauthorize) { onUnauthorize(); return; }
      router.replace("/"); return;
    }
    setSelectedPizza(null);
    setWorkspace("account");
    void refreshCustomerOrders(true);
  }
  function openAdminDashboard() {
    // Mark as admin_view_customer=false so admin-dashboard redirect works
    window.sessionStorage.removeItem("slicematic_admin_view_customer");
    router.push("/admin-dashboard");
  }

  function customerValidation() {
    return validateCustomer(customer.name, customer.phone, customer.address, customer.deliveryZone, pricingConfig);
  }

  function ensureCustomerReady() {
    const errors = customerValidation();
    setCustomerErrors(errors);
    if (Object.keys(errors).length) { setStep("intake"); showToast("Complete customer intake before choosing pizzas."); return false; }
    return true;
  }

  function goToStep(nextStep: Step) {
    setWorkspace("customer");
    if (nextStep !== "intake" && !ensureCustomerReady()) return;
    if (nextStep === "checkout") {
      if (!cart.length) { showToast("Add at least one pizza before checkout."); return; }
      router.push("/payment"); return;
    }
    if (nextStep === "tracking") {
      if (!lastOrder) { showToast("Place an order before tracking."); return; }
      router.push("/confirmation"); return;
    }
    setStep(nextStep);
  }

  async function submitCustomer(autoName?: string, autoPhone?: string, forceRefresh = false, autoEmail?: string) {
    const name = autoName ?? customer.name;
    const phone = autoPhone ?? customer.phone;
    const email = autoEmail ?? customerAuth.customerSessionEmail;
    const customerId = typeof window !== "undefined"
      ? window.sessionStorage.getItem("slicematic_customer_id") ?? undefined : undefined;
    if (!autoPhone && !autoEmail) {
      const errors = customerValidation();
      setCustomerErrors(errors);
      if (Object.keys(errors).length) { showToast("Fix the highlighted customer details."); return; }
    }
    const cachedRecs = useStore.getState().recommendations;
    if (!forceRefresh && cachedRecs.length > 0) { setStep("recommendation"); return; }
    setStep("recommendation");
    setRecommendation(null);
    setRecommendations([]);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, email, customer_id: customerId }),
      });
      if (!response.ok) { showToast("Recommendation unavailable — browse the menu."); setStep("menu"); return; }
      const data = await response.json();
      if (data.recommendations?.length) {
        setRecommendations(data.recommendations);
        setRecommendation(data.primary ?? data.recommendations[0] ?? null);
      } else if (data.pizzaId) {
        setRecommendation(data); setRecommendations([data]);
      } else { showToast("Recommendation unavailable — browse the menu."); setStep("menu"); }
    } catch { showToast("Recommendation unavailable — browse the menu."); setStep("menu"); }
  }

  // ── Cart handlers ─────────────────────────────────────────────────────────
  function openBuilder(pizza: MenuItem, fromRecommendation = false) {
    if (!ensureCustomerReady()) return;
    const base = activeBases[0]; const size = activeSizes[0];
    if (!base || !size) { showToast("Admin must enable at least one crust and size."); return; }
    setSelectedPizza(pizza);
    setBuilder({ baseId: base.id, sizeId: size.id, toppingIds: fromRecommendation && recommendation ? [recommendation.toppingId] : [], quantity: 1 });
  }

  function addPizzaDirectToCart(pizza: MenuItem) {
    if (!ensureCustomerReady()) return;
    const base = activeBases[0]; const size = activeSizes[0];
    if (!base || !size) { showToast("Admin must enable at least one crust and size."); return; }
    const existingQty = cart.reduce((s, l) => s + l.quantity, 0);
    if (existingQty + 1 > pricingConfig.maxOrderQty) { showToast(`Maximum outlet capacity is ${pricingConfig.maxOrderQty} pizzas per order.`); return; }
    setCart((c) => {
      const match = c.find((l) => l.pizzaId === pizza.id && l.baseId === base.id && l.sizeId === size.id && l.toppingIds.length === 0);
      if (match) return c.map((l) => l.id === match.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...c, { id: crypto.randomUUID(), pizzaId: pizza.id, baseId: base.id, sizeId: size.id, toppingIds: [], quantity: 1 }];
    });
    showToast(`${pizza.name} added to cart.`);
  }

  function addBuilderToCart() {
    if (!selectedPizza) return;
    if (!Number.isInteger(builder.quantity) || builder.quantity < 1 || builder.quantity > pricingConfig.maxOrderQty) {
      showToast(`Quantity must be between 1 and ${pricingConfig.maxOrderQty}.`); return;
    }
    const existingQty = cart.reduce((s, l) => s + l.quantity, 0);
    if (existingQty + builder.quantity > pricingConfig.maxOrderQty) { showToast(`Max ${pricingConfig.maxOrderQty} pizzas per order.`); return; }
    const areToppingsEqual = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    setCart((c) => {
      const match = c.find((l) => l.pizzaId === selectedPizza.id && l.baseId === builder.baseId && l.sizeId === builder.sizeId && areToppingsEqual(l.toppingIds, builder.toppingIds));
      if (match) return c.map((l) => l.id === match.id ? { ...l, quantity: l.quantity + builder.quantity } : l);
      return [...c, { id: crypto.randomUUID(), pizzaId: selectedPizza.id, baseId: builder.baseId, sizeId: builder.sizeId, toppingIds: builder.toppingIds, quantity: builder.quantity }];
    });
    setSelectedPizza(null);
    setStep("menu");
    showToast(`${selectedPizza.name} added to cart.`);
  }

  function addMemberFavoriteOrder() {
    const pizza = menu.pizzas.find((i) => i.name.toLowerCase().includes("paneer")) ?? activePizzas[0];
    const base = activeBases.find((i) => i.name.toLowerCase().includes("cheese")) ?? activeBases[0];
    const size = activeSizes.find((i) => i.id === "large") ?? activeSizes[0];
    const topping = activeToppings.find((i) => i.name.toLowerCase().includes("cheese")) ?? activeToppings[0];
    if (!pizza || !base || !size) { showToast("Menu needs at least one pizza, crust, and size."); return; }
    setCart((c) => [...c, { id: crypto.randomUUID(), pizzaId: pizza.id, baseId: base.id, sizeId: size.id, toppingIds: topping ? [topping.id] : [], quantity: 1 }]);
    setWorkspace("customer"); setStep("menu");
    showToast(`${pizza.name} favourite added to cart.`);
  }

  function useSavedCustomerProfile() {
    if (typeof window !== "undefined") {
      const json = window.sessionStorage.getItem("slicematic_customer");
      if (json) {
        try {
          const parsed = JSON.parse(json) as Partial<CustomerDetails>;
          setCustomer((c) => ({ ...c, name: parsed.name ?? c.name, phone: parsed.phone ?? c.phone, address: parsed.address ?? c.address, deliveryZone: parsed.deliveryZone ?? c.deliveryZone, note: parsed.note ?? c.note }));
          setWorkspace("customer"); setStep("intake");
          showToast("Saved delivery profile applied."); return;
        } catch { /* fall through */ }
      }
    }
    setCustomer({ name: "Aarav Sharma", phone: "9876543210", address: "Flat 1204, Lotus Heights, near Metro Gate 2, New Ashok Nagar", deliveryZone: "2-4", note: "Call once before dispatch." });
    setWorkspace("customer"); setStep("intake");
    showToast("Saved delivery profile applied.");
  }

  async function getCartInsight() {
    if (!cart.length) return;
    setCartInsightLoading(true);
    try {
      const res = await fetch("/api/ai/cart-insight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer, lines: cart, pricingConfig, isGuest: !customerAuth.customerLoggedIn }) });
      const result = await res.json();
      if (!result.ok) throw new Error("Cart insight unavailable");
      setCartInsight(result.insight);
    } catch { showToast("AI cart insight is unavailable."); } finally { setCartInsightLoading(false); }
  }

  function applyCartInsight() {
    if (!cartInsight?.suggestedPizzaId) { goToStep("checkout"); return; }
    const pizza = menu.pizzas.find((i) => i.id === cartInsight.suggestedPizzaId && i.available);
    if (!pizza) { showToast("Suggested pizza is no longer available."); return; }
    setRecommendation((cur) => cur ?? { pizzaId: pizza.id, toppingId: cartInsight.suggestedToppingId ?? activeToppings[0]?.id ?? 1, pizzaName: pizza.name, toppingName: cartInsight.suggestedToppingName ?? activeToppings[0]?.name ?? "Topping", reason: cartInsight.message, confidence: cartInsight.confidence, source: "fallback", customerTier: "new" });
    const base = activeBases[0]; const size = activeSizes[0];
    if (!base || !size) { showToast("Admin must enable at least one crust and size."); return; }
    setSelectedPizza(pizza);
    setBuilder({ baseId: base.id, sizeId: size.id, toppingIds: cartInsight.suggestedToppingId ? [cartInsight.suggestedToppingId] : [], quantity: 1 });
  }

  function removeCartLine(lineId: string) { setCart((c) => c.filter((l) => l.id !== lineId)); }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="app-shell">
      <AppHeader
        workspace={workspace}
        isAdminUser={isAdminSession}
        customerLoggedIn={customerAuth.customerLoggedIn}
        customerSessionEmail={customerAuth.customerSessionEmail}
        adminLoggedIn={false}
        adminSessionEmail=""
        onSelectCustomer={openCustomer}
        onSelectAccount={openAccount}
        onSelectAdmin={openAdminDashboard}
        onOpenAccount={openAccount}
      />

      {/* Account workspace */}
      {workspace === "account" && (
        <CustomerAccountPanel
          auth={customerAuth}
          orders={customerOrders}
          ordersLoading={customerOrdersLoading}
          ordersError={customerOrdersError}
          onRefreshOrders={() => void refreshCustomerOrders(true)}
          recommendation={recommendation}
          onContinueOrdering={openCustomer}
          onUseSavedProfile={useSavedCustomerProfile}
          onAddFavourite={addMemberFavoriteOrder}
          onOpenBuilder={(id) => { const pizza = menu.pizzas.find((p) => p.id === id); if (pizza) openBuilder(pizza, true); }}
          onBrowseMenu={() => goToStep("menu")}
          onUnauthorize={onUnauthorize}
        />
      )}

      {/* Customer workspace */}
      {workspace === "customer" && (
        <>
          {step !== "checkout" && step !== "tracking" && (
            <section className="hero-shell" id="customer-app">
              <aside className="status-rail">
                <div className="rail-card open">
                  <span />
                  <div><strong>{brand.openStatus}</strong><small>{brand.deliveryPromise}</small></div>
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
                <div className="rail-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <ReceiptText style={{ width: "24px", height: "24px", color: "var(--tomato)", flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "1.45rem", lineHeight: 1.1 }}>{Math.round(pricingConfig.gstRate * 100)}%</strong>
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>GST after discount</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <BadgePercent style={{ width: "24px", height: "24px", color: "var(--tomato)", flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "1.45rem", lineHeight: 1.1 }}>{Math.round(pricingConfig.bulkDiscountRate * 100)}%</strong>
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>off on {pricingConfig.bulkDiscountQty}+ pizzas</span>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="order-stage">
                <div className="hero-card">
                  <div>
                    <p className="eyebrow">Elite delivery OS</p>
                    <h1>{brand.hero}</h1>
                    <p>{brand.subhero}</p>
                  </div>
                  <img src="/assets/pizza-hero.jpg" alt="Fresh pizza" />
                </div>

                <CustomerFlowTabs activeStep={step} onSelectStep={goToStep} />

                {step === "intake" && (
                  <CustomerIntakeForm customer={customer} errors={customerErrors} onCustomerChange={setCustomer} onSubmit={() => void submitCustomer()} />
                )}

                {step === "recommendation" && (
                  <RecommendationLane
                    recommendation={recommendation}
                    recommendations={recommendations}
                    pizzas={menu.pizzas}
                    onRefresh={() => void submitCustomer(customer.name || undefined, customer.phone || undefined, true, customerAuth.customerSessionEmail)}
                    onBuild={(pizza) => openBuilder(pizza, true)}
                    onBrowseMenu={() => goToStep("menu")}
                  />
                )}

                {step === "menu" && (
                  <MenuCatalog pizzas={menu.pizzas} bases={menu.bases} onCustomize={openBuilder} onAdd={addPizzaDirectToCart} />
                )}
              </section>

              <CartRail
                cart={cart}
                menu={menu}
                totals={totals}
                pricingConfig={pricingConfig}
                customerLoggedIn={customerAuth.customerLoggedIn}
                customerOrderMode={customerOrderMode}
                customerSessionEmail={customerAuth.customerSessionEmail}
                cartInsight={cartInsight}
                cartInsightLoading={cartInsightLoading}
                onOpenAccount={openAccount}
                onRemoveLine={removeCartLine}
                onAskCartInsight={getCartInsight}
                onApplyCartInsight={applyCartInsight}
                onCheckout={() => router.push("/payment")}
                formatMoney={money}
              />
            </section>
          )}
        </>
      )}

      {selectedPizza && (
        <PizzaBuilderDialog pizza={selectedPizza} menu={menu} value={builder} maxQuantity={pricingConfig.maxOrderQty} onChange={setBuilder} onAddToCart={addBuilderToCart} onClose={() => setSelectedPizza(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
