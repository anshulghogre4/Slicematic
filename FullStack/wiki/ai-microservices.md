---
title: AI and Forecast Microservices
type: architecture
status: proposed
scope: FullStack/ and services/
last_updated: 2026-07-16
implementation_plan: FullStack/plans/fullstack-delivery-intelligence-sprints.md
---

# AI and Forecast Microservices

SliceMatic currently hosts UI, BFF routes, domain logic, OpenRouter orchestration, and Python process execution inside one Next.js deployment. The migration target is a modular web/BFF plus two independently deployable AI-oriented services.

## Current forecast

The existing [[feature-forecasting]] implementation uses scikit-learn `RandomForestRegressor` with weekday/hour features to forecast hourly demand for the next seven days. The admin refresh route already loads current order timestamps and retrains, but it spawns local Python and writes a filesystem cache. The dashboard chart exists; the refresh button and deployment-safe run persistence do not.

Target: Python Forecast Service, asynchronous run records, PostgreSQL forecast points, a Refresh Forecast button, previous-success fallback, and quality monitoring against a naive baseline.

## AI service

The TypeScript AI Service will own OpenRouter calls, prompt/version management, JSON validation, deterministic fallbacks, and these capabilities:

- Personalized recommendations
- Grounded menu question answering for the dashboard voice assistant
- Cart insight
- Menu copy
- Operations briefing

The Next.js BFF retains user authorization and loads authoritative menu/customer/order context. It sends only bounded, non-PII context to AI services.

## Voice menu assistant

Typed questions are always supported. Push-to-talk speech recognition is optional progressive enhancement, followed by optional browser speech synthesis. Answers must be grounded in the current menu and return matching item IDs; the model cannot invent menu facts.

## Extraction order

1. Characterize current behavior with tests.
2. Split large components into feature modules and move route business logic into server modules.
3. Define versioned contracts and in-process adapters.
4. Extract the TypeScript AI Service.
5. Extract the Python Forecast Service.
6. Switch BFF clients behind feature flags and retain fallbacks.

Related pages: [[architecture]], [[components]], [[feature-recommendation]], [[feature-ai-strategist]], [[feature-forecasting]], [[delivery-operations]], [[testing]].
