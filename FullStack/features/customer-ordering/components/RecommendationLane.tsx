import { RefreshCw, Sparkles, Utensils } from "lucide-react";

import { Skeleton } from "../../../components/ui";
import type { MenuItem, Recommendation } from "../../../lib/types";

export type RecommendationLaneProps = {
  recommendation: Recommendation | null;
  recommendations: Recommendation[];
  pizzas: MenuItem[];
  onRefresh: () => void;
  onBuild: (pizza: MenuItem) => void;
  onBrowseMenu: () => void;
};

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
  const sourceLabel = recommendation?.source === "openrouter" ? "OpenRouter response" : "Data-driven pick";

  function findAvailablePizza(rec: Recommendation) {
    return pizzas.find((item) => item.id === rec.pizzaId && item.available);
  }

  return (
    <section className="glass-panel ai-recommendation" id="ai" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">AI recommendations</p>
          <h2>{title}</h2>
          <p>{recommendation?.reason ?? "The backend queries Supabase history, sends a compact profile to OpenRouter, validates menu IDs, and logs the recommendation event."}</p>
          {recommendation && recommendation.confidence > 0 && (
            <small>{sourceLabel} / confidence {Math.round(recommendation.confidence * 100)}% / {recommendation.customerTier} customer</small>
          )}
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Refresh recommendations"
          onClick={onRefresh}
          disabled={!recommendation}
          style={{ padding: "0.5rem", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {!recommendation ? (
        <div className="sui-skeleton-stack" aria-label="Loading recommendations">
          <Skeleton variant="line" />
          <Skeleton variant="block" />
          <Skeleton variant="line" />
        </div>
      ) : hasMultiple ? (
        <div className="recommendation-list">
          {visibleRecommendations.map((rec, idx) => {
            const pizza = findAvailablePizza(rec);
            return (
              <article key={rec.recommendationId ?? `${rec.pizzaId}-${idx}`} className="recommendation-card">
                <div className="recommendation-card-head">
                  <span className="recommendation-rank">#{idx + 1}</span>
                  <strong>{rec.pizzaName} + {rec.toppingName}</strong>
                  <small>{Math.round(rec.confidence * 100)}% confidence</small>
                </div>
                <p>{rec.reason}</p>
                <button className="primary" type="button" disabled={!pizza} onClick={() => pizza && onBuild(pizza)}>
                  <Sparkles /> {pizza ? "Build this combo" : "Unavailable now"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
      <div className="recommendation-actions">
        {!hasMultiple && recommendation?.pizzaId ? (
          <button
            className="primary"
            type="button"
            disabled={!findAvailablePizza(recommendation)}
            onClick={() => {
              const pizza = findAvailablePizza(recommendation);
              if (pizza) onBuild(pizza);
            }}
          >
            <Sparkles /> {findAvailablePizza(recommendation) ? "Build this combo" : "Unavailable now"}
          </button>
        ) : null}
        <button type="button" onClick={onBrowseMenu}><Utensils /> Browse menu</button>
      </div>
    </section>
  );
}
