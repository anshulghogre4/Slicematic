import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseAdminEnv } from "../../../../../lib/supabase";
import { loadOutletBrandConfig, saveOutletBrandConfig } from "../../../../../lib/outlet-settings";
import { BrandConfig } from "../../../../../lib/types";
import { requireAdminSession } from "../../../../../lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  if (!hasSupabaseAdminEnv() || !getSupabaseServerClient()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured." }, { status: 503 });
  }

  const brandConfig = await loadOutletBrandConfig();
  return NextResponse.json({ ok: true, brandConfig });
}

export async function POST(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  if (!hasSupabaseAdminEnv() || !getSupabaseServerClient()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const brandConfig = body.brandConfig as BrandConfig;

    if (!brandConfig || !brandConfig.name) {
      return NextResponse.json({ ok: false, error: "Invalid brand configuration provided." }, { status: 400 });
    }

    const success = await saveOutletBrandConfig(brandConfig);

    if (success) {
      return NextResponse.json({ ok: true, brandConfig });
    } else {
      return NextResponse.json({ ok: false, error: "Failed to save to database." }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
}
