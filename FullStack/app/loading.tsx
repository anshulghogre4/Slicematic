import { Skeleton } from "../components/ui";

export default function RootLoading() {
  return (
    <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }} aria-busy="true" aria-label="Loading SliceMatic">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <Skeleton variant="line" style={{ width: 120, height: 14 }} />
        <Skeleton variant="line" style={{ width: 280, height: 32 }} />
        <Skeleton variant="line" style={{ width: "60%", height: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
          <Skeleton variant="block" style={{ minHeight: 180 }} />
          <Skeleton variant="block" style={{ minHeight: 180 }} />
          <Skeleton variant="block" style={{ minHeight: 180 }} />
        </div>
      </div>
    </main>
  );
}
