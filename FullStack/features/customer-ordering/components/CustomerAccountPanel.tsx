"use client";
/**
 * CustomerAccountPanel — premium customer dashboard.
 *
 * ONLY renders when customerLoggedIn = true.
 * Authentication is handled exclusively by the EntryPortal at "/" — never here.
 * If a not-logged-in user reaches this panel, they see a redirect nudge card.
 */

import {
  Check, LogOut, ReceiptText, RefreshCw, ShoppingBag, UserRound,
  Star, TrendingUp, Package, Utensils,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import CustomerOrderHistoryTable from "../../../components/CustomerOrderHistoryTable";
import type { CustomerOrderHistoryItem } from "../../../lib/data-service";
import { money } from "../../../lib/pricing";
import type { Recommendation } from "../../../lib/types";
import type { UseCustomerAuthReturn } from "../hooks/useCustomerAuth";

type Props = {
  auth: Pick<
    UseCustomerAuthReturn,
    | "customerLoggedIn" | "customerSessionEmail" | "customerLogout"
  >;
  orders: CustomerOrderHistoryItem[];
  ordersLoading: boolean;
  ordersError: string;
  onRefreshOrders: () => void;
  recommendation: Recommendation | null;
  onContinueOrdering: () => void;
  onUseSavedProfile: () => void;
  /** Rebuild from last cart line or last order — parent must not invent favourites. */
  onAddFavourite: () => void;
  onOpenBuilder: (pizzaId: number) => void;
  onBrowseMenu: () => void;
  /** Called on logout — resets isAuthorized in app/page.tsx → EntryPortal shows */
  onUnauthorize?: () => void;
  /** Current cart has lines — enables "Rebuild last cart item". */
  hasCartLines?: boolean;
  /** Toast / notify helper for honest empty-state feedback. */
  onNotify?: (message: string) => void;
};

// ── Animation variants ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" as const },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const MISSING_CUSTOMER_ID_ERROR = /no customer id/i;

function readSessionCustomerId(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("slicematic_customer_id")?.trim() ?? "";
}

function hasUsableSavedProfile(): boolean {
  if (typeof window === "undefined") return false;
  const json = window.sessionStorage.getItem("slicematic_customer");
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const name = String(parsed.name ?? "").trim();
    const phone = String(parsed.phone ?? "").trim();
    const address = String(parsed.address ?? "").trim();
    return Boolean(name || phone || address);
  } catch {
    return false;
  }
}

// ── Glass card ─────────────────────────────────────────────────────────────────
function GlassCard({ children, style = {}, index = 0 }: {
  children: React.ReactNode; style?: React.CSSProperties; index?: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      whileHover={{ y: -2, boxShadow: "0 16px 40px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 20,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.25rem", fontWeight: 780, color: "#111", letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick, variant = "ghost", disabled = false, helper }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  helper?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#c5362c", color: "#fff", border: "none" },
    ghost: { background: "rgba(0,0,0,0.04)", color: "#333", border: "1px solid rgba(0,0,0,0.08)" },
    danger: { background: "rgba(197,54,44,0.07)", color: "#c5362c", border: "1px solid rgba(197,54,44,0.15)" },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        aria-disabled={disabled}
        title={disabled && helper ? helper : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          fontWeight: 650, fontSize: "0.84rem", width: "100%",
          justifyContent: "flex-start",
          opacity: disabled ? 0.55 : 1,
          ...styles[variant],
        }}
      >
        {icon}
        {label}
      </motion.button>
      {disabled && helper ? (
        <p style={{ margin: 0, padding: "0 4px", fontSize: "0.68rem", color: "#999", lineHeight: 1.35 }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function CustomerAccountPanel({
  auth, orders, ordersLoading, ordersError,
  onRefreshOrders, recommendation,
  onContinueOrdering, onUseSavedProfile, onAddFavourite,
  onOpenBuilder, onBrowseMenu, onUnauthorize,
  hasCartLines = false, onNotify,
}: Props) {
  const { customerLoggedIn, customerSessionEmail, customerLogout } = auth;

  const [hasCustomerId, setHasCustomerId] = useState(false);

  useEffect(() => {
    setHasCustomerId(Boolean(readSessionCustomerId()));
  }, [customerLoggedIn, orders.length]);

  const totalSpent = useMemo(() =>
    orders.reduce((s, o) => s + (o.finalTotal ?? 0), 0), [orders]);
  const totalOrders = orders.length;

  const lastOrderLine = orders[0]?.lines?.[0];
  const canRebuild = hasCartLines || Boolean(lastOrderLine);
  const rebuildLabel = hasCartLines
    ? "Rebuild last cart item"
    : "Reorder last pizza";
  const rebuildHelper = "Add a pizza to your cart or place an order first.";

  const displayName = customerSessionEmail
    ? customerSessionEmail.split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Customer";

  const visibleOrdersError =
    hasCustomerId && ordersError && !MISSING_CUSTOMER_ID_ERROR.test(ordersError)
      ? ordersError
      : "";

  function handleUseSavedProfile() {
    if (!hasUsableSavedProfile()) {
      onNotify?.("No saved delivery profile yet. Fill your details on the order form first.");
      return;
    }
    onUseSavedProfile();
  }

  function handleRebuild() {
    if (!canRebuild) {
      onNotify?.(rebuildHelper);
      return;
    }
    onAddFavourite();
  }

  // ── Not logged in: redirect nudge (this path should rarely show — openAccount() guards first) ──
  if (!customerLoggedIn) {
    return (
      <section style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "32px" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 24, padding: "40px 48px",
            textAlign: "center", maxWidth: 400,
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #c5362c, #e85d52)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", color: "#fff",
          }}>
            <UserRound size={24} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 800, color: "#111" }}>Sign in to continue</h2>
          <p style={{ margin: "0 0 24px", color: "#888", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Your account dashboard, order history, and personalised recommendations are waiting.
          </p>
          <motion.button
            type="button"
            onClick={() => onUnauthorize?.()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 12,
              background: "#c5362c", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Go to login
          </motion.button>
        </motion.div>
      </section>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={stagger}
      style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100, margin: "0 auto" }}
      id="customer-account"
    >
      {/* Welcome hero */}
      <GlassCard index={0} style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #c5362c 0%, #e85d52 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: "1.2rem", flexShrink: 0,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </motion.div>
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Customer account
              </p>
              <h2 style={{ margin: "2px 0 0", fontSize: "1.4rem", fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>
                Welcome back, {displayName}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#888" }}>{customerSessionEmail}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <StatChip icon={<Package size={16} />} label="Total orders" value={String(totalOrders)} color="#6366f1" />
            <StatChip icon={<TrendingUp size={16} />} label="Total spent" value={money(totalSpent)} color="#c5362c" />
            {orders[0] && (
              <StatChip
                icon={<Star size={16} />}
                label="Last order"
                value={new Date(orders[0].createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                color="#f59e0b"
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Actions + AI rec */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Quick actions */}
        <GlassCard index={1} style={{ padding: "20px" }}>
          <p style={{ margin: "0 0 14px", fontSize: "0.72rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Quick actions
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ActionBtn icon={<ShoppingBag size={15} />} label="Continue ordering" onClick={onContinueOrdering} variant="primary" />
            <ActionBtn
              icon={<Check size={15} />}
              label="Use saved profile"
              onClick={handleUseSavedProfile}
            />
            <ActionBtn
              icon={<RefreshCw size={15} />}
              label={rebuildLabel}
              onClick={handleRebuild}
              disabled={!canRebuild}
              helper={rebuildHelper}
            />
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
            <ActionBtn
              icon={<LogOut size={15} />}
              label="Sign out"
              onClick={() => void customerLogout(onUnauthorize)}
              variant="danger"
            />
          </div>
        </GlassCard>

        {/* Personalized pick */}
        <GlassCard index={2} style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: "var(--tomato)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Utensils size={14} color="#fff" aria-hidden="true" />
            </div>
            <strong style={{ fontSize: "0.88rem", color: "#111" }}>Your personalised pick</strong>
          </div>
          <AnimatePresence mode="wait">
            {recommendation?.pizzaName ? (
              <motion.div key="rec-found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(197,54,44,0.06), rgba(22,109,69,0.06))",
                  border: "1px solid rgba(197,54,44,0.12)", marginBottom: 12,
                }}>
                  <p style={{ margin: 0, fontWeight: 750, color: "#c5362c", fontSize: "0.95rem" }}>{recommendation.pizzaName}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#666" }}>+ {recommendation.toppingName}</p>
                  <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#555", lineHeight: 1.5 }}>{recommendation.reason}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button"
                    onClick={() => onOpenBuilder(recommendation.pizzaId)}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "#c5362c", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Build this pizza
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={onBrowseMenu}
                    style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.05)", color: "#444", border: "1px solid rgba(0,0,0,0.08)", fontWeight: 650, fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Browse menu
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="rec-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 12px" }}>
                  Place your first order and we&apos;ll build a personalised pizza recommendation just for you.
                </p>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={onBrowseMenu}
                  style={{ padding: "9px 14px", borderRadius: 10, background: "#c5362c", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                >
                  Browse menu
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Order history */}
      <GlassCard index={3} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ReceiptText size={18} color="#c5362c" />
            <strong style={{ fontSize: "0.95rem", color: "#111" }}>Order history</strong>
            {totalOrders > 0 && (
              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(197,54,44,0.1)", color: "#c5362c" }}>
                {totalOrders} orders
              </span>
            )}
          </div>
          <motion.button type="button" onClick={onRefreshOrders} disabled={ordersLoading || !hasCustomerId}
            whileHover={hasCustomerId && !ordersLoading ? { scale: 1.03 } : undefined}
            whileTap={hasCustomerId && !ordersLoading ? { scale: 0.97 } : undefined}
            title={!hasCustomerId ? "Order history unlocks after your account is linked to a placed order." : undefined}
            style={{
              padding: "6px 14px", borderRadius: 8,
              cursor: ordersLoading || !hasCustomerId ? "default" : "pointer",
              border: "1px solid rgba(0,0,0,0.09)", background: "none",
              fontSize: "0.78rem", fontWeight: 650, color: "#555",
              opacity: !hasCustomerId ? 0.55 : 1,
            }}
          >
            {ordersLoading ? "Refreshing…" : "Refresh"}
          </motion.button>
        </div>
        <div style={{ padding: "12px 0 4px" }}>
          {visibleOrdersError ? (
            <p style={{ color: "#c5362c", fontSize: "0.84rem", padding: "0 24px 12px" }}>{visibleOrdersError}</p>
          ) : null}
          {ordersLoading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "20px 24px 24px", color: "#aaa" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #ddd", borderTopColor: "#c5362c", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: "0.84rem" }}>Loading your orders…</span>
            </div>
          ) : !hasCustomerId ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
              <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ margin: "0 0 6px", fontSize: "0.9rem", fontWeight: 650, color: "#555" }}>
                No orders linked yet
              </p>
              <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.5, maxWidth: 360, marginInline: "auto" }}>
                After you place an order, history for this account will show up here.
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#aaa" }}>
              <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>No past orders yet. Place your first order today!</p>
            </div>
          ) : (
            <CustomerOrderHistoryTable orders={orders} />
          )}
        </div>
      </GlassCard>
    </motion.section>
  );
}
