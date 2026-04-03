# Phase 1 Slice: Gateway-backed Proactive Messages

## Scope

This slice routes scheduler-driven proactive character messages through the new inference gateway while preserving the current scheduling rules:

- daily proactive memory scan
- one-message-per-day gating
- direct-conversation delivery
- fallback preservation when provider execution fails

## What Landed

### 1. Proactive message generation helper

`crates/core-api/src/generation.rs` now includes gateway-backed proactive message generation.

The helper:

- reads the character memory summary
- uses the latest world context as lightweight runtime grounding
- sends a short completion request through the active provider
- falls back to the existing fixed English reminder text if inference is unavailable

### 2. Scheduler runtime now uses the helper

`crates/core-api/src/scheduler.rs` now routes `trigger-memory-proactive-messages` through the generation helper.

Parity rules kept intact:

- only direct conversations are eligible
- empty memory summaries are skipped
- only one proactive message per day is sent per conversation
- emitted messages still go through the same realtime bus and persistence flow

### 3. Locking model improved for proactive delivery

As with the moments/feed slice, inference awaits were moved out of the runtime write lock:

- candidate conversations are collected under read lock
- gateway requests run outside the write lock
- completed messages are inserted under write lock
- realtime broadcast behavior remains unchanged

## Validation Notes

This slice was verified locally with:

- `cargo check` in `crates/core-api`
- `cargo build` in `crates/core-api`
- `pnpm typecheck`
- `pnpm build`

Runtime validation used a local mock OpenAI-compatible provider on `127.0.0.1:39117`, then:

- `PUT /system/provider`
- `POST /api/auth/init`
- `POST /api/conversations`
- `PATCH /api/characters/char_tech`
- `POST /system/scheduler/run/trigger-memory-proactive-messages`
- `GET /api/conversations/:id/messages`
- `GET /system/status`

Observed results during verification:

- scheduler reported `sent 1 proactive messages`
- the delivered message content came from the gateway mock provider
- `/system/status` showed `totalRequests=1` and `successfulRequests=1`
- the message was still persisted and broadcast through the existing conversation path

## Current Behavior Notes

- proactive message generation now uses the gateway, but conversation-level richer reply history context is still minimal
- fallback content is intentionally preserved so the app remains stable without provider setup
- keyring-backed secret storage is still pending

## Recommended Next Slice

1. route richer social reply generation through the gateway
2. add provider retry / circuit-breaker knobs for scheduler workloads
3. move provider secrets out of runtime snapshot persistence
