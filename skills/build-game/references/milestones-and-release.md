# Milestone gates, polish and release

## Contents
1. Milestone gate
2. Core-loop smoke test
3. Multiplayer verification
4. Polish standards (M3)
5. Launch readiness (M4)
6. Final report

## 1. Milestone gate

Run when the last feature of a milestone is `done`, before starting the next milestone:

1. `node tools/rbx-check.mjs` clean; full TestRunner run, 0 failed (count recorded).
2. Rebuild the world from builders (all zones) and run the core-loop smoke test (§2) from a reset profile.
3. Review the milestone's diff with the `roblox-reviewer` agent (`git diff milestone/<prev>..HEAD -- src world`; first milestone: the whole `src`). Fix Critical/High findings as part of the gate; re-run checks. Medium findings either get fixed now or a note in PROGRESS.md.
4. Re-read spec §0 pillars and §1 pacing targets; check the milestone actually serves them (e.g. "first reward ≤ 20 s" measured in the smoke test). If not, fix or revise the spec.
5. `git tag milestone/<Mn>`; PROGRESS.md entry with the gate results; remind the user to save the place in Studio.

## 2. Core-loop smoke test

A playtest recipe written once at the end of M1 (in `design/PROGRESS.md` under "Smoke test") and reused at every gate and session start. It drives the real player path, not QA shortcuts, from a reset profile:

- Join → spawn location correct → FTUE first beat visible.
- Perform the core action until the first reward; record the time.
- Spend/upgrade once; leave (stop play) and rejoin (start play) → values persisted (Mock store).
- Zero errors and warnings from game code in `get_console_output`; one screenshot at the reward moment.

Keep it under ~3 minutes of tool calls. Grow it by one step per milestone (M2: first meta upgrade, M3: FTUE complete, M4: purchase prompt opens for a product with an id).

## 3. Multiplayer verification

- Pure logic: specs with several players as data (trading, rounds, teams, leaderboards).
- Engine: QA stand-ins that act through system APIs (`simulateJoin`, `simulateAction`) where the spec has cross-player rules.
- Real clients: `StudioTestService:ExecuteMultiplayerTestAsync(numPlayers, args)` runs a Studio server with up to 8 clients from Edit context; the test's server script reads `GetTestArgs()` and reports with `EndTest(result)`. Check the current API with `docs_fetch` (`/docs/reference/engine/classes/StudioTestService.md`) and use it for late-join snapshot sync and cross-player interactions when the milestone has them.
- Late joiners: every system sends a full snapshot on join; verify by joining after state changed (start play after QA set world state, or the multiplayer test's mid-test player add).

## 4. Polish standards (M3)

Juice and readability (`roblox-animation-vfx`, `roblox-audio`, `roblox-gui`):
- Every player action answers within 100 ms on the client: sound + visual (button squash, hit flash, number pop-up, particle burst); server results reconcile.
- Rewards are celebrated in proportion to their size (small: pop + tick sound; big: screen flash, confetti, fanfare, camera nudge).
- UI: tweened open/close (0.15–0.25 s, `Quad`/`Back` out), hover/press states, consistent iconography, counters that tick up instead of jumping.
- Music per zone/state with crossfades; ambient beds; SFX in the SFX group.
- Camera: purposeful (spawn reveal, unlock showcase), never fights the player; respects reduced motion setting if the spec has one.

FTUE (spec §9): every beat is triggered by the player's own progress, teaches by doing, uses highlights/arrows/beams over text, and can't soft-lock (each beat has a fallback after N seconds).

Devices: phone portrait/landscape, tablet, desktop, gamepad — via the device simulator + screenshots for each screen; touch targets ≥ 44 px; no UI under the thumbstick or jump button.

Performance (`roblox-performance`): spec §13 budgets; no per-frame `Instance.new`, pooled projectiles/effects, `UnreliableRemoteEvent` for cosmetic high-rate updates, StreamingEnabled decision applied with `ModelStreamingMode` on large models.

## 5. Launch readiness (M4)

- Monetization (`roblox-monetization`): every product/pass from spec §10 wired by name; receipts idempotent and durable; passes checked on join and on `PromptGamePassPurchaseFinished`; paid random items with odds shown before purchase and the restricted-player path from `PolicyService:GetPolicyInfoForPlayerAsync()` (`ArePaidRandomItemsRestricted`).
- Social and safety: all player-written text filtered (`TextService:FilterStringAsync` + `GetNonChatStringForBroadcastAsync`/`ForUserAsync`) before display; chat through `TextChatService` only; no custom free-form messaging.
- Store assets (LAUNCH-03): `roblox-reference-art` with presets for icon (512×512) and thumbnails (1920×1080), using spec §7 art direction and in-game screenshots described as references; files in `art/marketing/`.
- Release report (LAUNCH-05): run `roblox-publish-checklist`; write `design/RELEASE.md`:

```markdown
# Release report — <game> (spec rev N, <date>)
Verdict: READY | NOT READY | READY WITH ACCEPTED RISK
## Gates
| Gate | Result | Evidence |
## For you to do
1. Save the place in Studio, then publish from Studio (File → Publish to Roblox) — the place contains the built world.
2. Create these products/passes and paste the ids into src/shared/Products.luau: | name | type | price |
3. Fill the Maturity & Compliance questionnaire: expected label <label> because <content>.
4. Upload icon and thumbnails from art/marketing/.
5. Optional: set roblox-kit.json ids + API key to enable cloud tests in CI.
## Rollback
<previous version / how to revert>
```

Publishing itself stays with the user unless they explicitly ask in this conversation (then follow `roblox-publish-checklist` §4).

## 6. Final report

When every feature is `done` (or `blocked` on something only the user can provide), tell the user, in this order:

1. What the game is now: one paragraph + the core loop, with 3–5 screenshots described (zones, HUD, a reward moment).
2. Build stats: features done/total per milestone, tests passed, commits, milestone tags.
3. Verification: what was playtested, what multi-client tests ran, reviewer result.
4. What only they can do: the RELEASE.md "For you to do" list and every blocked feature with its reason.
5. How to continue: `/roblox-agent-kit:game-spec` for a revision (new content, systems), `/roblox-agent-kit:build-game` to build it.
