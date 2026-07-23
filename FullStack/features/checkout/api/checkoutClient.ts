import { fetchJson } from "../../../lib/api/fetchJson";
import type { PricingConfig, SavedOrder } from "../../../lib/types";

export async function fetchOutletPricing() {
  return fetchJson<{ pricingConfig: PricingConfig }>("/api/outlet/pricing", {
    method: "GET",
  });
}

export async function placeCashOrder(payload: unknown) {
  return fetchJson<{ order: SavedOrder }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
