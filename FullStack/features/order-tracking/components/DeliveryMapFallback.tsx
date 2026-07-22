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
      title: "Rider not assigned",
      desc: "ETA and live map stay hidden until verified delivery data is available.",
    },
    map_offline: {
      icon: <MapPinOff size={32} className="text-sui-secondary" />,
      title: "Map unavailable",
      desc: "Live map cannot be shown. Order progress still follows recorded kitchen status only.",
    },
    stale_location: {
      icon: <Clock size={32} className="text-sui-warning" />,
      title: "Location unavailable",
      desc: "No verified GPS update is available for this order yet. ETA is not shown.",
    },
    provider_failure: {
      icon: <AlertTriangle size={32} className="text-sui-danger" />,
      title: "Tracking unavailable",
      desc: "Delivery tracking is not available right now. Your recorded order status is unchanged.",
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
