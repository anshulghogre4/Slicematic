import { NextResponse } from "next/server";
import { registerCustomer } from "../../../../lib/data-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      city?: string;
      address?: string;
    };

    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const city = (body.city ?? "").trim() || "Delhi NCR";

    if (!name || !phone || !email) {
      return NextResponse.json({ ok: false, error: "name, phone, and email are required" }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "Invalid mobile number" }, { status: 400 });
    }

    const customerId = await registerCustomer({
      name,
      phone,
      email,
      city,
      address: body.address
    });

    if (!customerId) {
      return NextResponse.json({ ok: false, error: "Could not register customer" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, customer_id: customerId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
