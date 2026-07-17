"use client";

/**
 * AdminOverviewPanel — Premium analytics dashboard with Framer Motion + Recharts.
 * Apple-inspired glassmorphism design, animated KPI cards, area chart, donut chart.
 */

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, ShoppingBag, Receipt, Truck,
  Sparkles, AlertTriangle, RefreshCw, Loader2,
  ArrowUpRight, ChevronRight,
} from "lucide-react";
import type { AdminSummary } from "../../../lib/types";
import { money } from "../../../lib/pricing";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  onRefresh: () => void;
};

// ── Animation presets ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v).toLocaleString("en-IN")}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, target, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
const ACCENT_COLORS = ["#c5362c", "#6366f1", "#f59e0b", "#10b981"];

function KpiCard({
  icon, label, value, sub, accentIndex = 0, index,
}: {
  icon: React.ReactNode; label: string; value: number; sub?: string;
  accentIndex?: number; index: number;
}) {
  const accent = ACCENT_COLORS[accentIndex % ACCENT_COLORS.length];
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      whileHover={{ y: -4, boxShadow: "0 20px 48px rgba(0,0,0,0.14)" }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 20,
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 300 }}
          style={{
            width: 46, height: 46, borderRadius: 13,
            background: accent, display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", flexShrink: 0,
          }}
        >
          {icon}
        </motion.div>
        <ArrowUpRight size={15} color="var(--muted)" />
      </div>
      <div>
        <div style={{ fontSize: "2rem", fontWeight: 750, letterSpacing: "-1px", color: "#111", lineHeight: 1 }}>
          <AnimatedNumber target={value} prefix={label.includes("order") && !label.includes("avg") ? "" : "₹"} />
        </div>
        <div style={{ fontSize: "0.72rem", color: "#888", marginTop: 6, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: "0.78rem", color: "#10b981", marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: "#111" }}>{money(payload[0].value)}</div>
    </div>
  );
}

// ── Priority badge ────────────────────────────────────────────────────────────
const priorityColors: Record<string, { bg: string; text: string; bar: string }> = {
  High: { bg: "#fff0f0", text: "#c5362c", bar: "#c5362c" },
  Medium: { bg: "#fffbeb", text: "#b45309", bar: "#f59e0b" },
  Low: { bg: "#f0fdf4", text: "#15803d", bar: "#10b981" },
};

// ── Main component ────────────────────────────────────────────────────────────
export function AdminOverviewPanel({ summary, opsBriefing, opsLoading, onRefresh }: Props) {
  const totalRevenue = summary.totalRevenue ?? 0;
  const totalOrders = summary.orderCount ?? summary.recentOrders?.length ?? 0;
  const avgTicket = summary.avgOrderValue ?? 0;
  const deliveryTotal = summary.recentOrders?.reduce((s, o) =>
    s + Math.max(0, o.finalTotal - o.subtotal - o.gst + o.discount), 0) ?? 0;

  // ── Hourly revenue chart data ──────────────────────────────────────────────
  const hourlyData = summary.hourlyDemand?.map((h) => ({
    hour: h.hour,
    revenue: h.revenue,
    orders: h.orders,
  })) ?? [];

  // ── Payment donut data ─────────────────────────────────────────────────────
  const paymentData = summary.paymentMix?.map((p) => ({
    name: p.mode, value: p.count, revenue: p.revenue,
  })) ?? (() => {
    const breakdown: Record<string, number> = {};
    summary.recentOrders?.forEach((o) => {
      breakdown[o.paymentMode] = (breakdown[o.paymentMode] ?? 0) + 1;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value, revenue: 0 }));
  })();

  const PIE_COLORS = ["#c5362c", "#6366f1", "#10b981", "#f59e0b"];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
      >
        <KpiCard index={0} accentIndex={0} icon={<TrendingUp size={20} />} label="Total Revenue" value={totalRevenue} />
        <KpiCard index={1} accentIndex={1} icon={<ShoppingBag size={20} />} label="Total Orders" value={totalOrders} />
        <KpiCard index={2} accentIndex={2} icon={<Receipt size={20} />} label="Avg Ticket" value={Math.round(avgTicket)} />
        <KpiCard index={3} accentIndex={3} icon={<Truck size={20} />} label="Delivery Collected" value={Math.round(deliveryTotal)} />
      </motion.div>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}
      >
        {/* Revenue area chart */}
        <motion.div
          custom={4}
          variants={fadeUp}
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 20, padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111" }}>Hourly Revenue</h3>
            <span style={{ fontSize: "0.72rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Today</span>
          </div>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c5362c" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#c5362c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v as number / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke="#c5362c" strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 3, fill: "#c5362c", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#c5362c", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "0.875rem" }}>
              No hourly data available yet.
            </div>
          )}
        </motion.div>

        {/* Payment breakdown donut */}
        <motion.div
          custom={5}
          variants={fadeUp}
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 20, padding: "24px",
          }}
        >
          <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 700, color: "#111" }}>Payment Mix</h3>
          <p style={{ margin: "0 0 16px", fontSize: "0.75rem", color: "#888" }}>{totalOrders} total orders</p>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={900}
                >
                  {paymentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} orders`, name]}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: "0.75rem", color: "#555", fontWeight: 600 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "0.875rem" }}>
              No payment data yet.
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── AI Ops Briefing ──────────────────────────────────────────────── */}
      <motion.div
        custom={6}
        variants={fadeUp}
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 20, padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #c5362c)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={15} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111" }}>AI Ops Briefing</h3>
          </div>
          <motion.button
            type="button"
            onClick={onRefresh}
            whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#888", display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem" }}
          >
            <RefreshCw size={13} style={{ animation: opsLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {opsLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10, color: "#888", padding: "20px 0" }}
            >
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.875rem" }}>Generating ops briefing…</span>
            </motion.div>
          ) : opsBriefing ? (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#555", lineHeight: 1.65, borderLeft: "3px solid #6366f1", paddingLeft: 14 }}>
                {opsBriefing.briefing}
              </p>

              {opsBriefing.staffing && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 2, minWidth: 60 }}>Staffing</span>
                  <span style={{ fontSize: "0.84rem", color: "#444" }}>{opsBriefing.staffing}</span>
                </div>
              )}

              {opsBriefing.prepList?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Prep checklist</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {opsBriefing.prepList.map((item, i) => (
                      <span key={i} style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 100, background: "rgba(99,102,241,0.08)", color: "#6366f1", fontWeight: 600 }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {opsBriefing.actions?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Action items</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {opsBriefing.actions.map((action, i) => {
                      const colors = priorityColors[action.priority] ?? priorityColors.Low;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "12px 14px", borderRadius: 12,
                            background: colors.bg, borderLeft: `3px solid ${colors.bar}`,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#111", marginBottom: 3 }}>{action.title}</div>
                            <div style={{ fontSize: "0.78rem", color: "#666" }}>{action.detail}</div>
                          </div>
                          <span style={{
                            fontSize: "0.65rem", fontWeight: 800, padding: "3px 8px",
                            borderRadius: 100, background: colors.bar, color: "#fff",
                            textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                          }}>
                            {action.priority}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 10, color: "#aaa", padding: "16px 0", fontSize: "0.875rem" }}
            >
              <AlertTriangle size={16} color="#f59e0b" />
              <span>AI ops briefing unavailable in demo mode. Configure an LLM API key to enable it.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Recent Orders Table ──────────────────────────────────────────── */}
      <motion.div
        custom={7}
        variants={fadeUp}
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 20, overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111" }}>Recent Orders</h3>
          {summary.topPizza && (
            <span style={{ fontSize: "0.75rem", color: "#888" }}>🏆 Top seller: <strong style={{ color: "#c5362c" }}>{summary.topPizza}</strong></span>
          )}
        </div>
        <div style={{ overflowX: "auto", padding: "12px 0 0" }}>
          {!summary.recentOrders?.length ? (
            <p style={{ color: "#aaa", fontSize: "0.875rem", padding: "16px 24px 24px" }}>No orders yet. They'll appear here in real time.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr>
                  {["Order ID", "Customer", "Time", "Items", "Payment", "Total", "Status"].map((h) => (
                    <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: "#aaa", fontWeight: 700, textTransform: "uppercase", fontSize: "0.67rem", letterSpacing: "0.08em", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.recentOrders.slice(0, 12).map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    whileHover={{ background: "rgba(0,0,0,0.015)" }}
                  >
                    <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: "0.76rem", color: "#999" }}>{order.id.slice(0, 8)}…</td>
                    <td style={{ padding: "11px 16px", fontWeight: 600, color: "#333" }}>{order.customerName || "Guest"}</td>
                    <td style={{ padding: "11px 16px", color: "#999" }}>
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "11px 16px" }}>{order.lines?.length ?? "—"}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        padding: "3px 9px", borderRadius: 100, fontSize: "0.7rem", fontWeight: 700,
                        background: order.paymentMode === "UPI" ? "#e0f2fe" : order.paymentMode === "Card" ? "#ede9fe" : "#dcfce7",
                        color: order.paymentMode === "UPI" ? "#0369a1" : order.paymentMode === "Card" ? "#7c3aed" : "#15803d",
                      }}>
                        {order.paymentMode}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: 700, color: "#111" }}>{money(order.finalTotal)}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        padding: "3px 9px", borderRadius: 100, fontSize: "0.7rem", fontWeight: 700,
                        background: order.status === "confirmed" ? "#dcfce7" : order.status === "preparing" ? "#fef9c3" : "#f3f4f6",
                        color: order.status === "confirmed" ? "#15803d" : order.status === "preparing" ? "#854d0e" : "#6b7280",
                        textTransform: "capitalize",
                      }}>
                        {order.status ?? "placed"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
