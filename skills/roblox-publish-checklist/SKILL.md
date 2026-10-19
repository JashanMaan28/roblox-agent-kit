---
name: roblox-publish-checklist
description: "Release gates for publishing or updating a Roblox game: blockers, runtime and performance checks, platform requirements, the check, cloud test, upload, publish flow. Use before shipping or when asked if a build is ready."
---

# Roblox Publish Checklist

## When to Load

Load before publishing or updating a live experience. Test the surfaces and risks the change introduces.

## Quick Reference

### 1. Define the release

Record the changed places, scripts, assets, configuration, schemas, products, supported devices, and rollback path. Classify each gate as required, conditional, or not applicable before testing.

### 2. Block on high-consequence failures

- **Persistence changed:** load, save, migration, duplicate-session, disconnect, and shutdown behavior. Load `roblox-data` or `roblox-server-data`.
- **Remotes or authority changed:** validate types, bounds, state, ownership, replay, and abusive frequency. Load `roblox-networking` and `roblox-security`.
- **Purchases changed:** test durable, idempotent receipt grants and retries. Load `roblox-monetization`.
- **Cloud auth or webhooks changed:** verify secrets, scopes, callback state, retries, signatures, and deduplication. Load `open-cloud`.

A failed high-consequence gate means NOT READY. Do not average it into a percentage. Precedence: user approval authorizes an otherwise permitted action; it does not satisfy a mandatory policy and does not turn a failed or unverified gate into PASS.

### 3. Exercise the shipped surface

- Run one normal flow plus failure, retry, leave/rejoin, and rapid-input cases relevant to the change.
- Test every supported input mode and representative viewport/device tier.
- Measure errors, memory, frame/network cost and streaming.
- Verify focus, touch targets, readable contrast, non-color state cues, reduced motion, and localized overflow where applicable.
- Confirm Dashboard metadata, permissions, questionnaire, and policy (full.md "Current platform requirements"); after publishing, verify the version actually serving players.

### 4. Ship with this kit's tools

1. `check` passes (StyLua, selene, luau-lsp, Rojo build).
2. `cloud_run_tests` passes on the **test** place.
3. `cloud_upload_place` with `publish: false` (saved version); `publish: true` **only** with explicit user approval in this conversation.
4. Changes to EditableImage, EditableMesh, PartOperation, SurfaceAppearance, or BaseWrap must be published from Studio (the place publishing API doesn't update them).
5. Verify the live version afterwards (`game.PlaceVersion` in a new server, place version history).

### 5. Require evidence

Every PASS cites a test, log, profiler capture, readback, screenshot, or dashboard inspection. UNVERIFIED if unavailable; approval is not evidence.

### Output

`READY`, `NOT READY`, or `READY WITH ACCEPTED RISK`; blockers first, then warnings, unverified gates, evidence, rollback plan, and skipped gates with reasons.

> Details: [references/full.md](references/full.md)
