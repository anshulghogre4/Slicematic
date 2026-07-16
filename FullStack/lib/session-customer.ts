import { getSupabaseBrowserClient } from "./supabase";
import { SESSION_STORAGE_KEYS } from "./session/storageKeys";

const DEMO_CUSTOMER_EMAIL = "demo@slicematic.in";
const DEMO_CUSTOMER_PHONE = "9999999999";

function isDemoIdentifier(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed === DEMO_CUSTOMER_EMAIL || trimmed === DEMO_CUSTOMER_PHONE;
}

/**
 * Resolves the bearer token to send to the protected /api/customer/* routes:
 * "demo-bypass" for the demo identity, otherwise the live Supabase access token.
 */
async function getCustomerAuthToken(identifierHint: string | null | undefined): Promise<string> {
  if (isDemoIdentifier(identifierHint)) return "demo-bypass";
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function withAuthHeader(token: string, extra?: Record<string, string>) {
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export function syncSessionCustomerId(customerId: string | null | undefined) {
  if (typeof window === "undefined" || !customerId) return;
  window.sessionStorage.setItem(SESSION_STORAGE_KEYS.customerId, customerId);
}

/** Ensure the logged-in session has a Supabase customer row (email + phone lookup). */
export async function syncSessionCustomerRecord(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const email = (window.sessionStorage.getItem(SESSION_STORAGE_KEYS.customerEmail) ?? "").trim().toLowerCase();
  const customerJson = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.customer);
  const existingId = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.customerId);
  if (!email || !customerJson) return existingId;

  let parsed: { name?: string; phone?: string; address?: string };
  try {
    parsed = JSON.parse(customerJson) as { name?: string; phone?: string; address?: string };
  } catch {
    return existingId;
  }

  const phone = (parsed.phone ?? "").trim();
  const name = (parsed.name ?? "").trim();
  if (!phone || !name) return existingId;

  try {
    const authToken = await getCustomerAuthToken(email);
    const profileRes = await fetch(`/api/customer/profile?identifier=${encodeURIComponent(email)}`, {
      cache: "no-store",
      headers: withAuthHeader(authToken)
    });
    const profileData = await profileRes.json();
    if (profileData.ok && profileData.profile?.customerId) {
      syncSessionCustomerId(profileData.profile.customerId);
      return profileData.profile.customerId;
    }

    const registerRes = await fetch("/api/customer/register", {
      method: "POST",
      headers: withAuthHeader(authToken, { "content-type": "application/json" }),
      body: JSON.stringify({ name, phone, email, city: "Delhi NCR", address: parsed.address ?? "" })
    });
    const registerData = await registerRes.json();
    if (registerData.ok && registerData.customer_id) {
      syncSessionCustomerId(registerData.customer_id);
      return registerData.customer_id;
    }
  } catch {
    /* ignore */
  }

  return existingId;
}

export function markOrdersNeedRefresh() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_STORAGE_KEYS.refreshOrders, "1");
}

export function applyOrderToSession(order: { linkedCustomerId?: string | null }) {
  syncSessionCustomerId(order.linkedCustomerId);
  markOrdersNeedRefresh();
}
