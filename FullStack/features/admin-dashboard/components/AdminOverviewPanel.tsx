"use client";

/**
 * AdminOverviewPanel — kitchen ops cockpit.
 * Intent: shift manager scans revenue first, then acts on briefing.
 * Hierarchy: revenue hero → demoted stats → briefing workbench → charts → orders.
 * Palette: tomato brand only; status color for status; no rainbow SaaS accents.
 */

import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, ShoppingBag, Receipt, Truck,
  Sparkles, AlertTriangle, RefreshCw, Loader2, Info,
} from "lucide-react";
import type { AdminSummary } from "../../../lib/types";
import { money } from "../../../lib/pricing";
import { Button, StatusPill } from "../../../components/ui";
import type { OpsBriefingStatus } from "../hooks/useAdminSession";

type OpsBriefing = {
  briefing: string;
  staffing: string;
  prepList: string[];
  revenueWatch: string;
  actions: Array<{ title: string; detail: string; priority: "High" | "Medium" | "Low" }>;
};

type Props = {
  summary: AdminSummary;
  opsBriefing: OpsBriefing | null;
  opsLoading: boolean;
  opsStatus: OpsBriefingStatus;
  onRefresh: () => void;
};

/** Bound to globals.css tokens (--tomato / --gold / --basil / tertiary). Recharts needs concrete fills. */
const CHART = {
  brand: "#c5362c",
  gold: "#d99532",
  basil: "#166d45",
  muted: "#8a8178",
  tick: "#8a8178",
  grid: "rgba(22, 21, 19, 0.06)",
} as const;

const PIE_COLORS = [CHART.brand, CHART.gold, CHART.basil, CHART.muted];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function fadeUp(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.22, ease: EASE_OUT },
    }),
  };
}

function stagger(reduceMotion: boolean | null) {
  if (reduceMotion) return undefined;
  return { visible: { transition: { staggerChildren: 0.04 } } };
}

function AnimatedNumber({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
}) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? target : 0);
  const rounded = useTransform(
    count,
    (v) => `${prefix}${Math.round(v).toLocaleString("en-IN")}${suffix}`,
  );

  useEffect(() => {
    if (reduceMotion) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration: 0.28, ease: EASE_OUT });
    return controls.stop;
  }, [target, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return <motion.span className="admin-overview__tabular">{rounded}</motion.span>;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-overview__tooltip">
      <div className="admin-overview__tooltip-label">{label}</div>
      <div className="admin-overview__tooltip-value admin-overview__tabular">{money(payload[0].value)}</div>
    </div>
  );
}

function priorityTone(priority: string): "danger" | "warning" | "success" {
  if (priority === "High") return "danger";
  if (priority === "Medium") return "warning";
  return "success";
}

function paymentTone(mode: string): "info" | "success" | "neutral" {
  if (mode === "UPI") return "info";
  if (mode === "Cash") return "success";
  return "neutral";
}

function orderStatusTone(status: string | undefined): "success" | "warning" | "neutral" {
  if (status === "confirmed") return "success";
  if (status === "preparing") return "warning";
  return "neutral";
}

function OpsBriefingState({
  status,
}: {
  status: Exclude<OpsBriefingStatus, "loading" | "live">;
}) {
  const copy: Record<Exclude<OpsBriefingStatus, "loading" | "live">, { title: string; detail: string }> = {
    idle: {
      title: "Ops briefing not loaded yet",
      detail: "Use Refresh after the admin session starts. Revenue, charts, and recent orders below still work.",
    },
    degraded: {
      title: "AI ops briefing unavailable",
      detail:
        "The LLM did not run — usually a missing provider key or upstream failure. No invented shift advice is shown. Use revenue, charts, and recent orders below; retry with Refresh after the server key is configured.",
    },
    empty: {
      title: "No briefing content returned",
      detail: "The request succeeded but the briefing body was empty. Metrics and recent orders below are still available.",
    },
    error: {
      title: "Could not load ops briefing",
      detail: "The request failed. Check the connection and try Refresh. Overview metrics and orders below are unaffected.",
    },
  };
  const { title, detail } = copy[status];
  const Icon = status === "idle" ? Info : AlertTriangle;

  return (
    <div className="admin-overview__state admin-overview__state--stack" role="status">
      <Icon size={16} aria-hidden="true" />
      <div className="admin-overview__state-copy">
        <p className="admin-overview__state-title">{title}</p>
        <p className="admin-overview__state-detail">{detail}</p>
      </div>
    </div>
  );
}

export function AdminOverviewPanel({ summary, opsBriefing, opsLoading, opsStatus, onRefresh }: Props) {
  const reduceMotion = useReducedMotion();
  const variants = fadeUp(reduceMotion);
  const staggerVariants = stagger(reduceMotion);

  const totalRevenue = summary.totalRevenue ?? 0;
  const totalOrders = summary.orderCount ?? summary.recentOrders?.length ?? 0;
  const avgTicket = summary.avgOrderValue ?? 0;
  const deliveryTotal =
    summary.recentOrders?.reduce(
      (s, o) => s + Math.max(0, o.finalTotal - o.subtotal - o.gst + o.discount),
      0,
    ) ?? 0;

  const hourlyData =
    summary.hourlyDemand?.map((h) => ({
      hour: h.hour,
      revenue: h.revenue,
      orders: h.orders,
    })) ?? [];

  const paymentData =
    summary.paymentMix?.map((p) => ({
      name: p.mode,
      value: p.count,
      revenue: p.revenue,
    })) ??
    (() => {
      const breakdown: Record<string, number> = {};
      summary.recentOrders?.forEach((o) => {
        breakdown[o.paymentMode] = (breakdown[o.paymentMode] ?? 0) + 1;
      });
      return Object.entries(breakdown).map(([name, value]) => ({ name, value, revenue: 0 }));
    })();

  const pieDuration = reduceMotion ? 0 : 220;

  return (
    <motion.div
      className="admin-overview admin-workspace-shell"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={staggerVariants}
    >
      {/* Revenue hero + demoted stats */}
      <motion.section
        className="admin-overview__kpi"
        variants={staggerVariants}
        aria-label="Shift metrics"
      >
        <motion.article className="admin-overview__hero" custom={0} variants={variants}>
          <div className="admin-overview__hero-icon" aria-hidden="true">
            <TrendingUp size={22} />
          </div>
          <div className="admin-overview__hero-copy">
            <p className="admin-overview__eyebrow">Total revenue</p>
            <p className="admin-overview__hero-value">
              <AnimatedNumber target={totalRevenue} prefix="₹" />
            </p>
          </div>
        </motion.article>

        <div className="admin-overview__stats">
          <motion.article className="admin-overview__stat" custom={1} variants={variants}>
            <ShoppingBag size={16} aria-hidden="true" />
            <div>
              <p className="admin-overview__eyebrow">Orders</p>
              <p className="admin-overview__stat-value">
                <AnimatedNumber target={totalOrders} />
              </p>
            </div>
          </motion.article>
          <motion.article className="admin-overview__stat" custom={2} variants={variants}>
            <Receipt size={16} aria-hidden="true" />
            <div>
              <p className="admin-overview__eyebrow">Avg ticket</p>
              <p className="admin-overview__stat-value">
                <AnimatedNumber target={Math.round(avgTicket)} prefix="₹" />
              </p>
            </div>
          </motion.article>
          <motion.article className="admin-overview__stat" custom={3} variants={variants}>
            <Truck size={16} aria-hidden="true" />
            <div>
              <p className="admin-overview__eyebrow">Delivery collected</p>
              <p className="admin-overview__stat-value">
                <AnimatedNumber target={Math.round(deliveryTotal)} prefix="₹" />
              </p>
            </div>
          </motion.article>
        </div>
      </motion.section>

      {/* Ops briefing — primary workbench */}
      <motion.section
        className="admin-overview__briefing"
        custom={4}
        variants={variants}
        aria-labelledby="admin-ops-briefing-title"
      >
        <div className="admin-overview__briefing-head">
          <div className="admin-overview__briefing-title-row">
            <span className="admin-overview__briefing-mark" aria-hidden="true">
              <Sparkles size={15} />
            </span>
            <h3 id="admin-ops-briefing-title">AI Ops Briefing</h3>
            {opsStatus === "live" ? <StatusPill tone="success">Live</StatusPill> : null}
            {opsStatus === "degraded" ? <StatusPill tone="warning">Degraded</StatusPill> : null}
            {opsStatus === "error" ? <StatusPill tone="danger">Failed</StatusPill> : null}
            {opsStatus === "empty" ? <StatusPill tone="neutral">Empty</StatusPill> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={opsLoading}
            aria-busy={opsLoading}
            className="admin-overview__refresh"
          >
            <RefreshCw size={14} className={opsLoading ? "admin-overview__spin" : undefined} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {opsLoading || opsStatus === "loading" ? (
            <motion.div
              key="loading"
              className="admin-overview__state"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              role="status"
              aria-live="polite"
            >
              <Loader2 size={16} className="admin-overview__spin" aria-hidden="true" />
              <span>Loading ops briefing…</span>
            </motion.div>
          ) : opsStatus === "live" && opsBriefing ? (
            <motion.div
              key="briefing"
              className="admin-overview__briefing-body"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <p className="admin-overview__briefing-lede">{opsBriefing.briefing}</p>

              {opsBriefing.staffing ? (
                <div className="admin-overview__fact">
                  <span className="admin-overview__eyebrow">Staffing</span>
                  <span>{opsBriefing.staffing}</span>
                </div>
              ) : null}

              {opsBriefing.prepList?.length > 0 ? (
                <div>
                  <p className="admin-overview__eyebrow">Prep checklist</p>
                  <ul className="admin-overview__prep">
                    {opsBriefing.prepList.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {opsBriefing.actions?.length > 0 ? (
                <div>
                  <p className="admin-overview__eyebrow">Action items</p>
                  <ul className="admin-overview__actions">
                    {opsBriefing.actions.map((action, i) => (
                      <motion.li
                        key={`${action.title}-${i}`}
                        className={`admin-overview__action admin-overview__action--${action.priority.toLowerCase()}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: 0.18 }}
                      >
                        <div>
                          <p className="admin-overview__action-title">{action.title}</p>
                          <p className="admin-overview__action-detail">{action.detail}</p>
                        </div>
                        <StatusPill tone={priorityTone(action.priority)}>{action.priority}</StatusPill>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key={opsStatus}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <OpsBriefingState
                status={opsStatus === "live" ? "empty" : opsStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Charts — secondary plane */}
      <motion.section
        className="admin-overview__charts"
        variants={staggerVariants}
        aria-label="Revenue and payment charts"
      >
        <motion.article className="admin-overview__chart-card" custom={5} variants={variants}>
          <div className="admin-overview__section-head">
            <h3>Hourly Revenue</h3>
            <span className="admin-overview__eyebrow">Today</span>
          </div>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.brand} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={CHART.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART.tick }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${((v as number) / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={CHART.brand}
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  isAnimationActive={!reduceMotion}
                  animationDuration={pieDuration}
                  dot={{ r: 3, fill: CHART.brand, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: CHART.brand, stroke: "var(--sui-surface-raised)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="admin-overview__empty-chart">No hourly data available yet.</p>
          )}
        </motion.article>

        <motion.article className="admin-overview__chart-card" custom={6} variants={variants}>
          <div className="admin-overview__section-head">
            <h3>Payment Mix</h3>
            <span className="admin-overview__eyebrow">{totalOrders} orders</span>
          </div>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={!reduceMotion}
                  animationBegin={0}
                  animationDuration={pieDuration}
                >
                  {paymentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} orders`, name]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--sui-border-soft)",
                    fontSize: 12,
                    background: "var(--sui-surface-raised)",
                    color: "var(--sui-text-primary)",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="admin-overview__legend">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="admin-overview__empty-chart">No payment data yet.</p>
          )}
        </motion.article>
      </motion.section>

      {/* Recent orders */}
      <motion.section className="admin-overview__orders" custom={7} variants={variants} aria-labelledby="admin-recent-orders-title">
        <div className="admin-overview__orders-head">
          <h3 id="admin-recent-orders-title">Recent Orders</h3>
          {summary.topPizza ? (
            <p className="admin-overview__top-seller">
              Top seller: <strong>{summary.topPizza}</strong>
            </p>
          ) : null}
        </div>

        {!summary.recentOrders?.length ? (
          <p className="admin-overview__empty-table">No orders yet. They&apos;ll appear here in real time.</p>
        ) : (
          <div className="admin-overview__table-wrap">
            <table className="admin-overview__table">
              <thead>
                <tr>
                  {["Order ID", "Customer", "Time", "Items", "Payment", "Total", "Status"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.recentOrders.slice(0, 12).map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.03, duration: 0.18 }}
                  >
                    <td className="admin-overview__mono">{order.id.slice(0, 8)}…</td>
                    <td className="admin-overview__strong">{order.customerName || "Guest"}</td>
                    <td className="admin-overview__muted admin-overview__tabular">
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="admin-overview__tabular">{order.lines?.length ?? "—"}</td>
                    <td>
                      <StatusPill tone={paymentTone(order.paymentMode)}>{order.paymentMode}</StatusPill>
                    </td>
                    <td className="admin-overview__strong admin-overview__tabular">{money(order.finalTotal)}</td>
                    <td>
                      <StatusPill tone={orderStatusTone(order.status)}>
                        {order.status ?? "placed"}
                      </StatusPill>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
