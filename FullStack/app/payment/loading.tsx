import { CheckoutSummarySkeleton } from "../../components/ui";

export default function PaymentLoading() {
  return (
    <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <section className="checkout-page">
        <div className="checkout-page-head">
          <div>
            <p className="eyebrow" style={{ width: 80, height: 16, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 250, height: 32, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 400, height: 16, backgroundColor: "var(--sui-surface-soft)", borderRadius: 4 }} />
          </div>
        </div>
        <CheckoutSummarySkeleton />
      </section>
    </main>
  );
}
