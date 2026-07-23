"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerShell from "../components/CustomerShell";
import { MarketingLanding } from "../components/landing/MarketingLanding";

export default function Page() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedInValue = window.sessionStorage.getItem("slicematic_customer_logged_in");
      const admin = window.sessionStorage.getItem("slicematic_is_admin") === "true";
      const adminViewCustomer = window.sessionStorage.getItem("slicematic_admin_view_customer") === "true";
      if (loggedInValue !== null) {
        setIsAuthorized(true);
        if (admin && !adminViewCustomer) {
          setIsAdmin(true);
          router.replace("/admin-dashboard");
        } else {
          setIsAdmin(false);
        }
      }
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-md text-primary" aria-label="Loading" />
      </main>
    );
  }

  if (!isAuthorized) {
    return <MarketingLanding />;
  }

  if (isAdmin) {
    return null;
  }

  return <CustomerShell onUnauthorize={() => setIsAuthorized(false)} />;
}
