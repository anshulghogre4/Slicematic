import { NextResponse } from "next/server";
import { loadMenu } from "../../../lib/data-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const menu = await loadMenu();
  return NextResponse.json(menu, {
    headers: { "Cache-Control": "no-store" }
  });
}
