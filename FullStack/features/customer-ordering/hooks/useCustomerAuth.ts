"use client";
/**
 * useCustomerAuth — all customer authentication state and handlers.
 * Extracted from SliceMaticStage3 / admin-dashboard page.
 */

import { useCallback, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useStore } from "../../../lib/store";
import type { CustomerDetails } from "../../../lib/types";

const demoCustomerEmail = "customer@slicematic.in";
const demoCustomerPassword = "slice-customer";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export type CustomerAuthView = "login" | "forgot" | "reset";
export type CustomerAuthMethod = "password" | "otp";
export type CustomerOtpChannel = "email" | "sms";

export type UseCustomerAuthReturn = {
  customerLoggedIn: boolean;
  customerAuthView: CustomerAuthView;
  customerAuthEmail: string;
  customerAuthPassword: string;
  customerAuthMethod: CustomerAuthMethod;
  customerOtpChannel: CustomerOtpChannel;
  customerOtpPhone: string;
  customerOtpCode: string;
  customerOtpSent: boolean;
  customerSessionEmail: string;
  customerAuthMessage: string;
  customerAuthLoading: boolean;
  demoCustomerSessionPassword: string;
  customerResetPassword: string;
  customerResetConfirm: string;
  // setters
  setCustomerLoggedIn: (v: boolean) => void;
  setCustomerAuthView: (v: CustomerAuthView) => void;
  setCustomerAuthEmail: (v: string) => void;
  setCustomerAuthPassword: (v: string) => void;
  setCustomerAuthMethod: (v: CustomerAuthMethod) => void;
  setCustomerOtpChannel: (v: CustomerOtpChannel) => void;
  setCustomerOtpPhone: (v: string) => void;
  setCustomerOtpCode: (v: string) => void;
  setCustomerOtpSent: (v: boolean) => void;
  setCustomerSessionEmail: (v: string) => void;
  setCustomerResetPassword: (v: string) => void;
  setCustomerResetConfirm: (v: string) => void;
  // actions
  showCustomerAuthView: (view: CustomerAuthView) => void;
  customerLogin: () => Promise<void>;
  customerLogout: (onUnauthorize?: () => void) => Promise<void>;
  sendCustomerOtp: () => Promise<void>;
  verifyCustomerOtp: () => Promise<void>;
  requestCustomerPasswordReset: () => Promise<void>;
  resetCustomerPassword: () => Promise<void>;
};

export function useCustomerAuth(
  onLoginSuccess?: (email: string) => void,
  onLogoutSuccess?: () => void
): UseCustomerAuthReturn {
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [customerAuthView, setCustomerAuthView] = useState<CustomerAuthView>("login");
  const [customerAuthEmail, setCustomerAuthEmail] = useState(demoCustomerEmail);
  const [customerAuthPassword, setCustomerAuthPassword] = useState(demoCustomerPassword);
  const [customerAuthMethod, setCustomerAuthMethod] = useState<CustomerAuthMethod>("password");
  const [customerOtpChannel, setCustomerOtpChannel] = useState<CustomerOtpChannel>("email");
  const [customerOtpPhone, setCustomerOtpPhone] = useState("");
  const [customerOtpCode, setCustomerOtpCode] = useState("");
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [customerSessionEmail, setCustomerSessionEmail] = useState("");
  const [customerAuthMessage, setCustomerAuthMessage] = useState("");
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false);
  const [demoCustomerSessionPassword, setDemoCustomerSessionPassword] = useState(demoCustomerPassword);
  const [customerResetPassword, setCustomerResetPassword] = useState("");
  const [customerResetConfirm, setCustomerResetConfirm] = useState("");

  const showCustomerAuthView = useCallback((view: CustomerAuthView) => {
    setCustomerAuthView(view);
    setCustomerAuthMessage("");
  }, []);

  function validateCustomerAuthEmail() {
    if (!emailPattern.test(customerAuthEmail.trim())) {
      setCustomerAuthMessage("Enter a valid email address.");
      return false;
    }
    return true;
  }

  function validateCustomerNewPassword() {
    if (customerResetPassword.length < 8) {
      setCustomerAuthMessage("New password must be at least 8 characters.");
      return false;
    }
    if (customerResetPassword !== customerResetConfirm) {
      setCustomerAuthMessage("Passwords do not match.");
      return false;
    }
    return true;
  }

  function normalizeOtpPhone() {
    const raw = customerOtpPhone.trim();
    const digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(raw)) return raw;
    if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
    if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
    setCustomerAuthMessage("Enter a valid mobile number for OTP.");
    return null;
  }

  const customerLogin = useCallback(async () => {
    if (!validateCustomerAuthEmail()) return;
    if (customerAuthPassword.length < 8) {
      setCustomerAuthMessage("Password must be at least 8 characters.");
      return;
    }
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    useStore.getState().resetSession();
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: customerAuthEmail.trim(),
          password: customerAuthPassword,
        });
        if (error) { setCustomerAuthMessage(error.message); return; }
        const email = data.user?.email ?? customerAuthEmail.trim();
        try {
          const { data: customerRow } = await supabase
            .schema("slicematic")
            .from("customer")
            .select("customer_id, first_name, last_name, mobile_number")
            .eq("email", email)
            .maybeSingle();
          if (customerRow?.customer_id) {
            sessionStorage.setItem("slicematic_customer_id", customerRow.customer_id);
            sessionStorage.setItem("slicematic_customer", JSON.stringify({
              name: `${customerRow.first_name ?? ""} ${customerRow.last_name ?? ""}`.trim(),
              phone: customerRow.mobile_number ?? "",
              address: "New Ashok Nagar, Delhi NCR",
              deliveryZone: "2-4",
              note: "",
            }));
          }
          sessionStorage.setItem("slicematic_customer_email", email);
          sessionStorage.setItem("slicematic_customer_logged_in", "true");
        } catch { /* ignore lookup errors */ }
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(email);
        setCustomerAuthView("login");
        setCustomerAuthMessage("");
        onLoginSuccess?.(email);
        return;
      }
      // Demo fallback
      if (
        customerAuthEmail.trim() === demoCustomerEmail &&
        customerAuthPassword === demoCustomerSessionPassword
      ) {
        sessionStorage.setItem("slicematic_customer_email", demoCustomerEmail);
        sessionStorage.setItem("slicematic_customer_logged_in", "true");
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(demoCustomerEmail);
        setCustomerAuthView("login");
        setCustomerAuthMessage("");
        onLoginSuccess?.(demoCustomerEmail);
      } else {
        setCustomerAuthMessage("Use the demo customer credentials or configure Supabase Auth.");
      }
    } finally {
      setCustomerAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAuthEmail, customerAuthPassword, demoCustomerSessionPassword, onLoginSuccess]);

  const customerLogout = useCallback(async (onUnauthorize?: () => void) => {
    setCustomerAuthLoading(true);
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) await supabase.auth.signOut();
    } finally {
      useStore.getState().resetSession();
      if (typeof window !== "undefined") {
        // Remove the key entirely (not set to "false") so app/page.tsx sees null
        // → isAuthorized=false → EntryPortal renders as the single login screen
        sessionStorage.removeItem("slicematic_customer_logged_in");
        sessionStorage.removeItem("slicematic_customer");
        sessionStorage.removeItem("slicematic_customer_email");
        sessionStorage.removeItem("slicematic_customer_id");
        sessionStorage.removeItem("slicematic_workspace");
        localStorage.removeItem("cf_pending");
      }
      setCustomerLoggedIn(false);
      setCustomerSessionEmail("");
      setCustomerAuthView("login");
      setCustomerAuthMessage("");
      setCustomerAuthLoading(false);
      // onUnauthorize() → setIsAuthorized(false) in app/page.tsx → EntryPortal shown
      onUnauthorize?.();
      onLogoutSuccess?.();
    }
  }, [onLogoutSuccess]);

  const sendCustomerOtp = useCallback(async () => {
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setCustomerAuthMessage("OTP login needs Supabase Auth environment variables.");
        return;
      }
      if (customerOtpChannel === "email") {
        if (!validateCustomerAuthEmail()) return;
        const { error } = await supabase.auth.signInWithOtp({
          email: customerAuthEmail.trim(),
          options: { shouldCreateUser: false },
        });
        if (error) { setCustomerAuthMessage(error.message); return; }
        setCustomerOtpSent(true);
        setCustomerAuthMessage(`OTP sent to ${customerAuthEmail.trim()}.`);
        return;
      }
      const phone = normalizeOtpPhone();
      if (!phone) return;
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      if (error) { setCustomerAuthMessage(error.message); return; }
      setCustomerOtpSent(true);
      setCustomerAuthMessage(`OTP sent to ${phone}.`);
    } finally {
      setCustomerAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerOtpChannel, customerAuthEmail, customerOtpPhone]);

  const verifyCustomerOtp = useCallback(async () => {
    const token = customerOtpCode.trim();
    if (!/^\d{6}$/.test(token)) {
      setCustomerAuthMessage("Enter the 6-digit OTP.");
      return;
    }
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setCustomerAuthMessage("OTP login needs Supabase Auth environment variables.");
        return;
      }
      const result =
        customerOtpChannel === "email"
          ? await supabase.auth.verifyOtp({
              email: customerAuthEmail.trim(),
              token,
              type: "email",
            })
          : await (async () => {
              const phone = normalizeOtpPhone();
              if (!phone) return null;
              return supabase.auth.verifyOtp({ phone, token, type: "sms" });
            })();
      if (!result) return;
      if (result.error) { setCustomerAuthMessage(result.error.message); return; }
      const user = result.data.user;
      const sessionName = user?.email ?? user?.phone ?? customerAuthEmail.trim();
      setCustomerLoggedIn(true);
      setCustomerSessionEmail(sessionName);
      setCustomerOtpCode("");
      setCustomerOtpSent(false);
      setCustomerAuthMessage("");
      onLoginSuccess?.(sessionName);
    } finally {
      setCustomerAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerOtpCode, customerOtpChannel, customerAuthEmail, customerOtpPhone, onLoginSuccess]);

  const requestCustomerPasswordReset = useCallback(async () => {
    if (!validateCustomerAuthEmail()) return;
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const redirectTo = `${window.location.origin}?customerReset=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(
          customerAuthEmail.trim(), { redirectTo }
        );
        if (error) { setCustomerAuthMessage(error.message); return; }
        setCustomerAuthMessage("Password reset link sent. Open the email link, then set the new password here.");
        return;
      }
      setCustomerAuthView("reset");
      setCustomerAuthMessage("Demo mode: set a new local customer password for this browser session.");
    } finally {
      setCustomerAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAuthEmail]);

  const resetCustomerPassword = useCallback(async () => {
    if (!validateCustomerNewPassword()) return;
    setCustomerAuthLoading(true);
    setCustomerAuthMessage("");
    try {
      const supabase = getSupabaseAuthClient();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setCustomerAuthMessage("Open the recovery link from your email before setting a new password.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: customerResetPassword });
        if (error) { setCustomerAuthMessage(error.message); return; }
        const resetEmail = sessionData.session.user.email ?? customerAuthEmail.trim();
        sessionStorage.setItem("slicematic_customer_email", resetEmail);
        sessionStorage.setItem("slicematic_customer_logged_in", "true");
        setCustomerLoggedIn(true);
        setCustomerSessionEmail(resetEmail);
        setCustomerResetPassword("");
        setCustomerResetConfirm("");
        setCustomerAuthView("login");
        onLoginSuccess?.(resetEmail);
        return;
      }
      // Demo mode
      setDemoCustomerSessionPassword(customerResetPassword);
      setCustomerAuthPassword(customerResetPassword);
      setCustomerResetPassword("");
      setCustomerResetConfirm("");
      setCustomerLoggedIn(false);
      setCustomerAuthView("login");
      setCustomerAuthMessage("Demo customer password updated. Sign in with the new password.");
    } finally {
      setCustomerAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerResetPassword, customerResetConfirm, customerAuthEmail, onLoginSuccess]);

  return {
    customerLoggedIn, customerAuthView, customerAuthEmail, customerAuthPassword,
    customerAuthMethod, customerOtpChannel, customerOtpPhone, customerOtpCode,
    customerOtpSent, customerSessionEmail, customerAuthMessage, customerAuthLoading,
    demoCustomerSessionPassword, customerResetPassword, customerResetConfirm,
    setCustomerLoggedIn, setCustomerAuthView, setCustomerAuthEmail,
    setCustomerAuthPassword, setCustomerAuthMethod, setCustomerOtpChannel,
    setCustomerOtpPhone, setCustomerOtpCode, setCustomerOtpSent,
    setCustomerSessionEmail, setCustomerResetPassword, setCustomerResetConfirm,
    showCustomerAuthView, customerLogin, customerLogout,
    sendCustomerOtp, verifyCustomerOtp,
    requestCustomerPasswordReset, resetCustomerPassword,
  };
}
