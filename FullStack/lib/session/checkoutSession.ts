import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from "./storageKeys";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CheckoutSessionIdentity = {
  customerLoggedIn: boolean;
  customerMode: "member" | "guest";
  sessionEmail: string;
  sessionCustomerId: string | null;
};

export type CashfreePendingPayment = {
  orderId: string;
  amountPaise: number;
  payload: unknown;
};

export function readCheckoutSessionIdentity(storage: ReadableStorage): CheckoutSessionIdentity {
  const customerLoggedIn = storage.getItem(SESSION_STORAGE_KEYS.customerLoggedIn) === "true";
  const sessionEmail = storage.getItem(SESSION_STORAGE_KEYS.customerEmail) ?? "";
  const sessionCustomerId = storage.getItem(SESSION_STORAGE_KEYS.customerId) || null;

  return {
    customerLoggedIn,
    customerMode: customerLoggedIn ? "member" : "guest",
    sessionEmail,
    sessionCustomerId,
  };
}

export function readCashfreePendingPayment(storage: ReadableStorage): CashfreePendingPayment | null {
  const rawPending = storage.getItem(LOCAL_STORAGE_KEYS.cashfreePending);
  if (!rawPending) return null;

  try {
    const parsed = JSON.parse(rawPending) as Partial<CashfreePendingPayment>;
    if (!parsed.orderId || typeof parsed.amountPaise !== "number" || !("payload" in parsed)) {
      return null;
    }
    return {
      orderId: parsed.orderId,
      amountPaise: parsed.amountPaise,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

export function writeCashfreePendingPayment(storage: Pick<Storage, "setItem">, pending: CashfreePendingPayment) {
  storage.setItem(LOCAL_STORAGE_KEYS.cashfreePending, JSON.stringify(pending));
}

export function clearCashfreePendingPayment(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(LOCAL_STORAGE_KEYS.cashfreePending);
}

export function completeCashfreeReturn(storage: WritableStorage, returnOrderId: string | null): CashfreePendingPayment | null {
  if (!returnOrderId) return null;
  const pending = readCashfreePendingPayment(storage);
  if (!pending) return null;
  clearCashfreePendingPayment(storage);
  return pending;
}
