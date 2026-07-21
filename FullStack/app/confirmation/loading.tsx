export default function ConfirmationLoading() {
  return (
    <main className="app-frame" style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      <div style={{ padding: "var(--space-md)", textAlign: "center", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
        <div style={{ width: 120, height: 16, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4, margin: "0 auto var(--space-md)" }} />
        <div style={{ width: 200, height: 24, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4, margin: "0 auto var(--space-xl)" }} />
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
          <div style={{ height: 160, backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-md)" }} />
          <div style={{ height: 160, backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-md)" }} />
        </div>

        <div style={{ height: 300, backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-md)" }} />
      </div>
    </main>
  );
}
