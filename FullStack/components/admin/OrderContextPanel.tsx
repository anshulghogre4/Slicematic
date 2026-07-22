"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bike,
  Clock,
  MapPin,
  ReceiptText,
  X,
  BadgeCheck,
  AlertTriangle,
  Hourglass,
  CreditCard,
  User,
  Package,
} from "lucide-react";
import { money } from "../../lib/pricing";
import type { SavedOrder } from "../../lib/types";
import { Button, StatusPill } from "../ui";

type OrderContextPanelProps = { order: SavedOrder; onClose: () => void };

function paymentTone(order: SavedOrder): "success" | "warning" | "danger" {
  if (order.paymentStatus === "failed") return "danger";
  if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") return "success";
  return "warning";
}

function orderStatusTone(status: string): "success" | "info" | "warning" | "danger" {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "delivery") return "info";
  return "warning";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "delivered") return <BadgeCheck size={13} />;
  if (status === "cancelled") return <AlertTriangle size={13} />;
  if (status === "delivery") return <Bike size={13} />;
  return <Hourglass size={13} />;
}

export function OrderContextPanel({ order, onClose }: OrderContextPanelProps) {
  const hasLines = Array.isArray(order.lines) && order.lines.length > 0;
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={order.id}
        className="ocp"
        aria-labelledby="ocp-title"
        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: 24 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="ocp__header">
          <div>
            <p className="ocp__eyebrow">Selected order</p>
            <h3 id="ocp-title" className="ocp__order-id">
              #{order.id.slice(0, 8).toUpperCase()}
            </h3>
            <span className="ocp__date">
              <Clock size={11} aria-hidden="true" />
              {new Date(order.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close order details"
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <div className="ocp__pills">
          <StatusPill tone={orderStatusTone(order.status)}>
            <StatusIcon status={order.status} />
            {order.status}
          </StatusPill>
          <StatusPill tone={paymentTone(order)}>
            {order.paymentMode} · {order.paymentStatus ?? "confirmed"}
          </StatusPill>
        </div>

        <dl className="ocp__facts">
          <div className="ocp__fact">
            <User size={14} className="ocp__fact-icon" aria-hidden="true" />
            <div>
              <dt>Customer</dt>
              <dd>
                {order.customerName}
                {order.phone && <small>{order.phone}</small>}
              </dd>
            </div>
          </div>

          <div className="ocp__fact">
            <CreditCard size={14} className="ocp__fact-icon" aria-hidden="true" />
            <div>
              <dt>Total charged</dt>
              <dd>
                <span className="ocp__total">{money(order.finalTotal)}</span>
                <small>
                  Subtotal {money(order.subtotal)} · GST {money(order.gst)}
                  {order.discount > 0 && ` · −${money(order.discount)}`}
                </small>
              </dd>
            </div>
          </div>

          <div className="ocp__fact">
            <MapPin size={14} className="ocp__fact-icon" aria-hidden="true" />
            <div>
              <dt>Delivery zone</dt>
              <dd>
                {order.deliveryZone ? `${order.deliveryZone} km zone` : "Zone unavailable"}
                {order.address && <small>{order.address}</small>}
              </dd>
            </div>
          </div>
        </dl>

        <div className="ocp__divider" />

        <section aria-labelledby="ocp-items-title">
          <h4 id="ocp-items-title" className="ocp__section-title">
            <ReceiptText size={14} aria-hidden="true" />
            Order items
          </h4>

          {hasLines ? (
            <ul className="ocp__lines">
              {order.lines.map((line, i) => (
                <li key={`${line.pizzaName}-${i}`} className="ocp__line">
                  <span className="ocp__line-info">
                    <strong>{line.quantity} × {line.pizzaName}</strong>
                    <small>
                      {line.sizeName} / {line.baseName}
                      {line.toppings.length ? ` · ${line.toppings.slice(0, 3).join(", ")}${line.toppings.length > 3 ? "…" : ""}` : ""}
                    </small>
                  </span>
                  <span className="ocp__line-price">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ocp__no-items">No line items recorded for this order.</p>
          )}
        </section>

        <div className="ocp__dispatch">
          <Package size={15} aria-hidden="true" />
          <div>
            <strong>Dispatch not connected</strong>
            <p>Rider, ETA &amp; live location will appear once delivery schema is live.</p>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
