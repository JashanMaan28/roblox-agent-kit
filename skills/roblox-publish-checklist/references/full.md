# Roblox Publish Checklist: Full Reference

This is a release gate, not a list of universal architecture rules. A gate is a check that can block publication. Define applicability first, then collect evidence.

## 1. Freeze the payload

Record:

- target experience, universe, and places;
- changed scripts, assets, configuration, schemas, products, and permissions;
- supported device and input matrix;
- expected player/data compatibility;
- rollback or forward-fix procedure.

Test the exact payload intended for publication. A passing local file that is not in the published place is irrelevant.

## 2. Classify gates before running them

Use four states:

- **Required:** the release touches this risk or the experience depends on it.
- **Conditional:** run when the named feature exists.
- **Not applicable:** feature is absent, with a reason.
- **Unverified:** required evidence could not be collected.

Do not convert Not Applicable or Unverified into PASS. Do not calculate a readiness percentage that can hide one data-loss or purchase blocker.

### Policy precedence

User approval authorizes an otherwise permitted action; it does not satisfy a mandatory policy and does not turn a failed or unverified gate into PASS. A mandatory platform policy (for example, paid-random-item restrictions) is not risk-acceptable: "I accept the risk; ship unchanged" maps to NOT READY, not to READY WITH ACCEPTED RISK. READY WITH ACCEPTED RISK exists for non-policy risks (named risk, impact, owner, rollback); approval is never evidence and never upgrades UNVERIFIED or FAILED to PASS.

## 3. High-consequence gates

### Persistence, conditional on stored state

Load `roblox-data` for player profiles and `roblox-server-data` for shared or cross-server state. Verify the actual storage abstraction used by the project.

- Existing data loads without being replaced by defaults.
- Schema migrations are deterministic and safe to retry.
- A failed session acquisition does not create a new empty profile.
- Duplicate joins, teleport overlap, crashes, and stale ownership follow the documented policy.
- Disconnect and shutdown paths preserve the library's release/save contract.
- Parallel writes cannot overwrite newer state.
- A failed save is observable and does not produce a false success.

### Trust boundaries, conditional on client requests or authority changes

Load `roblox-networking` and `roblox-security`.

- Inventory the changed remotes and their direction, payload, caller, and side effects.
- Validate type, finite numbers, bounds, state, ownership, permissions, and replay semantics as appropriate to each action.
- Use abuse controls based on action cost and semantics. Do not require one arbitrary rate limit for every remote.
- Keep currency, inventory, rewards, permissions, and purchase outcomes server-owned.
- Test malformed, stale, repeated, unauthorized, and high-frequency requests.
- For Server Authority projects, verify its required Studio settings and simulation path. Do not apply classic CFrame correction blindly.

### Monetization, conditional on paid products or entitlements

Load `roblox-monetization`.

- Developer Product grants are durable and idempotent by purchase ID.
- `ProcessReceipt` returns `PurchaseGranted` only after durable success.
- Retry, server handoff, player absence, and already-granted receipt cases are tested.
- Pass and subscription entitlements are checked on the server and refreshed after purchase when needed.
- Prompt completion events are not treated as proof of payment.
- Product IDs, amounts, and ownership come from trusted configuration.

### Cloud and webhooks, conditional on external integration

Load `open-cloud`.

- No key, secret, authorization code, access token, or refresh token appears in replicated content, URLs, client bundles, analytics, or ordinary logs.
- API-key permissions or OAuth scopes and resource grants are minimal and current.
- OAuth state, PKCE, redirect URL, token rotation, and revocation behavior are tested when applicable.
- Webhook verification runs before side effects; repeat delivery is safely deduplicated.
- Retries are bounded and limited to safe transient failures.

Any unresolved failure in these four groups is a release blocker.

## 4. Runtime and gameplay gates

Choose specimens from the changed surface. At minimum include:

1. normal completion;
2. invalid or denied action;
3. retry or repeat action;
4. leave/rejoin or reconnect when state is involved;
5. rapid input or concurrency when the flow can overlap.

For multiplayer changes, test at the actual participant count needed to exercise ownership, replication, team, trade, or matchmaking behavior. A solo playtest is not proof of multiplayer correctness.

Capture runtime errors and warnings. Verify cleanup after players, characters, rounds, UI screens, and temporary instances are destroyed or replaced.

## 5. Performance gates

Load `roblox-performance` when the release changes hot loops, physics, rendering, networking, streaming, UI density, or asset load.

- Capture a before and after measurement on representative device tiers.
- Inspect frame time, script hot spots, memory trend, network traffic, and load/streaming behavior relevant to the change.
- Investigate sustained regressions and growth, not generic part, texture, particle, or millisecond commandments.
- Test a realistic session and population. A short empty-place profile is not enough.

Record the tested device, viewport, graphics level, player count, place, and scenario with each result.

## 6. Input, UI, accessibility, and localization

Run only supported combinations, but state the support matrix explicitly.

- Keyboard/mouse, touch, and gamepad paths can reach every required action.
- Focus order, selected state, activation, back/close behavior, and modal boundaries work without a mouse.
- Representative small and large viewports have no clipping, overlap, hidden actions, or unsafe-inset collisions.
- State is not communicated by color alone. Text and controls remain readable over the game view.
- Reduced-motion behavior does not depend on animation to convey state.
- Localized strings fit representative long locales; missing keys and fallback behavior are visible.
- Audio-dependent information has a non-audio route where required.

Load `roblox-input`, `roblox-gui`, and `roblox-localization` for the relevant surfaces.

## 7. Creator Dashboard and publication configuration

Inspect the current dashboard rather than copying old dimensions or policy rules from this checklist.

- Correct owner, experience, start place, and place versions are selected.
- Visibility and access settings match the release intent.
- Supported devices, server size, permissions, and private-server settings are intentional.
- Experience questionnaire, content maturity, privacy, and policy declarations are complete and truthful.
- Name, description, icon, thumbnails, genre, and localization reflect the shipped experience.
- Paid items and prices point at the intended experience and products.
- Any required API services, secrets, webhooks, Open Cloud scopes, or external endpoints are configured for production rather than a test environment.

Dashboard UI and policy can change. Use the linked current Creator Hub pages as authority; the dated summary below is a starting point, not a substitute.

## 7a. Current platform requirements (verify before launch)

Checked against the Creator Docs on 2026-10-18 (as of Oct 2026 — re-check the linked docs before every launch). Sources: [Publish games and places](https://create.roblox.com/docs/production/publishing/publish-games-and-places), [Roblox Kids and Select](https://create.roblox.com/docs/production/publishing/kids-and-select), [Content maturity and compliance](https://create.roblox.com/docs/production/promotion/content-maturity), [Icons](https://create.roblox.com/docs/production/publishing/experience-icons), [Thumbnails](https://create.roblox.com/docs/production/publishing/thumbnails).

Release requirements apply to **every** release action: first release, releasing a new place version of a released game, **Publish As** to another game, and changing target-audience settings.

**Ages 16+ (and Trusted Friends):**
- Creator account in good standing and at least 2 days old.
- Age check through facial age estimation or government ID.
- The Maturity & Compliance Questionnaire's first (age-restricted content) question answered. **No** gives a **Content May Vary** label (age-checked 16+ only); **Yes** requires the full questionnaire and yields a label for age-checked 16+ or age-verified 18+ users. A game with no content maturity information has its playability automatically restricted for all players.

**All ages (adds Roblox Kids 5–8 and Select 9–15):**
- Everything above, plus account verification (government ID if 18+, facial age estimation if under 18) and 2-Step Verification.
- The **full** questionnaire with a Minimal, Mild, or Moderate rating.
- Either an active Roblox Plus or Premium subscription held for 2 consecutive months, or the one-time refundable 1,000 R$ publishing fee per game (refunded 90 days after the game becomes eligible, or 90 days after payment if it never does, per the Kids and Select FAQ; the publish page words the refund differently, so re-check).
- The evaluation: a 16+-only trial phase, then **250 unique plays by highly engaged age-checked users within 60 days** and a safety review; track it in the Audience Reach dashboard. An optional refundable **50,000 R$** expedited review gives a 48-hour review instead.

**Labels:**
- Minimal/Mild → Kids and Select eligible; Moderate → Select and 16+; **Content May Vary** → age-checked 16+ only; **Restricted** → age-verified 18+ only, unplayable in some countries and regions (for example Korea, Saudi Arabia, Türkiye). Receiving a Restricted label restarts servers to remove non-18+ players. Don't add age-restricted content before the matching label is granted.
- Answer for the most mature content a player can encounter. Inaccurate answers expose the game and account to moderation.
- **Generative AI:** the questionnaire asks whether users can interact with generative AI components in the game (text, voice, images, 3D, avatar movement) and what kind. Answer based on in-game interactions, not on whether AI helped build the game.
- The questionnaire also asks whether the game respects `PolicyService` `ArePaidRandomItemsRestricted`; make sure the answer is true in code (see `roblox-monetization`).

**Release limits:** at most **5 never-before-released games per day** (resets daily; re-releasing a game whose public access you revoked doesn't count). Places are limited to 100 MB; larger saves/publishes may fail.

**Media specs:**
- Icon: square, at least 512×512; check it at 150×150.
- Thumbnails: up to **10 images or videos** per game detail page; images 16:9, ideally 1920×1080 (under 3 MB for personalization uploads); keep 2–5 active for Home personalization.
- Video thumbnails: authentic gameplay only; **3 uploads per month** (rejected videos count toward the quota); not shown on Xbox, PlayStation, or VR headsets.

Dashboard/questionnaire problems are policy gates: an incomplete or inaccurate questionnaire is NOT READY, not an accepted risk.

## 7b. Using this kit's tools

Run these in order and cite each result as evidence. Tool details → `open-cloud` and `check`; Studio-side inspection → `studio-mcp`.

1. **`check` passes** on the exact source being released (formatting, selene, luau-lsp strict types, Rojo build). A failing check is a blocker for the changed code.
2. **`cloud_run_tests` passes on the test place** (`testPlaceId`), not the production place, so test uploads never touch production version history. Studio alternative: `execute_luau` (Server) running the project's TestRunner during a playtest.
3. **`cloud_upload_place` with `publish: false`** saves a version of the target place without making it live. Use it to stage, then inspect the saved version (open it in Studio, or check version history).
4. **`cloud_upload_place` with `publish: true` only with explicit user approval** given in this conversation for this release. Approval authorizes the action; it never upgrades a FAILED or UNVERIFIED gate.
5. **Studio-only content:** the place publishing API doesn't update `EditableImage`, `EditableMesh`, `PartOperation`, `SurfaceAppearance`, or `BaseWrap` instances. If the release modifies any of them, publish from Studio (File → Publish) instead, and tell the user to do so; don't report a cloud upload as having shipped them.
6. **Verify the live version afterwards:** join a fresh server and read `game.PlaceVersion` (for example via `execute_luau`, or a build marker the game logs), and compare it with the place's version history in Creator Dashboard. Existing servers keep the version they started with until they restart; plan a server restart or migration if the change requires it, and report old and new live versions separately.

## 8. Evidence contract

A PASS must cite one or more of:

- test name and result;
- playtest scenario and runtime log;
- Studio or MCP inspection/readback;
- profiler capture with scenario metadata;
- screenshot or video for visual/input claims;
- dashboard inspection with the relevant setting;
- durable-state readback for data or purchase claims.

A clean console does not prove data integrity, visual quality, accessibility, or purchase idempotency. A screenshot does not prove runtime behavior.

## 9. Final report

Use this structure:

1. **Verdict:** READY, NOT READY, or READY WITH ACCEPTED RISK.
2. **Payload:** exact experience/places and change scope.
3. **Blockers:** failed required high-consequence gates.
4. **Warnings:** nonblocking regressions or debt.
5. **Unverified:** required checks lacking evidence.
6. **Evidence:** pass results grouped by gate.
7. **Not applicable:** skipped gates with reasons.
8. **Rollback:** owner, trigger, and procedure.

Group evidence by class in the report: edits that succeeded (readback-confirmed), runtime behavior actually observed, and checks that could not run (reported as Unverified). A successful edit is not runtime proof. The checklist documents rollback; it does not supply transactional rollback. Recovery relies on the compensating action recorded per mutation (`studio-mcp`).

`READY WITH ACCEPTED RISK` requires a named risk, impact, owner, and rollback or mitigation. It is not a softer spelling of NOT READY.

## Close the release against the serving build

Track the source revision, installed Studio payload, published place version, and versions actually serving sessions separately. After an authorized publication, join through the intended player entry path and record the experience, place, runtime `PlaceVersion`, build marker, access state, and smoke-test result. Existing servers keep their loaded place version when a newer version is published. Report old and new live versions separately before attributing telemetry to a fix.

Inventory models, UI templates, and other place-owned dependencies referenced by the changed code. Exercise their spawn/open path in the release place and inspect the result: a silent fallback can leave the console clean while an asset is missing. Match this inventory to the saved/published candidate, not only the working Studio tree.

### Player-state transition matrix

For round or shared-state changes, cross the relevant events with active survivors, eliminated players already respawned, spectators, mid-round joiners, revived players, and leavers. Include join/data-ready during setup, role reveal, teleport, active play, results, cleanup, and the next round where applicable. Observe each affected client's controls, camera, UI, tools, and participation state. Include human and bot paths when both exist. A solo round that ends immediately on death cannot verify an eliminated player's behavior during a continuing multiplayer round.

## Sources

Reviewed 2026-10-18.

- [Publish games and places](https://create.roblox.com/docs/production/publishing/publish-games-and-places)
- [Roblox Kids and Select](https://create.roblox.com/docs/production/publishing/kids-and-select)
- [Content maturity and compliance](https://create.roblox.com/docs/production/promotion/content-maturity)
- [Icons](https://create.roblox.com/docs/production/publishing/experience-icons)
- [Thumbnails](https://create.roblox.com/docs/production/publishing/thumbnails)
- [Usage guide for place publishing (Open Cloud)](https://create.roblox.com/docs/cloud/guides/usage-place-publishing)
- [Version history](https://create.roblox.com/docs/projects/version-history)
- [DataModel.PlaceVersion](https://create.roblox.com/docs/reference/engine/classes/DataModel#PlaceVersion)
- [Adaptive design](https://create.roblox.com/docs/production/publishing/adaptive-design)
- [Accessibility](https://create.roblox.com/docs/production/publishing/accessibility)
- [Descriptions](https://create.roblox.com/docs/production/publishing/descriptions)
