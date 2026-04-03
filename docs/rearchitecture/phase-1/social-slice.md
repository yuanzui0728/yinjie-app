# Phase 1 Slice: Social Compatibility

## Scope

This slice moves the HTTP-based social layer into the new runtime scaffold without touching chat gateway behavior:

- pending friend requests
- accept / decline request
- friends list
- shake discovery
- manual friend request send
- scene-triggered friend request

## What Landed

### 1. Shared contracts

`packages/contracts` now includes `social` types for:

- `FriendRequest`
- `Friendship`
- `FriendListItem`
- shake result payload
- request payloads for accept / decline / send / trigger-scene

### 2. Rust Core API compatibility routes

The new runtime now exposes:

- `GET /api/social/friend-requests`
- `POST /api/social/friend-requests/send`
- `POST /api/social/friend-requests/:id/accept`
- `POST /api/social/friend-requests/:id/decline`
- `GET /api/social/friends`
- `POST /api/social/shake`
- `POST /api/social/trigger-scene`

### 3. Runtime state

The scaffolded runtime state now keeps:

- in-memory friend requests
- in-memory friendships
- scene trigger candidates from seeded character metadata

## Current Behavior Notes

- this is still an in-memory parity scaffold, not the final SQLite-backed social layer
- greetings are deterministic scaffold strings instead of full AI-generated greetings
- legacy NestJS `social` remains the production behavior baseline until parity is closed

## Recommended Next Slice

1. `chat` + `groups` + WebSocket
2. `moments`
3. `feed`
