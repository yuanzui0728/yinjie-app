# Gateway Scheduler Scene Slice

## Goal

Route scheduler-created scene-based friend requests through the same inference gateway greeting layer used by the manual social endpoints.

## What Changed

- `trigger_scene_friend_requests_job` in `crates/core-api/src/scheduler.rs` no longer holds the runtime write lock while generating greetings
- the scheduler now:
  - snapshots candidate `(user, character)` pairs first
  - generates greetings through `generate_social_greeting_text(...)`
  - re-checks pending friendship state before insert
- fallback static copy is still kept when provider generation is unavailable

## Validation

Validated on April 4, 2026 with:

- `cargo check`
- `cargo build`

Runtime validation passed against a temporary local OpenAI-compatible mock provider:

- `POST /system/scheduler/run/trigger-scene-friend-requests`
  - returned `created 1 scene-based friend requests`
- `GET /api/social/friend-requests?userId=...`
  - returned greeting `Mock scheduler scene: ...`
- `/system/status.inferenceGateway.successfulRequests` increased to `1`
- `/system/status.inferenceGateway.lastError` remained `null`
