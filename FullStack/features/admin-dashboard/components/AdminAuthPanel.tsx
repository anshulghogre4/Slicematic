"use client";
/**
 * AdminAuthPanel — the admin login / forgot / reset screens.
 * Extracted from SliceMaticStage3 renderAdminAuth().
 */

import {
  ArrowLeft,
  Check,
  KeyRound,
  Lock,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { AdminAuthView, UseAdminAuthReturn } from "../hooks/useAdminAuth";

type Props = Pick<
  UseAdminAuthReturn,
  | "adminAuthView"
  | "adminAuthMessage"
  | "adminAuthLoading"
  | "adminEmail"
  | "adminPassword"
  | "resetPassword"
  | "resetConfirm"
  | "demoSessionPassword"
  | "setAdminEmail"
  | "setAdminPassword"
  | "setResetPassword"
  | "setResetConfirm"
  | "showAdminAuthView"
  | "adminLogin"
  | "requestPasswordReset"
  | "resetAdminPassword"
>;

export function AdminAuthPanel({
  adminAuthView,
  adminAuthMessage,
  adminAuthLoading,
  adminEmail,
  adminPassword,
  resetPassword,
  resetConfirm,
  demoSessionPassword,
  setAdminEmail,
  setAdminPassword,
  setResetPassword,
  setResetConfirm,
  showAdminAuthView,
  adminLogin,
  requestPasswordReset,
  resetAdminPassword,
}: Props) {
  const authTitle =
    adminAuthView === "login"
      ? "Sign in to SliceMatic Ops"
      : adminAuthView === "forgot"
      ? "Recover admin access"
      : "Set a new password";

  const authCopy =
    adminAuthView === "login"
      ? "Secure access keeps menu changes, exports, AI operations, and revenue data inside the control room."
      : adminAuthView === "forgot"
      ? "Send a Supabase recovery link to the admin email. In demo mode, this opens a local reset flow."
      : "Use the recovery session from email, or update the local demo password for this browser session.";

  return (
    <section className="auth-console">
      <aside className="auth-visual">
        <span className="auth-mark">
          {adminAuthView === "forgot" ? (
            <Mail />
          ) : adminAuthView === "reset" ? (
            <KeyRound />
          ) : (
            <Lock />
          )}
        </span>
        <p className="eyebrow">Secure application access</p>
        <h2>{authTitle}</h2>
        <p>{authCopy}</p>
        <div className="auth-checks">
          <span><Check /> Supabase Auth ready</span>
          <span><Check /> Demo fallback included</span>
          <span><Check /> Admin APIs stay token-gated</span>
        </div>
      </aside>

      <section className="auth-card" aria-live="polite">
        {adminAuthView !== "login" && (
          <button
            className="text-action"
            type="button"
            onClick={() => showAdminAuthView("login")}
          >
            <ArrowLeft /> Back to login
          </button>
        )}

        {adminAuthView === "login" && (
          <>
            <div className="auth-heading">
              <Lock />
              <div>
                <p className="eyebrow">Admin login</p>
                <h3>Operations console</h3>
              </div>
            </div>
            <label>
              Admin email
              <div className="input-with-icon">
                <Mail />
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@slicematic.in"
                />
              </div>
            </label>
            <label>
              Password
              <div className="input-with-icon">
                <KeyRound />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </label>
            <button
              className="primary"
              disabled={adminAuthLoading}
              onClick={() => void adminLogin()}
              type="button"
            >
              <ShieldCheck /> {adminAuthLoading ? "Signing in…" : "Sign in"}
            </button>
            <div className="auth-links">
              <button type="button" onClick={() => showAdminAuthView("forgot")}>
                Forgot password
              </button>
              <button type="button" onClick={() => showAdminAuthView("reset")}>
                Reset password
              </button>
            </div>
            <div className="demo-credential">
              <span>Demo</span>
              <strong>{adminEmail}</strong>
              <small>Password: {demoSessionPassword}</small>
            </div>
          </>
        )}

        {adminAuthView === "forgot" && (
          <>
            <div className="auth-heading">
              <Mail />
              <div>
                <p className="eyebrow">Forgot password</p>
                <h3>Send recovery link</h3>
              </div>
            </div>
            <label>
              Admin email
              <div className="input-with-icon">
                <Mail />
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@slicematic.in"
                />
              </div>
            </label>
            <button
              className="primary"
              disabled={adminAuthLoading}
              onClick={() => void requestPasswordReset()}
              type="button"
            >
              <Send /> {adminAuthLoading ? "Sending link…" : "Send reset link"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => showAdminAuthView("reset")}
            >
              <KeyRound /> I have a recovery link
            </button>
          </>
        )}

        {adminAuthView === "reset" && (
          <>
            <div className="auth-heading">
              <KeyRound />
              <div>
                <p className="eyebrow">Reset password</p>
                <h3>Create new credentials</h3>
              </div>
            </div>
            <label>
              New password
              <div className="input-with-icon">
                <KeyRound />
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
            </label>
            <label>
              Confirm password
              <div className="input-with-icon">
                <KeyRound />
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </label>
            <button
              className="primary"
              disabled={adminAuthLoading}
              onClick={() => void resetAdminPassword()}
              type="button"
            >
              <ShieldCheck />{" "}
              {adminAuthLoading ? "Updating password…" : "Update password"}
            </button>
          </>
        )}

        {adminAuthMessage && (
          <div className="auth-message">{adminAuthMessage}</div>
        )}
      </section>
    </section>
  );
}
