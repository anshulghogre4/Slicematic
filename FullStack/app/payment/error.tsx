"use client";

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <div style={{ textAlign: "center", padding: "4rem 1rem", backgroundColor: "var(--sui-surface-soft)", borderRadius: "var(--sui-radius-lg)", marginTop: "2rem" }}>
        <h2 style={{ color: "var(--tomato)", marginBottom: "1rem" }}>Something went wrong with the checkout.</h2>
        <p style={{ color: "var(--sui-text-secondary)", marginBottom: "2rem" }}>{error.message || "We couldn't load the payment summary."}</p>
        <button className="sui-button sui-button--primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
