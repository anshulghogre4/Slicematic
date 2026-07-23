"use client";
/**
 * AppHeader — premium top navigation bar.
 * Features:
 *  - Framer Motion animated sliding pill for active tab
 *  - Frosted-glass backdrop
 *  - Admin console tab is HIDDEN from regular customers (isAdminUser must be true)
 *  - Guest session chip soft-gates to Account / Sign in; members open Account
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Pizza, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

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
  const reduceMotion = useReducedMotion();
  const handlers = { onSelectCustomer, onSelectAccount, onSelectAdmin };
  const visibleTabs = NAV_TABS.filter((t) => !t.adminOnly || isAdminUser);

  // ── Active session label ───────────────────────────────────────────────────
  const sessionLabel =
    workspace === "admin"
      ? adminLoggedIn
        ? adminSessionEmail || "Admin session"
        : "Secure admin access"
      : customerLoggedIn
      ? customerSessionEmail || "Member"
      : "Guest · Sign in";

  const sessionIcon =
    workspace === "admin" ? <ShieldCheck size={13} /> : <UserRound size={13} />;

  const sessionClickable =
    workspace !== "admin" && (customerLoggedIn || workspace === "customer" || workspace === "account");

  const fade = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 4 },
        transition: { duration: 0.2 },
      };

  return (
    <header className="app-header">
      {/* ── Logo mark ─────────────────────────────────────────────────────── */}
      <motion.div
        className="app-header__brand"
        initial={reduceMotion ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
      >
        <div className="app-header__logo" aria-hidden="true">
          <Pizza size={14} color="#fff" />
        </div>
        <span className="app-header__title">SliceMatic</span>
      </motion.div>

      {/* ── Nav tabs ──────────────────────────────────────────────────────── */}
      <nav className="app-header__nav" role="navigation" aria-label="Main navigation">
        {visibleTabs.map((tab) => {
          const isActive = workspace === tab.id;
          const onClick = handlers[HANDLER[tab.id] as keyof typeof handlers];
          return (
            <motion.button
              key={tab.id}
              type="button"
              className={`app-header__nav-btn${isActive ? " is-active" : ""}`}
              onClick={onClick}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "nav-active-pill"}
                  className="app-header__nav-pill"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <tab.Icon size={14} aria-hidden="true" />
              {tab.label}
            </motion.button>
          );
        })}
      </nav>

      {/* ── Session chip + theme ──────────────────────────────────────────── */}
      <div className="app-header__actions">
        <AnimatePresence mode="wait">
          <motion.button
            key={sessionLabel}
            type="button"
            className={`app-header__session${
              workspace === "admin"
                ? " app-header__session--admin"
                : customerLoggedIn
                ? " app-header__session--member"
                : " app-header__session--guest"
            }${sessionClickable ? " is-clickable" : ""}`}
            {...fade}
            onClick={sessionClickable ? onOpenAccount : undefined}
            disabled={!sessionClickable}
            aria-label={
              customerLoggedIn
                ? `Open account for ${sessionLabel}`
                : workspace === "admin"
                ? sessionLabel
                : "Sign in to continue as a member"
            }
          >
            {sessionIcon}
            <span className="app-header__session-text">{sessionLabel}</span>
          </motion.button>
        </AnimatePresence>
        <ThemeToggle />
      </div>
    </header>
  );
}
