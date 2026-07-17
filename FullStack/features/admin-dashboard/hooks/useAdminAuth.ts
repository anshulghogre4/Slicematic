"use client";
/**
 * useAdminAuth — all admin authentication state and handlers.
 * Extracted from SliceMaticStage3 / admin-dashboard page.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useStore } from "../../../lib/store";

const demoAdminEmail =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "admin@slicematic.in";
const demoAdminPassword =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "slicematic-demo";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export type AdminAuthView = "login" | "forgot" | "reset";

export type UseAdminAuthReturn = {
  // state
  adminLoggedIn: boolean;
  adminEmail: string;
  adminPassword: string;
  adminAuthView: AdminAuthView;
  adminAuthMessage: string;
  adminAuthLoading: boolean;
  adminAccessToken: string;
  adminSessionEmail: string;
  demoSessionPassword: string;
  resetPassword: string;
  resetConfirm: string;
  // setters for controlled inputs
  setAdminEmail: (v: string) => void;
  setAdminPassword: (v: string) => void;
  setResetPassword: (v: string) => void;
  setResetConfirm: (v: string) => void;
  // actions
  showAdminAuthView: (view: AdminAuthView) => void;
  adminAuthHeader: () => Record<string, string> | undefined;
  adminLogin: () => Promise<void>;
  adminLogout: (onUnauthorize?: () => void) => Promise<void>;
  requestPasswordReset: () => Promise<void>;
  resetAdminPassword: (
    onSuccess?: (token: string, email: string) => void
  ) => Promise<void>;
};

export function useAdminAuth(
  /** Called after a successful login so the parent can trigger summary/ops fetch */
  onLoginSuccess?: (token: string) => void,
  /** Called after logout to reset dependent state */
  onLogoutSuccess?: () => void
): UseAdminAuthReturn {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState(demoAdminEmail);
  const [adminPassword, setAdminPassword] = useState(demoAdminPassword);
  const [adminAuthView, setAdminAuthView] = useState<AdminAuthView>("login");
  const [adminAuthMessage, setAdminAuthMessage] = useState("");
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [adminSessionEmail, setAdminSessionEmail] = useState("");
  const [demoSessionPassword, setDemoSessionPassword] = useState(demoAdminPassword);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const showAdminAuthView = useCallback((view: AdminAuthView) => {
    setAdminAuthView(view);
    setAdminAuthMessage("");
  }, []);

  // ── Session restore on mount ────────────────────────────────────────────
  // Supabase session is checked FIRST so the actual login email (e.g. demo@slicematic.in)
  // is always shown — not the stale demo fallback stored in sessionStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdmin = window.sessionStorage.getItem("slicematic_is_admin") === "true";
    if (!isAdmin) return;

    setAdminLoggedIn(true);
    window.sessionStorage.setItem("slicematic_is_admin", "true");

    const supabase = getSupabaseAuthClient();
    if (supabase) {
      // ① Try live Supabase session first — it has the real email
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token ?? "";
        const supabaseEmail = data.session?.user?.email ?? "";
        // Always prefer Supabase email over stale sessionStorage value
        const displayEmail = supabaseEmail
          || window.sessionStorage.getItem("slicematic_admin_email")
          || demoAdminEmail;
        setAdminSessionEmail(displayEmail);
        setAdminEmail(displayEmail);
        if (token) setAdminAccessToken(token);
        // Persist the real email back so next restore is accurate
        window.sessionStorage.setItem("slicematic_admin_email", displayEmail);
        onLoginSuccess?.(token);
      });
    } else {
      // ② Demo/no-Supabase mode — use sessionStorage email
      const storedEmail = window.sessionStorage.getItem("slicematic_admin_email") || demoAdminEmail;
      setAdminSessionEmail(storedEmail);
      setAdminEmail(storedEmail);
      onLoginSuccess?.("");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adminAuthHeader = useCallback((): Record<string, string> | undefined => {
    const token = adminAccessToken || (adminLoggedIn ? "demo-bypass" : "");
    return token ? { authorization: `Bearer ${token}` } : undefined;
  }, [adminAccessToken, adminLoggedIn]);

  function validateAdminEmail() {
    if (!emailPattern.test(adminEmail.trim())) {
      setAdminAuthMessage("Enter a valid admin email address.");
      return false;
    }
    return true;
  }

  function validateNewPassword() {
    if (resetPassword.length < 8) {
      setAdminAuthMessage("New password must be at least 8 characters.");
      return false;
    }
    if (resetPassword !== resetConfirm) {
      setAdminAuthMessage("Passwords do not match.");
      return false;
    }
    return true;
  }

  const adminLogin = useCallback(async () => {
    if (!validateAdminEmail()) return;
    if (adminPassword.length < 8) {
      setAdminAuthMessage("Password must be at least 8 characters.");
      return;
    }
    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    useStore.getState().resetSession();
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: adminEmail.trim(),
          password: adminPassword,
        });
        if (error) { setAdminAuthMessage(error.message); return; }
        const token = data.session?.access_token ?? "";
        const email = data.user?.email ?? adminEmail.trim();
        setAdminAccessToken(token);
        setAdminSessionEmail(email);
        setAdminLoggedIn(true);
        setAdminAuthView("login");
        setAdminAuthMessage("");
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("slicematic_is_admin", "true");
          window.sessionStorage.setItem("slicematic_admin_email", email);
        }
        onLoginSuccess?.(token);
        return;
      }
      // Demo fallback
      if (adminEmail.trim() === demoAdminEmail && adminPassword === demoSessionPassword) {
        setAdminLoggedIn(true);
        setAdminSessionEmail(demoAdminEmail);
        setAdminAccessToken("");
        setAdminAuthView("login");
        setAdminAuthMessage("");
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("slicematic_is_admin", "true");
          window.sessionStorage.setItem("slicematic_admin_email", demoAdminEmail);
        }
        onLoginSuccess?.("");
      } else {
        setAdminAuthMessage("Use the demo admin credentials or configure Supabase Auth.");
      }
    } finally {
      setAdminAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail, adminPassword, demoSessionPassword, onLoginSuccess]);

  const adminLogout = useCallback(async (onUnauthorize?: () => void) => {
    setAdminAuthLoading(true);
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) await supabase.auth.signOut();
    } finally {
      useStore.getState().resetSession();
      if (typeof window !== "undefined") {
        // ── Clear every session key — admin AND customer ──────────────────
        localStorage.removeItem("cf_pending");
        // Admin keys
        window.sessionStorage.removeItem("slicematic_is_admin");
        window.sessionStorage.removeItem("slicematic_admin_email");
        window.sessionStorage.removeItem("slicematic_admin_view_customer");
        // Customer keys — these kept the page showing the customer UI after admin logout
        window.sessionStorage.removeItem("slicematic_customer_logged_in");
        window.sessionStorage.removeItem("slicematic_customer_email");
        window.sessionStorage.removeItem("slicematic_customer");
        window.sessionStorage.removeItem("slicematic_customer_id");
        window.sessionStorage.removeItem("slicematic_workspace");
      }
      setAdminLoggedIn(false);
      setAdminAccessToken("");
      setAdminSessionEmail("");
      setAdminAuthView("login");
      setAdminAuthMessage("");
      setAdminAuthLoading(false);
      // onUnauthorize carries the router.replace("/") from the calling page
      onUnauthorize?.();
      onLogoutSuccess?.();
    }
  }, [onLogoutSuccess]);

  const requestPasswordReset = useCallback(async () => {
    if (!validateAdminEmail()) return;
    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const redirectTo = `${window.location.origin}?reset=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(
          adminEmail.trim(), { redirectTo }
        );
        if (error) { setAdminAuthMessage(error.message); return; }
        setAdminAuthMessage("Password reset link sent. Open the email link, then set the new password here.");
        return;
      }
      setAdminAuthView("reset");
      setAdminAuthMessage("Demo mode: set a new local admin password for this browser session.");
    } finally {
      setAdminAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail]);

  const resetAdminPassword = useCallback(async (
    onSuccess?: (token: string, email: string) => void
  ) => {
    if (!validateNewPassword()) return;
    setAdminAuthLoading(true);
    setAdminAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setAdminAuthMessage("Open the recovery link from your email before setting a new Supabase password.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: resetPassword });
        if (error) { setAdminAuthMessage(error.message); return; }
        const token = sessionData.session.access_token ?? "";
        const email = sessionData.session.user.email ?? adminEmail.trim();
        setAdminAccessToken(token);
        setAdminSessionEmail(email);
        setAdminLoggedIn(true);
        setResetPassword("");
        setResetConfirm("");
        setAdminAuthView("login");
        onSuccess?.(token, email);
        return;
      }
      // Demo mode
      setDemoSessionPassword(resetPassword);
      setAdminPassword(resetPassword);
      setAdminLoggedIn(false);
      setResetPassword("");
      setResetConfirm("");
      setAdminAuthView("login");
      setAdminAuthMessage("Demo password updated for this session. Sign in with the new password.");
    } finally {
      setAdminAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPassword, resetConfirm, adminEmail]);

  return {
    adminLoggedIn,
    adminEmail,
    adminPassword,
    adminAuthView,
    adminAuthMessage,
    adminAuthLoading,
    adminAccessToken,
    adminSessionEmail,
    demoSessionPassword,
    resetPassword,
    resetConfirm,
    setAdminEmail,
    setAdminPassword,
    setResetPassword,
    setResetConfirm,
    showAdminAuthView,
    adminAuthHeader,
    adminLogin,
    adminLogout,
    requestPasswordReset,
    resetAdminPassword,
  };
}
