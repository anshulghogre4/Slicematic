import { defaultPricingConfig, sanitizePricingConfig } from "./pricing";
import { getSupabaseServerClient } from "./supabase";
import type { PricingConfig } from "./types";

const PRICING_KEY = "pricing_config";

export async function loadOutletPricingConfig(): Promise<PricingConfig> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return defaultPricingConfig;

  const { data, error } = await supabase
    .schema("slicematic")
    .from("outlet_settings")
    .select("setting_value")
    .eq("setting_key", PRICING_KEY)
    .maybeSingle();

  if (error || !data?.setting_value) return defaultPricingConfig;
  return sanitizePricingConfig(data.setting_value as Partial<PricingConfig>);
}

export async function saveOutletPricingConfig(config: PricingConfig): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const pricingConfig = sanitizePricingConfig(config);
  const { error } = await supabase.schema("slicematic").from("outlet_settings").upsert(
    {
      setting_key: PRICING_KEY,
      setting_value: pricingConfig,
      updated_at: new Date().toISOString()
    },
    { onConflict: "setting_key" }
  );

  return !error;
}
