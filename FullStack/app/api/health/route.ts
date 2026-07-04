import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: hasSupabaseEnv(),
    supabaseAdmin: hasSupabaseAdminEnv()
  });
}
