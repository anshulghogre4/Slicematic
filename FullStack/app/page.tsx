"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerShell from "../components/CustomerShell";
import EntryPortal from "../components/EntryPortal/EntryPortal";
import { useStore } from "../lib/store";

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

  function handlePortalComplete() {
    const admin = typeof window !== "undefined" && window.sessionStorage.getItem("slicematic_is_admin") === "true";
    setIsAuthorized(true);
    if (admin) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("slicematic_admin_view_customer");
      }
      setIsAdmin(true);
      router.replace("/admin-dashboard");
      return;
    }
    setIsAdmin(false);
  }

  if (loading) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <EntryPortal 
        onComplete={handlePortalComplete} 
        onRecommendationReady={(data) => {
          useStore.getState().setRecommendations(data.recommendations);
          useStore.getState().setRecommendation(data.primary ?? data.recommendations[0] ?? null);
        }}
      />
    );
  }

  if (isAdmin) {
    return null;
  }

  return <CustomerShell onUnauthorize={() => setIsAuthorized(false)} />;
}
