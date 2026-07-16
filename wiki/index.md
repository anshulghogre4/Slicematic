---
title: SliceMatic FullStack LLM Wiki
type: index
status: maintained
scope: FullStack/
last_compiled: 2026-07-16
---

# SliceMatic FullStack LLM Wiki

This is the persistent, LLM-maintained knowledge layer for `FullStack/`. It compiles facts scattered across code, tests, schema, and project documents into a smaller set of trusted, interlinked pages.

Start every FullStack task here, then read [[handoff]] and the pages relevant to the change. Maintenance rules live in [[AGENTS]].

## Current truth

- [[current-state]] — verified build/test status, runtime modes, known risks
- [[handoff]] — latest session context and next actions
- [[contradictions]] — known documentation/code drift and unresolved claims
- [[source-map]] — provenance map from wiki topics to authoritative files
- [[log]] — append-only history of ingest, query, and lint operations

## System map

- [[architecture]] — boundaries, workspaces, request and data flow
- [[components]] — UI component responsibilities and coupling
- [[knowledge-graph]] — dependency and blast-radius map
- [[state-management]] — Zustand, session storage, and identity state
- [[css-system]] — styling conventions and tokens

## Domain and integrations

- [[business-rules]] — pricing, validation, delivery, and checkout invariants
- [[database-schema]] — Supabase/PostgreSQL model
- [[api-contracts]] — route inventory and payload contracts
- [[auth-flows]] — customer, guest, admin, and demo authorization
- [[payments]] — Razorpay, Cashfree, and cash workflows
- [[feature-recommendation]] — personalized recommendation engine
- [[feature-ai-strategist]] — cart insight and upsell engine
- [[feature-forecasting]] — offline Python forecast pipeline
- [[delivery-operations]] — proposed rider, dispatch, fees, ETA, and live tracking domain
- [[ai-microservices]] — modularization, menu voice assistant, recommendation service, and forecast service

## Operations

- [[env-vars]] — configuration and graceful-degradation behavior
- [[testing]] — test inventory, current result, and coverage gaps
- [[scripts-tooling]] — build, seed, forecast, and storage scripts
- [[decisions]] — architecture decision records

## Fast task routing

| Task | Read first | Verify against |
|---|---|---|
| Pricing or checkout | [[business-rules]], [[payments]] | `lib/pricing.ts`, payment/order routes |
| Authentication | [[auth-flows]], [[current-state]] | `lib/*-auth.ts`, `components/EntryPortal/` |
| Database change | [[database-schema]], [[source-map]] | `supabase/schema.sql`, `lib/data-service.ts` |
| UI change | [[components]], [[css-system]] | both large workspace files and `app/globals.css` |
| API change | [[api-contracts]], [[architecture]] | matching `app/api/**/route.ts` and tests |
| AI feature | relevant feature page | route, prompt, fallback, event logging |
| Forecast | [[feature-forecasting]] | `lib/forecast-service.ts`, `scripts/` |
| Delivery/tracking | [[delivery-operations]], [[current-state]] | sprint plan, schema, auth, pricing, confirmation page |
| AI/forecast service | [[ai-microservices]], relevant feature page | AI routes, prompts, forecast Python/service/panel |

## Critical rules

1. Code and executable schema are source evidence; the wiki is the maintained synthesis.
2. Never expose `.env`, `.mcp.json`, or credential-bearing files.
3. Shared UI may exist in both `components/SliceMaticStage3.tsx` and `app/admin-dashboard/page.tsx`; search both before editing.
4. Pricing must be calculated from `lib/pricing.ts` on the server, never trusted from the browser.
5. Supabase-optional and AI-fallback behavior is intentional, but must not weaken configured production security.
6. Every material FullStack change must update affected wiki pages, [[handoff]], and [[log]].
7. When a wiki claim conflicts with source, record it in [[contradictions]] and prefer verified source behavior.

## Knowledge workflow

```text
FullStack code + schema + tests + project MD (source evidence)
                          ↓ ingest/compile
                  wiki/*.md (maintained synthesis)
                          ↓ query
             answer, decision, or implementation
                          ↓ write back
             affected pages + index + log + handoff
```

The wiki is intentionally plain Markdown and small enough for direct agent search. No vector database is currently warranted.
