"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Phone, ReceiptText, Send, ShieldCheck, ShoppingBag, Sparkles, UserRound, Trash2 } from "lucide-react";
import { useStore } from "../../lib/store";
import { calculateBill, getLineUnitPrice, money } from "../../lib/pricing";
import { CartLine, MenuPayload, PaymentMode } from "../../lib/types";
import { seedMenu } from "../../lib/seed-data";
import { applyOrderToSession } from "../../lib/session-customer";
import { fetchOutletPricingConfig } from "../../lib/customer-flow";

const paymentModes: Array<{ mode: PaymentMode; icon: React.ReactNode; copy: string }> = [
  { 
    mode: "UPI", 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upi-triangles">
        <polygon points="3,6 13,12 3,18" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
        <polygon points="10,6 20,12 10,18" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      </svg>
    ), 
    copy: "Confirm receipt before fulfillment." 
  },
  { mode: "Card", icon: <CreditCard />, copy: "Process on POS or payment link." },
  { mode: "Cash", icon: <ReceiptText />, copy: "Collect at delivery or counter." }
];

async function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function loadCashfreeSDK() {
  const { load } = await import("@cashfreepayments/cashfree-js");
  return await load({ mode: "sandbox" });
}

function renderLine(line: CartLine, menu: MenuPayload, index: number, onRemove: (id: string) => void) {
  const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
  const base = menu.bases.find((item) => item.id === line.baseId);
  const size = menu.sizes.find((item) => item.id === line.sizeId);
  const toppings = line.toppingIds.map((id) => menu.toppings.find((item) => item.id === id)?.name).filter(Boolean);
  return (
    <article className="cart-line" key={line.id ?? `${line.pizzaId}-${index}`}>
      <div>
        <strong>{line.quantity} x {pizza?.name}</strong>
        <span>{base?.name} / {size?.name} / {toppings.length ? toppings.join(", ") : "No extra toppings"}</span>
      </div>
      <div>
        <b>{money(getLineUnitPrice(line, menu) * line.quantity)}</b>
        <button type="button" onClick={() => onRemove(line.id)} aria-label="Remove line"><Trash2 /></button>
      </div>
    </article>
  );
}

export default function PaymentScreen() {
  const router = useRouter();
  const { cart, customer, pricingConfig, paymentMode, setPaymentMode, lastOrder, setLastOrder, recommendation, setCart, setPricingConfig } = useStore();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");
  const [toast, setToast] = useState("");
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionCustomerId, setSessionCustomerId] = useState<string | null>(null);

  const brand = { name: "SliceMatic" };

  useEffect(() => {
    void fetchOutletPricingConfig().then((config) => {
      if (config) setPricingConfig(config);
    });
  }, [setPricingConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCustomerLoggedIn(window.sessionStorage.getItem("slicematic_customer_logged_in") === "true");
    setSessionEmail(window.sessionStorage.getItem("slicematic_customer_email") ?? "");
    setSessionCustomerId(window.sessionStorage.getItem("slicematic_customer_id") || null);
  }, []);

  const customerOrderMode = customerLoggedIn ? "Member order" : "Guest order";
  const customerPaymentPolicy = customerLoggedIn || pricingConfig.guestCashAllowed ? "Cash, Card, and UPI available" : "Guest checkout requires UPI or Card";

  function buildOrderPayload() {
    return {
      customer,
      lines: cart,
      paymentMode,
      customerMode: customerLoggedIn ? "member" as const : "guest" as const,
      customerAccountEmail: customerLoggedIn ? sessionEmail || null : null,
      customerId: sessionCustomerId,
      pricingConfig,
      recommendationId: recommendation?.recommendationId ?? null
    };
  }

  // Fetch menu
  const [menu, setMenu] = useState<MenuPayload>(seedMenu);
  useEffect(() => {
    fetch("/api/menu")
      .then((response) => response.json())
      .then((payload: MenuPayload) => setMenu(payload))
      .catch(() => setMenu(seedMenu));
  }, []);

  const totals = useMemo(() => calculateBill(cart, menu, pricingConfig), [cart, menu, pricingConfig]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const cfReturnOrderId = params.get("order_id");
    const cfPending = localStorage.getItem("cf_pending");
    if (cfReturnOrderId && cfPending) {
      const pending = JSON.parse(cfPending) as { orderId: string; amountPaise: number; payload: unknown };
      localStorage.removeItem("cf_pending");
      window.history.replaceState({}, "", window.location.pathname);
      setPlacingOrder(true);
      setPaymentStatusMessage("Verifying UPI payment…");
      verifyCashfreeAndFinish(pending.orderId, pending.amountPaise, pending.payload).catch(console.error);
    }
  }, []);

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
      applyOrderToSession(result.order);
      router.push("/confirmation");
    } catch {
      setPaymentStatusMessage("Could not confirm UPI payment. Please retry.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function placeOrder() {
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
        body: JSON.stringify(buildOrderPayload())
      });
      const result = await response.json();
      if (!result.ok) {
        showToast(Object.values(result.errors ?? { server: "Could not place order." })[0] as string);
        return;
      }
      setLastOrder(result.order);
      setCart([]);
      applyOrderToSession(result.order);
      router.push("/confirmation");
    } catch {
      showToast("Could not place order. Please retry.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function placeUpiOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    const orderPayload = buildOrderPayload();
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
      cashfree.checkout({
        paymentSessionId: created.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch {
      setPaymentStatusMessage("Could not start UPI payment. Please retry.");
      showToast("Could not start UPI payment. Please retry.");
      setPlacingOrder(false);
    }
  }

  async function placeOnlineOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    const orderPayload = buildOrderPayload();
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
          verifyAndFinish(response, created.amountPaise, orderPayload).catch(console.error);
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            setPaymentStatusMessage("Payment cancelled.");
          }
        }
      });
      rzp.on("payment.failed", () => {
        setPlacingOrder(false);
        setPaymentStatusMessage("Payment failed.");
      });
      rzp.open();
    } catch {
      setPaymentStatusMessage("Could not start payment.");
      setPlacingOrder(false);
    }
  }

  async function verifyAndFinish(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, amountPaise: number, orderPayload: unknown) {
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
      applyOrderToSession(result.order);
      router.push("/confirmation");
    } catch {
      setPaymentStatusMessage("Could not confirm payment. Please contact support.");
    }
  }

  return (
    <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <section className="checkout-page" id="checkout">
        <div className="checkout-page-head">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Confirm payment and bill</h1>
            <p>Review the basket, payment rules, and live bill before the kitchen accepts the order.</p>
          </div>
          <button type="button" onClick={() => router.push("/")}><ArrowLeft /> Back to cart</button>
        </div>

        <div className="checkout-layout">
          <section className="checkout-review-card">
            <div className="cart-head"><div><p className="eyebrow">Order review</p><h2>Basket</h2></div><ShoppingBag /></div>
            <div className={customerLoggedIn ? "order-mode member" : "order-mode guest"}>
              <div><UserRound /><strong>{customerOrderMode}</strong></div>
              <span>{customerLoggedIn ? `Logged in as ${sessionEmail || customer.name}` : "Guest checkout. UPI/Card required unless owner enables guest cash."}</span>
            </div>
            {cart.length ? cart.map((line, idx) => renderLine(line, menu, idx, (id) => setCart((current) => current.filter((item) => item.id !== id)))) : <div className="empty-cart">Your cart is empty.<br /><span>Go back to menu and build a pizza.</span></div>}
            <div className="summary">
              <div><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
              <div><span>Quantity discount</span><b>- {money(totals.discount)}</b></div>
              <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b>{money(totals.gst)}</b></div>
              <div><span>Delivery</span><b>{pricingConfig.deliveryFee > 0 && totals.subtotal < pricingConfig.freeDeliveryMin ? money(pricingConfig.deliveryFee) : "Included"}</b></div>
              <div className="total"><span>Total payable</span><b>{money(totals.finalTotal)}</b></div>
            </div>
          </section>

          <section className="checkout-payment-card">
            <div className="checkout-head">
              <div><p className="eyebrow">Payment</p><h2>Select payment mode</h2></div>
              <div className={customerLoggedIn ? "checkout-policy member" : "checkout-policy guest"}>
                <strong>{customerOrderMode}</strong>
                <span>{customerPaymentPolicy}</span>
              </div>
            </div>
            <div className="payment-grid">
              {paymentModes.map((payment) => {
                const disabledForGuest = !customerLoggedIn && !pricingConfig.guestCashAllowed && payment.mode === "Cash";
                return (
                  <button key={payment.mode} className={paymentMode === payment.mode ? "active" : ""} disabled={disabledForGuest} onClick={() => disabledForGuest ? showToast("Cash is available after customer login.") : setPaymentMode(payment.mode)} type="button">
                    {payment.icon}<strong>{payment.mode}</strong><span>{disabledForGuest ? "Login required. Guests use UPI or Card only." : payment.copy}</span>
                  </button>
                );
              })}
            </div>
            <button className="primary" disabled={!cart.length || placingOrder} aria-busy={placingOrder} onClick={placeOrder} type="button">
              <Send /> {placingOrder ? "Processing payment…" : paymentMode === "Cash" ? "Place order" : "Pay & place order"}
            </button>
            {paymentStatusMessage && <p className="payment-status" role="status" aria-live="polite">{paymentStatusMessage}</p>}
          </section>
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
