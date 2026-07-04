export function syncSessionCustomerId(customerId: string | null | undefined) {
  if (typeof window === "undefined" || !customerId) return;
  window.sessionStorage.setItem("slicematic_customer_id", customerId);
}

/** Ensure the logged-in session has a Supabase customer row (email + phone lookup). */
export async function syncSessionCustomerRecord(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const email = (window.sessionStorage.getItem("slicematic_customer_email") ?? "").trim().toLowerCase();
  const customerJson = window.sessionStorage.getItem("slicematic_customer");
  const existingId = window.sessionStorage.getItem("slicematic_customer_id");
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
    const profileRes = await fetch(`/api/customer/profile?identifier=${encodeURIComponent(email)}`, { cache: "no-store" });
    const profileData = await profileRes.json();
    if (profileData.ok && profileData.profile?.customerId) {
      syncSessionCustomerId(profileData.profile.customerId);
      return profileData.profile.customerId;
    }

    const registerRes = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
  window.sessionStorage.setItem("slicematic_refresh_orders", "1");
}

export function applyOrderToSession(order: { linkedCustomerId?: string | null }) {
  syncSessionCustomerId(order.linkedCustomerId);
  markOrdersNeedRefresh();
}
