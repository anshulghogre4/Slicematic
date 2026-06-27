import { NextResponse } from "next/server";
import { loadMenu } from "../../../lib/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const menu = await loadMenu();
  return NextResponse.json(menu);
}
