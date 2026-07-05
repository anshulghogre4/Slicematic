"use client";

import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BadgePercent,
  Brain,
  Check,
  ChefHat,
  CreditCard,
  Download,
  Flame,
  Gauge,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  Pizza,
  Plus,
  UserRound,
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
  Upload,
  Utensils
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateBill, defaultPricingConfig, getLineUnitPrice, money, validateCustomer } from "../../lib/pricing";
import { CUSTOMER_FLOW_TABS, fetchOutletPricingConfig } from "../../lib/customer-flow";
import { buildSeedSummary, seedMenu } from "../../lib/seed-data";
import { AdminSummary, CartLine, CustomerDetails, MenuItem, MenuPayload, PaymentMode, PricingConfig, Recommendation, SavedOrder } from "../../lib/types";
import { useStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import ForecastPanel from "../../components/admin/ForecastPanel";
import RecommendationAIPanel from "../../components/admin/RecommendationAIPanel";
import { ADMIN_TABS, adminTabLabel, type AdminTab } from "../../lib/admin-tabs";
import CustomerOrderHistoryTable from "../../components/CustomerOrderHistoryTable";
import { CustomerOrderHistoryItem } from "../../lib/data-service";

type Step = "intake" | "recommendation" | "menu" | "checkout" | "tracking";
type Workspace = "customer" | "account" | "admin";
type AdminAuthView = "login" | "forgot" | "reset";
type CustomerAuthView = "login" | "forgot" | "reset";
type CustomerAuthMethod = "password" | "otp";
type CustomerOtpChannel = "email" | "sms";
type MenuSection = "pizzas" | "bases" | "toppings";
type MenuAdminPage = "create" | MenuSection;
type SettingsPage = "brand" | "financials" | "delivery";
type MenuDraft = {
  code: string;
  name: string;
  price: string;
  description: string;
  image: string;
  badge: string;
  tags: string;
  prepMinutes: string;
};
type CartInsight = {
  headline: string;
  message: string;
  nextAction: string;
  suggestedPizzaId?: number;
  suggestedPizzaName?: string;
  suggestedToppingId?: number;
  suggestedToppingName?: string;
  expectedImpact: string;
  confidence: number;
};
type OpsBriefing = {
  briefing: string;
  staffing: string;
  prepList: string[];
  revenueWatch: string;
  actions: Array<{ title: string; detail: string; priority: "High" | "Medium" | "Low" }>;
};

const paymentModes: Array<{ mode: PaymentMode; icon: React.ReactNode; copy: string }> = [
  { mode: "UPI", icon: <Phone />, copy: "Confirm receipt before fulfillment." },
  { mode: "Card", icon: <CreditCard />, copy: "Process on POS or payment link." },
  { mode: "Cash", icon: <ReceiptText />, copy: "Collect at delivery or counter." }
];

const demoAdminEmail = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "admin@slicematic.in";
const demoAdminPassword = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "slicematic-demo";
const demoCustomerEmail = "customer@slicematic.in";
const demoCustomerPassword = "slice-customer";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyMenuDraft: MenuDraft = {
  code: "",
  name: "",
  price: "",
  description: "",
  image: "/assets/pizza-hero.jpg",
  badge: "New",
  tags: "Veg, Signature",
  prepMinutes: "24"
};

function menuRowKey(section: MenuSection, id: number) {
  return `${section}:${id}`;
}

function snapshotMenuBaseline(payload: MenuPayload) {
  const baseline: Record<string, Pick<MenuItem, "name" | "price" | "available">> = {};
  (["pizzas", "bases", "toppings"] as MenuSection[]).forEach((section) => {
    payload[section].forEach((item) => {
      baseline[menuRowKey(section, item.id)] = { name: item.name, price: item.price, available: item.available };
    });
  });
  return baseline;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { cart, setCart, customer, setCustomer, pricingConfig, setPricingConfig, paymentMode, setPaymentMode, lastOrder, setLastOrder, recommendation, setRecommendation } = useStore();

  const [menu, setMenu] = useState<MenuPayload>(seedMenu);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [step, setStep] = useState<Step>("menu");
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [customerAuthView, setCustomerAuthView] = useState<CustomerAuthView>("login");
  const [customerAuthEmail, setCustomerAuthEmail] = useState(demoCustomerEmail);
  const [customerAuthPassword, setCustomerAuthPassword] = useState(demoCustomerPassword);
  const [customerAuthMethod, setCustomerAuthMethod] = useState<CustomerAuthMethod>("password");
  const [customerOtpChannel, setCustomerOtpChannel] = useState<CustomerOtpChannel>("email");
  const [customerOtpPhone, setCustomerOtpPhone] = useState("");
  const [customerOtpCode, setCustomerOtpCode] = useState("");
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [customerSessionEmail, setCustomerSessionEmail] = useState("");
  const [customerAuthMessage, setCustomerAuthMessage] = useState("");
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false);
  const [demoCustomerSessionPassword, setDemoCustomerSessionPassword] = useState(demoCustomerPassword);
  const [customerResetPassword, setCustomerResetPassword] = useState("");
  const [customerResetConfirm, setCustomerResetConfirm] = useState("");
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [builder, setBuilder] = useState({ baseId: seedMenu.bases[0].id, sizeId: seedMenu.sizes[0].id, toppingIds: [] as number[], quantity: 1 });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");
  const [toast, setToast] = useState("");
  const [workspace, setWorkspace] = useState<Workspace>("admin");
  const [adminTab, setAdminTab] = useState<AdminTab>("orders");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [adminEmail, setAdminEmail] = useState(demoAdminEmail);
  const [adminPassword, setAdminPassword] = useState(demoAdminPassword);
  const [adminSessionEmail, setAdminSessionEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAdmin = sessionStorage.getItem("slicematic_is_admin") === "true";
      if (!isAdmin) {
        router.replace("/");
      } else {
        setAdminLoggedIn(true);
        const supabase = getSupabaseAuthClient();
        if (supabase) {
          supabase.auth.getSession().then(({ data }) => {
            const token = data.session?.access_token ?? "";
            if (token) {
              setAdminAccessToken(token);
              setAdminSessionEmail(data.session?.user?.email ?? "");
            }
            refreshAdminSummary(token);
            loadOpsBriefing(token);
          });
        } else {
          refreshAdminSummary();
          loadOpsBriefing();
        }
      }
    }
  }, [router]);
  const [adminAuthView, setAdminAuthView] = useState<AdminAuthView>("login");
  const [adminAuthMessage, setAdminAuthMessage] = useState("");
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [demoSessionPassword, setDemoSessionPassword] = useState(demoAdminPassword);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [adminSummary, setAdminSummary] = useState<AdminSummary>(buildSeedSummary());
  const [adminSummaryLoading, setAdminSummaryLoading] = useState(false);
  const [adminSummaryStatus, setAdminSummaryStatus] = useState<"seed" | "live" | "error">("seed");
  const [adminSummaryError, setAdminSummaryError] = useState("");
  const [adminPaymentFilter, setAdminPaymentFilter] = useState("All");
  const [adminDateFilter, setAdminDateFilter] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(10);
  const [menuDraftSection, setMenuDraftSection] = useState<MenuSection>("pizzas");
  const [menuAdminPage, setMenuAdminPage] = useState<MenuAdminPage>("create");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("brand");
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyMenuDraft);
  const [menuSaving, setMenuSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [menuImageUploading, setMenuImageUploading] = useState(false);
  const [menuCopyLoading, setMenuCopyLoading] = useState(false);
  const [menuBaseline, setMenuBaseline] = useState<Record<string, Pick<MenuItem, "name" | "price" | "available">>>({});
  const [menuRowStatus, setMenuRowStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [cartInsight, setCartInsight] = useState<CartInsight | null>(null);
  const [cartInsightLoading, setCartInsightLoading] = useState(false);
  const [opsBriefing, setOpsBriefing] = useState<OpsBriefing | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderHistoryItem[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [brand, setBrand] = useState({
    name: "SliceMatic",
    outlet: "New Ashok Nagar",
    openStatus: "Open now",
    deliveryPromise: "30-40 min delivery",
    customerPromise: "Live price, safer payments, and smarter repeat orders.",
    opsPromise: "Peak demand, payments, menu, and AI operations controlled from one workspace.",
    hero: "Pizza delivery with a sharper kitchen, smarter recommendations, and a calmer checkout.",
    subhero: "Order from a live menu, build the exact pizza you want, and let the outlet control demand, revenue, and fulfilment from one polished screen."
  });

  useEffect(() => {
    fetch("/api/menu")
      .then((response) => response.json())
      .then((payload: MenuPayload) => {
        setMenu(payload);
        setMenuBaseline(snapshotMenuBaseline(payload));
      })
      .catch(() => setMenu(seedMenu));
    refreshAdminSummary();
  }, []);

  useEffect(() => {
    if (!adminLoggedIn) return;
    const refreshLiveAdminData = () => {
      if (document.visibilityState === "visible") {
        void refreshAdminSummary();
      }
    };
    const interval = window.setInterval(refreshLiveAdminData, 30000);
    window.addEventListener("focus", refreshLiveAdminData);
    document.addEventListener("visibilitychange", refreshLiveAdminData);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshLiveAdminData);
      document.removeEventListener("visibilitychange", refreshLiveAdminData);
    };
  }, [adminLoggedIn, adminAccessToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    // Cashfree redirects back with ?order_id=<our_order_id> after payment.
    const cfReturnOrderId = params.get("order_id");
    const cfPending = localStorage.getItem("cf_pending");
    if (cfReturnOrderId && cfPending) {
      const pending = JSON.parse(cfPending) as { orderId: string; amountPaise: number; payload: unknown };
      localStorage.removeItem("cf_pending");
      window.history.replaceState({}, "", window.location.pathname);
      setPlacingOrder(true);
      setPaymentStatusMessage("Verifying UPI payment…");
      void verifyCashfreeAndFinish(pending.orderId, pending.amountPaise, pending.payload);
      return;
    }

    const isRecovery = params.get("reset") === "true" || window.location.hash.includes("type=recovery");
    const isCustomerRecovery = params.get("customerReset") === "true";
    if (isCustomerRecovery) {
      setWorkspace("account");
      setCustomerAuthView("reset");
      setCustomerAuthMessage("Choose a new password to finish customer account recovery.");
      return;
    }
    if (isRecovery) {
      setWorkspace("admin");
      setAdminAuthView("reset");
      setAdminAuthMessage("Choose a new password to finish account recovery.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loggedInValue = window.sessionStorage.getItem("slicematic_customer_logged_in");
    if (loggedInValue === "true") {
      const customerJson = window.sessionStorage.getItem("slicematic_customer");
      const email = window.sessionStorage.getItem("slicematic_customer_email") ?? "";

      let identifierToUse = email;

      if (customerJson) {
        try {
          const parsedCustomer = JSON.parse(customerJson) as Partial<CustomerDetails>;
          if (!identifierToUse && parsedCustomer.phone) {
             identifierToUse = parsedCustomer.phone;
          }
          setCustomer((current) => ({
            ...current,
            name: parsedCustomer.name ?? current.name,
            phone: parsedCustomer.phone ?? current.phone,
            address: parsedCustomer.address ?? current.address,
            deliveryZone: parsedCustomer.deliveryZone ?? current.deliveryZone,
            note: parsedCustomer.note ?? current.note
          }));
        } catch {
          console.warn("Invalid customer session data");
        }
      }

      const customerId = window.sessionStorage.getItem("slicematic_customer_id")?.trim() ?? "";
      if (customerId) {
        setCustomerOrdersLoading(true);
        void getCustomerRoutesAuthToken().then((authToken) =>
          fetch(`/api/customer/orders?customer_id=${encodeURIComponent(customerId)}`, {
            cache: "no-store",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
          })
        )
          .then(res => res.json())
          .then(data => {
            if (data.ok && data.orders) {
              setCustomerOrders(data.orders);
            }
            if (data.ok && data.customer_id) {
              window.sessionStorage.setItem("slicematic_customer_id", data.customer_id);
            }
          })
          .catch(err => console.error("Error fetching customer orders", err))
          .finally(() => setCustomerOrdersLoading(false));
      }

      setCustomerLoggedIn(true);
      setCustomerSessionEmail(email || identifierToUse);
      setWorkspace("customer");
      setStep("menu");
    } else if (loggedInValue === "false") {
      setCustomerLoggedIn(false);
      setCustomerSessionEmail("");
      setStep("intake");
    }
  }, []);

  useEffect(() => {
    void fetchOutletPricingConfig().then((config) => {
      if (config) setPricingConfig(config);
    });
    const interval = window.setInterval(() => {
      void fetchOutletPricingConfig().then((config) => {
        if (config) setPricingConfig(config);
      });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [setPricingConfig]);

  useEffect(() => {
    fetch("/api/admin/outlet/brand", {
      headers: adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}
    })
      .then(r => r.json())
      .then(data => { if (data.ok && data.brandConfig) setBrand(data.brandConfig); })
      .catch(() => {});
  }, [adminAccessToken]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setCartInsight(null);
  }, [cart]);

  useEffect(() => {
    setOrderPage(1);
  }, [adminDateFilter, adminPaymentFilter, orderPageSize]);

  useEffect(() => {
    if (!customerLoggedIn && !pricingConfig.guestCashAllowed && paymentMode === "Cash") {
      setPaymentMode("UPI");
    }
  }, [customerLoggedIn, paymentMode, pricingConfig.guestCashAllowed]);

  const activePizzas = useMemo(() => menu.pizzas.filter((item) => item.available), [menu.pizzas]);
  const activeBases = useMemo(() => menu.bases.filter((item) => item.available), [menu.bases]);
  const activeSizes = useMemo(() => menu.sizes.filter((item) => item.available), [menu.sizes]);
  const activeToppings = useMemo(() => menu.toppings.filter((item) => item.available), [menu.toppings]);
  const totals = useMemo(() => calculateBill(cart, menu, pricingConfig), [cart, menu, pricingConfig]);
  const customerOrderMode = customerLoggedIn ? "Member order" : "Guest order";
  const customerPaymentPolicy = customerLoggedIn || pricingConfig.guestCashAllowed ? "Cash, Card, and UPI available" : "Guest checkout requires UPI or Card";

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
  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const safeOrderPage = Math.min(orderPage, orderPageCount);
  const orderPageStart = (safeOrderPage - 1) * orderPageSize;
  const paginatedOrders = filteredOrders.slice(orderPageStart, orderPageStart + orderPageSize);

  function showToast(message: string) {
    setToast(message);
  }

  function adminAuthHeader(): Record<string, string> | undefined {
    const token = adminAccessToken || (adminLoggedIn ? "demo-bypass" : "");
    return token ? { authorization: `Bearer ${token}` } : undefined;
  }

  async function persistOutletPricing(config: PricingConfig) {
    try {
      const response = await fetch("/api/admin/outlet/pricing", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...adminAuthHeader()
        },
        body: JSON.stringify({ pricingConfig: config })
      });
      if (!response.ok) {
        showToast("Financial settings could not be saved. Sign in again and retry.");
        return;
      }
      const result = await response.json();
      if (!result.ok) {
        showToast(result.error ?? "Financial settings could not be saved.");
      }
    } catch {
      showToast("Financial settings could not be saved. Check your connection and try again.");
    }
  }

  function updatePricing<K extends keyof PricingConfig>(field: K, value: PricingConfig[K]) {
    setPricingConfig((current) => ({ ...current, [field]: value }));
  }

  async function applySettings() {
    setSettingsSaving(true);
    try {
      const pricingRes = await fetch("/api/admin/outlet/pricing", {
        method: "POST",
        headers: { "content-type": "application/json", ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}) },
        body: JSON.stringify({ pricingConfig })
      });
      const pricingResult = await pricingRes.json();
      if (!pricingRes.ok || !pricingResult.ok) {
        showToast(pricingResult.error ?? "Could not save financial settings.");
        return;
      }
      
      const brandRes = await fetch("/api/admin/outlet/brand", {
        method: "POST",
        headers: { "content-type": "application/json", ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}) },
        body: JSON.stringify({ brandConfig: brand })
      });
      const brandResult = await brandRes.json();
      if (!brandRes.ok || !brandResult.ok) {
        showToast(brandResult.error ?? "Could not save brand settings.");
        return;
      }

      showToast("✓ Settings saved — live for all customers");
      const fastPoll = window.setInterval(() => {
        void fetchOutletPricingConfig().then(config => { if (config) setPricingConfig(config); });
      }, 5000);
      setTimeout(() => window.clearInterval(fastPoll), 60000);
    } catch {
      showToast("Network error — settings not saved. Check connection.");
    } finally {
      setSettingsSaving(false);
    }
  }

  function updatePercent(field: "gstRate" | "bulkDiscountRate", value: string) {
    const numeric = Number(value);
    updatePricing(field, (Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) / 100 : 0) as PricingConfig[typeof field]);
  }

  function updatePositiveNumber(field: "bulkDiscountQty" | "maxOrderQty" | "deliveryFee" | "freeDeliveryMin", value: string) {
    const numeric = Number(value);
    updatePricing(field, (Number.isFinite(numeric) ? Math.max(0, numeric) : 0) as PricingConfig[typeof field]);
  }

  function openCustomer() {
    setWorkspace("customer");
  }

  function openAccount() {
    setSelectedPizza(null);
    setWorkspace("account");
  }

  function openAdmin(tab: AdminTab = adminTab) {
    setSelectedPizza(null);
    setWorkspace("admin");
    setAdminTab(tab);
  }

  async function refreshAdminSummary(token = adminAccessToken) {
    if (!token) {
      if (sessionStorage.getItem("slicematic_customer_email") === demoAdminEmail || sessionStorage.getItem("slicematic_customer_email") === "demo@slicematic.in") {
        token = "demo-bypass";
      } else {
        const supabase = getSupabaseAuthClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) token = data.session.access_token;
        }
      }
    }
    setAdminSummaryLoading(true);
    setAdminSummaryError("");
    try {
      const response = await fetch("/api/admin/orders", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.recentOrders) {
        throw new Error(payload?.error ?? "Admin summary unavailable");
      }
      setAdminSummary(payload as AdminSummary);
      setAdminSummaryStatus("live");
    } catch (error) {
      setAdminSummaryStatus("error");
      setAdminSummaryError(error instanceof Error ? error.message : "Admin summary unavailable");
    } finally {
      setAdminSummaryLoading(false);
    }
  }

  function customerValidation() {
    return validateCustomer(customer.name, customer.phone, customer.address, customer.deliveryZone, pricingConfig);
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
    setWorkspace("customer");
    if (nextStep !== "intake" && !ensureCustomerReady()) return;
    if (nextStep === "checkout") {
      if (!cart.length) {
        showToast("Add at least one pizza before checkout.");
        return;
      }
      router.push("/payment");
      return;
    }
    if (nextStep === "tracking") {
      if (!lastOrder) {
        showToast("Place an order before tracking.");
        return;
      }
      router.push("/confirmation");
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

  function addPizzaDirectToCart(pizza: MenuItem) {
    if (!ensureCustomerReady()) return;
    const base = activeBases[0];
    const size = activeSizes[0];
    if (!base || !size) {
      showToast("Admin must enable at least one crust and size.");
      return;
    }
    const existingQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);
    if (existingQuantity + 1 > pricingConfig.maxOrderQty) {
      showToast(`Maximum outlet capacity is ${pricingConfig.maxOrderQty} pizzas per order.`);
      return;
    }
    setCart((current) => {
      const match = current.find(
        (line) =>
          line.pizzaId === pizza.id &&
          line.baseId === base.id &&
          line.sizeId === size.id &&
          line.toppingIds.length === 0
      );
      if (match) {
        return current.map((line) =>
          line.id === match.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          pizzaId: pizza.id,
          baseId: base.id,
          sizeId: size.id,
          toppingIds: [],
          quantity: 1
        }
      ];
    });
    showToast(`${pizza.name} added to cart.`);
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
    if (builder.quantity > pricingConfig.maxOrderQty) {
      showToast(`Maximum outlet capacity is ${pricingConfig.maxOrderQty} pizzas per order.`);
      return;
    }
    const existingQuantity = cart.reduce((sum, line) => sum + line.quantity, 0);
    if (existingQuantity + builder.quantity > pricingConfig.maxOrderQty) {
      showToast(`Maximum outlet capacity is ${pricingConfig.maxOrderQty} pizzas per order.`);
      return;
    }

    const areToppingsEqual = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    setCart((current) => {
      const match = current.find(
        (line) =>
          line.pizzaId === selectedPizza.id &&
          line.baseId === builder.baseId &&
          line.sizeId === builder.sizeId &&
          areToppingsEqual(line.toppingIds, builder.toppingIds)
      );
      if (match) {
        return current.map((line) =>
          line.id === match.id
            ? { ...line, quantity: line.quantity + builder.quantity }
            : line
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          pizzaId: selectedPizza.id,
          baseId: builder.baseId,
          sizeId: builder.sizeId,
          toppingIds: builder.toppingIds,
          quantity: builder.quantity
        }
      ];
    });
    setSelectedPizza(null);
    setStep("menu");
    showToast(`${selectedPizza.name} added to cart.`);
  }

  function removeCartLine(id: string) {
    setCart((current) => current.filter((line) => line.id !== id));
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("no window"));
        return;
      }
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
        resolve();
        return;
      }
      const existing = document.getElementById("razorpay-checkout-js");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("load failed")));
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("load failed"));
      document.body.appendChild(script);
    });
  }

  async function loadCashfreeSDK() {
    const { load } = await import("@cashfreepayments/cashfree-js");
    return load({ mode: "sandbox" as "sandbox" | "production" });
  }

  async function placeOrder() {
    if (!ensureCustomerReady()) return;
    if (!cart.length) {
      showToast("Add at least one pizza before checkout.");
      return;
    }
    if (!customerLoggedIn && !pricingConfig.guestCashAllowed && paymentMode === "Cash") {
      setPaymentMode("UPI");
      showToast("Guest checkout is online payment only. Sign in to use Cash.");
      return;
    }
    if (paymentMode === "Cash") {
      await placeCashOrder();
      return;
    }
    if (paymentMode === "UPI") {
      await placeUpiOrder();
      return;
    }
    await placeOnlineOrder();
  }

  async function placeCashOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer,
          lines: cart,
          paymentMode,
          customerMode: customerLoggedIn ? "member" : "guest",
          customerAccountEmail: customerLoggedIn ? customerSessionEmail : null,
          pricingConfig,
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
    } catch {
      showToast("Could not place order. Please retry.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function placeUpiOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    const orderPayload = {
      customer,
      lines: cart,
      paymentMode,
      customerMode: customerLoggedIn ? "member" : "guest",
      customerAccountEmail: customerLoggedIn ? customerSessionEmail : null,
      pricingConfig,
      recommendationId: recommendation?.recommendationId ?? null
    };
    try {
      const createRes = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const created = await createRes.json();
      if (!created.ok) {
        const message = Object.values(created.errors ?? { payment: "Could not start UPI payment." })[0] as string;
        setPaymentStatusMessage(message);
        showToast(message);
        setPlacingOrder(false);
        return;
      }

      localStorage.setItem("cf_pending", JSON.stringify({
        orderId: created.cfOrderId,
        amountPaise: created.amountPaise,
        payload: orderPayload,
      }));

      const cashfree = await loadCashfreeSDK();
      // redirectTarget "_self" = full-page redirect in the same tab.
      // After payment, Cashfree redirects to return_url?order_id=<orderId>.
      // The useEffect on mount detects that param and calls verify.
      cashfree.checkout({
        paymentSessionId: created.paymentSessionId,
        redirectTarget: "_self",
      });
      // Don't await — for redirect flow the promise never resolves (page navigates away).
      // If it does resolve (user somehow dismissed), cleanup below won't run because
      // we've already navigated. The useEffect handles verification on return.
    } catch {
      setPaymentStatusMessage("Could not start UPI payment. Please retry.");
      showToast("Could not start UPI payment. Please retry.");
      setPlacingOrder(false);
    }
  }

  async function verifyCashfreeAndFinish(cfOrderId: string, amountPaise: number, orderPayload: unknown) {
    try {
      const verifyRes = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cfOrderId, amountPaise, payload: orderPayload })
      });
      const result = await verifyRes.json();
      if (!result.ok) {
        setPaymentStatusMessage(Object.values(result.errors ?? { payment: "UPI payment verification failed." })[0] as string);
        return;
      }
      setLastOrder(result.order);
      setCart([]);
      setStep("tracking");
      refreshAdminSummary();
      showToast(paymentConfirmation(result.order.paymentMode));
    } catch {
      setPaymentStatusMessage("Could not confirm UPI payment. Please retry.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function placeOnlineOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    const orderPayload = {
      customer,
      lines: cart,
      paymentMode,
      customerMode: customerLoggedIn ? "member" : "guest",
      customerAccountEmail: customerLoggedIn ? customerSessionEmail : null,
      pricingConfig,
      recommendationId: recommendation?.recommendationId ?? null
    };
    try {
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const created = await createRes.json();
      if (!created.ok) {
        const message = Object.values(created.errors ?? { payment: "Could not start payment." })[0] as string;
        setPaymentStatusMessage(message);
        showToast(message);
        setPlacingOrder(false);
        return;
      }

      await loadRazorpayScript();
      const RazorpayCtor = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void; on: (event: string, handler: () => void) => void } }).Razorpay;
      if (!RazorpayCtor) {
        showToast("Payment module failed to load. Please retry.");
        setPlacingOrder(false);
        return;
      }

      const rzp = new RazorpayCtor({
        key: created.keyId,
        amount: String(created.amountPaise),
        currency: "INR",
        name: brand.name,
        description: "SliceMatic pizza order",
        order_id: created.razorpayOrderId,
        prefill: { name: created.prefillName, contact: created.prefillPhone },
        theme: { color: "#d33f2f" },
        handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          void verifyAndFinish(response, created.amountPaise, orderPayload);
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            setPaymentStatusMessage("Payment cancelled — no order was placed.");
          }
        }
      });
      rzp.on("payment.failed", () => {
        setPlacingOrder(false);
        setPaymentStatusMessage("Payment failed — no order was placed. You can retry.");
      });
      rzp.open();
    } catch {
      setPaymentStatusMessage("Could not start payment. Please retry.");
      showToast("Could not start payment. Please retry.");
      setPlacingOrder(false);
    }
  }

  async function verifyAndFinish(
    response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    amountPaise: number,
    orderPayload: unknown
  ) {
    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amountPaise,
          payload: orderPayload
        })
      });
      const result = await verifyRes.json();
      if (!result.ok) {
        setPaymentStatusMessage(Object.values(result.errors ?? { payment: "Payment verification failed." })[0] as string);
        return;
      }
      setLastOrder(result.order);
      setCart([]);
      setStep("tracking");
      refreshAdminSummary();
      showToast(paymentConfirmation(result.order.paymentMode));
    } catch {
      setPaymentStatusMessage("Payment captured but confirmation failed. Please contact support with your payment id.");
    } finally {
      setPlacingOrder(false);
    }
  }

  function getSupabaseAuthClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  /**
   * Bearer token for the protected /api/customer/* routes: "demo-bypass" for the
   * demo identity (which never has a real Supabase session), otherwise the live
   * Supabase access token for the currently active customer login.
   */
  async function getCustomerRoutesAuthToken(): Promise<string> {
    if (typeof window === "undefined") return "";
    const email = (window.sessionStorage.getItem("slicematic_customer_email") ?? "").trim().toLowerCase();
    if (email === "demo@slicematic.in" || email === "9999999999") return "demo-bypass";
    const supabase = getSupabaseAuthClient();
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  function validateAdminEmail() {
    if (!emailPattern.test(adminEmail.trim())) {
      setAdminAuthMessage("Enter a valid admin email address.");
      return false;
    }
    return true;
  }

  function validateCustomerAuthEmail() {
    if (!emailPattern.test(customerAuthEmail.trim())) {
      setCustomerAuthMessage("Enter a valid email address.");
      return false;
    }
    return true;
  }

  function normalizeOtpPhone() {
    const raw = customerOtpPhone.trim();
    const digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(raw)) {
      return raw;
    }
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `+91${digits}`;
    }
    if (/^91[6-9]\d{9}$/.test(digits)) {
      return `+${digits}`;
    }
    setCustomerAuthMessage("Enter a valid mobile number for OTP.");
    return null;
  }

  async function sendCustomerOtp() {
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setCustomerAuthMessage("OTP login needs Supabase Auth environment variables.");
        showToast("OTP login needs Supabase Auth.");
        return;
      }

      if (customerOtpChannel === "email") {
        if (!validateCustomerAuthEmail()) return;
        const email = customerAuthEmail.trim();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false }
        });
        if (error) {
          setCustomerAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        setCustomerOtpSent(true);
        setCustomerAuthMessage(`OTP sent to ${email}.`);
        showToast("Email OTP sent.");
        return;
      }

      const phone = normalizeOtpPhone();
      if (!phone) return;
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false }
      });
      if (error) {
        setCustomerAuthMessage(error.message);
        showToast(error.message);
        return;
      }
      setCustomerOtpSent(true);
      setCustomerAuthMessage(`OTP sent to ${phone}.`);
      showToast("Mobile OTP sent.");
    } finally {
      setCustomerAuthLoading(false);
    }
  }

  async function verifyCustomerOtp() {
    const token = customerOtpCode.trim();
    if (!/^\d{6}$/.test(token)) {
      setCustomerAuthMessage("Enter the 6-digit OTP.");
      return;
    }

    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setCustomerAuthMessage("OTP login needs Supabase Auth environment variables.");
        return;
      }

      const result = customerOtpChannel === "email"
        ? await supabase.auth.verifyOtp({ email: customerAuthEmail.trim(), token, type: "email" })
        : await (async () => {
            const phone = normalizeOtpPhone();
            if (!phone) return null;
            return supabase.auth.verifyOtp({ phone, token, type: "sms" });
          })();
      if (!result) return;

      if (result.error) {
        setCustomerAuthMessage(result.error.message);
        showToast(result.error.message);
        return;
      }

      const user = result.data.user;
      const sessionName = user?.email ?? user?.phone ?? customerAuthEmail.trim();
      setCustomerLoggedIn(true);
      setCustomerSessionEmail(sessionName);
      setCustomerOtpCode("");
      setCustomerOtpSent(false);
      setCustomerAuthMessage("");
      showToast("Customer account verified.");
    } finally {
      setCustomerAuthLoading(false);
    }
  }

  function validateCustomerNewPassword() {
    if (customerResetPassword.length < 8) {
      setCustomerAuthMessage("New password must be at least 8 characters.");
      return false;
    }
    if (customerResetPassword !== customerResetConfirm) {
      setCustomerAuthMessage("Passwords do not match.");
      return false;
    }
    return true;
  }

  async function customerLogin() {
    if (!validateCustomerAuthEmail()) return;
    if (customerAuthPassword.length < 8) {
      setCustomerAuthMessage("Password must be at least 8 characters.");
      return;
    }

    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    useStore.getState().resetSession();
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: customerAuthEmail.trim(), password: customerAuthPassword });
        if (error) {
          setCustomerAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        const email = data.user?.email ?? customerAuthEmail.trim();
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(email);
        setWorkspace("customer");
        setStep("menu");
        setCustomerAuthView("login");
        setCustomerAuthMessage("");
        showToast("Customer account signed in.");
        return;
      }

      if (customerAuthEmail.trim() === demoCustomerEmail && customerAuthPassword === demoCustomerSessionPassword) {
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(demoCustomerEmail);
        setWorkspace("customer");
        setStep("menu");
        setCustomerAuthView("login");
        setCustomerAuthMessage("");
        showToast("Demo customer account signed in.");
      } else {
        setCustomerAuthMessage("Use the demo customer credentials or configure Supabase Auth.");
        showToast("Use the demo customer credentials or configure Supabase Auth.");
      }
    } finally {
      setCustomerAuthLoading(false);
    }
  }

  async function requestCustomerPasswordReset() {
    if (!validateCustomerAuthEmail()) return;
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const redirectTo = `${window.location.origin}?customerReset=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(customerAuthEmail.trim(), { redirectTo });
        if (error) {
          setCustomerAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        setCustomerAuthMessage("Password reset link sent. Open the email link, then set the new password here.");
        showToast("Customer reset link sent.");
        return;
      }

      setCustomerAuthView("reset");
      setCustomerAuthMessage("Demo mode: set a new local customer password for this browser session.");
      showToast("Demo customer reset screen ready.");
    } finally {
      setCustomerAuthLoading(false);
    }
  }

  async function resetCustomerPassword() {
    if (!validateCustomerNewPassword()) return;
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setCustomerAuthMessage("Open the recovery link from your email before setting a new password.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: customerResetPassword });
        if (error) {
          setCustomerAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(sessionData.session.user.email ?? customerAuthEmail.trim());
        setWorkspace("customer");
        setStep("menu");
        setCustomerResetPassword("");
        setCustomerResetConfirm("");
        setCustomerAuthView("login");
        showToast("Customer password reset complete.");
        return;
      }

      setDemoCustomerSessionPassword(customerResetPassword);
      setCustomerAuthPassword(customerResetPassword);
      setCustomerResetPassword("");
      setCustomerResetConfirm("");
      setCustomerLoggedIn(false);
      setCustomerAuthView("login");
      setCustomerAuthMessage("Demo customer password updated for this session. Sign in with the new password.");
      showToast("Demo customer password updated.");
    } finally {
      setCustomerAuthLoading(false);
    }
  }

  async function customerLogout() {
    setCustomerAuthLoading(true);
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) await supabase.auth.signOut();
    } finally {
      useStore.getState().resetSession();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("slicematic_customer");
        sessionStorage.removeItem("slicematic_customer_email");
        sessionStorage.removeItem("slicematic_customer_id");
        sessionStorage.removeItem("slicematic_workspace");
        sessionStorage.setItem("slicematic_customer_logged_in", "false");
        localStorage.removeItem("cf_pending");
      }
      setCustomerLoggedIn(false);
      setCustomerSessionEmail("");
      setCustomerAuthView("login");
      setCustomerAuthMessage("You have been signed out.");
      setWorkspace("customer");
      setStep("intake");
      setCustomerAuthLoading(false);
      showToast("Signed out of customer account.");
    }
  }

  function useSavedCustomerProfile() {
    setCustomer({
      name: "Aarav Sharma",
      phone: "9876543210",
      address: "Flat 1204, Lotus Heights, near Metro Gate 2, New Ashok Nagar",
      deliveryZone: "2-4",
      note: "Call once before dispatch."
    });
    setWorkspace("customer");
    setStep("intake");
    showToast("Saved delivery profile applied.");
  }

  function addMemberFavoriteOrder() {
    const pizza = menu.pizzas.find((item) => item.name.toLowerCase().includes("paneer")) ?? activePizzas[0];
    const base = activeBases.find((item) => item.name.toLowerCase().includes("cheese")) ?? activeBases[0];
    const size = activeSizes.find((item) => item.id === "large") ?? activeSizes[0];
    const topping = activeToppings.find((item) => item.name.toLowerCase().includes("cheese")) ?? activeToppings[0];
    if (!pizza || !base || !size) {
      showToast("Menu needs at least one pizza, crust, and size.");
      return;
    }
    setCart((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        pizzaId: pizza.id,
        baseId: base.id,
        sizeId: size.id,
        toppingIds: topping ? [topping.id] : [],
        quantity: 1
      }
    ]);
    setWorkspace("customer");
    setStep("menu");
    showToast(`${pizza.name} favourite added to cart.`);
  }

  function validateNewPassword() {
    if (resetPassword.length < 8) {
      setAdminAuthMessage("New password must be at least 8 characters.");
      return false;
    }
    if (resetPassword !== resetConfirm) {
      setAdminAuthMessage("Passwords do not match.");
      return false;
    }
    return true;
  }

  async function adminLogin() {
    if (!validateAdminEmail()) return;
    if (adminPassword.length < 8) {
      setAdminAuthMessage("Password must be at least 8 characters.");
      return;
    }

    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    useStore.getState().resetSession();
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail.trim(), password: adminPassword });
        if (error) {
          setAdminAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        const token = data.session?.access_token ?? "";
        setAdminAccessToken(token);
        setAdminSessionEmail(data.user?.email ?? adminEmail.trim());
        setAdminLoggedIn(true);
        setAdminAuthView("login");
        setAdminAuthMessage("");
        refreshAdminSummary(token);
        loadOpsBriefing(token);
        showToast("Admin session opened.");
        return;
      }

      if (adminEmail.trim() === demoAdminEmail && adminPassword === demoSessionPassword) {
        setAdminLoggedIn(true);
        setAdminSessionEmail(demoAdminEmail);
        setAdminAccessToken("");
        setAdminAuthView("login");
        setAdminAuthMessage("");
        refreshAdminSummary();
        loadOpsBriefing();
        showToast("Demo admin session opened.");
      } else {
        setAdminAuthMessage("Use the demo admin credentials or configure Supabase Auth.");
        showToast("Use the demo admin credentials or configure Supabase Auth.");
      }
    } finally {
      setAdminAuthLoading(false);
    }
  }

  async function requestPasswordReset() {
    if (!validateAdminEmail()) return;
    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const redirectTo = `${window.location.origin}?reset=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(adminEmail.trim(), { redirectTo });
        if (error) {
          setAdminAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        setAdminAuthMessage("Password reset link sent. Open the email link, then set the new password here.");
        showToast("Password reset link sent.");
        return;
      }

      setAdminAuthView("reset");
      setAdminAuthMessage("Demo mode: set a new local admin password for this browser session.");
      showToast("Demo password reset screen ready.");
    } finally {
      setAdminAuthLoading(false);
    }
  }

  async function resetAdminPassword() {
    if (!validateNewPassword()) return;
    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setAdminAuthMessage("Open the recovery link from your email before setting a new Supabase password.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: resetPassword });
        if (error) {
          setAdminAuthMessage(error.message);
          showToast(error.message);
          return;
        }
        setAdminAccessToken(sessionData.session.access_token ?? "");
        setAdminSessionEmail(sessionData.session.user.email ?? adminEmail.trim());
        setAdminLoggedIn(true);
        setResetPassword("");
        setResetConfirm("");
        setAdminAuthView("login");
        refreshAdminSummary(sessionData.session.access_token ?? "");
        loadOpsBriefing(sessionData.session.access_token ?? "");
        showToast("Password reset complete. Admin session opened.");
        return;
      }

      setDemoSessionPassword(resetPassword);
      setAdminPassword(resetPassword);
      setAdminLoggedIn(false);
      setResetPassword("");
      setResetConfirm("");
      setAdminAuthView("login");
      setAdminAuthMessage("Demo password updated for this session. Sign in with the new password.");
      showToast("Demo admin password updated.");
    } finally {
      setAdminAuthLoading(false);
    }
  }

  async function adminLogout() {
    setAdminAuthLoading(true);
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) await supabase.auth.signOut();
    } finally {
      useStore.getState().resetSession();
      sessionStorage.removeItem("slicematic_is_admin");
      sessionStorage.removeItem("slicematic_admin_view_customer");
      sessionStorage.removeItem("slicematic_customer_logged_in");
      localStorage.removeItem("cf_pending");
      setAdminLoggedIn(false);
      router.replace("/");
    }
  }

  async function loadOpsBriefing(token = adminAccessToken) {
    if (!token) {
      if (sessionStorage.getItem("slicematic_customer_email") === demoAdminEmail || sessionStorage.getItem("slicematic_customer_email") === "demo@slicematic.in") {
        token = "demo-bypass";
      } else {
        const supabase = getSupabaseAuthClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) token = data.session.access_token;
        }
      }
    }
    setOpsLoading(true);
    try {
      const response = await fetch("/api/ai/ops-briefing", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined
      });
      const result = await response.json();
      if (!result.ok) throw new Error("Ops briefing unavailable");
      setOpsBriefing(result.briefing);
    } catch {
      showToast("AI operations briefing is unavailable.");
    } finally {
      setOpsLoading(false);
    }
  }

  async function downloadCsv() {
    try {
      let token = adminAccessToken;
      if (!token) {
        if (sessionStorage.getItem("slicematic_customer_email") === demoAdminEmail || sessionStorage.getItem("slicematic_customer_email") === "demo@slicematic.in") {
          token = "demo-bypass";
        } else {
          const supabase = getSupabaseAuthClient();
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data.session) token = data.session.access_token;
          }
        }
      }
      const response = await fetch("/api/admin/orders?format=csv", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined
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

  async function getCartInsight() {
    if (!ensureCustomerReady()) return;
    setCartInsightLoading(true);
    try {
      const response = await fetch("/api/ai/cart-insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer, lines: cart })
      });
      const result = await response.json();
      if (!result.ok) throw new Error("Cart insight unavailable");
      setCartInsight(result.insight);
    } catch {
      showToast("AI cart insight is unavailable.");
    } finally {
      setCartInsightLoading(false);
    }
  }

  function applyCartInsight() {
    if (!cartInsight?.suggestedPizzaId) {
      goToStep("checkout");
      return;
    }
    const pizza = menu.pizzas.find((item) => item.id === cartInsight.suggestedPizzaId && item.available);
    if (!pizza) {
      showToast("Suggested pizza is no longer available.");
      return;
    }
    setRecommendation((current) => current ?? {
      pizzaId: pizza.id,
      toppingId: cartInsight.suggestedToppingId ?? activeToppings[0]?.id ?? 1,
      pizzaName: pizza.name,
      toppingName: cartInsight.suggestedToppingName ?? activeToppings[0]?.name ?? "Topping",
      reason: cartInsight.message,
      confidence: cartInsight.confidence,
      source: "fallback",
      customerTier: "new"
    });
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
      toppingIds: cartInsight.suggestedToppingId ? [cartInsight.suggestedToppingId] : [],
      quantity: 1
    });
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

  function isMenuRowDirty(section: MenuSection, item: MenuItem) {
    const baseline = menuBaseline[menuRowKey(section, item.id)];
    if (!baseline) return false;
    return baseline.name !== item.name || baseline.price !== item.price || baseline.available !== item.available;
  }

  async function saveMenuRow(section: MenuSection, item: MenuItem) {
    const key = menuRowKey(section, item.id);
    setMenuRowStatus((current) => ({ ...current, [key]: "saving" }));
    try {
      const response = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...adminAuthHeader()
        },
        body: JSON.stringify({
          section,
          id: item.id,
          item: { name: item.name, price: item.price, available: item.available }
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMenuRowStatus((current) => ({ ...current, [key]: "error" }));
        showToast(Object.values(result.errors ?? { server: "This item could not be saved." })[0] as string);
        return;
      }

      const saved = result.item as MenuItem;
      setMenu((current) => ({
        ...current,
        [section]: current[section].map((entry) => (entry.id === item.id ? saved : entry))
      }));
      setMenuBaseline((current) => ({
        ...current,
        [key]: { name: saved.name, price: saved.price, available: saved.available }
      }));
      setMenuRowStatus((current) => ({ ...current, [key]: "saved" }));
      showToast(`${saved.name} saved.`);
      window.setTimeout(() => {
        setMenuRowStatus((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }, 2000);
    } catch {
      setMenuRowStatus((current) => ({ ...current, [key]: "error" }));
      showToast("This item could not be saved. Check your connection and try again.");
    }
  }

  function renderRowSaveButton(section: MenuSection, item: MenuItem) {
    const status = menuRowStatus[menuRowKey(section, item.id)];
    const dirty = isMenuRowDirty(section, item);
    const stateClass = status ?? (dirty ? "dirty" : "idle");
    const label = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Retry" : "Save";
    return (
      <button
        type="button"
        className={`row-save-btn ${stateClass}`}
        disabled={status === "saving" || (!dirty && status !== "error")}
        onClick={() => saveMenuRow(section, item)}
      >
        {label}
      </button>
    );
  }

  function nextMenuItem(section: MenuSection, draft = menuDraft): MenuItem {
    const collection = menu[section];
    const nextId = Math.max(0, ...collection.map((item) => item.id)) + 1;
    const prefix = section === "pizzas" ? "P" : section === "bases" ? "B" : "T";
    const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    return {
      id: nextId,
      code: draft.code.trim().toUpperCase() || `${prefix}${nextId}`,
      name: draft.name.trim(),
      price: Number(draft.price),
      description: draft.description.trim() || defaultDraftDescription(section),
      image: section === "pizzas" ? draft.image.trim() || "/assets/pizza-hero.jpg" : undefined,
      badge: section === "pizzas" ? draft.badge.trim() || "New" : undefined,
      tags: section === "pizzas" ? (tags.length ? tags : ["Signature"]) : undefined,
      prepMinutes: section === "pizzas" ? Number(draft.prepMinutes || 24) : undefined,
      available: true
    };
  }

  async function addMenuItem() {
    const name = menuDraft.name.trim();
    const price = Number(menuDraft.price);
    if (name.length < 2) {
      showToast("Add a menu item name first.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast("Menu price must be a positive number.");
      return;
    }

    setMenuSaving(true);
    try {
      let item = nextMenuItem(menuDraftSection);
      const authHeader = adminAuthHeader();
      if (authHeader) {
        const response = await fetch("/api/admin/menu", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeader
          },
          body: JSON.stringify({ section: menuDraftSection, item })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          showToast(Object.values(result.errors ?? { server: "Menu item could not be saved." })[0] as string);
          return;
        }
        item = result.item as MenuItem;
      }

      setMenu((current) => ({
        ...current,
        [menuDraftSection]: [...current[menuDraftSection], item]
      }));
      setMenuBaseline((current) => ({
        ...current,
        [menuRowKey(menuDraftSection, item.id)]: { name: item.name, price: item.price, available: item.available }
      }));
      setMenuDraft(emptyMenuDraft);
      setQuery("");
      setCategory("All");
      showToast(`${item.name} added to ${menuDraftSection}.`);

      // confirm with server (catches any DB-side discrepancy or edge-cache stale hit)
      fetch("/api/menu")
        .then((r) => r.json())
        .then((payload: MenuPayload) => {
          setMenu(payload);
          setMenuBaseline(snapshotMenuBaseline(payload));
        })
        .catch(() => { /* leave optimistic state on network error */ });
    } catch {
      showToast("Menu item could not be saved. Check admin access and Supabase settings.");
    } finally {
      setMenuSaving(false);
    }
  }

  async function uploadMenuImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast("Image must be 4 MB or smaller.");
      return;
    }

    setMenuImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: adminAuthHeader(),
        body: form
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        showToast(result.error ?? "Image upload failed.");
        return;
      }
      setMenuDraft((current) => ({ ...current, image: result.url }));
      showToast("Image uploaded and linked to this pizza.");
    } catch {
      showToast("Image upload failed.");
    } finally {
      setMenuImageUploading(false);
    }
  }

  async function generateMenuCopy() {
    if (!menuDraft.name.trim()) {
      showToast("Add an item name before using AI copy.");
      return;
    }
    setMenuCopyLoading(true);
    try {
      const response = await fetch("/api/ai/menu-copy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...adminAuthHeader()
        },
        body: JSON.stringify({
          section: menuDraftSection,
          name: menuDraft.name,
          price: menuDraft.price,
          tags: menuDraft.tags
        })
      });
      const result = await response.json();
      if (!result.ok) {
        showToast(Object.values(result.errors ?? { server: "AI copy could not be generated." })[0] as string);
        return;
      }
      const copy = result.copy;
      setMenuDraft((current) => ({
        ...current,
        description: copy.description ?? current.description,
        badge: copy.badge ?? current.badge,
        tags: Array.isArray(copy.tags) ? copy.tags.join(", ") : current.tags,
        prepMinutes: copy.prepMinutes ? String(copy.prepMinutes) : current.prepMinutes
      }));
      showToast(`AI menu copy generated (${result.source}).`);
    } catch {
      showToast("AI copy could not be generated.");
    } finally {
      setMenuCopyLoading(false);
    }
  }

  function defaultDraftDescription(section: MenuSection) {
    if (section === "pizzas") return "New chef-curated pizza added from the admin menu studio.";
    if (section === "bases") return "New crust option added for customer customization.";
    return "New add-on topping available for customized orders.";
  }

  function showAdminAuthView(view: AdminAuthView) {
    setAdminAuthView(view);
    setAdminAuthMessage("");
  }

  function renderAdminAuth() {
    const authTitle = adminAuthView === "login" ? "Sign in to SliceMatic Ops" : adminAuthView === "forgot" ? "Recover admin access" : "Set a new password";
    const authCopy = adminAuthView === "login"
      ? "Secure access keeps menu changes, exports, AI operations, and revenue data inside the control room."
      : adminAuthView === "forgot"
        ? "Send a Supabase recovery link to the admin email. In demo mode, this opens a local reset flow."
        : "Use the recovery session from email, or update the local demo password for this browser session.";

    return (
      <section className="auth-console">
        <aside className="auth-visual">
          <span className="auth-mark">{adminAuthView === "forgot" ? <Mail /> : adminAuthView === "reset" ? <KeyRound /> : <Lock />}</span>
          <p className="eyebrow">Secure application access</p>
          <h2>{authTitle}</h2>
          <p>{authCopy}</p>
          <div className="auth-checks">
            <span><Check /> Supabase Auth ready</span>
            <span><Check /> Demo fallback included</span>
            <span><Check /> Admin APIs stay token-gated</span>
          </div>
        </aside>

        <section className="auth-card" aria-live="polite">
          {adminAuthView !== "login" && (
            <button className="text-action" type="button" onClick={() => showAdminAuthView("login")}><ArrowLeft /> Back to login</button>
          )}

          {adminAuthView === "login" && (
            <>
              <div className="auth-heading">
                <Lock />
                <div>
                  <p className="eyebrow">Admin login</p>
                  <h3>Operations console</h3>
                </div>
              </div>
              <label>Admin email
                <div className="input-with-icon"><Mail /><input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@slicematic.in" /></div>
              </label>
              <label>Password
                <div className="input-with-icon"><KeyRound /><input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Minimum 8 characters" /></div>
              </label>
              <button className="primary" disabled={adminAuthLoading} onClick={adminLogin} type="button"><ShieldCheck /> {adminAuthLoading ? "Signing in" : "Sign in"}</button>
              <div className="auth-links">
                <button type="button" onClick={() => showAdminAuthView("forgot")}>Forgot password</button>
                <button type="button" onClick={() => showAdminAuthView("reset")}>Reset password</button>
              </div>
              <div className="demo-credential">
                <span>Demo</span>
                <strong>{demoAdminEmail}</strong>
                <small>Password: {demoSessionPassword}</small>
              </div>
            </>
          )}

          {adminAuthView === "forgot" && (
            <>
              <div className="auth-heading">
                <Mail />
                <div>
                  <p className="eyebrow">Forgot password</p>
                  <h3>Send recovery link</h3>
                </div>
              </div>
              <label>Admin email
                <div className="input-with-icon"><Mail /><input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@slicematic.in" /></div>
              </label>
              <button className="primary" disabled={adminAuthLoading} onClick={requestPasswordReset} type="button"><Send /> {adminAuthLoading ? "Sending link" : "Send reset link"}</button>
              <button className="secondary-action" type="button" onClick={() => showAdminAuthView("reset")}><KeyRound /> I have a recovery link</button>
            </>
          )}

          {adminAuthView === "reset" && (
            <>
              <div className="auth-heading">
                <KeyRound />
                <div>
                  <p className="eyebrow">Reset password</p>
                  <h3>Create new credentials</h3>
                </div>
              </div>
              <label>New password
                <div className="input-with-icon"><KeyRound /><input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="At least 8 characters" /></div>
              </label>
              <label>Confirm password
                <div className="input-with-icon"><KeyRound /><input type="password" value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} placeholder="Repeat new password" /></div>
              </label>
              <button className="primary" disabled={adminAuthLoading} onClick={resetAdminPassword} type="button"><ShieldCheck /> {adminAuthLoading ? "Updating password" : "Update password"}</button>
            </>
          )}

          {adminAuthMessage && <div className="auth-message">{adminAuthMessage}</div>}
        </section>
      </section>
    );
  }

  function showCustomerAuthView(view: CustomerAuthView) {
    setCustomerAuthView(view);
    setCustomerAuthMessage("");
  }

  function renderCustomerAccount() {
    if (customerLoggedIn) {
      return (
        <section className="account-shell" id="customer-account">
          <div className="account-hero">
            <div>
              <p className="eyebrow">Customer account</p>
              <h2>Welcome back, {customerSessionEmail || "SliceMatic customer"}.</h2>
              <p>Use your account for faster checkout, repeat-order recommendations, saved delivery context, and order history when Supabase is connected.</p>
            </div>
            <div className="account-actions">
              <div className="session-pill"><UserRound /><span>{customerSessionEmail}</span></div>
              <button type="button" onClick={useSavedCustomerProfile}><Check /> Use saved profile</button>
              <button type="button" onClick={addMemberFavoriteOrder}><Sparkles /> Rebuild favourite</button>
              <button className="primary" type="button" onClick={openCustomer}><ShoppingBag /> Continue ordering</button>
              <button className="danger-action" type="button" onClick={customerLogout}><LogOut /> Logout</button>
            </div>
          </div>
          <div className="account-grid">
            <article className="order-history-widget" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <ReceiptText /><strong>Your Order History</strong>
              </div>
              {customerOrdersLoading ? (
                <p style={{ color: "var(--text-muted)" }}>Loading past orders...</p>
              ) : customerOrders.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No past orders found. Place your first order today!</p>
              ) : (
                <CustomerOrderHistoryTable orders={customerOrders} />
              )}
            </article>
            <article><Sparkles /><strong>Personalized picks</strong><span>Recommendation context can use account-linked history.</span></article>
            <article><ShieldCheck /><strong>Easy login</strong><span>Passwordless login using otp only.</span></article>
            <article><CreditCard /><strong>Full payment choice</strong><span>Members can use Cash, Card, or UPI; guests stay online-only.</span></article>
          </div>
        </section>
      );
    }

    const authTitle = customerAuthView === "login" ? "Sign in to your SliceMatic account" : customerAuthView === "forgot" ? "Recover customer access" : "Set a new customer password";
    const authCopy = customerAuthView === "login"
      ? "Customer accounts keep repeat ordering, recommendations, and delivery preferences ready without blocking guest checkout."
      : customerAuthView === "forgot"
        ? "Send a recovery link to your customer email. In demo mode, this opens a local reset flow."
        : "Use the recovery session from email, or update the local demo customer password for this browser session.";

    return (
      <section className="auth-console customer-auth" id="customer-account">
        <aside className="auth-visual">
          <span className="auth-mark">{customerAuthView === "forgot" ? <Mail /> : customerAuthView === "reset" ? <KeyRound /> : <UserRound />}</span>
          <p className="eyebrow">Customer account</p>
          <h2>{authTitle}</h2>
          <p>{authCopy}</p>
          <div className="auth-checks">
            <span><Check /> Guest ordering still works</span>
            <span><Check /> Supabase Auth ready</span>
            <span><Check /> Password recovery included</span>
          </div>
        </aside>

        <section className="auth-card" aria-live="polite">
          {customerAuthView !== "login" && (
            <button className="text-action" type="button" onClick={() => showCustomerAuthView("login")}><ArrowLeft /> Back to login</button>
          )}

          {customerAuthView === "login" && (
            <>
              <div className="auth-heading">
                <UserRound />
                <div>
                  <p className="eyebrow">Customer login</p>
                  <h3>Faster repeat orders</h3>
                </div>
              </div>
              <div className="auth-method-toggle" role="group" aria-label="Customer sign in method">
                <button className={customerAuthMethod === "password" ? "active" : ""} type="button" onClick={() => setCustomerAuthMethod("password")}><KeyRound /> Password</button>
                <button className={customerAuthMethod === "otp" ? "active" : ""} type="button" onClick={() => setCustomerAuthMethod("otp")}><ShieldCheck /> OTP</button>
              </div>

              {customerAuthMethod === "password" && (
                <>
                  <label>Email
                    <div className="input-with-icon"><Mail /><input value={customerAuthEmail} onChange={(event) => setCustomerAuthEmail(event.target.value)} placeholder="customer@slicematic.in" /></div>
                  </label>
                  <label>Password
                    <div className="input-with-icon"><KeyRound /><input type="password" value={customerAuthPassword} onChange={(event) => setCustomerAuthPassword(event.target.value)} placeholder="Minimum 8 characters" /></div>
                  </label>
                  <button className="primary" disabled={customerAuthLoading} onClick={customerLogin} type="button"><ShieldCheck /> {customerAuthLoading ? "Signing in" : "Sign in"}</button>
                </>
              )}

              {customerAuthMethod === "otp" && (
                <>
                  <div className="otp-channel-row" role="group" aria-label="OTP channel">
                    <button className={customerOtpChannel === "email" ? "active" : ""} type="button" onClick={() => { setCustomerOtpChannel("email"); setCustomerOtpSent(false); setCustomerOtpCode(""); }}><Mail /> Email</button>
                    <button className={customerOtpChannel === "sms" ? "active" : ""} type="button" onClick={() => { setCustomerOtpChannel("sms"); setCustomerOtpSent(false); setCustomerOtpCode(""); }}><Phone /> Mobile</button>
                  </div>
                  {customerOtpChannel === "email" ? (
                    <label>Email
                      <div className="input-with-icon"><Mail /><input value={customerAuthEmail} onChange={(event) => { setCustomerAuthEmail(event.target.value); setCustomerOtpSent(false); }} placeholder="saurav@slicematic.in" /></div>
                    </label>
                  ) : (
                    <label>Mobile number
                      <div className="input-with-icon"><Phone /><input value={customerOtpPhone} onChange={(event) => { setCustomerOtpPhone(event.target.value); setCustomerOtpSent(false); }} placeholder="9876500101" inputMode="tel" /></div>
                    </label>
                  )}
                  <div className="otp-actions">
                    <button className="primary" disabled={customerAuthLoading} onClick={sendCustomerOtp} type="button"><Send /> {customerAuthLoading ? "Sending OTP" : customerOtpSent ? "Resend OTP" : "Send OTP"}</button>
                  </div>
                  {customerOtpSent && (
                    <>
                      <label>OTP code
                        <div className="input-with-icon"><ShieldCheck /><input value={customerOtpCode} onChange={(event) => setCustomerOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" /></div>
                      </label>
                      <button className="primary" disabled={customerAuthLoading} onClick={verifyCustomerOtp} type="button"><ShieldCheck /> {customerAuthLoading ? "Verifying" : "Verify and sign in"}</button>
                    </>
                  )}
                </>
              )}
              <button className="secondary-action" type="button" onClick={openCustomer}><ShoppingBag /> Continue as guest</button>
              <div className="auth-links">
                <button type="button" onClick={() => showCustomerAuthView("forgot")}>Forgot password</button>
                <button type="button" onClick={() => showCustomerAuthView("reset")}>Reset password</button>
              </div>
              <div className="demo-credential">
                <span>Demo customer</span>
                <strong>{demoCustomerEmail}</strong>
                <small>Password: {demoCustomerSessionPassword}</small>
              </div>
              <div className="customer-mode-compare">
                <article>
                  <strong>Guest</strong>
                  <span>Fast checkout, UPI/Card only, no saved order memory.</span>
                </article>
                <article>
                  <strong>Member</strong>
                  <span>Saved profile, favourite rebuild, history-aware recommendations, Cash unlocked.</span>
                </article>
              </div>
            </>
          )}

          {customerAuthView === "forgot" && (
            <>
              <div className="auth-heading">
                <Mail />
                <div>
                  <p className="eyebrow">Forgot password</p>
                  <h3>Send recovery link</h3>
                </div>
              </div>
              <label>Email
                <div className="input-with-icon"><Mail /><input value={customerAuthEmail} onChange={(event) => setCustomerAuthEmail(event.target.value)} placeholder="customer@slicematic.in" /></div>
              </label>
              <button className="primary" disabled={customerAuthLoading} onClick={requestCustomerPasswordReset} type="button"><Send /> {customerAuthLoading ? "Sending link" : "Send reset link"}</button>
              <button className="secondary-action" type="button" onClick={() => showCustomerAuthView("reset")}><KeyRound /> I have a recovery link</button>
            </>
          )}

          {customerAuthView === "reset" && (
            <>
              <div className="auth-heading">
                <KeyRound />
                <div>
                  <p className="eyebrow">Reset password</p>
                  <h3>Create new credentials</h3>
                </div>
              </div>
              <label>New password
                <div className="input-with-icon"><KeyRound /><input type="password" value={customerResetPassword} onChange={(event) => setCustomerResetPassword(event.target.value)} placeholder="At least 8 characters" /></div>
              </label>
              <label>Confirm password
                <div className="input-with-icon"><KeyRound /><input type="password" value={customerResetConfirm} onChange={(event) => setCustomerResetConfirm(event.target.value)} placeholder="Repeat new password" /></div>
              </label>
              <button className="primary" disabled={customerAuthLoading} onClick={resetCustomerPassword} type="button"><ShieldCheck /> {customerAuthLoading ? "Updating password" : "Update password"}</button>
            </>
          )}

          {customerAuthMessage && <div className="auth-message">{customerAuthMessage}</div>}
        </section>
      </section>
    );
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
        <a className="brand" href="#customer-app" onClick={(event) => { event.preventDefault(); openCustomer(); }}>
          <span><Pizza /></span>
          <div>
            <strong>{brand.name}</strong>
            <small>{brand.outlet}</small>
          </div>
        </a>
        <nav>
          <button onClick={() => {
            sessionStorage.setItem("slicematic_admin_view_customer", "true");
            router.push("/");
          }} type="button"><Utensils /> Customer app</button>
          <button className="active" onClick={() => setAdminTab("overview")} type="button"><Settings2 /> Admin console</button>
        </nav>
        {workspace === "customer" ? (
          <div className="top-customer-tools">
            <button className={customerLoggedIn ? "customer-chip signed-in" : "customer-chip guest"} type="button" onClick={customerLoggedIn ? openAccount : undefined} style={{ cursor: customerLoggedIn ? "pointer" : "default" }}>
              <UserRound />
              <span>{customerLoggedIn ? `Logged in as ${customerSessionEmail}` : "Guest checkout"}</span>
            </button>

          </div>
        ) : (
          <div className="workspace-status">
            {workspace === "account" ? <UserRound /> : <ShieldCheck />}
            <span>{workspace === "account" ? (customerLoggedIn ? customerSessionEmail || "Customer signed in" : "Customer account access") : (adminLoggedIn ? adminSessionEmail || "Signed in" : "Secure operations access")}</span>
          </div>
        )}
      </header>

      {false && renderCustomerAccount()}

      {false && (
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
                    {/* <div className="hero-actions">
                      <button type="button" onClick={() => setStep("menu")}><Flame /> Start order</button>
                      <button type="button" onClick={() => openAdmin("overview")}><ShieldCheck /> Admin dashboard</button>
                    </div> */}
                  </div>
                  <img src="/assets/pizza-hero.jpg" alt="Fresh pizza" />
                </div>

                <div className="flow-tabs">
                  {CUSTOMER_FLOW_TABS.map((item) => (
                    <button key={item.id} className={step === item.id ? "active" : ""} onClick={() => goToStep(item.id as Step)} type="button">
                      {item.label}
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
                      <h2>{recommendation ? `${recommendation?.pizzaName} + ${recommendation?.toppingName}` : "Reading order history..."}</h2>
                      <p>{recommendation?.reason ?? "The backend queries Supabase history, sends a compact profile to OpenRouter, validates menu IDs, and logs the recommendation event."}</p>
                      {recommendation && <small>{recommendation?.source === "openrouter" ? "OpenRouter response" : "Demo fallback"} / confidence {Math.round((recommendation?.confidence || 0) * 100)}% / {recommendation?.customerTier} customer</small>}
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

                {step === "menu" && (
                  <section className="menu-section">
                    <div className="section-head">
                      <div><h2>Signature pizzas</h2></div>
                      <div className="category-row">
                        {["All", "Veg", "Chicken", "Cheese", "Spicy"].map((item) => (
                          <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} type="button">{item}</button>
                        ))}
                      </div>
                    </div>
                    <div className="menu-grid">
                      {filteredPizzas.map((pizza) => {
                        const thinCrust = menu.bases.find((b) => b.code === "B1" || b.name.toLowerCase() === "thin crust");
                        const thinCrustPrice = thinCrust?.price ?? 149;
                        return (
                          <article className="pizza-card" key={pizza.id}>
                            <div className="pizza-media">
                              <img src={pizza.image} alt={pizza.name} />
                              <span><Sparkles /> {pizza.badge}</span>
                              <b><Star /> 4.{pizza.id}</b>
                            </div>
                            <div className="pizza-body">
                              <div>
                                <h3 style={{ display: "inline-flex", alignItems: "center" }}>
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "12px",
                                    height: "12px",
                                    border: `1px solid ${pizza.tags?.includes("Veg") ? "#10b981" : "#ef4444"}`,
                                    padding: "2px",
                                    marginRight: "8px",
                                    flexShrink: 0
                                  }}>
                                    <span style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: pizza.tags?.includes("Veg") ? "#10b981" : "#ef4444"
                                    }} />
                                  </span>
                                  {pizza.name}
                                </h3>
                                <strong>{money(pizza.price + thinCrustPrice)}</strong>
                              </div>
                              <p>{pizza.description}</p>
                              <div className="chips"><span><ChefHat /> Fresh</span><span>{pizza.prepMinutes} min</span>{pizza.tags?.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                            </div>
                            <div className="pizza-actions">
                              <button className="primary" onClick={() => openBuilder(pizza)} type="button"><SlidersHorizontal /> Customize</button>
                              <button onClick={() => addPizzaDirectToCart(pizza)} type="button" aria-label={`Add ${pizza.name}`}><Plus /></button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </section>

              <aside className="cart-panel">
                <div className="cart-head"><div><p className="eyebrow">Your order</p><h2>Cart</h2></div><ShoppingBag /></div>
                <div className={customerLoggedIn ? "order-mode member" : "order-mode guest"}>
                  <div><UserRound /><strong>{customerOrderMode}</strong></div>
                  <span>{customerLoggedIn ? `Logged in as ${customerSessionEmail}` : "No account session. Online payment only."}</span>
                  {!customerLoggedIn && <button type="button" onClick={openAccount}>Sign in for Cash</button>}
                </div>
                {cart.length ? cart.map(renderLine) : <div className="empty-cart">Your cart is waiting.<br /><span>Build a pizza to see live totals.</span></div>}
                <div className="summary">
                  <div><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
                  <div><span>Quantity discount</span><b>- {money(totals.discount)}</b></div>
                  <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b>{money(totals.gst)}</b></div>
                  <div><span>Delivery</span><b>{pricingConfig.deliveryFee === 0 ? "Included" : totals.deliveryCharge === 0 ? `Free (above ${money(pricingConfig.freeDeliveryMin)})` : money(totals.deliveryCharge)}</b></div>
                  <div className="total"><span>Total</span><b>{money(totals.finalTotal)}</b></div>
                </div>
                <div className="ai-cart-card">
                  <div><Brain /><strong>AI cart strategist</strong></div>
                  {cartInsight ? (
                    <>
                      <h3>{cartInsight?.headline}</h3>
                      <p>{cartInsight?.message}</p>
                      <small>{cartInsight?.expectedImpact} / confidence {Math.round((cartInsight?.confidence || 0) * 100)}%</small>
                      <button type="button" onClick={applyCartInsight}>{cartInsight?.nextAction}</button>
                    </>
                  ) : (
                    <>
                      <p>Get a margin-aware pairing, discount cue, or checkout reassurance based on this cart.</p>
                      <button type="button" onClick={getCartInsight} disabled={cartInsightLoading}><Sparkles /> {cartInsightLoading ? "Reading cart" : "Ask AI"}</button>
                    </>
                  )}
                </div>
                <button className="primary" disabled={!cart.length} onClick={() => router.push("/payment")} type="button">Continue to checkout <Send /></button>
              </aside>
            </section>
          )}
          {/* Checkout and Tracking moved to /payment and /confirmation */}
        </>
      )}

      {true && (
        <section className="admin-section" id="admin">
          <div className="admin-hero">
            <div><p className="eyebrow">Admin + analytics</p><h2>{brand.opsPromise}</h2></div>
            <div className="admin-hero-actions">
              {adminLoggedIn ? (
                <>
                  <div className="session-pill"><ShieldCheck /><span>{adminSessionEmail || "Admin session"}</span></div>
                  <button className="primary" type="button" onClick={downloadCsv}><Download /> Export CSV</button>
                  <button className="danger-action" type="button" onClick={adminLogout}><LogOut /> Logout</button>
                </>
              ) : (
                <div className="secure-pill"><Lock /><span>Login required</span></div>
              )}
            </div>
          </div>
          {!adminLoggedIn ? null : (
            <>
              <div className="admin-tabs">
                {ADMIN_TABS.map((tab) => (
                  <button key={tab} className={adminTab === tab ? "active" : ""} onClick={() => setAdminTab(tab)} type="button">
                    {adminTabLabel(tab)}
                  </button>
                ))}
              </div>
              {adminTab === "overview" && <AdminOverview summary={adminSummary} opsBriefing={opsBriefing} opsLoading={opsLoading} onRefreshOps={() => loadOpsBriefing()} />}
              {adminTab === "orders" && (
                <section className="admin-card orders-console">
                  <div className="admin-page-head">
                    <div>
                      <p className="eyebrow">Live order ledger</p>
                      <h3>All Supabase orders</h3>
                      <span>{adminSummaryStatus === "live" ? "Connected to admin API" : adminSummaryStatus === "error" ? "Using last loaded data because refresh failed" : "Showing seed data until live refresh completes"}</span>
                    </div>
                    <div className="orders-summary-actions">
                      <strong>{filteredOrders.length} matched / {adminSummary.recentOrders.length} fetched</strong>
                      <button type="button" onClick={() => refreshAdminSummary()} disabled={adminSummaryLoading}>{adminSummaryLoading ? "Refreshing" : "Refresh orders"}</button>
                    </div>
                  </div>
                  {adminSummaryError && <div className="admin-error">{adminSummaryError}</div>}
                  <div className="filters">
                    <input type="date" value={adminDateFilter} onChange={(event) => setAdminDateFilter(event.target.value)} aria-label="Filter orders by date" />
                    <select value={adminPaymentFilter} onChange={(event) => setAdminPaymentFilter(event.target.value)} aria-label="Filter orders by payment mode"><option>All</option><option>UPI</option><option>Card</option><option>Cash</option></select>
                    <select value={orderPageSize} onChange={(event) => setOrderPageSize(Number(event.target.value))} aria-label="Orders per page"><option value={5}>5 per page</option><option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option></select>
                    <button type="button" onClick={() => { setAdminDateFilter(""); setAdminPaymentFilter("All"); setOrderPage(1); }}>Clear filters</button>
                  </div>
                  <OrderTable orders={paginatedOrders} />
                  <div className="order-pagination" aria-label="Order pagination">
                    <span>{filteredOrders.length ? `${orderPageStart + 1}-${Math.min(orderPageStart + orderPageSize, filteredOrders.length)} of ${filteredOrders.length}` : "0 orders"}</span>
                    <div>
                      <button type="button" onClick={() => setOrderPage(1)} disabled={safeOrderPage === 1}>First</button>
                      <button type="button" onClick={() => setOrderPage((page) => Math.max(1, page - 1))} disabled={safeOrderPage === 1}>Previous</button>
                      <strong>Page {safeOrderPage} of {orderPageCount}</strong>
                      <button type="button" onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))} disabled={safeOrderPage === orderPageCount}>Next</button>
                      <button type="button" onClick={() => setOrderPage(orderPageCount)} disabled={safeOrderPage === orderPageCount}>Last</button>
                    </div>
                  </div>
                </section>
              )}
              {adminTab === "forecast" && <ForecastPanel summary={adminSummary} />}
              {adminTab === "menu" && (
                <section className="admin-card menu-editor">
                  <div className="admin-page-head">
                    <div>
                      <p className="eyebrow">Menu operations</p>
                      <h3>Manage the live menu catalogue.</h3>
                    </div>
                    <span>{menu.pizzas.length} pizzas / {menu.bases.length} bases / {menu.toppings.length} toppings</span>
                  </div>
                  <div className="sub-tabs">
                    {[
                      ["create", "Create item"],
                      ["pizzas", "Pizzas"],
                      ["bases", "Bases"],
                      ["toppings", "Toppings"]
                    ].map(([page, label]) => (
                      <button key={page} className={menuAdminPage === page ? "active" : ""} onClick={() => setMenuAdminPage(page as MenuAdminPage)} type="button">{label}</button>
                    ))}
                  </div>
                  {menuAdminPage === "create" && (
                    <div className="menu-create-studio wide">
                      <div>
                        <p className="eyebrow">Menu lifecycle</p>
                        <h3>Add a new pizza, crust, or topping</h3>
                        <p>New items become available to the customer journey immediately. With Supabase configured, this creates a real database menu record.</p>
                      </div>
                      <div className="segment-control">
                        {(["pizzas", "bases", "toppings"] as MenuSection[]).map((section) => (
                          <button className={menuDraftSection === section ? "active" : ""} key={section} onClick={() => setMenuDraftSection(section)} type="button">{section}</button>
                        ))}
                      </div>
                      <div className="draft-grid">
                        <label>Code<input value={menuDraft.code} onChange={(event) => setMenuDraft({ ...menuDraft, code: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "P9" : menuDraftSection === "bases" ? "B6" : "T11"} /></label>
                        <label>Name<input value={menuDraft.name} onChange={(event) => setMenuDraft({ ...menuDraft, name: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "Truffle Mushroom" : menuDraftSection === "bases" ? "Sourdough Crust" : "Smoked Paprika"} /></label>
                        <label>Price<input type="number" min={0} value={menuDraft.price} onChange={(event) => setMenuDraft({ ...menuDraft, price: event.target.value })} placeholder={menuDraftSection === "pizzas" ? "389" : menuDraftSection === "bases" ? "199" : "49"} /></label>
                        {menuDraftSection === "pizzas" && (
                          <>
                            <label>Badge<input value={menuDraft.badge} onChange={(event) => setMenuDraft({ ...menuDraft, badge: event.target.value })} placeholder="Chef special" /></label>
                            <label>Prep minutes<input type="number" min={5} max={90} value={menuDraft.prepMinutes} onChange={(event) => setMenuDraft({ ...menuDraft, prepMinutes: event.target.value })} /></label>
                            <label>Tags<input value={menuDraft.tags} onChange={(event) => setMenuDraft({ ...menuDraft, tags: event.target.value })} placeholder="Veg, Cheese, Signature" /></label>
                            <div className="wide image-upload-studio">
                              <div className="image-preview-frame">
                                <img src={menuDraft.image || "/assets/pizza-hero.jpg"} alt="New pizza preview" />
                              </div>
                              <div className="image-upload-controls">
                                <label>Pizza image
                                  <span className="upload-dropzone">
                                    <Upload />
                                    <strong>{menuImageUploading ? "Uploading image" : "Upload image"}</strong>
                                    <small>JPG, PNG, WEBP, or GIF. Preview auto-fits the card.</small>
                                    <input type="file" accept="image/*" onChange={(event) => uploadMenuImage(event.target.files?.[0] ?? null)} />
                                  </span>
                                </label>
                                <label>Image URL<input value={menuDraft.image} onChange={(event) => setMenuDraft({ ...menuDraft, image: event.target.value })} placeholder="/uploads/menu/truffle-mushroom.webp" /></label>
                              </div>
                            </div>
                          </>
                        )}
                        {menuDraftSection !== "toppings" && (
                          <label className="wide">Description<textarea value={menuDraft.description} onChange={(event) => setMenuDraft({ ...menuDraft, description: event.target.value })} placeholder={defaultDraftDescription(menuDraftSection)} /></label>
                        )}
                        <button className="ai-secondary wide" disabled={menuCopyLoading} onClick={generateMenuCopy} type="button"><Sparkles /> {menuCopyLoading ? "Generating menu copy" : "AI polish copy"}</button>
                        <button className="primary wide" disabled={menuSaving} onClick={addMenuItem} type="button"><Plus /> {menuSaving ? "Saving item" : `Add to ${menuDraftSection}`}</button>
                      </div>
                    </div>
                  )}
                  {menuAdminPage === "pizzas" && (
                    <>
                      <div className="menu-editor-section wide"><p className="eyebrow">Pizza catalogue</p><span>Customer-facing pizzas with price, availability, and image preview.</span></div>
                      {menu.pizzas.map((pizza) => (
                        <article key={pizza.id}>
                          <img src={pizza.image} alt="" />
                          <input value={pizza.name} onChange={(event) => updatePizza(pizza.id, "name", event.target.value)} />
                          <input type="number" min={0} value={pizza.price} onChange={(event) => updatePizza(pizza.id, "price", Number(event.target.value))} />
                          <label><input type="checkbox" checked={pizza.available} onChange={(event) => updatePizza(pizza.id, "available", event.target.checked)} /> Available</label>
                          {renderRowSaveButton("pizzas", pizza)}
                        </article>
                      ))}
                    </>
                  )}
                  {menuAdminPage === "bases" && (
                    <>
                      <div className="menu-editor-section wide"><p className="eyebrow">Bases</p><span>Crust options available in the pizza builder.</span></div>
                      {menu.bases.map((base) => (
                        <article className="compact" key={base.id}>
                          <strong>{base.code}</strong>
                          <input value={base.name} onChange={(event) => updateMenuItem("bases", base.id, "name", event.target.value)} />
                          <input type="number" min={0} value={base.price} onChange={(event) => updateMenuItem("bases", base.id, "price", Number(event.target.value))} />
                          <label><input type="checkbox" checked={base.available} onChange={(event) => updateMenuItem("bases", base.id, "available", event.target.checked)} /> Available</label>
                          {renderRowSaveButton("bases", base)}
                        </article>
                      ))}
                    </>
                  )}
                  {menuAdminPage === "toppings" && (
                    <>
                      <div className="menu-editor-section wide"><p className="eyebrow">Toppings</p><span>Add-ons that change basket value and personalization quality.</span></div>
                      {menu.toppings.map((topping) => (
                        <article className="compact" key={topping.id}>
                          <strong>{topping.code}</strong>
                          <input value={topping.name} onChange={(event) => updateMenuItem("toppings", topping.id, "name", event.target.value)} />
                          <input type="number" min={0} value={topping.price} onChange={(event) => updateMenuItem("toppings", topping.id, "price", Number(event.target.value))} />
                          <label><input type="checkbox" checked={topping.available} onChange={(event) => updateMenuItem("toppings", topping.id, "available", event.target.checked)} /> Available</label>
                          {renderRowSaveButton("toppings", topping)}
                        </article>
                      ))}
                    </>
                  )}
                </section>
              )}
              {adminTab === "ai" && <RecommendationAIPanel />}
              {adminTab === "settings" && (
                <section className="admin-card settings-console">
                  <div className="settings-head">
                    <div>
                      <p className="eyebrow">Owner configuration</p>
                      <h3>Control the customer app, financial rules, delivery policy, and risk settings.</h3>
                    </div>
                    <button type="button" onClick={applySettings} disabled={settingsSaving}><Check /> {settingsSaving ? "Saving…" : "Apply live"}</button>
                  </div>

                  <div className="sub-tabs">
                    {[
                      ["brand", "Brand"],
                      ["financials", "Financials"],
                      ["delivery", "Delivery & risk"]
                    ].map(([page, label]) => (
                      <button key={page} className={settingsPage === page ? "active" : ""} onClick={() => setSettingsPage(page as SettingsPage)} type="button">{label}</button>
                    ))}
                  </div>

                  {settingsPage === "brand" && (
                    <div className="settings-group">
                      <div><p className="eyebrow">Brand and outlet</p><span>Everything here is visible to customers.</span></div>
                      <div className="settings-grid">
                        <label>Brand<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label>
                        <label>Outlet<input value={brand.outlet} onChange={(event) => setBrand({ ...brand, outlet: event.target.value })} /></label>
                        <label>Open status<input value={brand.openStatus} onChange={(event) => setBrand({ ...brand, openStatus: event.target.value })} /></label>
                        <label>Delivery promise<input value={brand.deliveryPromise} onChange={(event) => setBrand({ ...brand, deliveryPromise: event.target.value })} /></label>
                        <label className="wide">Hero headline<textarea value={brand.hero} onChange={(event) => setBrand({ ...brand, hero: event.target.value })} /></label>
                        <label className="wide">Hero copy<textarea value={brand.subhero} onChange={(event) => setBrand({ ...brand, subhero: event.target.value })} /></label>
                        <label className="wide">Customer promise strip<input value={brand.customerPromise} onChange={(event) => setBrand({ ...brand, customerPromise: event.target.value })} /></label>
                        <label className="wide">Operations promise<input value={brand.opsPromise} onChange={(event) => setBrand({ ...brand, opsPromise: event.target.value })} /></label>
                      </div>
                    </div>
                  )}

                  {settingsPage === "financials" && (
                    <div className="settings-group">
                      <div><p className="eyebrow">Financial rules</p><span>These values drive live cart totals and the order API.</span></div>
                      <div className="settings-grid">
                        <label>GST %<input type="number" min={0} max={100} value={Math.round(pricingConfig.gstRate * 100)} onChange={(event) => updatePercent("gstRate", event.target.value)} /></label>
                        <label>Discount %<input type="number" min={0} max={100} value={Math.round(pricingConfig.bulkDiscountRate * 100)} onChange={(event) => updatePercent("bulkDiscountRate", event.target.value)} /></label>
                        <label>Discount quantity<input type="number" min={1} value={pricingConfig.bulkDiscountQty} onChange={(event) => updatePositiveNumber("bulkDiscountQty", event.target.value)} /></label>
                        <label>Max pizzas/order<input type="number" min={1} value={pricingConfig.maxOrderQty} onChange={(event) => updatePositiveNumber("maxOrderQty", event.target.value)} /></label>
                        <label>Delivery fee<input type="number" min={0} value={pricingConfig.deliveryFee} onChange={(event) => updatePositiveNumber("deliveryFee", event.target.value)} /></label>
                        <label>Free delivery above<input type="number" min={0} value={pricingConfig.freeDeliveryMin} onChange={(event) => updatePositiveNumber("freeDeliveryMin", event.target.value)} /></label>
                      </div>
                    </div>
                  )}

                  {settingsPage === "delivery" && (
                    <div className="settings-group">
                      <div><p className="eyebrow">Delivery and payment risk</p><span>Use stricter controls for guest orders and delivery radius expansion.</span></div>
                      <div className="settings-grid">
                        <label>Active delivery radius<select value={pricingConfig.activeDeliveryZone} onChange={(event) => updatePricing("activeDeliveryZone", event.target.value as PricingConfig["activeDeliveryZone"])}><option value="0-2">0-2 km</option><option value="2-4">0-4 km</option><option value="4-6">0-6 km</option></select></label>
                        <label className="toggle-row"><input type="checkbox" checked={pricingConfig.guestCashAllowed} onChange={(event) => updatePricing("guestCashAllowed", event.target.checked)} /> Allow Cash for guest checkout</label>
                        <div className="settings-preview wide">
                          <strong>Live policy preview</strong>
                          <span>GST {Math.round(pricingConfig.gstRate * 100)}%, {Math.round(pricingConfig.bulkDiscountRate * 100)}% off at {pricingConfig.bulkDiscountQty}+ pizzas, max {pricingConfig.maxOrderQty} pizzas/order, delivery fee {money(pricingConfig.deliveryFee)}, guest Cash {pricingConfig.guestCashAllowed ? "allowed" : "blocked"}. Saved to Supabase — applies to all customers on next page load.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      )}

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

function AdminOverview({ summary, opsBriefing, opsLoading, onRefreshOps }: { summary: AdminSummary; opsBriefing: OpsBriefing | null; opsLoading: boolean; onRefreshOps: () => void }) {
  const forecastPeak = summary.forecast[0];
  const onlineRevenue = summary.paymentMix.filter((item) => item.mode !== "Cash").reduce((sum, item) => sum + item.revenue, 0);
  const onlineShare = summary.totalRevenue ? Math.round((onlineRevenue / summary.totalRevenue) * 100) : 0;
  const peakOrders = Math.max(0, ...summary.hourlyDemand.map((item) => item.orders));
  return (
    <section className="admin-card">
      <div className="owner-pulse-strip">
        <article><Check /><strong>Outlet ready</strong><span>{summary.orderCount} orders tracked today</span></article>
        <article><Flame /><strong>Peak load</strong><span>{peakOrders} orders around {summary.busiestHour}</span></article>
        <article><CreditCard /><strong>Online mix</strong><span>{onlineShare}% revenue protected online</span></article>
        <article><Sparkles /><strong>AI assist</strong><span>{opsBriefing ? "Briefing active" : "Briefing ready"}</span></article>
      </div>
      <div className="kpi-grid">
        <div><span>Total revenue</span><strong>{money(summary.totalRevenue)}</strong></div>
        <div><span>Orders</span><strong>{summary.orderCount}</strong></div>
        <div><span>AOV</span><strong>{money(summary.avgOrderValue)}</strong></div>
        <div><span>Top pizza</span><strong>{summary.topPizza}</strong></div>
      </div>
      <div className="owner-action-board">
        <article>
          <b>Protect peak</b>
          <strong>{summary.busiestHour} rush window</strong>
          <span>Stage dough, cheese, and rider slots before the rush. Forecast peak: {forecastPeak?.label ?? "next service"}.</span>
        </article>
        <article>
          <b>Push winner</b>
          <strong>{summary.topPizza}</strong>
          <span>Keep this pizza visible in menu hero and AI pairings. It is currently the strongest demand signal.</span>
        </article>
        <article>
          <b>Payment risk</b>
          <strong>{onlineShare}% online revenue</strong>
          <span>Guest orders stay UPI/Card only. Member Cash can be accepted because identity and history reduce failed-delivery risk.</span>
        </article>
        <article>
          <b>Margin lever</b>
          <strong>{money(summary.avgOrderValue)} AOV</strong>
          <span>Use cart AI to nudge toppings before checkout and move small orders toward the quantity discount threshold.</span>
        </article>
      </div>
      <div className="chart-grid">
        <div><h3>Hourly demand</h3><ResponsiveContainer width="100%" height={260}><BarChart data={summary.hourlyDemand}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Bar dataKey="orders" fill="#d33f2f" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div><h3>Payment mix</h3><ResponsiveContainer width="100%" height={260}><AreaChart data={summary.paymentMix}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mode" /><YAxis /><Tooltip /><Area dataKey="revenue" fill="#166d45" stroke="#166d45" /></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="ops-briefing">
        <div>
          <p className="eyebrow">AI shift briefing</p>
          <h3>{opsBriefing?.briefing ?? "Generate a live operations briefing from order data."}</h3>
          <p>{opsBriefing?.staffing ?? "The briefing converts revenue, demand, payment mix, and forecast signals into practical prep and staffing actions."}</p>
        </div>
        <button type="button" onClick={onRefreshOps} disabled={opsLoading}><Brain /> {opsLoading ? "Thinking" : "Refresh briefing"}</button>
        {opsBriefing && (
          <>
            <div className="prep-list">
              {opsBriefing.prepList.map((item) => <span key={item}><Check /> {item}</span>)}
            </div>
            <div className="ops-actions">
              {opsBriefing.actions.map((action) => (
                <article key={action.title}>
                  <b>{action.priority}</b>
                  <strong>{action.title}</strong>
                  <span>{action.detail}</span>
                </article>
              ))}
            </div>
            <small>{opsBriefing.revenueWatch}</small>
          </>
        )}
      </div>
    </section>
  );
}

function OrderTable({ orders }: { orders: SavedOrder[] }) {
  if (!orders.length) {
    return <div className="empty-orders">No orders match the current filters.</div>;
  }

  return (
    <div className="order-table">
      <div className="order-row head"><span>Order</span><span>Placed</span><span>Customer</span><span>Payment</span><span>Total</span><span>Status</span></div>
      {orders.map((order) => (
        <div className="order-row" key={order.id}>
          <span><strong>{order.id.slice(0, 8)}</strong><small>{order.id}</small></span>
          <span>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}<small>{order.deliveryZone ? `${order.deliveryZone} km zone` : "No zone"}</small></span>
          <span>{order.customerName}<small>{order.phone || "No phone"}{order.address ? ` · ${order.address}` : ""}</small></span>
          <span>{order.paymentMode}<small>{order.paymentStatus ?? "confirmed"}</small></span>
          <span>{money(order.finalTotal)}<small>Subtotal {money(order.subtotal)} · GST {money(order.gst)}</small></span>
          <span>{order.status}</span>
        </div>
      ))}
    </div>
  );
}
