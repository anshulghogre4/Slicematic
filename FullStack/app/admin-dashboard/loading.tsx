export default function AdminLoading() {
  return (
    <div style={{ padding: "var(--space-xl)", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
      {/* Top Bar Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-xl)" }}>
        <div style={{ width: 150, height: 24, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4 }} />
        <div style={{ width: 300, height: 40, backgroundColor: "var(--sui-surface-soft)", borderRadius: 8 }} />
      </div>

      {/* Main Grid Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "var(--space-lg)" }}>
        {/* Nav Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <div style={{ height: 40, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4 }} />
          <div style={{ height: 40, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4 }} />
          <div style={{ height: 40, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4 }} />
        </div>

        {/* Content Skeleton */}
        <div style={{ height: 600, backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-lg)" }} />
      </div>
    </div>
  );
}
