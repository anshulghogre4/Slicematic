"use client";
/**
 * AppHeader — premium top navigation bar.
 * Features:
 *  - Framer Motion animated sliding pill for active tab
 *  - Frosted-glass backdrop
 *  - Admin console tab is HIDDEN from regular customers (isAdminUser must be true)
 *  - Smooth hover + scale micro-interactions
 */

import { motion, AnimatePresence } from "framer-motion";
import { Pizza, Settings2, ShieldCheck, UserRound } from "lucide-react";

type Workspace = "customer" | "account" | "admin";

type Props = {
  workspace: Workspace;
  /** Show the Admin console tab only if the session user is an admin. */
  isAdminUser?: boolean;
  customerLoggedIn: boolean;
  customerSessionEmail: string;
  adminLoggedIn: boolean;
  adminSessionEmail: string;
  onSelectCustomer: () => void;
  onSelectAccount: () => void;
  onSelectAdmin: () => void;
  onOpenAccount: () => void;
};

const NAV_TABS = [
  { id: "customer" as const, label: "Customer", Icon: Pizza, adminOnly: false },
  { id: "account" as const, label: "Account", Icon: UserRound, adminOnly: false },
  { id: "admin" as const, label: "Admin console", Icon: Settings2, adminOnly: true },
];

const HANDLER: Record<Workspace, keyof Props> = {
  customer: "onSelectCustomer",
  account: "onSelectAccount",
  admin: "onSelectAdmin",
};

export function AppHeader({
  workspace,
  isAdminUser = false,
  customerLoggedIn,
  customerSessionEmail,
  adminLoggedIn,
  adminSessionEmail,
  onSelectCustomer,
  onSelectAccount,
  onSelectAdmin,
  onOpenAccount,
}: Props) {
  const handlers = { onSelectCustomer, onSelectAccount, onSelectAdmin };
  const visibleTabs = NAV_TABS.filter((t) => !t.adminOnly || isAdminUser);

  // ── Active session label ───────────────────────────────────────────────────
  const sessionLabel =
    workspace === "customer"
      ? customerLoggedIn
        ? `${customerSessionEmail}`
        : "Guest checkout"
      : workspace === "account"
      ? customerLoggedIn
        ? customerSessionEmail || "Customer account"
        : "Customer account access"
      : adminLoggedIn
      ? adminSessionEmail || "Admin session"
      : "Secure admin access";

  const sessionIcon =
    workspace === "admin" ? <ShieldCheck size={13} /> : <UserRound size={13} />;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(248, 246, 243, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        gap: 16,
      }}
    >
      {/* ── Logo mark ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
      >
        <div
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #c5362c 0%, #e85d52 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Pizza size={14} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#111", letterSpacing: "-0.02em" }}>
          SliceMatic
        </span>
      </motion.div>

      {/* ── Nav tabs ──────────────────────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "rgba(0,0,0,0.04)",
          borderRadius: 10,
          padding: "3px",
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = workspace === tab.id;
          const onClick = handlers[HANDLER[tab.id] as keyof typeof handlers];
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={onClick}
              whileTap={{ scale: 0.96 }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                color: isActive ? "#111" : "#666",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                letterSpacing: "-0.01em",
                transition: "color 0.2s ease",
                zIndex: 1,
              }}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Sliding background pill */}
              {isActive && (
                <motion.span
                  layoutId="nav-active-pill"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#fff",
                    borderRadius: 7,
                    boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
                    zIndex: -1,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <tab.Icon size={14} />
              {tab.label}
            </motion.button>
          );
        })}
      </nav>

      {/* ── Session chip ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.button
          key={sessionLabel}
          type="button"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          onClick={
            workspace === "customer" && customerLoggedIn
              ? onOpenAccount
              : undefined
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 100,
            border: "1px solid rgba(0,0,0,0.09)",
            background:
              workspace === "admin"
                ? "rgba(197, 54, 44, 0.07)"
                : customerLoggedIn
                ? "rgba(16, 185, 129, 0.09)"
                : "rgba(0,0,0,0.04)",
            color:
              workspace === "admin"
                ? "#c5362c"
                : customerLoggedIn
                ? "#15803d"
                : "#666",
            fontSize: "0.75rem",
            fontWeight: 650,
            cursor:
              workspace === "customer" && customerLoggedIn ? "pointer" : "default",
            whiteSpace: "nowrap",
            maxWidth: 260,
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          {sessionIcon}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {sessionLabel}
          </span>
        </motion.button>
      </AnimatePresence>
    </header>
  );
}
