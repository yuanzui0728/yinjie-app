# Gateway Group Replies Slice

## Goal

Restore the old group-chat behavior where a user message can trigger delayed AI member replies, while routing the actual generation through the new inference gateway runtime.

## What Changed

- Updated `crates/core-api/src/routes/legacy/chat.rs`
- `POST /api/groups/:id/messages` now:
  - persists the user message exactly as before
  - checks character members in the target group
  - applies activity-frequency gating (`high` / `normal` / `low`) before deciding who responds
  - schedules delayed async replies per selected character
  - generates each reply through `generate_chat_reply_text(...)`
  - falls back to placeholder copy if the provider is unavailable or generation fails
  - persists generated group replies back into `group_messages`
- Added local operation logging for successful async group replies

## Behavior Notes

- The HTTP response for `POST /api/groups/:id/messages` is unchanged: it still returns the just-sent message immediately.
- AI group replies remain asynchronous and appear later in the stored group message history.
- No new public API paths were introduced.

## Validation

Validated on April 4, 2026 with:

- `cargo check`
- `cargo build`

Runtime validation passed against a temporary local OpenAI-compatible mock provider:

- started Core API on `http://127.0.0.1:39101`
- configured `/system/provider` to point to `http://127.0.0.1:39126/v1`
- initialized a user and created a group with `char_tech` and `char_roommate`
- sent a user message through `POST /api/groups/:id/messages`
- observed a delayed character reply stored in `GET /api/groups/:id/messages`
- observed provider usage in `/system/status.inferenceGateway`

Observed result summary:

- `totalMessages = 2`
- `aiReplies = 1`
- `latestReply = "Mock group reply from provider."`
- `inferenceRequests = 1`
- `inferenceSuccess = 1`
