const SANDBOX_BASE = "https://sandbox.cashfree.com/pg";
const PROD_BASE = "https://api.cashfree.com/pg";
const API_VERSION = "2025-01-01";

function baseUrl(): string {
  return process.env.CASHFREE_ENV === "production" ? PROD_BASE : SANDBOX_BASE;
}

function headers(): Record<string, string> {
  return {
    "x-client-id": process.env.CASHFREE_APP_ID ?? "",
    "x-client-secret": process.env.CASHFREE_SECRET_KEY ?? "",
    "x-api-version": API_VERSION,
    "content-type": "application/json",
  };
}

export function hasCashfreeEnv(): boolean {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

export async function createCashfreeOrder(params: {
  orderId: string;
  amount: number;
  customerPhone: string;
  customerName: string;
  returnUrl: string;
}): Promise<{ paymentSessionId: string; cfOrderId: string }> {
  if (!hasCashfreeEnv()) throw new Error("CASHFREE_NOT_CONFIGURED");

  const res = await fetch(`${baseUrl()}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: params.orderId,
        customer_phone: params.customerPhone,
        customer_name: params.customerName,
      },
      order_meta: {
        return_url: params.returnUrl,
        payment_methods: "upi",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CASHFREE_ORDER_FAILED: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    payment_session_id?: string;
    cf_order_id?: string;
    order_id?: string;
  };

  if (!data.payment_session_id) throw new Error("CASHFREE_ORDER_FAILED");

  return {
    paymentSessionId: data.payment_session_id,
    cfOrderId: data.cf_order_id ?? data.order_id ?? params.orderId,
  };
}

export async function verifyCashfreePayment(orderId: string): Promise<{
  success: boolean;
  paymentId?: string;
  paymentStatus?: string;
}> {
  if (!hasCashfreeEnv()) throw new Error("CASHFREE_NOT_CONFIGURED");

  const res = await fetch(`${baseUrl()}/orders/${orderId}/payments`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    return { success: false };
  }

  const payments = (await res.json()) as Array<{
    cf_payment_id?: number;
    payment_status?: string;
  }>;

  const successful = payments.find((p) => p.payment_status === "SUCCESS");
  if (successful) {
    return {
      success: true,
      paymentId: String(successful.cf_payment_id ?? ""),
      paymentStatus: "SUCCESS",
    };
  }

  return { success: false };
}
