# Phase 1 Slice: Proactive Realtime Delivery

## Scope

This slice closes the gap between scheduler-generated proactive messages and the new `/chat` realtime runtime:

- internal realtime event bus
- scheduler-to-socket message handoff
- proactive message delivery through existing `new_message`
- realtime observability for internal message pushes

## What Landed

### 1. Internal realtime event bus

`crates/core-api/src/app_state.rs` now carries an internal broadcast channel for realtime commands.

This keeps the runtime boundary clean:

- scheduler can publish realtime intents without owning `SocketIo`
- realtime runtime stays responsible for actual socket emission
- no new external business API was introduced

### 2. Realtime runtime command handling

`crates/core-api/src/realtime.rs` now subscribes to the internal bus during install.

When it receives a proactive message command, it:

- emits the existing `new_message` event into the conversation room
- records an internal realtime trace in `/system/realtime`

No event names changed. Existing frontend contracts remain compatible.

### 3. Scheduler proactive message handoff

`crates/core-api/src/scheduler.rs` now publishes proactive direct-message payloads to the realtime bus after persisting them into conversation state.

That means `trigger-memory-proactive-messages` now does both:

- persist the proactive character message
- deliver it to connected socket clients in the matching conversation room

## Validation Notes

This slice was verified locally with a real Core API process and a real Socket.IO client:

- `cargo check`
- `POST /api/auth/init`
- `PATCH /api/characters/char_tech`
- `POST /api/conversations`
- Socket.IO connect to `http://127.0.0.1:39091/chat`
- emit `join_conversation`
- `POST /system/scheduler/run/trigger-memory-proactive-messages`

Observed results during verification:

- the socket client received `new_message`
- the emitted message id contained the proactive marker
- the proactive message persisted in `/api/conversations/:id/messages`
- `/system/realtime` recorded `internal-message:scheduler-proactive-message:<conversationId>`

## Current Behavior Notes

- proactive realtime delivery now works for connected conversation rooms only, which is the intended parity behavior for socket push
- proactive messages still rely on in-memory conversation state rather than database persistence
- scheduler-triggered proactive delivery currently targets direct conversations only
- no new socket event names were introduced, so legacy-compatible clients can consume the push immediately

## Recommended Next Slice

1. persistence alignment for scheduler-driven writes
2. inference gateway runtime beyond provider probe scaffolding
3. import / narrative / analytics migration
