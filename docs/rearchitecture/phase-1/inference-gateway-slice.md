# Phase 1 Slice: Inference Gateway Runtime

## Scope

This slice turns the inference gateway from a placeholder into a real runtime surface:

- persisted provider configuration
- real provider probe execution
- queue and concurrency metrics
- admin control-plane wiring
- compatibility sync with legacy `ai-model`

## What Landed

### 1. Real gateway runtime in Rust

`crates/inference-gateway/src/lib.rs` now provides:

- provider config normalization
- active provider state
- queue depth and in-flight counters
- success / failure counters
- last success / last error tracking
- real HTTP probe execution via `reqwest`

The probe path currently targets OpenAI-compatible style endpoints and treats `2xx`, `401`, `403`, `404`, and `405` as reachable enough for compatibility validation.

### 2. Core API provider system routes

The new runtime now exposes:

- `GET /system/provider`
- `PUT /system/provider`
- `POST /system/provider/test`

`PUT /system/provider` persists provider config into runtime snapshot state, updates the inference gateway in-memory runtime, and keeps `config.ai_model` aligned with `provider.model`.

`POST /system/provider/test` now executes a real network probe through the gateway instead of returning a scaffolded acceptance message.

### 3. System status metrics

`GET /system/status` now surfaces live inference runtime telemetry:

- `activeProvider`
- `queueDepth`
- `maxConcurrency`
- `inFlightRequests`
- `totalRequests`
- `successfulRequests`
- `failedRequests`
- `lastSuccessAt`
- `lastError`

This gives the admin control plane a real production-facing status surface for the gateway queue.

### 4. Legacy compatibility alignment

The legacy compatibility route `PUT /api/config/ai-model` now updates both:

- `runtime.config.ai_model`
- `runtime.config.provider.model`

This keeps the old config surface behaviorally compatible while preventing drift between the compatibility layer and the new gateway runtime.

### 5. Admin runtime wiring

`apps/admin/src/routes/dashboard-page.tsx` now:

- loads saved provider config on boot
- resets the provider form from runtime state
- allows saving provider config separately from probing
- sends `mode` through the typed system contract
- shows active provider and queue metrics
- shows probe result details including normalized endpoint and status code

## Validation Notes

This slice was verified locally with real process execution:

- `cargo check` in `crates/inference-gateway`
- `cargo check` in `crates/core-api`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Runtime verification was performed by starting the new Core API on `127.0.0.1:39092` with a dedicated temporary runtime path, then:

- `PUT /system/provider`
- `GET /system/provider`
- `POST /system/provider/test`
- `GET /system/status`
- `GET /api/config/ai-model`
- restart Core API
- re-check `GET /system/provider` and `GET /api/config/ai-model`

Observed results during verification:

- provider config saved and reloaded successfully
- probe returned `200` against the local `/health` endpoint
- inference status counters updated in `/system/status`
- `ai-model` compatibility route stayed aligned with the saved provider model
- provider config restored correctly after process restart

## Current Behavior Notes

- the gateway currently provides probe and queue telemetry, not full completion routing yet
- provider secrets are still snapshot-persisted in runtime config for now; keychain migration remains a later slice
- actual high-throughput inference request execution still needs the next runtime slice

## Recommended Next Slice

1. completion-style inference execution queue
2. provider timeout / retry / circuit-breaker policies
3. scheduler and social generation calls routed through the gateway
