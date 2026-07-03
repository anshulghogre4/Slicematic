"use client";

import React, { useState, useEffect } from "react";
import { Pizza, ArrowRight, Lock, UserCheck, ShieldAlert, Smartphone, Mail, Sparkles, Smile, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { randomUUID } from "crypto"; // In browser we can fall back to crypto.randomUUID or simple random generators
import "./EntryPortal.css";

interface EntryPortalProps {
  onComplete: () => void;
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
  },
  {
    name: "Nisha Verma",
    phone: "9876500007",
    email: "nisha@slicematic.in",
    address: "15, Block B, Green Park",
    city: "Delhi NCR",
    age: 35,
    deliveryZone: "0-2" as const,
    note: "Leave with guard."
  },
  {
    name: "Kabir Mehta",
    phone: "9876500002",
    email: "kabir@slicematic.in",
    address: "B-42, Sector 62",
    city: "Noida",
    age: 29,
    deliveryZone: "4-6" as const,
    note: "Behind the shopping complex."
  }
];

export default function EntryPortal({ onComplete }: EntryPortalProps) {
  const [step, setStep] = useState<"identity" | "otp" | "register">("identity");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regCity, setRegCity] = useState("Delhi NCR");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");

  // Target customer found during login
  const [matchedCustomer, setMatchedCustomer] = useState<any>(null);

  // Validate if input looks like email or mobile
  const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isMobile = (val: string) => /^\d{10}$/.test(val);

  // Initial pre-fill setup when moving to registration
  useEffect(() => {
    if (step === "register") {
      if (isEmail(identifier)) {
        setRegEmail(identifier.trim());
      } else if (isMobile(identifier)) {
        setRegMobile(identifier.trim());
      }
    }
  }, [step, identifier]);

  // Handle Identity Submission (Phone/Email verification)
  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmedVal = identifier.trim();

    if (!trimmedVal) {
      setErrorMsg("Please enter your email address or 10-digit mobile number.");
      return;
    }

    if (!isEmail(trimmedVal) && !isMobile(trimmedVal)) {
      setErrorMsg("Please enter a valid email address or a 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      let foundCustomer: any = null;

      // 1. Check Supabase DB first (if configured)
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const queryField = isEmail(trimmedVal) ? "email" : "mobile_number";
        const { data, error } = await supabase
          .schema("slicematic")
          .from("customer")
          .select("*")
          .eq(queryField, trimmedVal)
          .maybeSingle();

        if (!error && data) {
          foundCustomer = {
            name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
            phone: data.mobile_number || "",
            email: data.email || "",
            address: "", // Will populate or fetch from orders later
            city: data.city || "Delhi NCR",
            age: 25 // default
          };
        }
      }

      // 2. Check localstorage registered customers (offline mock DB)
      if (!foundCustomer) {
        const localUsers = localStorage.getItem("slicematic_mock_customers");
        if (localUsers) {
          const parsedUsers: LocalRegisteredCustomer[] = JSON.parse(localUsers);
          const localMatch = parsedUsers.find(
            (c) => c.email.toLowerCase() === trimmedVal.toLowerCase() || c.phone === trimmedVal
          );
          if (localMatch) {
            foundCustomer = localMatch;
          }
        }
      }

      // 3. Check hardcoded seed customers
      if (!foundCustomer) {
        const seedMatch = SEED_CUSTOMERS.find(
          (c) => c.email.toLowerCase() === trimmedVal.toLowerCase() || c.phone === trimmedVal
        );
        if (seedMatch) {
          foundCustomer = seedMatch;
        }
      }

      if (foundCustomer) {
        // Customer exists, proceed to OTP step
        setMatchedCustomer(foundCustomer);
        setStep("otp");
      } else {
        // Customer does not exist, proceed to registration
        setMatchedCustomer(null);
        setStep("register");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred during account lookup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submission (always 1111)
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (otp !== "1111") {
      setErrorMsg("Incorrect OTP code. For demo purposes, use code 1111.");
      return;
    }

    // Success login
    saveSessionAndProceed(matchedCustomer);
  };

  // Handle Registration submission
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!regName.trim()) {
      setErrorMsg("Full Name is required.");
      return;
    }
    if (!regAge.trim() || isNaN(Number(regAge)) || Number(regAge) <= 0) {
      setErrorMsg("Please enter a valid age.");
      return;
    }
    if (!regAddress.trim()) {
      setErrorMsg("Delivery address is required.");
      return;
    }
    if (!regCity.trim()) {
      setErrorMsg("City is required.");
      return;
    }
    if (!isMobile(regMobile)) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!isEmail(regEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const newCustomer = {
      name: regName.trim(),
      phone: regMobile.trim(),
      email: regEmail.trim().toLowerCase(),
      address: regAddress.trim(),
      city: regCity.trim(),
      age: Number(regAge)
    };

    try {
      // 1. Try to register in Supabase
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const [firstName, ...rest] = newCustomer.name.split(/\s+/);
        const lastName = rest.join(" ");
        const calculatedBirthYear = new Date().getFullYear() - newCustomer.age;
        const mockBirthDate = `${calculatedBirthYear}-01-01`;

        await supabase.schema("slicematic").from("customer").insert({
          customer_id: typeof window !== "undefined" && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2),
          first_name: firstName,
          last_name: lastName,
          mobile_number: newCustomer.phone,
          email: newCustomer.email,
          city: newCustomer.city,
          birth_date: mockBirthDate,
          registration_date: new Date().toISOString()
        });
      }

      // 2. Save to localStorage to persist in mock DB
      const localUsers = localStorage.getItem("slicematic_mock_customers");
      let usersList: LocalRegisteredCustomer[] = [];
      if (localUsers) {
        try {
          usersList = JSON.parse(localUsers);
        } catch {
          usersList = [];
        }
      }
      usersList.push(newCustomer);
      localStorage.setItem("slicematic_mock_customers", JSON.stringify(usersList));

      // Proceed and complete
      saveSessionAndProceed(newCustomer);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to register. Please check input data and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to save session details and trigger parent callback
  const saveSessionAndProceed = (customerObj: any) => {
    if (typeof window !== "undefined") {
      const displayAddress = customerObj.city 
        ? `${customerObj.address || ""}, ${customerObj.city}`.trim().replace(/^,\s*/, "")
        : customerObj.address || "";

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
      sessionStorage.setItem("slicematic_customer_email", customerObj.email || "");
      sessionStorage.setItem("slicematic_customer_logged_in", "true");
    }
    onComplete();
  };

  // Guest login bypass
  const handleGuestLogin = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("slicematic_customer");
      sessionStorage.removeItem("slicematic_customer_email");
      sessionStorage.setItem("slicematic_customer_logged_in", "false");
    }
    onComplete();
  };

  return (
    <div className="portal-container">
      <div className="portal-glass">
        {/* Brand Header */}
        <div className="portal-header">
          <div className="portal-logo">
            <Pizza />
          </div>
          <h2>SliceMatic Portal</h2>
          <p>Fresh crusts, premium toppings, elite AI pairings.</p>
        </div>

        {/* Wizard Form States */}
        {step === "identity" && (
          <form onSubmit={handleIdentitySubmit} className="portal-form">
            <div className="input-group">
              <label htmlFor="identifier">Mobile or Email</label>
              <div className="input-icon-wrapper">
                {identifier.includes("@") ? <Mail /> : <Smartphone />}
                <input
                  type="text"
                  id="identifier"
                  placeholder="Enter email or 10-digit phone number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {errorMsg && <div className="portal-error-card"><ShieldAlert /><span>{errorMsg}</span></div>}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              {loading ? "Checking..." : "Proceed"} <ArrowRight />
            </button>

            <div className="portal-divider">
              <span>OR</span>
            </div>

            <button type="button" onClick={handleGuestLogin} className="portal-secondary-btn" disabled={loading}>
              <Smile /> Continue as Guest
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="portal-form">
            <button type="button" className="back-btn" onClick={() => setStep("identity")} disabled={loading}>
              <ArrowLeft /> Back
            </button>

            <div className="otp-heading">
              <Lock />
              <h3>Enter Security Code</h3>
              <p>We've sent an OTP to <strong>{identifier}</strong> (for this demo, enter <strong>1111</strong>).</p>
            </div>

            <div className="input-group">
              <label htmlFor="otp">4-Digit OTP Code</label>
              <input
                type="text"
                id="otp"
                maxLength={4}
                placeholder="XXXX"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className="otp-input"
              />
            </div>

            {errorMsg && <div className="portal-error-card"><ShieldAlert /><span>{errorMsg}</span></div>}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              Verify & Enter App <UserCheck />
            </button>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegistrationSubmit} className="portal-form scroll-form">
            <button type="button" className="back-btn" onClick={() => setStep("identity")} disabled={loading}>
              <ArrowLeft /> Back
            </button>

            <div className="registration-heading">
              <Sparkles />
              <h3>Create Your Account</h3>
              <p>New account registration for premium SliceMatic members.</p>
            </div>

            <div className="reg-grid">
              <div className="input-group">
                <label htmlFor="regName">Full Name</label>
                <input
                  type="text"
                  id="regName"
                  placeholder="Rahul Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="regAge">Age</label>
                <input
                  type="number"
                  id="regAge"
                  placeholder="25"
                  value={regAge}
                  onChange={(e) => setRegAge(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="regMobile">Mobile Number</label>
                <input
                  type="text"
                  id="regMobile"
                  placeholder="9876543210"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="regEmail">Email Address</label>
                <input
                  type="email"
                  id="regEmail"
                  placeholder="rahul@slicematic.in"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group wide-field">
                <label htmlFor="regCity">City</label>
                <input
                  type="text"
                  id="regCity"
                  placeholder="Delhi NCR"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group wide-field">
                <label htmlFor="regAddress">Delivery Address</label>
                <textarea
                  id="regAddress"
                  placeholder="Flat No, Wing, Landmark, Street Area"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  disabled={loading}
                  rows={2}
                />
              </div>
            </div>

            {errorMsg && <div className="portal-error-card"><ShieldAlert /><span>{errorMsg}</span></div>}

            <button type="submit" className="portal-primary-btn" disabled={loading}>
              {loading ? "Registering..." : "Register & Order"} <UserCheck />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
