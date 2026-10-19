# Working style: examples, verification ladder, common failures

Loaded on demand from `../SKILL.md`. Adapted from community skills (MIT and Apache-2.0); see `../ATTRIBUTION.md`. The rules in `SKILL.md` win if anything here conflicts.

## 1. Mode inference

| User says | Mode | Why |
|---|---|---|
| "let's redesign the shop economy together" | Peer | Co-creation phrasing; wants judgment, not output |
| "add a double-jump ability" | Autonomous | Task phrasing; review happens after |
| "can you look at my DataStore code?" | Peer (review) | Asking for assessment; don't rewrite unasked (use `roblox-review`) |
| "fix the bugs then push the update" | Autonomous + approval gate | Implementation is autonomous; publishing stays gated |

Mixed requests ("build the leaderboard, and I want to discuss the reward curve"): build autonomously, discuss in peer mode, and say you split it.

## 2. Bravery calls

- **Low risk, just do it:** rename `part1` to `LobbyDoor`, reword a tooltip, move parts into a folder. Mention it in the summary.
- **Medium risk, do and show:** replace a `while true do` poll with `CollectionService` signals. Implement, show the diff, note the behavioural change, invite correction.
- **High risk, propose first:** change a player-data schema version, touch `ProcessReceipt`, delete a DataStore key family, enable StreamingEnabled on a shipped place, publish. Write a short proposal with the rollback story and wait.

## 3. Process examples

- **Ask once, early:** "make saves faster" in a game with two competing save paths. One concrete question ("which path should own saves: A or B?") beats three silent assumptions or five questions.
- **State assumptions:** "I assumed coins are the only persisted currency." One line; cheap to correct.
- **Unverifiable facts:** asked to wire a purchase flow against "the live catalog" you can't inspect: say which product IDs you didn't verify instead of asserting they exist.
- **Accepted risk vs policy:** "I accept the risk, ship it" covers otherwise permitted actions (note it in one line). It never overrides a mandatory platform policy (e.g. paid random items for a policy-restricted user, see `roblox-monetization`) or turns a failed or unrun check into a pass. Restate the compliant alternative once, then proceed compliantly or stop and report.

## 4. Checkable collaboration rules

**Start from the current state.**

- Load the applicable domain skills before planning; pull out their acceptance checks and record evidence for each before reporting completion. Loading a skill doesn't satisfy it.
- Before resuming a task from memory, re-read the current source, the place state and the latest decisions. Distinguish implemented, tested, approved, deferred, rejected and live work.
- For multi-step fixes, keep a numbered list of observations (including what the user approved or liked), each deferred item's next action, and any missing evidence. Reconcile it at handoff.
- Keep the user's authority, your current credentials and the scope of what was authorised separate. Check `roblox-kit.json`, plugin config and `cloud_config_status` before asking for a key again; report presence without printing secrets.

**Ground recommendations in evidence.**

- Label observations vs hypotheses and your confidence. When advice changes, name the new evidence. Don't raise confidence just because the user agrees.
- Treat earlier AI analyses (including your own from earlier in the session) as leads: recheck source, date and interpretation before reusing them.
- Say what a reference is (live place, old copy, partial client code, template, reconstruction) and cite what you actually inspected. Access to a reference isn't permission to reuse its assets.

**Preserve approved work while fixing defects.**

- For a narrow fix, change only the properties needed; compare before and after on the surface the user cares about; keep accepted layout, effects and unrelated work intact.
- After repeated subjective misses (look, feel, layout), get one representative example approved before spreading the pattern.
- Verify delegated work (subagents, Studio's `subagent`) against the brief and the actual result. A clean report or diff doesn't prove the right screen, state or device was tested.

## 5. Establish the source of truth and reuse before adding

1. **Who owns each subtree?** Rojo files, Studio, Wally `Packages/`, or a generated build. Don't hand-edit generated output or make Studio-only edits the next sync overwrites. In Rojo projects, scripts under mapped folders are edited on disk only, never with `multi_edit`.
2. **Inventory before proposing structure.** Search scripts, modules, remotes and tags (`rg` on disk; `script_search`, `script_grep`, `search_game_tree` in Studio); read the project mapping and naming conventions; run once to see existing warnings. Find the feature's current owner and dependencies.
3. **Plan the smallest compatible edit.** Name the instances, files and execution locations you'll change. Reuse existing remotes, service modules, cleanup utilities, tags, attributes, folders and config patterns.
4. **Reuse before adding.** Before creating a RemoteEvent, search by purpose and inspect both ends. Before adding a "manager" module, find the current owner. Before adding folders or tags, check the existing naming and lookup pattern. Duplicate systems are dangerous when both run: input binds twice, data saves twice, UI clones twice, gameplay effects apply twice.
5. **Attributes vs tags vs folders.** Attributes: small typed, designer-editable metadata on an instance. `CollectionService` tags: discovering sets of instances anywhere in the hierarchy. Folders: ownership and navigation, not semantics. Validate attributes at the system boundary and warn with the full instance path:

```luau
local CollectionService = game:GetService("CollectionService")

local function setupDoor(instance: Instance)
	if not instance:IsA("Model") then
		return
	end
	local accessLevel = instance:GetAttribute("AccessLevel")
	if type(accessLevel) ~= "number" then
		warn(`Door {instance:GetFullName()} needs a numeric AccessLevel attribute`)
		return
	end
	-- attach behaviour; also clean it up on GetInstanceRemovedSignal("Door")
end

for _, door in CollectionService:GetTagged("Door") do
	setupDoor(door)
end
CollectionService:GetInstanceAddedSignal("Door"):Connect(setupDoor)
```

6. **Create real, inspectable objects.** Authored UI, folders, attachments, constraints and remotes stay visible in Explorer (Rojo `.model.json`/`.rbxm` or Studio). Use scripts for behaviour and genuinely dynamic repetition, not to hide a whole feature in runtime construction.
7. **Clean the experiment.** Remove temporary parts, test remotes, command-bar leftovers, debug UI, prints, disabled duplicate scripts, placeholder assets, and tags/attributes added only for diagnosis. Stop the playtest and confirm the edit-mode hierarchy is clean.

## 6. Verification ladder

Use the smallest rungs that cover the change, but never report a lower rung as a higher one.

| Rung | What it proves | How in this kit |
|---|---|---|
| 1. Static | Project mapping parses, types check, lint clean, Rojo builds | PostToolUse hook; `rbx-check.mjs` (`check` skill) |
| 2. Unit | Pure logic and module contracts | `tests/*.spec.luau` via TestRunner in Studio or `cloud_run_tests` (`roblox-testing`) |
| 3. Single session | Right execution context and hierarchy, no new Output errors, happy path, cleanup | `start_stop_play`, `get_console_output`, `execute_luau` on Server/Client, `screen_capture` |
| 4. Lifecycle | Respawn, reset, rejoin, streaming, character replacement | Reset the character via `execute_luau`, re-run the path |
| 5. Server & clients | Remotes, replication, ownership, joins/leaves with 2+ players | Studio Test → Server & Clients (the user starts it; the MCP playtest is single-client) |
| 6. Device / input | Touch, gamepad, small screens, orientation | Device emulator (`skill` → `rbx-device-simulator-lua`), `user_*_input` |
| 7. Stress / failure | Malformed input, spam, empty/full content, rapid transitions, disconnects | Server-side tests and adversarial remote calls in a playtest |

State the highest rung you actually reached and which you didn't run. "Looks right" or static reading is never "tested in Studio".

## 7. Common failures

| Symptom | Likely cause | Remedy |
|---|---|---|
| Studio edit disappears after sync | A Rojo-mapped script was edited in Studio | Edit the file on disk and resync |
| Feature runs twice | Duplicate script, remote or controller | Inspect first; consolidate under the existing owner |
| Client can't access a module/object | Wrong execution/storage location | Move shared content deliberately; keep secrets server-only |
| Authored screen unreadable in Explorer | Whole UI built by one LocalScript | Create a named instance shell plus small behaviour modules |
| Test passes only in solo Play | Replication or lifecycle untested | Server & Clients, rejoin/respawn checks |
| "Clean" Output hides client errors | Only server output read | Check both Server and Client contexts (`execute_luau` on each, console output) |
| Shipped place has debug folders/prints | Experiment cleanup skipped | Keep a cleanup list; inspect the hierarchy after the session |
| Attribute/tag behaviour silently fails | Schema or class not validated | Validate at the setup boundary; warn with the full instance path |
| `multi_edit` "old_string not found" | Guessed anchor, stale read, alignment whitespace | `script_read` the exact lines, use a short distinctive anchor |
| Edit tools fail mid-session | A playtest is still running | `start_stop_play` with `is_start: false`, confirm via `get_studio_state` |

## 8. Execution locations (quick map)

| Location | Role | Constraint |
|---|---|---|
| `ServerScriptService` | Authoritative server scripts/modules | Not replicated |
| `ServerStorage` | Server-only assets/data (and `Tests` in this kit) | Clients can't see it |
| `ReplicatedStorage` | Shared modules, assets, remotes, `Packages` | Visible to clients: no secrets |
| `StarterPlayerScripts` | Client systems that survive respawn | Cloned into `PlayerScripts` |
| `StarterCharacterScripts` | Per-character client behaviour | Recreated every spawn |
| `StarterGui` | Authored UI templates | Cloned into `PlayerGui`; `ResetOnSpawn` matters |
| `Workspace` | Replicated world and live characters | Streaming and network ownership affect what clients see |

Check each script's actual `RunContext` and the project's conventions; don't assume from location alone.
