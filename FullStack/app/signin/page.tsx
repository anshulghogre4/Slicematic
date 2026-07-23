"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EntryPortal from "../../components/EntryPortal/EntryPortal";
import { useStore } from "../../lib/store";

/**
 * Sole auth UI: email → OTP (EntryPortal).
 * Marketing landing CTAs redirect here — see plans/landing-page-vision.md.
 */
export default function SignInPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loggedIn = window.sessionStorage.getItem("slicematic_customer_logged_in");
    const admin = window.sessionStorage.getItem("slicematic_is_admin") === "true";
    const adminViewCustomer = window.sessionStorage.getItem("slicematic_admin_view_customer") === "true";

    // Only bounce real members/admins. Guests keep `logged_in=false` and must
    // still reach EntryPortal (e.g. Account soft-gate from CustomerShell).
    if (loggedIn === "true") {
      if (admin && !adminViewCustomer) {
        router.replace("/admin-dashboard");
      } else {
        router.replace("/");
      }
      return;
    }
    setReady(true);
  }, [router]);

  function handlePortalComplete() {
    const admin =
      typeof window !== "undefined" && window.sessionStorage.getItem("slicematic_is_admin") === "true";
    if (admin) {
      window.sessionStorage.removeItem("slicematic_admin_view_customer");
      router.replace("/admin-dashboard");
      return;
    }
    router.replace("/");
  }

  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100 text-base-content">
        <span className="loading loading-spinner loading-md text-primary" aria-label="Loading sign in" />
      </main>
    );
  }

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
