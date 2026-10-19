---
name: roblox-security
description: "Roblox exploit hardening: authority models, remote abuse, economy and DataStore exploits, prompt and detector abuse, ban APIs, backdoor scans of free models. Use for security audits, exploiters, or duplicated items or currency."
---

# Roblox Security

## When to Load

Load for authority, remote abuse, economy, saves, bans, backdoors, or sandboxing audits. Remote validation/rate limits: roblox-networking. Save/session-lock protocol: roblox-data. Text filtering (TextService:FilterStringAsync, fail-closed): see roblox-localization.

## Quick Reference

**Core:** Client is always compromised. The server remains the source of truth, but the implementation depends on the authority model.

### Authority Models

- **Classic replication:** validate client requests against server state. Never trust client damage, currency, inventory, permissions, or positions.
- **Server Authority:** `Workspace.AuthorityMode = Server`: the server owns core simulation while clients predict and recover from misprediction. Use `BindToSimulation()` (needs `UseFixedSimulation`), not blanket `Heartbeat` correction. Cheap for stock characters, rewrite-scale for authored simulation (full.md).
- **Both:** validate attacks, purchases, teleports, permissions, and custom remotes at the server boundary.

### Audit Checklist

**CRITICAL:** Server-authoritative state · Documented authority model · Validate all arg types · Rate limit remotes · Session-lock DataStore · No client currency mutations · ProcessReceipt verification · No secrets in client code · Inserted assets/plugins scanned for backdoors

**HIGH:** Validate custom movement and action transitions · BindToClose protection · Atomic trading · Never trust client values · Use InputActions for simulation input in Server Authority projects · Validate ProximityPrompt/ClickDetector/DragDetector like remotes

**MEDIUM:** Server cooldowns · server-computed leaderboards · anti-AFK reward checks · TextService filtering (roblox-localization) · Script sandboxing for third-party code

### Free-model / Toolbox backdoors

Before keeping any inserted model, package, or plugin output: list its scripts with `search_game_tree`, then `script_grep` for `require(` (by asset ID), `loadstring`, `getfenv`/`setfenv`, `HttpService`, `InsertService`/`LoadAsset`, `string.char`/`\x` obfuscation, and `IsStudio` checks; `script_read` anything unexplained. Delete scripts a prop does not need. Sandboxing (script capabilities) is an opt-in beta, off by default: scan anyway. Full red-flag table: full.md.

### Enforcement

Enforcement is a product decision with appeal implications. `Players:BanAsync`/`UnbanAsync` are server-only and need `Players.BanningEnabled`; `pcall` them. Duration, reason limits and device blocks: full.md.

### Anti-Patterns

Don't obfuscate client code, use `_G` for security, kick without logging, over-validate movement, rely on client anti-cheat, or keep unreviewed free-model scripts.

See [references/full.md](references/full.md) for detailed examples.
