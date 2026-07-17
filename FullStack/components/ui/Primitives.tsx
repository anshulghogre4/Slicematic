"use client";

import type { ReactNode } from "react";

type IllustrationName = "empty-cart" | "kitchen" | "clipboard" | "robot";

const illustrationClass: Record<IllustrationName, string> = {
  "empty-cart": "illustration-empty-cart",
  kitchen: "illustration-kitchen",
  clipboard: "illustration-clipboard",
  robot: "illustration-clipboard", // fallback until robot SVG ships
};

interface EmptyStateProps {
  illustration?: IllustrationName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ illustration = "empty-cart", title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className={`empty-state__illustration ${illustrationClass[illustration]}`} role="img" aria-label={title} />
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  );
}

export function SuccessCheckmark() {
  return (
    <svg className="success-checkmark" viewBox="0 0 56 56" aria-label="Success">
      <circle cx="28" cy="28" r="28" />
      <path d="M17 28 L24 35 L39 20" fill="none" />
    </svg>
  );
}

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min = 1, max = 20, onChange }: QuantityStepperProps) {
  return (
    <div className="qty-stepper">
      <button
        className="qty-stepper__btn"
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="qty-stepper__value" aria-live="polite">{value}</span>
      <button
        className="qty-stepper__btn"
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

interface TagChipProps {
  variant: "veg" | "spicy" | "popular" | "fast";
  children: ReactNode;
}

export function TagChip({ variant, children }: TagChipProps) {
  return <span className={`tag-chip tag-chip--${variant}`}>{children}</span>;
}

interface ReasonTagProps {
  variant: "preference" | "popular" | "history";
  children: ReactNode;
}

export function ReasonTag({ variant, children }: ReasonTagProps) {
  return <span className={`reason-tag reason-tag--${variant}`}>{children}</span>;
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`filter-bar__chip ${active ? "filter-bar__chip--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface ExceptionChipProps {
  variant: "warning" | "danger" | "info";
  children: ReactNode;
}

export function ExceptionChip({ variant, children }: ExceptionChipProps) {
  return <span className={`exception-chip exception-chip--${variant}`}>{children}</span>;
}

interface PaymentTileProps {
  icon: ReactNode;
  label: string;
  copy: string;
  selected: boolean;
  onClick: () => void;
}

export function PaymentTile({ icon, label, copy, selected, onClick }: PaymentTileProps) {
  return (
    <button
      type="button"
      className={`payment-tile ${selected ? "payment-tile--selected" : ""}`}
      onClick={onClick}
    >
      <div className="payment-tile__icon">{icon}</div>
      <div>
        <div className="payment-tile__label">{label}</div>
        <div className="payment-tile__copy">{copy}</div>
      </div>
    </button>
  );
}

interface AiServiceCardProps {
  name: string;
  status: "live" | "degraded" | "offline";
  lastSuccess?: string;
  action?: ReactNode;
}

export function AiServiceCard({ name, status, lastSuccess, action }: AiServiceCardProps) {
  const statusLabels: Record<string, string> = {
    live: "Operational",
    degraded: "Degraded",
    offline: "Offline",
  };

  return (
    <div className="ai-service-card">
      <div className={`ai-service-card__dot ai-service-card__dot--${status}`} />
      <div>
        <div className="ai-service-card__name">{name}</div>
        <div className="ai-service-card__status">
          {statusLabels[status]}
          {lastSuccess && ` · Last success: ${lastSuccess}`}
        </div>
      </div>
      {action}
    </div>
  );
}
