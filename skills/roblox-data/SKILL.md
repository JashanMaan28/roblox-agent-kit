---
name: roblox-data
description: "Roblox player saves: DataStoreService and ProfileStore, session locks, schemas and migrations, UpdateAsync, retries, BindToClose. Use when writing or debugging saves: data lost, rolled back, duplicated or not saving."
---

# roblox data persistence

## When to Load

Load for player saves, migrations, retries, shutdowns, or session ownership. Leaderboards/messaging/world data: roblox-server-data. Open Cloud API keys, CI, and the plugin's read-only `datastore_list` / `datastore_list_entries` / `datastore_get_entry` tools for inspecting live entries: open-cloud.

## Quick Reference

- Define a serializable template and a version field before storing player state. Deep-copy templates so nested defaults are not shared; migrate, then reconcile missing fields against the template. Scope store names by environment (`PlayerData_Studio`) so Studio writes stay out of production.
- Use `UpdateAsync` for read-modify-write; handle throttling and transient errors. A transform returning `nil` cancels the write: report that as failure.
- Prevent concurrent profile mutation with a session-ownership protocol.
- With ProfileStore: `StartSessionAsync`, `Profile.OnSessionEnd`, `Profile:EndSession()` as documented (ProfileService's old `Release()` does not exist there); no `Steal` for normal loads; `ProfileStore.Mock` for ephemeral Studio writes.
- Save on meaningful changes and lifecycle boundaries; `PlayerRemoving` alone is not sufficient. `BindToClose` must wait (bounded, under the 30 s shutdown limit) for every in-flight final save, not just start them.
- Store primitives/arrays/dictionaries; convert Instances/userdata/functions/cyclic tables first. Validate numbers (no NaN/inf), strings (`utf8.len`), nested tables: one bad value fails the write.
- RTBF: keep the user ID as a static substring in keys (`player_<UserId>`) so `{UserId}` deletion templates match; hashed/random keys make erasure manual.
- `GetAsync` serves a 4-second local cache (`DataStoreGetOptions.UseCache`, default `true`); verify writes with `UseCache = false`.
- Poll `DataStoreService:GetRequestBudgetForRequestType` for live headroom; quotas scale with concurrent users (experience reads: 300 + CCU x 40/min).
- New code identifies users with `player.User` (`User.Id`, `DomainType`, `DomainId`); `UserId` remains valid, but never mix the two IDs in one key scheme.
- Debug a live save by reading it with `datastore_get_entry` (read-only); never "fix" production data from Studio Luau without asking the user (studio-mcp).
- First-session traces and funnels: roblox-analytics. Receipt/grant ordering for purchases: roblox-monetization.

> Persistence workflows: [references/full.md](references/full.md)
