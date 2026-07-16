---
title: SliceMatic Wiki Operation Log
type: log
status: append-only
scope: wiki/
---

# SliceMatic Wiki Operation Log

Entries use `## [YYYY-MM-DD] operation | title` so agents and shell tools can parse the timeline.

## [2026-07-06] ingest | Initial FullStack wiki

- Created the first architecture, component, API, CSS, state, business-rule, auth, payment, database, environment, testing, tooling, decision, graph, and handoff pages.
- Source scope: `FullStack/` and project documentation available at that time.

## [2026-07-16] lint | FullStack verification

- Inspected 99 supported FullStack files: 77 code, 6 documents, and 16 static images.
- Structural extraction found 405 entities and 1,109 relationships.
- Verified production build passes.
- Verified tests currently report 92 passed and one failed.
- Identified drift in database, auth, API, and testing pages; recorded in [[contradictions]].

## [2026-07-16] ingest | Karpathy-style knowledge layer

- Added [[AGENTS]] as the wiki schema.
- Rebuilt [[index]] as the content-oriented navigation entry.
- Added [[source-map]], [[current-state]], [[contradictions]], and this append-only operation log.
- Connected existing feature pages into the main navigation.
- Adopted ingest, query, lint, and mandatory writeback operations.

## [2026-07-16] query | Delivery intelligence and tracking sprint

- Audited unused `customer_activity` and `customer_preference` tables and the current static tracking flow.
- Researched current delivery lifecycle, live location, ETA, privacy, Supabase Realtime, and mapping providers through official sources.
- Selected Google Maps plus private Supabase Broadcast as the India MVP direction, behind provider abstractions.
- Added [[delivery-operations]] and a five-sprint implementation backlog covering security, preferences, activity, fees, dispatch, rider PWA, maps, ETA, proof, and rollout.

## [2026-07-16] query | Forecast, voice, segregation, and AI services

- Verified the existing Random Forest training, cache, refresh route, metadata, and dashboard chart against source.
- Added a deployment-safe forecast-service sprint with run/point persistence and a dashboard Refresh Forecast workflow.
- Added a grounded menu voice-assistant design with typed fallback, push-to-talk, speech synthesis, and menu-ID validation.
- Added modular-monolith extraction tasks before recommendation/voice and forecasting microservice extraction.
- Added [[ai-microservices]] as the durable architecture summary.

## [2026-07-16] query | Map API free-tier options

- Compared Google India, TomTom, Geoapify, LocationIQ, Mapbox, MapTiler/MapLibre, open self-hosted stacks, and HERE using current official pricing/terms.
- Added a separate provider-options section to the sprint with quotas, card/billing requirements, commercial limitations, caching/attribution cautions, and selection ladder.
- Identified TomTom as the strongest no-credit-card developer option, Geoapify as the simplest small free prototype, and Google as the provisional India production option.
- Excluded HERE's Limited/Base plans from rider tracking because their published excluded-use terms cover asset tracking.
