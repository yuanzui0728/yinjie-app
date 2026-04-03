# Phase 1 Slice: Runtime Persistence Alignment

## Scope

This slice moves the new Core API beyond process-only memory state by adding local runtime snapshot persistence:

- startup restore from persisted snapshot
- background persistence queue for write-heavy routes
- scheduler state persistence
- realtime conversation persistence handoff
- real backup / restore operations on top of snapshot files

## What Landed

### 1. Persistence module

`crates/core-api/src/persistence.rs` now owns the local runtime snapshot workflow.

It provides:

- snapshot path resolution from `YINJIE_DATABASE_PATH`
- snapshot load during startup
- debounced background save execution
- synchronous flush for operations that need a durable file now
- backup creation
- latest-backup restore

The current storage format is a local JSON snapshot:

- `*.runtime.json`

This is intentionally an infrastructure bridge. It improves durability now without changing business logic, while still leaving room for the later SQLite migration.

### 2. AppState persistence bus

`crates/core-api/src/app_state.rs` now carries a background persistence command channel.

That lets write paths request durability without blocking on file IO every time.

The Core API now restores:

- `RuntimeState`
- `SchedulerState`

on process start if a snapshot file already exists.

### 3. Write-path integration

Persistence requests were wired into the major mutation surfaces:

- auth
- config
- characters
- chat / groups
- social
- moments
- feed
- realtime direct-message turns
- scheduler execution

This means the new runtime no longer loses all important state on every restart.

### 4. Real backup / restore behavior

`/system/backup/create` and `/system/backup/restore` are no longer placeholder responses.

Current behavior:

- backup create forces a fresh snapshot flush
- backup create copies that snapshot into a local `backups/` directory
- restore loads the latest backup into live memory state
- restore also rewrites the active runtime snapshot

## Validation Notes

This slice was verified locally with a dedicated runtime-data directory:

- `cargo check`
- start Core API with custom `YINJIE_DATABASE_PATH`
- `POST /api/auth/init`
- `POST /api/feed`
- wait for background snapshot flush
- confirm `*.runtime.json` exists
- stop Core API
- restart Core API with the same path
- confirm the same user id is restored
- `POST /system/backup/create`
- `POST /api/characters`
- `POST /system/backup/restore`
- confirm the newly added character disappears after restore

Observed results during verification:

- runtime snapshot file was created successfully
- restored user id remained stable after restart
- `/system/status` switched to `database.connected = true` once local persistence existed
- backup creation returned a real file path
- restore reloaded the previous runtime state into memory

## Current Behavior Notes

- persistence is currently snapshot-based JSON storage, not row-level SQLite persistence yet
- backup restore currently restores the latest backup file automatically
- realtime room membership remains in-memory and intentionally does not survive restart
- scheduler, conversations, feed, moments, characters, and auth seed mutations now survive restart

## Recommended Next Slice

1. diagnostics export from runtime snapshot and logs
2. inference gateway runtime beyond provider probe scaffolding
3. SQLite-backed persistence migration
