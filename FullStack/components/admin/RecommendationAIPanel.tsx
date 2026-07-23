"use client";

import Link from "next/link";
import { Brain, Sparkles, Wand2 } from "lucide-react";
import { AiServiceCard, FadeInUp, StatusPill } from "../ui";
import {
  RECOMMENDATION_DEFAULT_MODEL,
  RECOMMENDATION_OUTPUT_SCHEMA,
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_USER_PAYLOAD_FIELDS
} from "../../lib/recommendation-prompt";

export default function RecommendationAIPanel() {
  return (
    <FadeInUp>
      <section className="admin-card ai-panel ai-console admin-workspace-shell">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">AI operations</p>
            <h2>Grounded AI services</h2>
            <p>
              Recommendation, menu copy, and ops briefing share the same calm cockpit pattern as Orders —
              status first, prompts second. No invented live-agent console until S4 APIs land.
            </p>
          </div>
          <StatusPill tone="info">Display-only</StatusPill>
        </div>

        <div className="ai-console-grid">
          <AiServiceCard
            name="Recommendation engine"
            status="live"
            lastSuccess="POST /api/recommend after customer login"
            action={
              <span style={{ color: "var(--sui-text-tertiary)", fontSize: "var(--text-micro)" }}>
                <Brain size={16} aria-hidden />
              </span>
            }
          />
          <AiServiceCard
            name="Menu copy polish"
            status="live"
            lastSuccess="Menu → Create item → AI polish"
            action={
              <span style={{ color: "var(--sui-text-tertiary)", fontSize: "var(--text-micro)" }}>
                <Wand2 size={16} aria-hidden />
              </span>
            }
          />
          <AiServiceCard
            name="Ops briefing"
            status="degraded"
            lastSuccess="Overview — offline when LLM unavailable (no fake insights)"
            action={
              <span style={{ color: "var(--sui-text-tertiary)", fontSize: "var(--text-micro)" }}>
                <Sparkles size={16} aria-hidden />
              </span>
            }
          />
        </div>

        <div className="admin-glass-card ai-console-honesty">
          <p className="eyebrow">Ops briefing honesty</p>
          <p>
            When the LLM is missing or the provider fails, Overview shows a degraded empty state — not a spinner
            forever and not invented shift paragraphs. Admins can still run the shift from revenue KPIs, hourly
            revenue, payment mix, and recent orders. Retry from Overview → Refresh after the server provider key
            is available.
          </p>
          <p>
            <Link href="/admin-dashboard?tab=overview">Open Overview briefing</Link>
          </p>
        </div>

        <div className="admin-glass-card">
          <p className="eyebrow">How recommendations run</p>
          <p>
            Triggered after name and phone, before menu selection. The API builds a customer feature profile from
            Supabase history, sends grounded menu IDs to OpenRouter, validates returned IDs, logs{" "}
            <code>recommendation_event</code>, and falls back safely when the API key is missing or rate-limited.
          </p>
          <div className="ai-prompt-meta">
            <p>
              <strong>Model:</strong> <code>{RECOMMENDATION_DEFAULT_MODEL}</code> — override with env{" "}
              <code>OPENROUTER_MODEL</code>
            </p>
            <p>
              <strong>Response format:</strong> OpenRouter <code>response_format: json_object</code>
            </p>
            <p>
              <strong>Output schema:</strong> {RECOMMENDATION_OUTPUT_SCHEMA}
            </p>
            <p>
              <strong>User message payload:</strong> {RECOMMENDATION_USER_PAYLOAD_FIELDS.join("; ")}
            </p>
            <p>
              <strong>Endpoint:</strong> <code>POST /api/recommend</code>
            </p>
            <p>
              <strong>Related:</strong>{" "}
              <Link href="/admin-dashboard?tab=overview">Overview ops briefing</Link>
              {" · "}
              <Link href="/admin-dashboard?tab=menu">Menu AI polish</Link>
            </p>
          </div>
        </div>

        <details className="ai-console-details admin-glass-card">
          <summary>System prompt (live — lib/recommendation-prompt.ts)</summary>
          <pre>{RECOMMENDATION_SYSTEM_PROMPT}</pre>
        </details>
      </section>
    </FadeInUp>
  );
}
