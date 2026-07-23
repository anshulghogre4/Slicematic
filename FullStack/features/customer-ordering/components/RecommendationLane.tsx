"use client";

import { RefreshCw, Utensils } from "lucide-react";

import {
  EmptyState,
  FadeInUp,
  ReasonTag,
  Skeleton,
  StaggerContainer,
  StaggerItem
} from "../../../components/ui";
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

function hasPizzaId(rec: Recommendation | null | undefined): rec is Recommendation {
  return Boolean(rec?.pizzaId);
}

function LaneSkeleton() {
  return (
    <div className="recommendation-lane__skeleton" aria-hidden="true">
      <Skeleton variant="circle" className="recommendation-lane__skeleton-rank" />
      <div className="recommendation-lane__skeleton-body">
        <Skeleton variant="line" className="recommendation-lane__skeleton-title" />
        <Skeleton variant="line" className="recommendation-lane__skeleton-reason" />
        <div className="recommendation-lane__skeleton-meta">
          <Skeleton variant="line" className="recommendation-lane__skeleton-tag" />
          <Skeleton variant="line" className="recommendation-lane__skeleton-pct" />
        </div>
      </div>
      <Skeleton variant="line" className="recommendation-lane__skeleton-cta" />
    </div>
  );
}

export function RecommendationLane({
  recommendation,
  recommendations,
  pizzas,
  onRefresh,
  onBuild,
  onBrowseMenu
}: RecommendationLaneProps) {
  const isLoading = recommendation === null;
  const visibleRecommendations = recommendations.length > 0
    ? recommendations.filter(hasPizzaId)
    : hasPizzaId(recommendation)
      ? [recommendation]
      : [];
  const pickCount = visibleRecommendations.length;
  const isEmpty = !isLoading && pickCount === 0;

  function findAvailablePizza(rec: Recommendation) {
    return pizzas.find((item) => item.id === rec.pizzaId && item.available);
  }

  const availableCount = visibleRecommendations.filter((rec) => Boolean(findAvailablePizza(rec))).length;
  const allUnavailable = pickCount > 0 && availableCount === 0;

  const title = isLoading
    ? "Finding picks for you…"
    : isEmpty
      ? "No picks right now"
      : pickCount > 1
        ? `${pickCount} picks for you`
        : "A pick for you";

  const subtitle = isLoading
    ? "Looking at recent orders to suggest a pizza and topping combo."
    : isEmpty
      ? "We could not find a combo for you. Browse the menu or refresh to try again."
      : allUnavailable
        ? "These picks are not on the live menu right now. Browse for available pizzas."
        : pickCount > 1
          ? "Suggested pizza and topping combos from your orders. Build one to customize."
          : recommendation?.reason?.trim()
            ? recommendation.reason
            : "Suggested pizza and topping combo from your orders. Build to customize.";

  const sourceLabel = recommendation?.source === "openrouter" ? "Personalized" : "From your orders";
  const showMeta = !isLoading && !isEmpty && recommendation && recommendation.confidence > 0;
  const statusMessage = isLoading
    ? "Loading recommendations"
    : isEmpty
      ? "No recommendations available"
      : allUnavailable
        ? "Recommendations loaded but none are available on the menu"
        : `${pickCount} recommendation${pickCount === 1 ? "" : "s"} ready`;

  return (
    <FadeInUp>
      <section
        className="glass-panel ai-recommendation recommendation-lane"
        id="ai"
        aria-live="polite"
        aria-busy={isLoading}
        aria-label="Recommendations"
      >
        <span className="sr-only" role="status">
          {statusMessage}
        </span>

        <div className="recommendation-lane__intro">
          <div className="recommendation-lane__head">
            <div className="recommendation-lane__copy">
              {!isLoading && !isEmpty ? (
                <p className="recommendation-lane__eyebrow">{sourceLabel}</p>
              ) : null}
              <h2 className="section-heading recommendation-lane__title">{title}</h2>
              <p className="section-subheading recommendation-lane__subtitle">{subtitle}</p>
              {showMeta ? (
                <div className="recommendation-lane__meta">
                  <ReasonTag variant={getReasonVariant(recommendation)}>
                    {getReasonLabel(recommendation)}
                  </ReasonTag>
                  <span className="recommendation-lane__match">
                    {Math.round(recommendation.confidence * 100)}% match
                    {recommendation.customerTier ? ` · ${recommendation.customerTier}` : ""}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="sui-button sui-button--ghost sui-button--sm recommendation-lane__refresh"
              title="Refresh recommendations"
              aria-label="Refresh recommendations"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>

          {!isEmpty ? (
            <div className="recommendation-lane__actions">
              <button className="sui-button sui-button--secondary" type="button" onClick={onBrowseMenu}>
                <Utensils size={16} aria-hidden="true" /> Browse menu
              </button>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div
            className="recommendation-lane__list"
            aria-label="Loading recommendations"
          >
            <LaneSkeleton />
            <LaneSkeleton />
            <LaneSkeleton />
          </div>
        ) : isEmpty ? (
          <EmptyState
            illustration="clipboard"
            title="No picks available"
            description="Nothing to build yet. Browse the live menu, or refresh for a new suggestion."
            action={
              <button className="sui-button sui-button--primary" type="button" onClick={onBrowseMenu}>
                <Utensils size={16} aria-hidden="true" /> Browse menu
              </button>
            }
          />
        ) : (
          <div className="recommendation-lane__list">
            {allUnavailable ? (
              <p className="recommendation-lane__notice" role="status">
                None of these picks are available right now. Build is disabled until they return to the menu.
              </p>
            ) : null}
            <StaggerContainer className="recommendation-list recommendation-lane__cards" staggerDelay={0.06}>
              {visibleRecommendations.map((rec, idx) => {
                const pizza = findAvailablePizza(rec);
                const unavailable = !pizza;
                const why = rec.reason?.trim();
                const buildLabel = unavailable
                  ? "Unavailable"
                  : pickCount === 1
                    ? "Build this combo"
                    : "Build combo";

                return (
                  <StaggerItem key={rec.recommendationId ?? `${rec.pizzaId}-${idx}`}>
                    <article
                      className={`recommendation-card${unavailable ? " recommendation-card--unavailable" : ""}${idx === 0 ? " recommendation-card--primary" : ""}`}
                    >
                      <span className="recommendation-card__rank" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <div className="recommendation-card__body">
                        <strong className="recommendation-card__name">
                          {rec.pizzaName} + {rec.toppingName}
                        </strong>
                        {why ? (
                          <p className="recommendation-card__why">{why}</p>
                        ) : null}
                        <div className="recommendation-card__tags">
                          <ReasonTag variant={getReasonVariant(rec)}>{getReasonLabel(rec)}</ReasonTag>
                          {rec.confidence > 0 ? (
                            <span className="recommendation-card__confidence">
                              {Math.round(rec.confidence * 100)}% match
                            </span>
                          ) : null}
                          {unavailable ? (
                            <span className="recommendation-card__unavailable-label">Unavailable on menu</span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        className="sui-button sui-button--primary recommendation-card__build"
                        type="button"
                        disabled={unavailable}
                        aria-disabled={unavailable}
                        aria-label={
                          unavailable
                            ? `${rec.pizzaName} is not available right now`
                            : `Build ${rec.pizzaName} with ${rec.toppingName}`
                        }
                        title={unavailable ? "This pizza is not available right now" : `Build ${rec.pizzaName}`}
                        onClick={() => pizza && onBuild(pizza)}
                      >
                        <Utensils size={14} aria-hidden="true" /> {buildLabel}
                      </button>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        )}
      </section>
    </FadeInUp>
  );
}
