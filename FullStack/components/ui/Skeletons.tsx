"use client";

import { Skeleton } from "./Skeleton";

/* ── Menu Card Skeleton ── */
export function MenuCardSkeleton() {
  return (
    <div className="skeleton-menu-card sui-skeleton" style={{ background: "none" }}>
      <div className="skeleton-menu-card__image" />
      <div className="skeleton-menu-card__body">
        <Skeleton variant="line" style={{ width: "70%", height: 16 }} />
        <Skeleton variant="line" style={{ width: "40%", height: 14 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <Skeleton variant="line" style={{ width: 48, height: 18, borderRadius: 999 }} />
          <Skeleton variant="line" style={{ width: 52, height: 18, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Recommendation Skeleton ── */
export function RecommendationSkeleton() {
  return (
    <div className="skeleton-recommendation sui-skeleton" style={{ background: "none" }}>
      <Skeleton variant="block" style={{ width: 80, height: 80, borderRadius: "var(--sui-radius-sm)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "grid", gap: 8, alignContent: "center" }}>
        <Skeleton variant="line" style={{ width: "60%", height: 16 }} />
        <Skeleton variant="line" style={{ width: "80%", height: 12 }} />
        <Skeleton variant="line" style={{ width: "30%", height: 20, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ── Checkout Summary Skeleton ── */
export function CheckoutSummarySkeleton() {
  return (
    <div className="skeleton-checkout-summary sui-card">
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton variant="line" style={{ width: "55%", height: 14 }} />
          <Skeleton variant="line" style={{ width: "20%", height: 14 }} />
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--sui-border-soft)", paddingTop: 12, marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton variant="line" style={{ width: "30%", height: 18 }} />
          <Skeleton variant="line" style={{ width: "25%", height: 18 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Order Table Row Skeleton ── */
export function OrderRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-order-row sui-skeleton" style={{ background: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", height: "100%" }}>
            <Skeleton variant="circle" style={{ width: 10, height: 10, flexShrink: 0 }} />
            <Skeleton variant="line" style={{ width: "25%", height: 14 }} />
            <Skeleton variant="line" style={{ width: "15%", height: 14 }} />
            <Skeleton variant="line" style={{ width: "18%", height: 14 }} />
            <div style={{ marginLeft: "auto" }}>
              <Skeleton variant="line" style={{ width: 60, height: 14 }} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Forecast Chart Skeleton ── */
export function ForecastChartSkeleton() {
  return (
    <div className="skeleton-forecast-chart sui-skeleton" style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "24px 16px" }}>
      {[40, 65, 55, 80, 70, 45, 90, 60, 75, 50, 85, 68].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            background: "rgba(255,255,255,0.3)",
            borderRadius: "4px 4px 0 0",
          }}
        />
      ))}
    </div>
  );
}

/* ── AI Service Card Skeleton ── */
export function AiServiceCardSkeleton() {
  return (
    <div className="skeleton-ai-card sui-skeleton" style={{ background: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton variant="circle" style={{ width: 10, height: 10 }} />
        <Skeleton variant="line" style={{ width: "40%", height: 16 }} />
      </div>
      <Skeleton variant="line" style={{ width: "70%", height: 12 }} />
      <Skeleton variant="line" style={{ width: "50%", height: 12 }} />
    </div>
  );
}

/* ── Admin Metric Card Skeleton ── */
export function AdminMetricSkeleton() {
  return (
    <div className="sui-card" style={{ padding: "var(--space-lg)", display: "grid", gap: 10 }}>
      <Skeleton variant="line" style={{ width: "45%", height: 12 }} />
      <Skeleton variant="line" style={{ width: "30%", height: 28 }} />
      <Skeleton variant="line" style={{ width: "60%", height: 12 }} />
    </div>
  );
}

/* ── Cart Insight Skeleton ── */
export function CartInsightSkeleton() {
  return (
    <div className="sui-card" style={{ padding: "var(--space-md)", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Skeleton variant="circle" style={{ width: 20, height: 20 }} />
        <Skeleton variant="line" style={{ width: "50%", height: 14 }} />
      </div>
      <Skeleton variant="line" style={{ width: "85%", height: 12 }} />
      <Skeleton variant="line" style={{ width: "65%", height: 12 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Skeleton variant="line" style={{ width: 80, height: 30, borderRadius: "var(--sui-radius-sm)" }} />
        <Skeleton variant="line" style={{ width: 80, height: 30, borderRadius: "var(--sui-radius-sm)" }} />
      </div>
    </div>
  );
}

/* ── Tracking Timeline Skeleton ── */
export function TrackingTimelineSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "var(--space-lg)" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Skeleton variant="circle" style={{ width: 16, height: 16 }} />
            {i < 5 && <div style={{ width: 2, height: 24, background: "var(--sui-border-soft)" }} />}
          </div>
          <div style={{ flex: 1, display: "grid", gap: 4 }}>
            <Skeleton variant="line" style={{ width: `${70 - i * 8}%`, height: 14 }} />
            <Skeleton variant="line" style={{ width: "35%", height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
