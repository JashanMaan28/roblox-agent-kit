---
name: new-system
description: "Scaffold a secure client/server gameplay system as one vertical slice: types, rules module, remotes, server system, client controller, spec. Use when adding a feature like a shop, inventory, ability, quest or daily reward."
argument-hint: "<SystemName> [short description of the rules]"
---

# New gameplay system (vertical slice)

Generate the system named in `$ARGUMENTS` (PascalCase, e.g. `DailyBonus`). A system is never one file: generate all pieces together so nothing is left unvalidated, untyped or untested.

## Before generating

1. **Read the project.** `default.project.json` (where `src/shared`, `src/server`, `src/client`, `tests` map), the server/client entry points, any existing `src/shared/Types.luau`, remotes, networking wrapper, signal library, data layer (ProfileStore, a `PlayerData` module), rate limiter and QA commands. **Match existing conventions**; use what's there instead of creating parallel versions (`roblox-architecture`, `roblox-kit` "reuse before adding").
2. **Pin down the rules.** If costs, cooldowns, limits or rewards are ambiguous, ask the one or two questions that change the code. Default everything else into the rules module's `Config` table, where it's easy to tune.
3. **Decide persistence.** If state must survive rejoin, it goes through the project's data layer (`roblox-data`). If there is none, keep state in memory and flag it as not persisted rather than writing raw DataStore calls inline.

## The pieces

Code for each piece, ready to copy with `__Name__` replaced: [references/templates.md](references/templates.md).

| # | File (kit layout) | Role |
|---|---|---|
| 1 | `src/shared/Types.luau` | Shared payload/snapshot types. Create the file if missing; otherwise add to it |
| 2 | `src/shared/__Name__Logic.luau` | Pure rules + `Config`: no services, no clock reads, no `math.random` (time and RNG are parameters). Returns a new state or `nil, reason` |
| 3 | `src/shared/Remotes/__Name__Request.model.json`, `__Name__Sync.model.json` | RemoteEvents as Rojo files, visible in Explorer. Use the project's own remote convention if it has one |
| 4 | `src/server/RateLimit.luau` | Per-player token bucket, only if the project has no limiter |
| 5 | `src/server/Systems/__Name__.luau` | Owns all state in `{ [Player]: State }`, cleaned on `PlayerRemoving`. Handler ladder: **rate limit → type → range → permission/plausibility → mutate → replicate**. Public API (`add`, `reset`, `getState`) that gameplay, QA and other systems share. `init()` wires, `start()` runs |
| 6 | `src/client/Controllers/__Name__Controller.luau` | Renders server snapshots, sends requests, computes nothing authoritative. Optimistic UI only if it reconciles with the next snapshot |
| 7 | `tests/__Name__Logic.spec.luau` | TestRunner spec for the rules: happy path, every rejection reason, boundaries (0, negative, fractional, NaN, ±inf, max+1), immutability |
| 8 | `src/server/init.server.luau`, `src/client/init.client.luau` | Require the new modules (init all, then start all). Edit the existing bootstrap if there is one |
| 9 | QA commands (`roblox-testing`) | Server-gated entries calling the public API: grant, reset, trigger edge cases |

Security non-negotiables (`roblox-security`, `roblox-networking`): the server computes every outcome from its own data; every remote argument is validated (type, NaN/inf, integer, range, length, ownership) before use; handlers drop bad input silently; late joiners get a full snapshot on join; no RemoteFunction the server invokes on a client.

## After generating

1. Run `check` (`node "${CLAUDE_PLUGIN_ROOT}/scripts/rbx-check.mjs"`) and fix everything it reports.
2. Run the tests (`roblox-testing`): Studio `execute_luau` (Server, during a playtest) with the TestRunner, or `cloud_run_tests`. Report the counts.
3. If Studio is connected, playtest the happy path and one rejection (`studio-mcp`); otherwise say the playtest is still owed.
4. Summarise in 2–3 bullets: what the server validates, what an exploiter could try, and why it fails.
5. Flag any deliberate scope cuts (e.g. "not persisted yet", "no receipt idempotency: needed before selling this for Robux", "single-player only, not multi-client tested").

Deliver complete new files and targeted edits to existing ones (Types, entry points, QA list). Don't rewrite unrelated code.
