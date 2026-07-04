import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: "f:/Preparation/FDE_Slicemate/Slicematic/FullStack/.env.local" });
dotenv.config({ path: "f:/Preparation/FDE_Slicemate/Slicematic/FullStack/.env" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrders() {
  const { data, count, error } = await supabase.schema("slicematic").from("orders").select("*", { count: "exact" });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Total orders in slicematic.orders: ${count}`);
    console.log("Order dates:", data.map(o => o.order_datetime));
  }
}

checkOrders();
