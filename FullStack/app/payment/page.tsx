"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../../lib/store";
import { calculateBill } from "../../lib/pricing";
import { MenuPayload } from "../../lib/types";
import { seedMenu } from "../../lib/seed-data";
import { applyOrderToSession } from "../../lib/session-customer";
import { fetchOutletPricingConfig } from "../../lib/customer-flow";
import {
  completeCashfreeReturn,
  readCheckoutSessionIdentity,
  writeCashfreePendingPayment,
} from "../../lib/session/checkoutSession";
import { CheckoutSummary } from "../../features/checkout/components/CheckoutSummary";

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

export default function PaymentScreen() {
  const router = useRouter();
  const { cart, customer, pricingConfig, paymentMode, setPaymentMode, setLastOrder, recommendation, setCart, setPricingConfig } = useStore();
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
    const interval = window.setInterval(() => {
      void fetchOutletPricingConfig().then((config) => {
        if (config) setPricingConfig(config);
      });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [setPricingConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const identity = readCheckoutSessionIdentity(window.sessionStorage);
    setCustomerLoggedIn(identity.customerLoggedIn);
    setSessionEmail(identity.sessionEmail);
    setSessionCustomerId(identity.sessionCustomerId);
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
    const pending = completeCashfreeReturn(window.localStorage, cfReturnOrderId);
    if (pending) {
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

      writeCashfreePendingPayment(window.localStorage, {
        orderId: created.cfOrderId,
        amountPaise: created.amountPaise,
        payload: orderPayload,
      });

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

        <CheckoutSummary
          cart={cart}
          menu={menu}
          totals={totals}
          pricingConfig={pricingConfig}
          customerLoggedIn={customerLoggedIn}
          customerOrderMode={customerOrderMode}
          customerPaymentPolicy={customerPaymentPolicy}
          sessionEmail={sessionEmail}
          customerName={customer.name}
          paymentMode={paymentMode}
          placingOrder={placingOrder}
          paymentStatusMessage={paymentStatusMessage}
          onRemoveLine={(id) => setCart((current) => current.filter((item) => item.id !== id))}
          onSelectPaymentMode={setPaymentMode}
          onGuestCashBlocked={() => showToast("Cash is available after customer login.")}
          onPlaceOrder={placeOrder}
        />
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
