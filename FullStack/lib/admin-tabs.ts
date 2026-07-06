export type AdminTab = "overview" | "orders" | "forecast" | "menu" | "ai" | "settings";

export const ADMIN_TABS: AdminTab[] = ["overview", "orders", "forecast", "menu", "ai", "settings"];

export function adminTabLabel(tab: AdminTab): string {
  if (tab === "ai") return "AI";
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}
