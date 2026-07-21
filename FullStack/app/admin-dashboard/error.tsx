"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem", backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-lg)", margin: "2rem" }}>
      <h2 style={{ color: "var(--tomato)", marginBottom: "1rem" }}>Dashboard Error</h2>
      <p style={{ color: "var(--sui-text-secondary)", marginBottom: "2rem" }}>{error.message || "Failed to load admin workspace."}</p>
      <button className="sui-button sui-button--primary" onClick={() => reset()}>
        Retry Workspace
      </button>
    </div>
  );
}
