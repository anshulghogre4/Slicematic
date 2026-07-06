import { NextResponse } from "next/server";
import { lookupCustomerProfile } from "../../../../lib/data-service";
import { requireCustomerOwnership } from "../../../../lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("identifier")?.trim();
    if (!identifier) {
      return NextResponse.json({ ok: false, error: "identifier (email or mobile) is required" }, { status: 400 });
    }

    const authError = await requireCustomerOwnership(request, { identifier });
    if (authError) return authError;

    const profile = await lookupCustomerProfile(identifier);
    if (!profile) {
      return NextResponse.json({ ok: true, profile: null });
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
