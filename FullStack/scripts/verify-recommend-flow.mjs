import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openRouter = process.env.OPENROUTER_API_KEY;

console.log("=== Env keys ===");
console.log("NEXT_PUBLIC_SUPABASE_URL:", url ? "SET" : "MISSING");
console.log("SUPABASE_SERVICE_ROLE_KEY:", serviceKey ? "SET" : "MISSING");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", anonKey ? "SET" : "MISSING");
console.log("OPENROUTER_API_KEY:", openRouter ? "SET" : "MISSING");

if (!url || !(serviceKey || anonKey)) {
  console.error("\nCannot connect to Supabase — missing URL or key.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey || anonKey);

async function main() {
  console.log("\n=== Customer table (sample) ===");
  const { data: customers, error: ce } = await supabase
    .schema("slicematic")
    .from("customer")
    .select("customer_id, first_name, last_name, mobile_number, email")
    .order("registration_date", { ascending: false })
    .limit(3);

  if (ce) {
    console.error("Customer query error:", ce.message);
  } else {
    console.log(`Found ${customers?.length ?? 0} customers`);
    for (const c of customers ?? []) {
      console.log(`  UUID: ${c.customer_id} | ${c.first_name} ${c.last_name ?? ""} | phone: ${c.mobile_number} | email: ${c.email ?? "—"}`);

      const { count } = await supabase
        .schema("slicematic")
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", c.customer_id);
      console.log(`    orders by customer_id: ${count ?? 0}`);
    }
  }

  console.log("\n=== Order history via phone lookup (recommend route pattern) ===");
  const testPhone = customers?.[0]?.mobile_number;
  if (testPhone) {
    const { data: byPhone } = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id")
      .eq("mobile_number", testPhone)
      .maybeSingle();
    console.log(`Phone ${testPhone} → customer_id: ${byPhone?.customer_id ?? "NOT FOUND"}`);
  }

  console.log("\n=== Global popularity (order_item count) ===");
  const { data: items, error: ie } = await supabase
    .schema("slicematic")
    .from("order_item")
    .select("pizza_type_id, quantity");
  if (ie) console.error("order_item error:", ie.message);
  else console.log(`order_item rows: ${items?.length ?? 0}`);

  console.log("\n=== recommendation_event (recent) ===");
  const { data: recs, error: re } = await supabase
    .schema("slicematic")
    .from("recommendation_event")
    .select("recommendation_id, customer_id, action_taken, recommendation_timestamp")
    .order("recommendation_timestamp", { ascending: false })
    .limit(3);
  if (re) console.error("recommendation_event error:", re.message);
  else console.log(`Recent events: ${recs?.length ?? 0}`, recs?.map((r) => ({ customer_id: r.customer_id?.slice(0, 8), action: r.action_taken })));

  if (openRouter) {
    console.log("\n=== OpenRouter ping ===");
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { authorization: `Bearer ${openRouter}` }
    });
    console.log("OpenRouter models endpoint:", res.status, res.ok ? "OK" : "FAILED");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
