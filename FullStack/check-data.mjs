import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkData() {
  console.log("Fetching latest customers...");
  const { data: customers, error: customerError } = await supabase
    .schema('slicematic')
    .from('customer')
    .select('*')
    .order('registration_date', { ascending: false })
    .limit(5);

  if (customerError) {
    console.error("Error fetching customers:", customerError);
  } else {
    console.log(`Found ${customers.length} recent customers.`);
    for (const c of customers) {
      console.log(`- ${c.first_name} ${c.last_name || ''} | Mobile: ${c.mobile_number} | Email: ${c.email || 'N/A'}`);
      
      const { data: orders, error: ordersError } = await supabase
        .schema('slicematic')
        .from('orders')
        .select('*')
        .eq('customer_id', c.customer_id)
        .order('order_datetime', { ascending: false });
        
      if (ordersError) {
         console.error(`  Error fetching orders for ${c.mobile_number}:`, ordersError);
      } else {
         console.log(`  -> Found ${orders.length} orders.`);
         orders.forEach(o => {
           console.log(`     Order ID: ${o.order_id} | Status: ${o.order_status} | Total: ${o.final_amount}`);
         });
      }
    }
  }
}

checkData();
