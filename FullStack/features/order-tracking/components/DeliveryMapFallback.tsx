import { MapPinOff, Clock, UserSearch, AlertTriangle } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export type FallbackState = 
  | "no_rider" 
  | "map_offline" 
  | "stale_location" 
  | "provider_failure";

export function DeliveryMapFallback({ state }: { state: FallbackState }) {
  const configs: Record<FallbackState, { icon: React.ReactNode; title: string; desc: string }> = {
    no_rider: {
      icon: <UserSearch size={32} className="text-sui-secondary" />,
      title: "Searching for rider",
      desc: "We are assigning a nearby delivery partner. Live tracking will begin shortly.",
    },
    map_offline: {
      icon: <MapPinOff size={32} className="text-sui-secondary" />,
      title: "Map temporarily unavailable",
      desc: "We are tracking your order, but the live map cannot be displayed right now.",
    },
    stale_location: {
      icon: <Clock size={32} className="text-sui-warning" />,
      title: "Location paused",
      desc: "Rider's GPS signal is weak. ETA may be slightly delayed.",
    },
    provider_failure: {
      icon: <AlertTriangle size={32} className="text-sui-danger" />,
      title: "Tracking service down",
      desc: "Your order is still on the way. We are working to restore the tracking service.",
    }
  };

  const { icon, title, desc } = configs[state];

  return (
    <Card style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "var(--space-2xl)", 
      textAlign: "center",
      backgroundColor: "var(--sui-surface-soft)",
      border: "1px dashed var(--sui-border)",
      minHeight: 250
    }}>
      <div style={{ marginBottom: "var(--space-md)", color: "var(--sui-text-tertiary)" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "var(--text-heading)", fontWeight: 600, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: "var(--text-body)", color: "var(--sui-text-secondary)", maxWidth: 300, lineHeight: 1.4 }}>{desc}</p>
    </Card>
  );
}
