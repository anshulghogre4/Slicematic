import { RefreshCw, Sparkles, Utensils } from "lucide-react";

import { RecommendationSkeleton, EmptyState, ReasonTag } from "../../../components/ui";
import type { MenuItem, Recommendation } from "../../../lib/types";

export type RecommendationLaneProps = {
  recommendation: Recommendation | null;
  recommendations: Recommendation[];
  pizzas: MenuItem[];
  onRefresh: () => void;
  onBuild: (pizza: MenuItem) => void;
  onBrowseMenu: () => void;
};

function getReasonVariant(rec: Recommendation): "preference" | "popular" | "history" {
  if (rec.customerTier === "returning") return "history";
  if (rec.confidence > 0.7) return "preference";
  return "popular";
}

function getReasonLabel(rec: Recommendation): string {
  if (rec.customerTier === "returning") return "You ordered this before";
  if (rec.confidence > 0.7) return "Matches your taste";
  return "Popular today";
}

export function RecommendationLane({
  recommendation,
  recommendations,
  pizzas,
  onRefresh,
  onBuild,
  onBrowseMenu
}: RecommendationLaneProps) {
  const visibleRecommendations = recommendations.length > 0 ? recommendations : recommendation ? [recommendation] : [];
  const hasMultiple = visibleRecommendations.length > 1;
  const title = !recommendation
    ? "Reading order history..."
    : hasMultiple
      ? `${visibleRecommendations.length} picks for you`
      : recommendation.pizzaName
        ? `${recommendation.pizzaName} + ${recommendation.toppingName}`
        : "Explore our menu";
  const sourceLabel = recommendation?.source === "openrouter" ? "AI-powered" : "Data-driven";

  function findAvailablePizza(rec: Recommendation) {
    return pizzas.find((item) => item.id === rec.pizzaId && item.available);
  }

  return (
    <section className="glass-panel ai-recommendation animate-fade-in-up" id="ai" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} /> AI recommendations
          </p>
          <h2 className="section-heading" style={{ marginBottom: 4 }}>{title}</h2>
          <p className="section-subheading" style={{ margin: 0 }}>
            {recommendation?.reason ?? "Analyzing your order history to find the perfect match..."}
          </p>
          {recommendation && recommendation.confidence > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <ReasonTag variant={getReasonVariant(recommendation)}>
                {sourceLabel}
              </ReasonTag>
              <span style={{ fontSize: "var(--text-micro)", color: "var(--sui-text-tertiary)" }}>
                {Math.round(recommendation.confidence * 100)}% confidence · {recommendation.customerTier}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sui-button sui-button--ghost sui-button--sm"
          title="Refresh recommendations"
          onClick={onRefresh}
          disabled={!recommendation}
          style={{ flexShrink: 0 }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Loading skeleton */}
      {!recommendation ? (
        <div className="stagger-children" style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-md)" }} aria-label="Loading recommendations">
          <RecommendationSkeleton />
          <RecommendationSkeleton />
          <RecommendationSkeleton />
        </div>
      ) : hasMultiple ? (
        /* Multiple recommendation cards */
        <div className="recommendation-list stagger-children" style={{ marginTop: "var(--space-md)" }}>
          {visibleRecommendations.map((rec, idx) => {
            const pizza = findAvailablePizza(rec);
            return (
              <article
                key={rec.recommendationId ?? `${rec.pizzaId}-${idx}`}
                className="recommendation-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-md)",
                  border: "1px solid var(--sui-border-soft)",
                  borderRadius: "var(--sui-radius-md)",
                  background: "var(--sui-surface-card)",
                  transition: "box-shadow var(--sui-motion-fast) ease",
                }}
              >
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--sui-surface-accent)",
                  color: "var(--tomato)",
                  fontWeight: 800,
                  fontSize: "var(--text-small)",
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: "var(--text-body)" }}>{rec.pizzaName} + {rec.toppingName}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", lineHeight: 1.4 }}>
                    {rec.reason}
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <ReasonTag variant={getReasonVariant(rec)}>{getReasonLabel(rec)}</ReasonTag>
                    <span style={{ fontSize: "var(--text-micro)", color: "var(--sui-text-tertiary)", lineHeight: "20px" }}>
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <button
                  className="sui-button sui-button--primary sui-button--sm"
                  type="button"
                  disabled={!pizza}
                  onClick={() => pizza && onBuild(pizza)}
                >
                  <Sparkles size={14} /> {pizza ? "Build" : "N/A"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="recommendation-actions" style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
        {!hasMultiple && recommendation?.pizzaId ? (
          <button
            className="sui-button sui-button--primary"
            type="button"
            disabled={!findAvailablePizza(recommendation)}
            onClick={() => {
              const pizza = findAvailablePizza(recommendation);
              if (pizza) onBuild(pizza);
            }}
          >
            <Sparkles size={16} /> {findAvailablePizza(recommendation) ? "Build this combo" : "Unavailable now"}
          </button>
        ) : null}
        <button className="sui-button sui-button--secondary" type="button" onClick={onBrowseMenu}>
          <Utensils size={16} /> Browse menu
        </button>
      </div>
    </section>
  );
}
