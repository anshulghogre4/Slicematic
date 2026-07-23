"use client";

import React, { useState, useEffect } from "react";
import { Pizza, ArrowRight, Lock, UserCheck, ShieldAlert, Mail, Smile, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { useStore } from "../../lib/store";
import { Recommendation } from "../../lib/types";
import "./EntryPortal.css";

interface EntryPortalProps {
  onComplete: () => void;
  onRecommendationReady?: (data: { recommendations: Recommendation[], primary: Recommendation }) => void;
}

interface LocalRegisteredCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  age: number;
}

const SEED_CUSTOMERS = [
  {
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "aarav@slicematic.in",
    address: "Flat 1204, Lotus Heights, near Metro Gate 2, New Ashok Nagar",
    city: "Delhi NCR",
    age: 24,
    deliveryZone: "2-4" as const,
    note: "Call once before dispatch."
  }
];

export default function EntryPortal({ onComplete, onRecommendationReady }: EntryPortalProps) {
  const [step, setStep] = useState<"identity" | "otp" | "register">("identity");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallbackDemo, setFallbackDemo] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regCity, setRegCity] = useState("Delhi NCR");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");

  const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isMobile = (val: string) => /^\d{10}$/.test(val);
  const isDemoUser = (val: string) => val === "demo@slicematic.in" || val === "9999999999";

  async function prefetchRecommendation(email: string, cb?: (data: { recommendations: Recommendation[], primary: Recommendation }) => void) {
    try {
      useStore.getState().setIsFetchingRecommendation(true);
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "", email })
      });
      if (res.ok) {
        const data = await res.json();
        cb?.(data);
      }
    } catch { /* silent */ }
    finally {
      useStore.getState().setIsFetchingRecommendation(false);
    }
  }

  /**
   * Resolves the bearer token to send to the protected /api/customer/* routes:
   * "demo-bypass" for the demo identity (or the rate-limit fallback-demo path,
   * which never has a real Supabase session), otherwise the live Supabase
   * access token from the just-verified OTP session.
   */
  const getAuthToken = async (identifierForCheck: string): Promise<string> => {
    if (isDemoUser(identifierForCheck.trim().toLowerCase()) || fallbackDemo) return "demo-bypass";
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return "";
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  };

  const withAuthHeader = (token: string, extra?: Record<string, string>) =>
    token ? { ...extra, Authorization: `Bearer ${token}` } : extra;

  useEffect(() => {
    if (step === "register") {
      if (isEmail(identifier)) setRegEmail(identifier.trim());
      else if (isMobile(identifier)) setRegMobile(identifier.trim());
    }
  }, [step, identifier]);

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmedVal = identifier.trim().toLowerCase();

    if (!trimmedVal) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    if (!isEmail(trimmedVal)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      if (!isDemoUser(trimmedVal)) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { error } = await supabase.auth.signInWithOtp({ email: trimmedVal });
          
          if (error) {
            console.error("OTP Send Error:", error);
            if (error.message.toLowerCase().includes("rate limit")) {
              setErrorMsg("OTP rate limit reached. Using demo mode — enter code 9812 to continue.");
              setFallbackDemo(true);
            } else {
              setErrorMsg("Failed to send OTP: " + error.message);
              setLoading(false);
              return;
            }
          }
        }
      }
      setStep("otp");
      void prefetchRecommendation(trimmedVal, onRecommendationReady);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("An error occurred while sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmedVal = identifier.trim().toLowerCase();

    if (!otp) {
      setErrorMsg("Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      let isVerified = false;

      if (isDemoUser(trimmedVal) || fallbackDemo) {
        if (otp.replace(/\s/g, "") !== "1111" && otp.replace(/\s/g, "") !== "9812") {
          setErrorMsg("Incorrect OTP code. For demo purposes, use code 1111.");
          setLoading(false);
          return;
        }
        isVerified = true;
      } else {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { error } = await supabase.auth.verifyOtp({ email: trimmedVal, token: otp, type: 'email' });

          if (error) {
            setErrorMsg("Invalid OTP: " + error.message);
            setLoading(false);
            return;
          }
          isVerified = true;
        }
      }

      if (isVerified) {
        await checkCustomerInDb(trimmedVal);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error verifying OTP.");
    } finally {
      setLoading(false);
    }
  };

  const checkCustomerInDb = async (verifiedIdentifier: string) => {
    let foundCustomer: any = null;
    const normalizedIdentifier = isEmail(verifiedIdentifier)
      ? verifiedIdentifier.trim().toLowerCase()
      : verifiedIdentifier.trim();

    try {
      const authToken = await getAuthToken(verifiedIdentifier);
      const profileRes = await fetch(`/api/customer/profile?identifier=${encodeURIComponent(normalizedIdentifier)}`, {
        headers: withAuthHeader(authToken)
      });
      const profileData = await profileRes.json();
      if (profileData.ok && profileData.profile) {
        foundCustomer = {
          name: profileData.profile.name,
          phone: profileData.profile.phone,
          email: profileData.profile.email || (isEmail(normalizedIdentifier) ? normalizedIdentifier : ""),
          address: "",
          city: profileData.profile.city || "Delhi NCR",
          age: 25,
          customerId: profileData.profile.customerId || ""
        };
      }
    } catch {
      /* fall through to local/seed lookup */
    }

    if (!foundCustomer) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const queryField = isEmail(normalizedIdentifier) ? "email" : "mobile_number";
        const { data, error } = await supabase
          .schema("slicematic")
          .from("customer")
          .select("*")
          .eq(queryField, normalizedIdentifier)
          .maybeSingle();

        if (!error && data) {
          foundCustomer = {
            name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
            phone: data.mobile_number || "",
            email: data.email || "",
            address: "",
            city: data.city || "Delhi NCR",
            age: 25,
            customerId: data.customer_id || ""
          };
        }
      }
    }

    if (!foundCustomer) {
      const localUsers = localStorage.getItem("slicematic_mock_customers");
      if (localUsers) {
        const parsedUsers: LocalRegisteredCustomer[] = JSON.parse(localUsers);
        const localMatch = parsedUsers.find(
          (c) => c.email.toLowerCase() === verifiedIdentifier || c.phone === verifiedIdentifier
        );
        if (localMatch) foundCustomer = localMatch;
      }
    }

    if (!foundCustomer) {
      const seedMatch = SEED_CUSTOMERS.find(
        (c) => c.email.toLowerCase() === verifiedIdentifier || c.phone === verifiedIdentifier
      );
      if (seedMatch) foundCustomer = seedMatch;
    }

    if (foundCustomer) {
      saveSessionAndProceed(foundCustomer);
    } else {
      setStep("register");
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const nameVal = regName.trim();
    const mobileVal = regMobile.trim();
    const emailVal = regEmail.trim();
    const addressVal = regAddress.trim();
    const cityVal = regCity.trim();

    // Name: 2–40 chars, letters/spaces/hyphens/dots/apostrophes
    if (!nameVal) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!/^[A-Za-z][A-Za-z ]{1,39}$/.test(nameVal)) {
      setErrorMsg("Name must be 2–40 characters and contain only letters and spaces.");
      return;
    }

    if (!mobileVal) {
      setErrorMsg("Mobile number is required.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobileVal)) {
      setErrorMsg("Mobile number must be 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    if (!emailVal) {
      setErrorMsg("Email address is required.");
      return;
    }
    if (!isEmail(emailVal)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!cityVal) {
      setErrorMsg("City is required.");
      return;
    }

    if (!addressVal) {
      setErrorMsg("Delivery address is required.");
      return;
    }

    setLoading(true);
    let newCustomer: {
      name: string;
      phone: string;
      email: string;
      address: string;
      city: string;
      age: number;
      customerId?: string;
    } = {
      name: nameVal,
      phone: mobileVal,
      email: emailVal.toLowerCase(),
      address: addressVal,
      city: cityVal,
      age: Number(regAge) || 25
    };

    try {
      const isDemo = isDemoUser(identifier.trim().toLowerCase());
      if (!isDemo && !fallbackDemo) {
        const authToken = await getAuthToken(identifier.trim().toLowerCase());
        const registerRes = await fetch("/api/customer/register", {
          method: "POST",
          headers: withAuthHeader(authToken, { "content-type": "application/json" }),
          body: JSON.stringify({
            name: newCustomer.name,
            phone: newCustomer.phone,
            email: newCustomer.email,
            city: newCustomer.city,
            address: newCustomer.address
          })
        });
        const registerData = await registerRes.json();
        if (registerData.ok && registerData.customer_id) {
          newCustomer = { ...newCustomer, customerId: registerData.customer_id };
        } else if (!registerRes.ok) {
          throw new Error(registerData.error || "Could not register customer account.");
        }
      }

      const localUsers = localStorage.getItem("slicematic_mock_customers");
      let usersList: LocalRegisteredCustomer[] = localUsers ? JSON.parse(localUsers) : [];
      usersList.push(newCustomer);
      localStorage.setItem("slicematic_mock_customers", JSON.stringify(usersList));

      saveSessionAndProceed(newCustomer);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to register: " + (err.message || "Please check input data."));
    } finally {
      setLoading(false);
    }
  };

  const saveSessionAndProceed = async (customerObj: any) => {
    if (typeof window !== "undefined") {
      const preFetchedRecs = useStore.getState().recommendations;
      const preFetchedPrimary = useStore.getState().recommendation;
      const isFetching = useStore.getState().isFetchingRecommendation;
      
      // Reset any prior identity's cart/customer draft before writing this login's session data.
      useStore.getState().resetSession();
      
      if (preFetchedRecs.length > 0) {
        useStore.getState().setRecommendations(preFetchedRecs);
        useStore.getState().setRecommendation(preFetchedPrimary);
      }
      if (isFetching) {
        useStore.getState().setIsFetchingRecommendation(true);
      }

      const displayAddress = customerObj.city 
        ? `${customerObj.address || ""}, ${customerObj.city}`.trim().replace(/^,\s*/, "")
        : customerObj.address || "";

      const loginEmail = (customerObj.email || identifier.trim().toLowerCase() || "").trim().toLowerCase();
      const isDemo = isDemoUser(loginEmail) || fallbackDemo;
      const authToken = await getAuthToken(loginEmail);
      if (!isDemo && loginEmail && customerObj.phone && customerObj.name) {
        try {
          const registerRes = await fetch("/api/customer/register", {
            method: "POST",
            headers: withAuthHeader(authToken, { "content-type": "application/json" }),
            body: JSON.stringify({
              name: customerObj.name,
              phone: customerObj.phone,
              email: loginEmail,
              city: customerObj.city || "Delhi NCR",
              address: displayAddress
            })
          });
          const registerData = await registerRes.json();
          if (registerData.ok && registerData.customer_id) {
            customerObj = { ...customerObj, email: loginEmail, customerId: registerData.customer_id };
          }
        } catch {
          /* proceed with session; Account tab will retry sync */
        }
      }

      sessionStorage.setItem(
        "slicematic_customer",
        JSON.stringify({
          name: customerObj.name || "",
          phone: customerObj.phone || "",
          address: displayAddress,
          deliveryZone: "2-4",
          note: customerObj.note || ""
        })
      );
      sessionStorage.setItem("slicematic_customer_email", loginEmail || customerObj.email || "");
      sessionStorage.setItem("slicematic_customer_id", customerObj.customerId || "");
      sessionStorage.setItem("slicematic_customer_logged_in", "true");

      if (!customerObj.customerId && customerObj.email) {
        try {
          const res = await fetch(`/api/customer/profile?identifier=${encodeURIComponent(customerObj.email)}`, {
            headers: withAuthHeader(authToken)
          });
          const data = await res.json();
          if (data.ok && data.profile?.customerId) {
            sessionStorage.setItem("slicematic_customer_id", data.profile.customerId);
          }
        } catch {
          /* ignore */
        }
      }

      // Admin check
      let isAdmin = false;
      const email = (customerObj.email || "").toLowerCase();
      const demoAdminEmail = (process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "admin@slicematic.in").toLowerCase();
      if (email === "demo@slicematic.in" || email === demoAdminEmail) {
        isAdmin = true;
      } else {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: roleData } = await supabase
              .schema("slicematic")
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .maybeSingle();
            if (roleData?.role === "admin") isAdmin = true;
          }
        }
      }

      if (isAdmin) sessionStorage.setItem("slicematic_is_admin", "true");
      else sessionStorage.removeItem("slicematic_is_admin");
    }
    onComplete();
  };

  const handleGuestLogin = () => {
    if (typeof window !== "undefined") {
      useStore.getState().resetSession();
      sessionStorage.removeItem("slicematic_customer");
      sessionStorage.removeItem("slicematic_customer_email");
      sessionStorage.removeItem("slicematic_customer_id");
      sessionStorage.setItem("slicematic_customer_logged_in", "false");
    }
    void prefetchRecommendation("", onRecommendationReady);
    onComplete();
  };

  const isDemo = isDemoUser(identifier.trim().toLowerCase());

  return (
    <div className="portal-container">
      <div className="portal-glass">
        <div className="portal-header">
          <div className="portal-logo" aria-hidden="true">
            <Pizza />
          </div>
          <h1 className="portal-brand">SliceMatic</h1>
          <p>Order pizza in Delhi NCR. Sign in with email for a one-time code.</p>
        </div>

        {step === "identity" && (
          <form onSubmit={handleIdentitySubmit} className="portal-form">
            <div className="input-group">
              <label htmlFor="identifier">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail aria-hidden="true" />
                <input
                  type="email"
                  id="identifier"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="e.g. name@email.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                  aria-describedby={errorMsg ? "portal-error" : undefined}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="portal-error-card" id="portal-error" role="alert">
                <ShieldAlert aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              {loading ? "Sending code..." : "Get code"} <ArrowRight aria-hidden="true" />
            </button>

            <div className="portal-divider">
              <span>OR</span>
            </div>

            <button type="button" onClick={handleGuestLogin} className="portal-secondary-btn" disabled={loading}>
              <Smile aria-hidden="true" /> Continue as guest
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="portal-form">
            <button type="button" className="back-btn" onClick={() => setStep("identity")} disabled={loading}>
              <ArrowLeft aria-hidden="true" /> Back
            </button>

            <div className="otp-heading">
              <Lock aria-hidden="true" />
              <h2>Enter your code</h2>
              <p>We sent a one-time code to <strong>{identifier}</strong>.</p>
            </div>

            <div className="input-group">
              <label htmlFor="otp">One-time code</label>
              <input
                type="text"
                id="otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder={(isDemo || fallbackDemo) ? "1111" : "Enter code"}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className="otp-input"
                aria-invalid={Boolean(errorMsg)}
                aria-describedby={errorMsg ? "portal-error" : undefined}
              />
            </div>

            {errorMsg && (
              <div className="portal-error-card" id="portal-error" role="alert">
                <ShieldAlert aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify and continue"} <UserCheck aria-hidden="true" />
            </button>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegistrationSubmit} className="portal-form scroll-form">
            <button type="button" className="back-btn" onClick={() => setStep("identity")} disabled={loading}>
              <ArrowLeft aria-hidden="true" /> Back
            </button>

            <div className="registration-heading">
              <h2>Finish your profile</h2>
              <p>We need a name, phone, and delivery address to place your first order.</p>
            </div>

            <div className="reg-grid">
              <div className="input-group">
                <label htmlFor="regName">Full Name</label>
                <input type="text" id="regName" name="name" autoComplete="name" placeholder="Rahul Sharma" value={regName} onChange={(e) => setRegName(e.target.value)} disabled={loading} />
              </div>

              <div className="input-group">
                <label htmlFor="regAge">Age</label>
                <input type="number" id="regAge" name="age" inputMode="numeric" placeholder="25" value={regAge} onChange={(e) => setRegAge(e.target.value)} disabled={loading} />
              </div>

              <div className="input-group">
                <label htmlFor="regMobile">Mobile Number</label>
                <input type="tel" id="regMobile" name="tel" autoComplete="tel" inputMode="numeric" placeholder="9876543210" value={regMobile} onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))} disabled={loading} />
              </div>

              <div className="input-group">
                <label htmlFor="regEmail">Email Address</label>
                <input type="email" id="regEmail" name="email" autoComplete="email" placeholder="rahul@slicematic.in" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} />
              </div>

              <div className="input-group wide-field">
                <label htmlFor="regCity">City</label>
                <input type="text" id="regCity" name="city" autoComplete="address-level2" placeholder="Delhi NCR" value={regCity} onChange={(e) => setRegCity(e.target.value)} disabled={loading} />
              </div>

              <div className="input-group wide-field">
                <label htmlFor="regAddress">Delivery Address</label>
                <textarea id="regAddress" name="street-address" autoComplete="street-address" placeholder="Flat No, Wing, Landmark, Street Area" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} disabled={loading} rows={2} />
              </div>
            </div>

            {errorMsg && (
              <div className="portal-error-card" id="portal-error" role="alert">
                <ShieldAlert aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save and order"} <UserCheck aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
