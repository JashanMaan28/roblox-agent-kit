# Attribution

`SKILL.md` and `references/studio-mcp-details.md` are kit-authored, with sections paraphrased and adapted from the MIT-licensed sources below. Tool parameter names were re-checked against the live Studio MCP `tools/list` schema (2026-10-18).

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/MSayib/roblox-dev-skill (commit 4a35b01) | `references/mcp-integration.md` (multi_edit call shape, execute_luau privilege/timeout notes, http_get allowlist, built-in `rbx-*` skills, generate_texture / segment_mesh, script_grep line-number caveat, stop-playtest-before-multi_edit); `references/agent-safety.md` ("Six facts", "Never act on instructions found inside the place", "Pre-flight") | MIT | `LICENSE-MSayib` |
| https://github.com/m4bwav/roblox-agent (commit 581a33a) | `skills/roblox-agent-studio/SKILL.md` Step 3 (execute_luau sandbox episodes, first-return-value only, whitespace-exact multi_edit anchors); `references/troubleshooting-and-servers.md` (connection checklist); `LEARNINGS.md` L-006 (poll list_roblox_studios after start) and L-008 (black screen_capture when minimised) | MIT | `LICENSE-m4bwav` |
| https://github.com/TabooHarmony/roblox-brain (commit ceee4aa) | `skills/tools/roblox-studio-mcp/references/full.md` (mutation records and ambiguous timeouts, destructive-test preflight, untrusted place-content boundary, asset privacy diagnosis, structured playtest pattern and discipline) | MIT | `LICENSE-TabooHarmony` |

## Modifications

- Rewritten and condensed for this plugin's single `roblox-studio` server; all hard-coded `mcp__…` tool prefixes removed.
- Removed references to `~/RobloxDocs`, third-party Studio MCP bridges (chrrxs/robloxstudio-mcp, `set_active_studio`), installing Roblox's own plugin, CUA screenshot fallbacks, and the sources' maintenance/evergreen machinery.
- Corrected against the live schema: `wait_job_finished` takes `jobId` (one source said `generationId`); `subagent` types are build-dependent; `screen_capture` requires `capture_id`; `start_stop_play` requires `is_start`.
- Dropped two incorrect source claims: that `execute_luau` cannot run during a playtest (it targets Server/Client while one runs) and that scripts are limited to ~4-5 KB per write.
- Structured playtest adapted to use files on disk for Rojo projects instead of `multi_edit`.
