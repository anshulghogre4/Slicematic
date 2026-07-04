import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const cachePath = path.join(process.cwd(), "lib", "generated", "forecast-cache.json");
const scriptPath = path.join(process.cwd(), "scripts", "forecast_model.py");
const pythonCmd = process.platform === "win32" ? "python" : "python3";

async function fetchOrders() {
  if (!url || !(serviceKey || anonKey)) {
    console.warn("Supabase env missing — training on demo data via empty order list.");
    return [];
  }

  const supabase = createClient(url, serviceKey || anonKey);
  const { data, error } = await supabase
    .schema("slicematic")
    .from("orders")
    .select("order_datetime, final_amount")
    .order("order_datetime", { ascending: false });

  if (error) {
    console.warn("Supabase order fetch failed:", error.message);
    return [];
  }

  return (data || []).map((row) => ({
    createdAt: String(row.order_datetime),
    finalTotal: Number(row.final_amount ?? 0)
  }));
}

function runTrainer(orders) {
  if (!existsSync(scriptPath)) {
    console.error("Missing scripts/forecast_model.py");
    process.exit(1);
  }

  const result = spawnSync(
    pythonCmd,
    [scriptPath, "--stdin-json", "--write-cache", cachePath],
    {
      cwd: process.cwd(),
      input: JSON.stringify(orders),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.error || result.status !== 0) {
    console.error("Forecast training failed:", result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`);
    process.exit(1);
  }

  return JSON.parse(result.stdout);
}

async function main() {
  const orders = await fetchOrders();
  console.log(`Training forecast on ${orders.length} orders...`);
  const payload = runTrainer(orders);

  console.log(`Model: ${payload.model}`);
  console.log(`Features: ${payload.features.join(", ")}`);
  console.log(`Buckets: ${payload.bucketCount}`);
  if (payload.rmse != null) {
    console.log(`Validation RMSE: ${payload.rmse.toFixed(2)} orders/hour`);
  } else {
    console.log("Validation RMSE: insufficient data (< 20 hourly buckets)");
  }
  console.log("Top 3 peak windows:");
  for (const peak of payload.topPeaks || []) {
    console.log(`- ${peak.label}: ${peak.predictedOrders} predicted orders`);
  }
  console.log(`Cache written to ${cachePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
