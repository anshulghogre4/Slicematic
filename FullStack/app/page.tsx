"use client";

import { useState } from "react";
import SliceMaticStage3 from "../components/SliceMaticStage3";
import EntryPortal from "../components/EntryPortal/EntryPortal";

export default function Page() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  if (!isAuthorized) {
    return <EntryPortal onComplete={() => setIsAuthorized(true)} />;
  }

  return <SliceMaticStage3 onUnauthorize={() => setIsAuthorized(false)} />;
}
