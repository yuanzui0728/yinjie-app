# Phase 1 Slice: Auth / Config / Characters

## Scope

This slice moves the first legacy-compatible business surface into the new production workspace without changing the original business intent:

- `auth`
- `config`
- `characters`

## What Landed

### 1. Shared contracts

`packages/contracts` now contains typed shapes and client bindings for:

- auth session flow
- AI model config flow
- character CRUD flow

This removes repeated `unknown` casts from the new frontends and creates a stable interface for future module migration.

### 2. Rust Core API modularization

`crates/core-api` was split into:

- `app_state.rs`
- `error.rs`
- `models.rs`
- `seed.rs`
- `routes/system.rs`
- `routes/legacy/auth.rs`
- `routes/legacy/config.rs`
- `routes/legacy/characters.rs`

The new route tree now exposes:

- `/system/*`
- `/api/auth/*`
- `/api/config/*`
- `/api/characters/*`

### 3. Frontend adaptation

The new app and admin runtime UIs now read from the same typed client surface:

- app dashboard reads `system`, `config`, and `characters`
- admin dashboard reads `system`, `config`, and `characters`
- provider probe keeps using the shared system client

## Current Behavior Notes

- `config` compatibility is close to legacy shape and returns the legacy model list.
- `auth` compatibility is currently a scaffolded local store, not final JWT parity.
- `characters` compatibility is currently a scaffolded in-memory store seeded with bootstrap records matching legacy field shape.
- old NestJS code remains the source of truth for production behavior until the Rust migration for each module is declared parity-complete.

## Next Migration Targets

Recommended next slices:

1. `world` + `scheduler`
2. `social`
3. `chat` + `groups` + WebSocket compatibility
