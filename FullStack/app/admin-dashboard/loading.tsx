import { Skeleton } from "../../components/ui";

export default function AdminLoading() {
  return (
    <div style={{ padding: "var(--space-xl)" }} aria-busy="true" aria-label="Loading admin dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-xl)", gap: 16 }}>
        <Skeleton variant="line" style={{ width: 150, height: 24 }} />
        <Skeleton variant="line" style={{ width: 300, height: 40 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "var(--space-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <Skeleton variant="line" style={{ height: 40 }} />
          <Skeleton variant="line" style={{ height: 40 }} />
          <Skeleton variant="line" style={{ height: 40 }} />
        </div>
        <Skeleton variant="block" style={{ height: 600 }} />
      </div>
    </div>
  );
}
