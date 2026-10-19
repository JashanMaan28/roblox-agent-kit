---
name: open-cloud
description: "roblox-cloud MCP tools and the opencloud CLI: Creator Docs search, API keys and scopes, headless Luau Execution, cloud tests, place upload/publish, DataStore reads, CI, OAuth, webhooks. Use for Roblox API lookups or work without Studio."
---

# Open Cloud + docs

## Docs (no setup)

`docs_search` (plain-language question → pages) then `docs_fetch` (page as Markdown). Indexes: `/docs/reference/engine/llms.txt` (Luau engine API) and `/docs/cloud/llms.txt` (REST; full schemas in `/docs/cloud/openapi.json`). Engine APIs run inside Roblox; Open Cloud APIs are HTTP from outside. Don't mix them up, and read the reference before calling an endpoint instead of recalling paths.

## Configuration

- API key: the plugin's `roblox_api_key` option (stored in the OS keychain), or `ROBLOX_API_KEY` in the environment. Never ask the user to paste a key into chat; never print it, write it to a file or pass it as a CLI argument. The user creates it at https://create.roblox.com/dashboard/credentials, limited to the experience(s) and, ideally, their IP.
- IDs: `roblox-kit.json` in the project root: `{ "universeId": "...", "placeId": "...", "testPlaceId": "..." }`. Explicit tool arguments override it; plugin options are the fallback. `cloud_config_status` shows what's resolved.
- Use a **separate test place** (`testPlaceId`) in the experience for `cloud_run_tests`, so test uploads never touch the production place's version history.

Scopes per tool:

| Tool | Scope |
|---|---|
| `cloud_run_luau` | `universe.place.luau-execution-session:write` |
| `cloud_upload_place`, `cloud_run_tests` | `universe-places:write` (+ the Luau one for tests) |
| `datastore_list` | `universe-datastores.control:list` |
| `datastore_list_entries` / `datastore_get_entry` | `universe-datastores.objects:list` / `:read` |

## Tools

### `cloud_run_luau`

Runs Luau on a fresh Roblox server against the latest saved (or a given) place version, with the full engine API. Return values come back as JSON; `print` output comes back as logs.

- **Limits:** script ≤ 4 MB; JSON-serialised return values ≤ 4 MB (task errors if exceeded); up to 5 min per task; 10 incomplete tasks per place (more → HTTP 429); task creation 5/min per key owner; only the last 450 KB of logs are kept; task info is retained 24 h after completion. Return one compact table rather than printing megabytes.
- **What persists:** DataModel changes are local to the task and are discarded, *unless* the script calls `AssetService:SavePlaceAsync()`. That only works when the place has API saving enabled in its settings (or was created with `CreatePlaceAsync`), it overwrites the place, an active Team Create session blocks it, and **by default it also publishes** (pass `{ SaveWithoutPublish = true }` to only save). Never call it without the user's explicit yes.
- **Engine calls are real:** DataStore, MemoryStore, MessagingService and HTTP calls from the task hit the live experience. Treat a cloud task like a production server.

### `cloud_run_tests`

`rojo build` → upload as a **Saved** version of the test place → run `ServerStorage.Tests` via the TestRunner → pass/fail with logs. Read the counts in the log (`N passed, M failed`): **zero tests found is a setup failure, not a pass** (wrong project mapping, specs not named `*.spec`, or `tests/` missing from the build), even if the tool reports success.

### `cloud_upload_place`

`publish: false` saves a version players don't see; `publish: true` goes **live**. Only publish when the user explicitly asked in this conversation.

- The place-publishing endpoint is beta and doesn't update EditableImage, EditableMesh, PartOperation, SurfaceAppearance or BaseWrap instances: publish those from Studio.
- HTTP 409: the documented meaning is "place not part of the universe" (check `universeId`/`placeId`). A 409 "Server is busy and unable to process your upload request" has also been observed while the place was open in Studio; it cleared after closing the place there. Ask the user to close it before retrying.

### `datastore_*`

Read-only inspection of live data (e.g. debugging a player's save). There are intentionally no write tools; for fixes, write a reviewed migration script and ask the user. Open Cloud and in-game DataStore requests **share one per-experience budget**, so a bulk listing can throttle live servers (and vice versa): page modestly and prefer off-peak for large scans.

## CLI / CI

The same client is a CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/opencloud.mjs" run|upload|test|docs`. Projects created by `rbx-new` carry copies in `tools/` (`tools/rbx-cloud.mjs`, `tools/rbx-check.mjs`) and a `.github/workflows/ci.yml` that runs checks on every push, and cloud tests when the repo has `ROBLOX_API_KEY` (secret) plus `ROBLOX_UNIVERSE_ID` and `ROBLOX_TEST_PLACE_ID` (variables).

Roblox's reference implementation of the same idea (build → upload → run tests with Luau Execution from GitHub Actions) is https://github.com/Roblox/place-ci-cd-demo.

Testing strategy and Jest Lua over Open Cloud: see `roblox-testing`.

## Beyond the kit's tools

For OAuth 2.0 apps (PKCE), webhook receivers, the in-experience Secrets store (`HttpService:GetSecret`), REST mechanics (pagination, `updateMask`, long-running operations, retries) and a permission-failure diagnosis order, read [references/oauth-webhooks-secrets.md](references/oauth-webhooks-secrets.md).
