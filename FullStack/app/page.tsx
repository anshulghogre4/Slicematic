"use client";

import { useEffect, useState } from "react";
import SliceMaticStage3 from "../components/SliceMaticStage3";
import EntryPortal from "../components/EntryPortal/EntryPortal";

export default function Page() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedInValue = window.sessionStorage.getItem("slicematic_customer_logged_in");
      if (loggedInValue !== null) {
        setIsAuthorized(true);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return null;
  }

  if (!isAuthorized) {
    return <EntryPortal onComplete={() => setIsAuthorized(true)} />;
  }

  return <SliceMaticStage3 onUnauthorize={() => setIsAuthorized(false)} />;
}
