import { Skeleton } from "../../components/ui";

export default function ConfirmationLoading() {
  return (
    <main
      className="app-frame"
      style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-lg)" }}
      aria-busy="true"
      aria-label="Loading confirmation"
    >
      <div style={{ display: "grid", gap: "var(--space-xl)", textAlign: "center" }}>
        <div style={{ display: "grid", gap: "var(--space-md)", justifyItems: "center" }}>
          <Skeleton variant="circle" style={{ width: 56, height: 56 }} />
          <Skeleton variant="line" style={{ width: 120, height: 14 }} />
          <Skeleton variant="line" style={{ width: 220, height: 28 }} />
          <Skeleton variant="line" style={{ width: 140, height: 22 }} />
        </div>
        <Skeleton variant="block" style={{ height: 220 }} />
        <Skeleton variant="block" style={{ height: 250 }} />
        <Skeleton variant="block" style={{ height: 52 }} />
      </div>
    </main>
  );
}
