import { sanitizePricingConfig } from "./pricing";
import type { PricingConfig } from "./types";

export const CUSTOMER_FLOW_TABS = [
  { id: "menu" as const, label: "Menu" },
  { id: "recommendation" as const, label: "Recommendation" },
  { id: "checkout" as const, label: "Checkout" },
  { id: "intake" as const, label: "Customer Details" }
];

export type CustomerFlowTabId = (typeof CUSTOMER_FLOW_TABS)[number]["id"];

export async function fetchOutletPricingConfig(): Promise<PricingConfig | null> {
  const response = await fetch("/api/outlet/pricing", { cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as { ok?: boolean; pricingConfig?: Partial<PricingConfig> };
  if (!data.ok || !data.pricingConfig) return null;
  return sanitizePricingConfig(data.pricingConfig);
}
