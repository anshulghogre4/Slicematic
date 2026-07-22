"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BadgePercent, Check, Download, LogOut, ReceiptText, Settings2, ShieldCheck } from "lucide-react";
import { calculateBill, money, validateCustomer } from "../../lib/pricing";
import { fetchOutletPricingConfig } from "../../lib/customer-flow";
import { seedMenu, buildSeedSummary } from "../../lib/seed-data";
import type { CustomerDetails, MenuItem, MenuPayload, PricingConfig } from "../../lib/types";
import { useStore } from "../../lib/store";
import { parseAdminTab, type AdminTab } from "../../lib/admin-tabs";

// ── Feature components ────────────────────────────────────────────────────────
import { AppHeader } from "../../components/AppHeader";
import {
  AdminOverviewPanel,
  AdminMenuWorkspace,
  AdminOrdersWorkspace,
  AdminSettingsWorkspace,
  AdminTabNav,
} from "../../features/admin-dashboard/components";
import { CustomerAccountPanel, CartRail, CustomerFlowTabs, CustomerIntakeForm, RecommendationLane } from "../../features/customer-ordering/components";
import { MenuCatalog, PizzaBuilderDialog } from "../../features/menu/components";
import ForecastPanel from "../../components/admin/ForecastPanel";
import RecommendationAIPanel from "../../components/admin/RecommendationAIPanel";

// ── Feature hooks ─────────────────────────────────────────────────────────────
import { useAdminAuth } from "../../features/admin-dashboard/hooks/useAdminAuth";
import { useAdminSession } from "../../features/admin-dashboard/hooks/useAdminSession";
import { useCustomerAuth } from "../../features/customer-ordering/hooks/useCustomerAuth";
import { useOrderHistory } from "../../features/customer-ordering/hooks/useOrderHistory";

// ── Types local to this page ──────────────────────────────────────────────────
type Step = "intake" | "recommendation" | "menu" | "checkout" | "tracking";
type Workspace = "customer" | "account" | "admin";
type MenuSection = "pizzas" | "bases" | "toppings";
type MenuAdminPage = "create" | MenuSection;
type SettingsPage = "brand" | "financials" | "delivery";
type MenuDraft = {
  code: string; name: string; price: string; description: string;
  image: string; badge: string; tags: string; prepMinutes: string;
};

const emptyMenuDraft: MenuDraft = {
  code: "", name: "", price: "", description: "",
  image: "/assets/pizza-hero.jpg", badge: "New", tags: "Veg, Signature", prepMinutes: "24",
};

function menuRowKey(section: MenuSection, id: number) { return `${section}:${id}`; }
function snapshotMenuBaseline(payload: MenuPayload) {
  const b: Record<string, Pick<MenuItem, "name" | "price" | "available">> = {};
  (["pizzas", "bases", "toppings"] as MenuSection[]).forEach((s) => {
    payload[s].forEach((i) => { b[menuRowKey(s, i.id)] = { name: i.name, price: i.price, available: i.available }; });
  });
  return b;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    cart, setCart, customer, setCustomer,
    pricingConfig, setPricingConfig,
    paymentMode, setPaymentMode,
    recommendation, setRecommendation,
    recommendations, setRecommendations,
  } = useStore();

  // ── UI shell state ────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("menu");
  const [workspace, setWorkspace] = useState<Workspace>("admin");
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [toast, setToast] = useState("");
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});

  // ── Menu state ────────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuPayload>(seedMenu);
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [builder, setBuilder] = useState({ baseId: seedMenu.bases[0].id, sizeId: seedMenu.sizes[0].id, toppingIds: [] as number[], quantity: 1 });
  const [menuDraftSection, setMenuDraftSection] = useState<MenuSection>("pizzas");
  const [menuAdminPage, setMenuAdminPage] = useState<MenuAdminPage>("create");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("brand");
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyMenuDraft);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuImageUploading, setMenuImageUploading] = useState(false);
  const [menuCopyLoading, setMenuCopyLoading] = useState(false);
  const [menuBaseline, setMenuBaseline] = useState<Record<string, Pick<MenuItem, "name" | "price" | "available">>>({});
  const [menuRowStatus, setMenuRowStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [cartInsight, setCartInsight] = useState<null | { headline: string; message: string; nextAction: string; suggestedPizzaId?: number; suggestedPizzaName?: string; suggestedToppingId?: number; suggestedToppingName?: string; expectedImpact: string; confidence: number; }>(null);
  const [cartInsightLoading, setCartInsightLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(() => searchParams.get("order") ?? "");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersSearch, setOrdersSearch] = useState("");
  const ORDERS_PAGE_SIZE = 15;
  const [brand, setBrand] = useState({
    name: "SliceMatic", outlet: "New Ashok Nagar",
    openStatus: "Open now", deliveryPromise: "30-40 min delivery",
    customerPromise: "Live price, safer payments, and smarter repeat orders.",
    opsPromise: "Peak demand, payments, menu, and AI operations controlled from one workspace.",
    hero: "Pizza delivery with a sharper kitchen, smarter recommendations, and a calmer checkout.",
    subhero: "Order from a live menu, build the exact pizza you want, and let the outlet control demand, revenue, and fulfilment from one polished screen.",
  });

  // ── Feature hooks ─────────────────────────────────────────────────────────
  const adminAuth = useAdminAuth(
    (token) => { void session.refreshAdminSummary(token); void session.loadOpsBriefing(token); },
    () => { router.replace("/"); }
  );
  const session = useAdminSession(adminAuth.adminAccessToken, adminAuth.adminLoggedIn);
  const { customerOrders, customerOrdersLoading, customerOrdersError, refreshCustomerOrders, clearOrders } = useOrderHistory();
  const customerAuth = useCustomerAuth(
    (email) => { setWorkspace("customer"); setStep("menu"); void refreshCustomerOrders(true); },
    () => { clearOrders(); setStep("intake"); }
  );
  const reduceMotion = useReducedMotion();

  // ── Bootstrap: redirect non-admin users, then let useAdminAuth restore session ─
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdmin = sessionStorage.getItem("slicematic_is_admin") === "true";
    if (!isAdmin) { router.replace("/"); }
    // Session restore (slicematic_is_admin → adminLoggedIn) is handled inside
    // useAdminAuth's own useEffect, which fires onLoginSuccess → summary/briefing.
  }, [router]);

  // ── URL-based tab sync ────────────────────────────────────────────────────
  useEffect(() => {
    const tabFromUrl = parseAdminTab(searchParams.get("tab"));
    if (tabFromUrl && tabFromUrl !== adminTab) setAdminTab(tabFromUrl);
  }, [adminTab, searchParams]);

  function selectAdminTab(tab: AdminTab) {
    setAdminTab(tab);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }

  function selectAdminOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "orders");
    if (orderId) params.set("order", orderId); else params.delete("order");
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }

  // ── Live data refresh on visibility / focus ───────────────────────────────
  useEffect(() => {
    if (!adminAuth.adminLoggedIn) return;
    const refresh = () => { if (document.visibilityState === "visible") void session.refreshAdminSummary(); };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [adminAuth.adminLoggedIn, adminAuth.adminAccessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Menu + pricing bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((p: MenuPayload) => { setMenu(p); setMenuBaseline(snapshotMenuBaseline(p)); })
      .catch(() => setMenu(seedMenu));
  }, []);

  useEffect(() => {
    void fetchOutletPricingConfig().then((c) => { if (c) setPricingConfig(c); });
  }, [setPricingConfig]);

  // ── Brand fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    const token = adminAuth.adminAccessToken;
    fetch("/api/admin/outlet/brand", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.brandConfig) setBrand(d.brandConfig); })
      .catch(() => {});
  }, [adminAuth.adminAccessToken]);

  // ── Customer session restore ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const loggedInValue = window.sessionStorage.getItem("slicematic_customer_logged_in");
    if (loggedInValue === "true") {
      const email = window.sessionStorage.getItem("slicematic_customer_email") ?? "";
      const customerJson = window.sessionStorage.getItem("slicematic_customer");
      let identifier = email;
      if (customerJson) {
        try {
          const parsed = JSON.parse(customerJson) as Partial<CustomerDetails>;
          if (!identifier && parsed.phone) identifier = parsed.phone;
          setCustomer((c) => ({ ...c, name: parsed.name ?? c.name, phone: parsed.phone ?? c.phone, address: parsed.address ?? c.address, deliveryZone: parsed.deliveryZone ?? c.deliveryZone, note: parsed.note ?? c.note }));
        } catch { /* ignore */ }
      }
      customerAuth.setCustomerLoggedIn(true);
      customerAuth.setCustomerSessionEmail(identifier);
      void refreshCustomerOrders(true);
    } else if (loggedInValue === "false") {
      customerAuth.setCustomerLoggedIn(false);
      customerAuth.setCustomerSessionEmail("");
      setStep("intake");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Payment mode guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (!customerAuth.customerLoggedIn && !pricingConfig.guestCashAllowed && paymentMode === "Cash") setPaymentMode("UPI");
  }, [customerAuth.customerLoggedIn, paymentMode, pricingConfig.guestCashAllowed, setPaymentMode]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2400); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { setCartInsight(null); }, [cart]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const activePizzas = useMemo(() => menu.pizzas.filter((i) => i.available), [menu.pizzas]);
  const activeBases = useMemo(() => menu.bases.filter((i) => i.available), [menu.bases]);
  const activeSizes = useMemo(() => menu.sizes.filter((i) => i.available), [menu.sizes]);
  const activeToppings = useMemo(() => menu.toppings.filter((i) => i.available), [menu.toppings]);
  const totals = useMemo(() => calculateBill(cart, menu, pricingConfig), [cart, menu, pricingConfig]);
  const customerOrderMode = customerAuth.customerLoggedIn ? "Member order" : "Guest order";

  function showToast(msg: string) { setToast(msg); }

  // ── Settings persistence ──────────────────────────────────────────────────
  async function persistOutletPricing(config: PricingConfig) {
    const h = adminAuth.adminAuthHeader();
    try {
      const r = await fetch("/api/admin/outlet/pricing", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ pricingConfig: config }) });
      if (!r.ok) showToast("Financial settings could not be saved.");
    } catch { showToast("Financial settings could not be saved."); }
  }
  function updatePricing<K extends keyof PricingConfig>(field: K, value: PricingConfig[K]) {
    setPricingConfig((cur) => { const next = { ...cur, [field]: value }; if (adminAuth.adminLoggedIn) void persistOutletPricing(next); return next; });
  }
  function updatePercent(field: "gstRate" | "bulkDiscountRate", value: string) {
    const n = Number(value); updatePricing(field, ((Number.isFinite(n) ? Math.max(0, Math.min(100, n)) / 100 : 0) as PricingConfig[typeof field]));
  }
  function updatePositiveNumber(field: "bulkDiscountQty" | "maxOrderQty" | "deliveryFee" | "freeDeliveryMin", value: string) {
    const n = Number(value); updatePricing(field, (Number.isFinite(n) ? Math.max(0, n) : 0) as PricingConfig[typeof field]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function openCustomer() { setWorkspace("customer"); }
  function openAccount() { setSelectedPizza(null); setWorkspace("account"); void refreshCustomerOrders(true); }

  function customerValidation() { return validateCustomer(customer.name, customer.phone, customer.address, customer.deliveryZone, pricingConfig); }
  function ensureCustomerReady() {
    const errors = customerValidation(); setCustomerErrors(errors);
    if (Object.keys(errors).length) { setStep("intake"); showToast("Complete customer intake before choosing pizzas."); return false; }
    return true;
  }
  function goToStep(nextStep: Step) {
    setWorkspace("customer");
    if (nextStep !== "intake" && !ensureCustomerReady()) return;
    if (nextStep === "checkout") { if (!cart.length) { showToast("Add at least one pizza before checkout."); return; } router.push("/payment"); return; }
    if (nextStep === "tracking") { router.push("/confirmation"); return; }
    setStep(nextStep);
  }

  async function submitCustomer(autoName?: string, autoPhone?: string, forceRefresh = false, autoEmail?: string) {
    const name = autoName ?? customer.name;
    const phone = autoPhone ?? customer.phone;
    const email = autoEmail ?? customerAuth.customerSessionEmail;
    const customerId = typeof window !== "undefined" ? window.sessionStorage.getItem("slicematic_customer_id") ?? undefined : undefined;
    if (!autoPhone && !autoEmail) {
      const errors = customerValidation(); setCustomerErrors(errors);
      if (Object.keys(errors).length) { showToast("Fix the highlighted customer details."); return; }
    }
    const cachedRecs = useStore.getState().recommendations;
    if (!forceRefresh && cachedRecs.length > 0) { setStep("recommendation"); return; }
    setStep("recommendation"); setRecommendation(null); setRecommendations([]);
    try {
      const res = await fetch("/api/recommend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, phone, email, customer_id: customerId }) });
      if (!res.ok) { showToast("Recommendation unavailable — browse the menu."); setStep("menu"); return; }
      const data = await res.json();
      if (data.recommendations?.length) { setRecommendations(data.recommendations); setRecommendation(data.primary ?? data.recommendations[0] ?? null); }
      else if (data.pizzaId) { setRecommendation(data); setRecommendations([data]); }
      else { showToast("Recommendation unavailable — browse the menu."); setStep("menu"); }
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
    const existing = cart.reduce((s, l) => s + l.quantity, 0);
    if (existing + 1 > pricingConfig.maxOrderQty) { showToast(`Max ${pricingConfig.maxOrderQty} pizzas per order.`); return; }
    setCart((c) => {
      const m = c.find((l) => l.pizzaId === pizza.id && l.baseId === base.id && l.sizeId === size.id && l.toppingIds.length === 0);
      if (m) return c.map((l) => l.id === m.id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...c, { id: crypto.randomUUID(), pizzaId: pizza.id, baseId: base.id, sizeId: size.id, toppingIds: [], quantity: 1 }];
    });
    showToast(`${pizza.name} added to cart.`);
  }
  function addBuilderToCart() {
    if (!selectedPizza) return;
    if (!Number.isInteger(builder.quantity) || builder.quantity < 1 || builder.quantity > pricingConfig.maxOrderQty) { showToast(`Quantity must be between 1 and ${pricingConfig.maxOrderQty}.`); return; }
    const existing = cart.reduce((s, l) => s + l.quantity, 0);
    if (existing + builder.quantity > pricingConfig.maxOrderQty) { showToast(`Max ${pricingConfig.maxOrderQty} pizzas per order.`); return; }
    const eq = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    setCart((c) => {
      const m = c.find((l) => l.pizzaId === selectedPizza.id && l.baseId === builder.baseId && l.sizeId === builder.sizeId && eq(l.toppingIds, builder.toppingIds));
      if (m) return c.map((l) => l.id === m.id ? { ...l, quantity: l.quantity + builder.quantity } : l);
      return [...c, { id: crypto.randomUUID(), pizzaId: selectedPizza.id, baseId: builder.baseId, sizeId: builder.sizeId, toppingIds: builder.toppingIds, quantity: builder.quantity }];
    });
    setSelectedPizza(null); setStep("menu");
    showToast(`${selectedPizza.name} added to cart.`);
  }
  function addMemberFavourite() {
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
    const json = typeof window !== "undefined" ? window.sessionStorage.getItem("slicematic_customer") : null;
    if (json) {
      try {
        const p = JSON.parse(json) as Partial<CustomerDetails>;
        setCustomer((c) => ({ ...c, name: p.name ?? c.name, phone: p.phone ?? c.phone, address: p.address ?? c.address, deliveryZone: p.deliveryZone ?? c.deliveryZone, note: p.note ?? c.note }));
        setWorkspace("customer"); setStep("intake"); showToast("Saved delivery profile applied."); return;
      } catch { /* fall through */ }
    }
    setCustomer({ name: "Aarav Sharma", phone: "9876543210", address: "Flat 1204, Lotus Heights, near Metro Gate 2, New Ashok Nagar", deliveryZone: "2-4", note: "Call once before dispatch." });
    setWorkspace("customer"); setStep("intake"); showToast("Saved delivery profile applied.");
  }
  function removeCartLine(lineId: string) { setCart((c) => c.filter((l) => l.id !== lineId)); }

  async function getCartInsight() {
    if (!cart.length) return;
    setCartInsightLoading(true);
    try {
      const r = await fetch("/api/ai/cart-insight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer, lines: cart, pricingConfig, isGuest: !customerAuth.customerLoggedIn }) });
      const result = await r.json();
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

  // ── Menu admin helpers ────────────────────────────────────────────────────
  function updatePizza(id: number, field: keyof MenuItem, value: string | number | boolean) {
    setMenu((m) => ({ ...m, pizzas: m.pizzas.map((p) => p.id === id ? { ...p, [field]: value } : p) }));
  }
  function updateMenuItemLocal(section: "bases" | "toppings", id: number, field: keyof MenuItem, value: string | number | boolean) {
    setMenu((m) => ({ ...m, [section]: m[section].map((i) => i.id === id ? { ...i, [field]: value } : i) }));
  }
  function isMenuRowDirty(section: MenuSection, item: MenuItem) {
    const b = menuBaseline[menuRowKey(section, item.id)];
    return b ? b.name !== item.name || b.price !== item.price || b.available !== item.available : false;
  }
  async function saveMenuRow(section: MenuSection, item: MenuItem) {
    const key = menuRowKey(section, item.id);
    setMenuRowStatus((s) => ({ ...s, [key]: "saving" }));
    try {
      const r = await fetch("/api/admin/menu", { method: "PATCH", headers: { "content-type": "application/json", ...adminAuth.adminAuthHeader() }, body: JSON.stringify({ section, id: item.id, item: { name: item.name, price: item.price, available: item.available } }) });
      const result = await r.json();
      if (!r.ok || !result.ok) { setMenuRowStatus((s) => ({ ...s, [key]: "error" })); showToast(Object.values(result.errors ?? { server: "Item could not be saved." })[0] as string); return; }
      const saved = result.item as MenuItem;
      setMenu((m) => ({ ...m, [section]: m[section].map((e) => (e.id === item.id ? saved : e)) }));
      setMenuBaseline((b) => ({ ...b, [key]: { name: saved.name, price: saved.price, available: saved.available } }));
      setMenuRowStatus((s) => ({ ...s, [key]: "saved" }));
      showToast(`${saved.name} saved.`);
      window.setTimeout(() => setMenuRowStatus((s) => { const n = { ...s }; delete n[key]; return n; }), 2000);
    } catch { setMenuRowStatus((s) => ({ ...s, [key]: "error" })); showToast("Item could not be saved."); }
  }
  function renderRowSaveButton(section: MenuSection, item: MenuItem) {
    const status = menuRowStatus[menuRowKey(section, item.id)];
    const dirty = isMenuRowDirty(section, item);
    const stateClass = status ?? (dirty ? "dirty" : "idle");
    const label = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Retry" : "Save";
    return (<button type="button" className={`row-save-btn ${stateClass}`} disabled={status === "saving" || (!dirty && status !== "error")} onClick={() => void saveMenuRow(section, item)}>{label}</button>);
  }
  function defaultDraftDescription(section: MenuSection) {
    if (section === "pizzas") return "New chef-curated pizza added from the admin menu studio.";
    if (section === "bases") return "New crust option added for customer customization.";
    return "New add-on topping available for customized orders.";
  }
  function nextMenuItem(section: MenuSection, draft = menuDraft): MenuItem {
    const col = menu[section]; const nextId = Math.max(0, ...col.map((i) => i.id)) + 1;
    const prefix = section === "pizzas" ? "P" : section === "bases" ? "B" : "T";
    const tags = draft.tags.split(",").map((t) => t.trim()).filter(Boolean);
    return { id: nextId, code: draft.code.trim().toUpperCase() || `${prefix}${nextId}`, name: draft.name.trim(), price: Number(draft.price), description: draft.description.trim() || defaultDraftDescription(section), image: section === "pizzas" ? draft.image.trim() || "/assets/pizza-hero.jpg" : undefined, badge: section === "pizzas" ? draft.badge.trim() || "New" : undefined, tags: section === "pizzas" ? (tags.length ? tags : ["Signature"]) : undefined, prepMinutes: section === "pizzas" ? Number(draft.prepMinutes || 24) : undefined, available: true };
  }
  async function addMenuItem() {
    const name = menuDraft.name.trim(); const price = Number(menuDraft.price);
    if (name.length < 2) { showToast("Add a menu item name first."); return; }
    if (!Number.isFinite(price) || price < 0) { showToast("Menu price must be a positive number."); return; }
    setMenuSaving(true);
    try {
      let item = nextMenuItem(menuDraftSection);
      const h = adminAuth.adminAuthHeader();
      if (h) {
        const r = await fetch("/api/admin/menu", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify({ section: menuDraftSection, item }) });
        const result = await r.json();
        if (!r.ok || !result.ok) { showToast(Object.values(result.errors ?? { server: "Menu item could not be saved." })[0] as string); return; }
        item = result.item as MenuItem;
      }
      setMenu((m) => ({ ...m, [menuDraftSection]: [...m[menuDraftSection], item] }));
      setMenuBaseline((b) => ({ ...b, [menuRowKey(menuDraftSection, item.id)]: { name: item.name, price: item.price, available: item.available } }));
      setMenuDraft(emptyMenuDraft);
      showToast(`${item.name} added to menu.`);
    } catch { showToast("Menu item could not be saved."); } finally { setMenuSaving(false); }
  }
  async function uploadMenuImage(file: File) {
    setMenuImageUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const r = await fetch("/api/admin/menu/image", { method: "POST", headers: { ...adminAuth.adminAuthHeader() }, body: form });
      const result = await r.json();
      if (!r.ok || !result.ok) { showToast(result.error ?? "Image upload failed."); return; }
      setMenuDraft((d) => ({ ...d, image: result.url }));
      showToast("Image uploaded.");
    } catch { showToast("Image upload failed."); } finally { setMenuImageUploading(false); }
  }
  async function generateMenuCopy() {
    if (!menuDraft.name.trim()) { showToast("Add an item name before using AI copy."); return; }
    setMenuCopyLoading(true);
    try {
      const r = await fetch("/api/ai/menu-copy", { method: "POST", headers: { "content-type": "application/json", ...adminAuth.adminAuthHeader() }, body: JSON.stringify({ section: menuDraftSection, name: menuDraft.name, price: menuDraft.price, tags: menuDraft.tags }) });
      const result = await r.json();
      if (!result.ok) { showToast(Object.values(result.errors ?? { server: "AI copy could not be generated." })[0] as string); return; }
      const copy = result.copy;
      setMenuDraft((d) => ({ ...d, description: copy.description ?? d.description, badge: copy.badge ?? d.badge, tags: Array.isArray(copy.tags) ? copy.tags.join(", ") : d.tags, prepMinutes: copy.prepMinutes ? String(copy.prepMinutes) : d.prepMinutes }));
      showToast(`AI menu copy generated (${result.source}).`);
    } catch { showToast("AI copy could not be generated."); } finally { setMenuCopyLoading(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="app-shell">
      <AppHeader
        workspace={workspace}
        isAdminUser={adminAuth.adminLoggedIn}
        customerLoggedIn={customerAuth.customerLoggedIn}
        customerSessionEmail={customerAuth.customerSessionEmail}
        adminLoggedIn={adminAuth.adminLoggedIn}
        adminSessionEmail={adminAuth.adminSessionEmail}
        onSelectCustomer={openCustomer}
        onSelectAccount={openAccount}
        onSelectAdmin={() => setWorkspace("admin")}
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
          onAddFavourite={addMemberFavourite}
          onOpenBuilder={(id) => { const p = menu.pizzas.find((x) => x.id === id); if (p) openBuilder(p, true); }}
          onBrowseMenu={() => goToStep("menu")}
        />
      )}

      {/* Customer workspace */}
      {workspace === "customer" && step !== "checkout" && step !== "tracking" && (
        <section className="hero-shell" id="customer-app">
          <aside className="status-rail">
            <div className="rail-card open"><span /><div><strong>{brand.openStatus}</strong><small>{brand.deliveryPromise}</small></div></div>
            <div className="rail-card">
              <p className="eyebrow">Operating signals</p>
              <ul>
                <li><Check /> Live menu control</li><li><Check /> Verified billing rules</li>
                <li><Check /> AI pairings</li><li><Check /> Demand forecast</li>
              </ul>
            </div>
            <div className="rail-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ReceiptText style={{ width: "24px", height: "24px", color: "var(--tomato)", flexShrink: 0 }} />
                <div><strong style={{ fontSize: "1.45rem", lineHeight: 1.1 }}>{Math.round(pricingConfig.gstRate * 100)}%</strong><span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>GST after discount</span></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <BadgePercent style={{ width: "24px", height: "24px", color: "var(--tomato)", flexShrink: 0 }} />
                <div><strong style={{ fontSize: "1.45rem", lineHeight: 1.1 }}>{Math.round(pricingConfig.bulkDiscountRate * 100)}%</strong><span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>off on {pricingConfig.bulkDiscountQty}+ pizzas</span></div>
              </div>
            </div>
          </aside>

          <section className="order-stage">
            <div className="hero-card">
              <div><p className="eyebrow">Elite delivery OS</p><h1>{brand.hero}</h1><p>{brand.subhero}</p></div>
              <img src="/assets/pizza-hero.jpg" alt="Fresh pizza" />
            </div>
            <CustomerFlowTabs activeStep={step} onSelectStep={goToStep} />
            {step === "intake" && <CustomerIntakeForm customer={customer} errors={customerErrors} onCustomerChange={setCustomer} onSubmit={() => void submitCustomer()} />}
            {step === "recommendation" && (
              <RecommendationLane
                recommendation={recommendation} recommendations={recommendations} pizzas={menu.pizzas}
                onRefresh={() => void submitCustomer(customer.name || undefined, customer.phone || undefined, true, customerAuth.customerSessionEmail)}
                onBuild={(pizza) => openBuilder(pizza, true)}
                onBrowseMenu={() => goToStep("menu")}
              />
            )}
            {step === "menu" && <MenuCatalog pizzas={menu.pizzas} bases={menu.bases} onCustomize={openBuilder} onAdd={addPizzaDirectToCart} />}
          </section>

          <CartRail
            cart={cart} menu={menu} totals={totals} pricingConfig={pricingConfig}
            customerLoggedIn={customerAuth.customerLoggedIn} customerOrderMode={customerOrderMode}
            customerSessionEmail={customerAuth.customerSessionEmail}
            cartInsight={cartInsight} cartInsightLoading={cartInsightLoading}
            onOpenAccount={openAccount} onRemoveLine={removeCartLine}
            onAskCartInsight={getCartInsight} onApplyCartInsight={applyCartInsight}
            onCheckout={() => router.push("/payment")} formatMoney={money}
          />
        </section>
      )}

      {/* Admin workspace */}
      {workspace === "admin" && (
        <section className="admin-section" id="admin">
          <div className="admin-hero">
            <div>
              <p className="eyebrow">Admin + analytics</p>
              <h2>{brand.opsPromise}</h2>
            </div>
          {adminAuth.adminLoggedIn && (
              <div className="admin-hero-actions">
                <div className="session-pill"><ShieldCheck /><span>{adminAuth.adminSessionEmail || "Admin session"}</span></div>
                <button className="primary" type="button" onClick={() => {
                  window.sessionStorage.setItem("slicematic_admin_view_customer", "true");
                  router.push("/");
                }}>
                  <Settings2 size={14} /> View as Customer
                </button>
                <button className="primary" type="button" onClick={() => void session.downloadCsv()}><Download /> Export CSV</button>
                <button className="danger-action" type="button" onClick={() => void adminAuth.adminLogout(() => router.replace("/"))}><LogOut /> Logout</button>
              </div>
            )}
          </div>

          {/* Gate ops UI until admin session is proven. EntryPortal remains the only login form. */}
          {!adminAuth.adminLoggedIn ? (
            <section className="auth-console" aria-busy="true" aria-live="polite">
              <div className="auth-panel" style={{ maxWidth: 420, margin: "2rem auto", textAlign: "center" }}>
                <p className="eyebrow">Operations console</p>
                <h2>Verifying admin session</h2>
                <p style={{ color: "var(--sui-text-secondary)" }}>
                  Sign in from the Entry Portal. This page does not show ops data until an admin session is restored.
                </p>
                <Link className="primary" href="/" style={{ display: "inline-flex", marginTop: "1rem" }}>
                  Return to sign in
                </Link>
              </div>
            </section>
          ) : (
          <>
              <AdminTabNav activeTab={adminTab} onSelectTab={selectAdminTab} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={adminTab}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
                  className="admin-tab-content"
                >
                  {adminTab === "overview" && (
                    <AdminOverviewPanel
                      summary={session.adminSummary}
                      opsBriefing={session.opsBriefing}
                      opsLoading={session.opsLoading}
                      onRefresh={() => void session.loadOpsBriefing()}
                    />
                  )}
                  {adminTab === "orders" && (() => {
                    // Apply ID search first, then date/payment filters from session
                    const searchTerm = ordersSearch.trim().toLowerCase();
                    const searchFiltered = searchTerm
                      ? session.filteredOrders.filter(
                          (o) =>
                            o.id.toLowerCase().includes(searchTerm) ||
                            o.customerName?.toLowerCase().includes(searchTerm) ||
                            o.phone?.toLowerCase().includes(searchTerm)
                        )
                      : session.filteredOrders;

                    const totalOrders = searchFiltered.length;
                    const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PAGE_SIZE));
                    const safePage = Math.min(ordersPage, totalPages);
                    const pagedOrders = searchFiltered.slice((safePage - 1) * ORDERS_PAGE_SIZE, safePage * ORDERS_PAGE_SIZE);

                    return (
                    <AdminOrdersWorkspace
                      orders={pagedOrders}
                      allOrders={session.adminSummary.recentOrders}
                      selectedOrderId={selectedOrderId}
                      onSelectOrder={selectAdminOrder}
                      totalMatched={totalOrders}
                      totalFetched={session.adminSummary.recentOrders.length}
                      filters={(
                        <div className="filters orders-filters">
                          {/* Order ID / customer search */}
                          <div className="orders-search-wrap">
                            <input
                              id="orders-search"
                              type="search"
                              className="orders-search-input"
                              placeholder="Search by order ID, name, or phone…"
                              value={ordersSearch}
                              onChange={(e) => { setOrdersSearch(e.target.value); setOrdersPage(1); }}
                              aria-label="Search orders"
                            />
                            {ordersSearch && (
                              <button
                                type="button"
                                className="orders-search-clear"
                                onClick={() => { setOrdersSearch(""); setOrdersPage(1); }}
                                aria-label="Clear search"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {/* Date + payment filters */}
                          <input type="date" value={session.adminDateFilter} onChange={(e) => { session.setAdminDateFilter(e.target.value); setOrdersPage(1); }} />
                          <select value={session.adminPaymentFilter} onChange={(e) => { session.setAdminPaymentFilter(e.target.value); setOrdersPage(1); }}>
                            <option>All</option><option>UPI</option><option>Card</option><option>Cash</option>
                          </select>
                        </div>
                      )}
                      pagination={totalPages > 1 ? (
                        <div className="orders-pagination" role="navigation" aria-label="Orders pagination">
                          <button
                            type="button"
                            className="orders-pagination__btn"
                            onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            aria-label="Previous page"
                          >
                            ← Prev
                          </button>

                          <span className="orders-pagination__info">
                            Page {safePage} of {totalPages} &middot; {totalOrders} orders
                          </span>

                          {/* Direct page jump */}
                          <form
                            className="orders-pagination__jump"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = parseInt((e.currentTarget.elements.namedItem("page") as HTMLInputElement).value, 10);
                              if (!isNaN(val)) setOrdersPage(Math.min(totalPages, Math.max(1, val)));
                              (e.currentTarget.elements.namedItem("page") as HTMLInputElement).value = "";
                            }}
                          >
                            <input
                              name="page"
                              type="number"
                              min={1}
                              max={totalPages}
                              placeholder="Go to…"
                              className="orders-pagination__jump-input"
                              aria-label={`Jump to page (1–${totalPages})`}
                            />
                            <button type="submit" className="orders-pagination__btn" aria-label="Go to page">
                              Go
                            </button>
                          </form>

                          <button
                            type="button"
                            className="orders-pagination__btn"
                            onClick={() => setOrdersPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            aria-label="Next page"
                          >
                            Next →
                          </button>
                        </div>
                      ) : null}
                    />
                    );
                  })()}
                  {adminTab === "forecast" && <ForecastPanel summary={session.adminSummary} authHeaders={adminAuth.adminAuthHeader()} />}
                  {adminTab === "menu" && (
                    <AdminMenuWorkspace
                      menu={menu} menuAdminPage={menuAdminPage} menuDraftSection={menuDraftSection}
                      menuDraft={menuDraft} menuSaving={menuSaving} menuImageUploading={menuImageUploading}
                      menuCopyLoading={menuCopyLoading}
                      onMenuAdminPageChange={setMenuAdminPage} onMenuDraftSectionChange={setMenuDraftSection}
                      onMenuDraftChange={setMenuDraft}
                      onUploadMenuImage={(file) => { if (file) void uploadMenuImage(file); }}
                      onGenerateMenuCopy={generateMenuCopy} onAddMenuItem={addMenuItem}
                      onUpdatePizza={updatePizza} onUpdateMenuItem={updateMenuItemLocal}
                      renderRowSaveButton={renderRowSaveButton}
                      defaultDraftDescription={defaultDraftDescription}
                    />
                  )}
                  {adminTab === "ai" && <RecommendationAIPanel />}
                  {adminTab === "settings" && (
                    <AdminSettingsWorkspace
                      brand={brand} pricingConfig={pricingConfig} settingsPage={settingsPage}
                      applyLabel="Apply live preview"
                      onApply={() => showToast("Settings applied to the live app preview.")}
                      onSettingsPageChange={setSettingsPage} onBrandChange={setBrand}
                      onUpdatePercent={updatePercent} onUpdatePositiveNumber={updatePositiveNumber}
                      onUpdatePricing={updatePricing}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
          </>
          )}
        </section>
      )}

      {selectedPizza && (
        <PizzaBuilderDialog pizza={selectedPizza} menu={menu} value={builder} maxQuantity={pricingConfig.maxOrderQty} onChange={setBuilder} onAddToCart={addBuilderToCart} onClose={() => setSelectedPizza(null)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
