import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseEnv } from "./supabase";

export const DEMO_CUSTOMER_EMAIL = "demo@slicematic.in";
export const DEMO_CUSTOMER_PHONE = "9999999999";

export interface OwnershipTarget {
  identifier?: string | null;
  customerId?: string | null;
}

function unauthorized(message = "Authentication required.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function forbidden(message = "You are not authorized to access this customer's data.") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

function isDemoIdentifier(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed === DEMO_CUSTOMER_EMAIL || trimmed === DEMO_CUSTOMER_PHONE;
}

/**
 * Verifies the caller (via Supabase JWT bearer token) is the customer being requested.
 * Returns null when the caller is authorized to proceed, or a NextResponse (401/403/503)
 * that the route should return as-is to short-circuit the request.
 */
export async function requireCustomerOwnership(
  request: Request,
  target: OwnershipTarget
): Promise<NextResponse | null> {
  if (!hasSupabaseEnv()) return null;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return unauthorized();

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }

  if (token === "demo-bypass") {
    if (isDemoIdentifier(target.identifier)) return null;

    const targetCustomerId = target.customerId?.trim();
    if (targetCustomerId) {
      const { data: customerRow } = await supabase
        .schema("slicematic")
        .from("customer")
        .select("email, mobile_number")
        .eq("customer_id", targetCustomerId)
        .maybeSingle();
      if (customerRow && (isDemoIdentifier(customerRow.email) || isDemoIdentifier(customerRow.mobile_number))) {
        return null;
      }
    }

    return forbidden("Demo session cannot access another customer's data.");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return unauthorized("Invalid or expired session.");
  const callerEmail = data.user.email.trim().toLowerCase();

  const targetIdentifier = target.identifier?.trim();
  if (targetIdentifier) {
    let targetEmail: string | null;
    if (targetIdentifier.includes("@")) {
      targetEmail = targetIdentifier.toLowerCase();
    } else {
      const { data: customerRow } = await supabase
        .schema("slicematic")
        .from("customer")
        .select("email")
        .eq("mobile_number", targetIdentifier)
        .maybeSingle();
      targetEmail = customerRow?.email ? String(customerRow.email).trim().toLowerCase() : null;
    }
    if (!targetEmail || targetEmail !== callerEmail) return forbidden();
    return null;
  }

  const targetCustomerId = target.customerId?.trim();
  if (targetCustomerId) {
    const { data: customerRow } = await supabase
      .schema("slicematic")
      .from("customer")
      .select("email")
      .eq("customer_id", targetCustomerId)
      .maybeSingle();
    const rowEmail = customerRow?.email ? String(customerRow.email).trim().toLowerCase() : null;
    if (!rowEmail || rowEmail !== callerEmail) return forbidden();
    return null;
  }

  return forbidden();
}
