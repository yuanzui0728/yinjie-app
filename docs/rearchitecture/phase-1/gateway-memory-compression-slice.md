# Gateway Memory Compression Slice

## Goal

Restore the old chat-service memory compression behavior in the new realtime runtime without changing socket semantics or message persistence.

## What Changed

- Added `generate_memory_summary_text(...)` in `crates/core-api/src/generation.rs`
- Realtime conversation turns now check the full persisted history length after each turn
- When total conversation messages reach a multiple of `10`, the primary character's memory is refreshed through the inference gateway
- Memory updates are written after generation, inside the final persistence section, so inference waits do not hold the runtime write lock
- Both legacy-compatible fields are updated:
  - `profile.memorySummary`
  - `profile.memory.recentSummary`

## Validation

Validated on April 4, 2026 with:

- `cargo check`
- `cargo build`

Runtime validation passed against a temporary local OpenAI-compatible mock provider:

- sent `5` direct-chat turns through Socket.IO `/chat`
- received `5` gateway-backed character replies
- after total message count reached `10`, `GET /api/characters/char_tech` returned:
  - `profile.memorySummary = "Mock memory summary: user asks focused deployment questions"`
  - `profile.memory.recentSummary = "Mock memory summary: user asks focused deployment questions"`
- `/system/status.inferenceGateway.successfulRequests` reached `6`
- `/system/status.inferenceGateway.lastError` remained `null`
