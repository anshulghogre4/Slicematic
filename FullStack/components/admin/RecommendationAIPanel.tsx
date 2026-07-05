"use client";

import { Brain } from "lucide-react";
import {
  RECOMMENDATION_DEFAULT_MODEL,
  RECOMMENDATION_OUTPUT_SCHEMA,
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_USER_PAYLOAD_FIELDS
} from "../../lib/recommendation-prompt";

export default function RecommendationAIPanel() {
  return (
    <section className="admin-card ai-panel">
      <Brain />
      <h2>OpenRouter AI Recommendation Engine</h2>
      <p>
        Triggered after name and phone, before menu selection. The API builds a customer feature profile from
        Supabase history, sends grounded menu IDs to OpenRouter, validates returned IDs, logs{" "}
        <code>recommendation_event</code>, and falls back safely when the API key is missing or rate-limited.
      </p>

      <p className="eyebrow">System prompt (live — lib/recommendation-prompt.ts)</p>
      <pre>{RECOMMENDATION_SYSTEM_PROMPT}</pre>

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
      </div>
    </section>
  );
}
