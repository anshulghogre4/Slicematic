import { getLineUnitPrice, money } from "./pricing";
import type { CartLine, MenuPayload, PricingConfig } from "./types";

export type CartLineSummary = {
  pizzaName: string;
  baseName: string;
  sizeName: string;
  toppingNames: string[];
  lineTotal: number;
  lineTotalLabel: string;
  hasMissingItem: boolean;
};

export function summarizeCartLine(line: CartLine, menu: MenuPayload): CartLineSummary {
  const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
  const base = menu.bases.find((item) => item.id === line.baseId);
  const size = menu.sizes.find((item) => item.id === line.sizeId);
  const toppingNames = line.toppingIds
    .map((id) => menu.toppings.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const lineTotal = getLineUnitPrice(line, menu) * line.quantity;

  return {
    pizzaName: pizza?.name ?? "Unavailable pizza",
    baseName: base?.name ?? "Unavailable crust",
    sizeName: size?.name ?? "Unavailable size",
    toppingNames,
    lineTotal,
    lineTotalLabel: money(lineTotal),
    hasMissingItem: !pizza || !base || !size || toppingNames.length !== line.toppingIds.length
  };
}

export function getDeliveryChargeLabel(
  deliveryCharge: number,
  pricingConfig: Pick<PricingConfig, "deliveryFee" | "freeDeliveryMin">
) {
  if (pricingConfig.deliveryFee === 0) return "Included";
  if (deliveryCharge === 0) return `Free (above ${money(pricingConfig.freeDeliveryMin)})`;
  return money(deliveryCharge);
}
