"use client";

import { Check } from "lucide-react";
import { FadeInUp } from "../../../components/ui";
import { money } from "../../../lib/pricing";
import type { BrandConfig, PricingConfig } from "../../../lib/types";

export type SettingsPage = "brand" | "financials" | "delivery";

export type AdminSettingsWorkspaceProps = {
  brand: BrandConfig;
  pricingConfig: PricingConfig;
  settingsPage: SettingsPage;
  settingsSaving?: boolean;
  applyLabel?: string;
  deliveryPolicyNote?: string;
  onApply: () => void;
  onSettingsPageChange: (page: SettingsPage) => void;
  onBrandChange: (brand: BrandConfig) => void;
  onUpdatePercent: (field: "gstRate" | "bulkDiscountRate", value: string) => void;
  onUpdatePositiveNumber: (field: "bulkDiscountQty" | "maxOrderQty" | "deliveryFee" | "freeDeliveryMin", value: string) => void;
  onUpdatePricing: <K extends keyof PricingConfig>(field: K, value: PricingConfig[K]) => void;
};

export function AdminSettingsWorkspace({
  brand,
  pricingConfig,
  settingsPage,
  settingsSaving = false,
  applyLabel,
  deliveryPolicyNote,
  onApply,
  onSettingsPageChange,
  onBrandChange,
  onUpdatePercent,
  onUpdatePositiveNumber,
  onUpdatePricing
}: AdminSettingsWorkspaceProps) {
  const actionLabel = applyLabel ?? (settingsSaving ? "Saving..." : "Apply live");

  return (
    <FadeInUp>
    <section className="admin-card settings-console admin-workspace-shell">
      <div className="settings-head admin-page-head">
        <div>
          <p className="eyebrow">Owner configuration</p>
          <h3>Control the customer app, financial rules, delivery policy, and risk settings.</h3>
          <p style={{ margin: "6px 0 0", color: "var(--sui-text-secondary)", fontSize: "var(--text-small)" }}>
            Brand, Financials, and Delivery & risk use the same console chrome as Menu and Forecast.
          </p>
        </div>
        <button type="button" onClick={onApply} disabled={settingsSaving}><Check /> {actionLabel}</button>
      </div>

      <div className="sub-tabs" role="tablist" aria-label="Settings sections">
        {[
          ["brand", "Brand"],
          ["financials", "Financials"],
          ["delivery", "Delivery & risk"]
        ].map(([page, label]) => (
          <button key={page} className={settingsPage === page ? "active" : ""} onClick={() => onSettingsPageChange(page as SettingsPage)} type="button">{label}</button>
        ))}
      </div>

      {settingsPage === "brand" && (
        <div className="settings-group">
          <div><p className="eyebrow">Brand and outlet</p><span>Everything here is visible to customers.</span></div>
          <div className="settings-grid">
            <label>Brand<input value={brand.name} onChange={(event) => onBrandChange({ ...brand, name: event.target.value })} /></label>
            <label>Outlet<input value={brand.outlet} onChange={(event) => onBrandChange({ ...brand, outlet: event.target.value })} /></label>
            <label>Open status<input value={brand.openStatus} onChange={(event) => onBrandChange({ ...brand, openStatus: event.target.value })} /></label>
            <label>Delivery promise<input value={brand.deliveryPromise} onChange={(event) => onBrandChange({ ...brand, deliveryPromise: event.target.value })} /></label>
            <label className="wide">Hero headline<textarea value={brand.hero} onChange={(event) => onBrandChange({ ...brand, hero: event.target.value })} /></label>
            <label className="wide">Hero copy<textarea value={brand.subhero} onChange={(event) => onBrandChange({ ...brand, subhero: event.target.value })} /></label>
            <label className="wide">Customer promise strip<input value={brand.customerPromise} onChange={(event) => onBrandChange({ ...brand, customerPromise: event.target.value })} /></label>
            <label className="wide">Operations promise<input value={brand.opsPromise} onChange={(event) => onBrandChange({ ...brand, opsPromise: event.target.value })} /></label>
          </div>
        </div>
      )}

      {settingsPage === "financials" && (
        <div className="settings-group admin-glass-card">
          <div><p className="eyebrow">Financial rules</p><span>These values drive live cart totals and the order API. Bill order stays subtotal → discount → taxable → GST → delivery → finalTotal.</span></div>
          <div className="settings-grid">
            <label>GST %<input type="number" min={0} max={100} value={Math.round(pricingConfig.gstRate * 100)} onChange={(event) => onUpdatePercent("gstRate", event.target.value)} /></label>
            <label>Discount %<input type="number" min={0} max={100} value={Math.round(pricingConfig.bulkDiscountRate * 100)} onChange={(event) => onUpdatePercent("bulkDiscountRate", event.target.value)} /></label>
            <label>Discount quantity<input type="number" min={1} value={pricingConfig.bulkDiscountQty} onChange={(event) => onUpdatePositiveNumber("bulkDiscountQty", event.target.value)} /></label>
            <label>Max pizzas/order<input type="number" min={1} value={pricingConfig.maxOrderQty} onChange={(event) => onUpdatePositiveNumber("maxOrderQty", event.target.value)} /></label>
            <label>Delivery fee<input type="number" min={0} value={pricingConfig.deliveryFee} onChange={(event) => onUpdatePositiveNumber("deliveryFee", event.target.value)} /></label>
            <label>Free delivery above<input type="number" min={0} value={pricingConfig.freeDeliveryMin} onChange={(event) => onUpdatePositiveNumber("freeDeliveryMin", event.target.value)} /></label>
          </div>
        </div>
      )}

      {settingsPage === "delivery" && (
        <div className="settings-group">
          <div><p className="eyebrow">Delivery and payment risk</p><span>Use stricter controls for guest orders and delivery radius expansion.</span></div>
          <div className="settings-grid">
            <label>Active delivery radius<select value={pricingConfig.activeDeliveryZone} onChange={(event) => onUpdatePricing("activeDeliveryZone", event.target.value as PricingConfig["activeDeliveryZone"])}><option value="0-2">0-2 km</option><option value="2-4">0-4 km</option><option value="4-6">0-6 km</option></select></label>
            <label className="toggle-row"><input type="checkbox" checked={pricingConfig.guestCashAllowed} onChange={(event) => onUpdatePricing("guestCashAllowed", event.target.checked)} /> Allow Cash for guest checkout</label>
            <div className="settings-preview wide">
              <strong>Live policy preview</strong>
              <span>GST {Math.round(pricingConfig.gstRate * 100)}%, {Math.round(pricingConfig.bulkDiscountRate * 100)}% off at {pricingConfig.bulkDiscountQty}+ pizzas, max {pricingConfig.maxOrderQty} pizzas/order, delivery fee {money(pricingConfig.deliveryFee)}, guest Cash {pricingConfig.guestCashAllowed ? "allowed" : "blocked"}{deliveryPolicyNote ? ` ${deliveryPolicyNote}` : ""}</span>
            </div>
          </div>
        </div>
      )}
    </section>
    </FadeInUp>
  );
}
