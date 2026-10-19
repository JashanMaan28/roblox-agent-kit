---
name: roblox-review
description: "Five-lens audit of Roblox/Luau code (security, data safety, performance, typing, deprecated APIs) as a severity-sorted findings table. Use when asked to review code or a diff, or before shipping a system."
argument-hint: "[paths or diff]"
---

# Review Roblox code

Audit the Luau code targeted by `$ARGUMENTS`: paths, a system name, a git range/diff (`git diff main...HEAD`), or "everything". With no target, review the current uncommitted diff if there is one, otherwise `src/`.

This is a review: report, don't rewrite. Fix only what the user confirms afterwards.

## Procedure

1. **Collect the target.** Files on disk: list them (`Glob`/`Grep`). A diff: read the changed hunks *and* enough surrounding code to judge them. Studio-only scripts (not on disk): read them with `script_read` via Studio MCP and pass the source along.
2. **Prioritise** large targets in this order: remote handlers (`OnServerEvent`, `OnServerInvoke`), persistence (DataStore/ProfileStore/MemoryStore), purchase handling (`ProcessReceipt`), per-frame loops, then the rest.
3. **Audit** through the five lenses below, in order. For a multi-file audit, delegate to the plugin's read-only `roblox-reviewer` agent (listed as `roblox-agent-kit:roblox-reviewer`) with the file list and any lens the user emphasised; otherwise do it inline. Optionally run `check` first so type/lint errors don't eat review time.
4. **Verify currency claims** you're unsure about with `docs_search` / `docs_fetch` (`/docs/reference/engine/deprecated.md` lists every deprecated member and its replacement).
5. **Report** a table sorted by severity:

   | # | Severity | File:Line | Finding | Failure scenario | Fix |
   |---|---|---|---|---|---|

   - **Critical**: exploitable, or loses/duplicates player data or purchases.
   - **High**: leak, crash or lockup under load; broken behaviour for some players.
   - **Medium**: correctness risk, type hole, deprecated API with a behavioural difference.
   - **Low**: style, maintainability, deprecated-but-harmless API, missing `--!strict` on old files.

6. Offer to fix Critical and High findings in severity order.

## The five lenses

1. **Security** (`roblox-security`, `roblox-networking`): every remote argument type-checked (numbers also against NaN `x ~= x`, ±inf, negatives, non-integers, ranges); no client-decided outcomes (damage, price, reward, teleport target); distance/ownership/state re-checked inside the handler; rate limits on spammable remotes; no server→client `InvokeClient` the server waits on; no secrets, admin lists or authoritative price tables in replicated containers; QA/cheat remotes gated server-side.
2. **Data safety** (`roblox-data`, `roblox-monetization`): DataStore calls wrapped in `pcall` with retry/backoff; `UpdateAsync` instead of `GetAsync`+`SetAsync` read-modify-write; session locking (or ProfileStore); save on `PlayerRemoving` and `BindToClose`; **a failed load must never be treated as a new player** (Critical); only serialisable values saved; bounded arrays; schema version and migration path; `ProcessReceipt` idempotent and returning `PurchaseGranted` only after the grant is saved.
3. **Performance and memory** (`roblox-performance`, `roblox-luau-patterns`): connections without a cleanup path (especially in `PlayerAdded`/`CharacterAdded`); tables keyed by Player/Instance never cleared; per-frame allocations or remote fires in `RenderStepped`/`Heartbeat`; server-side tweens on world objects; `while true do task.wait()` polling where events exist; client code assuming instances exist under StreamingEnabled.
4. **Typing and correctness** (`roblox-luau-types`): missing `--!strict` (Low unless the file is new); `::` casts or `any` hiding missing validation; optionals (`FindFirstChild`, `.Character`, `GetAttribute`) indexed without narrowing; a `local function` that shadows a forward-declared local; "test this in the command bar" instructions for live state (separate module instance, see `roblox-testing`).
5. **Currency** (`roblox-luau-core`, `roblox-luau-types`): deprecated APIs and their replacements: `wait`/`spawn`/`delay` → `task.*`; `Humanoid:LoadAnimation` → `Animator:LoadAnimation`; `BodyVelocity`/`BodyGyro`/`BodyPosition` → constraint movers; `Velocity`/`RotVelocity` → `AssemblyLinearVelocity`/`AssemblyAngularVelocity`; lower-camel aliases (`:connect`, `brickColor`, `:remove`) and `Instance:Remove` → `Destroy`; the legacy chat system → `TextChatService`; `table.getn` → `#`. Also code that only type-checks under the old solver, or misses new-solver tools (type functions, `read`/`write` properties) where they'd remove casts.

## Honesty rules

- Report only findings verifiable in the code you read. No speculative "might be a problem" filler.
- If a judgement depends on code you haven't seen (a validation wrapper, a remote's client side), say so and name the file you'd need.
- Every finding has a concrete failure scenario: what an exploiter sends, what data is lost, what leaks.
- A short or empty table for clean code is a good result. Say "clean under this lens" in one line per lens.
