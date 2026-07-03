import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "CASHFREE_APP_ID",
  "CASHFREE_SECRET_KEY",
  "CASHFREE_ENV"
] as const;

export async function GET() {
  const env = Object.fromEntries(requiredEnv.map((name) => [name, Boolean(process.env[name])]));
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      env,
      supabase: { configured: false, menuQuery: false }
    });
  }

  const result = await supabase
    .schema("slicematic")
    .from("pizza_types")
    .select("pizza_type_id", { count: "exact", head: true });

  return NextResponse.json({
    ok: !result.error,
    env,
    supabase: {
      configured: true,
      menuQuery: !result.error,
      errorCode: result.error?.code ?? null
    }
  });
}
