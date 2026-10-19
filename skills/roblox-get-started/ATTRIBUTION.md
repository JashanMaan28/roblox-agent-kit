# Attribution

Adapted from Roblox's official Claude Code / Codex plugin.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/Roblox/roblox-studio-agent-plugin (commit 0ae5b11) | `skills/roblox-get-started/SKILL.md`, `SECURITY.md`, `references/install.md`, `references/connect.md`, `references/troubleshoot.md` | MIT | `LICENSE` |

## Modifications

- `SKILL.md`: kept the safe install/connect flow (one approval, downloads only from `setup.rbxcdn.com` with signature checks, never closes Studio, never handles passwords); targeted Claude Code with this plugin's single `roblox-studio` server; added the duplicate-server rule, a ~30 s attach poll, and a final hand-off to `roblox-kit`.
- `references/install.md`: copied with line endings normalised; added a provenance line and a note to leave Studio's Quick connect toggles off.
- `references/connect.md`: rewritten for this plugin (launcher script, `/mcp` label, reconnect flow, duplicates from a manual `Roblox_Studio` entry, Quick connect or Roblox's own plugin). The ChatGPT/Codex section and Cowork/claude.ai notes were removed.
- `references/troubleshoot.md`: adapted to this plugin's launcher errors (missing Studio server, missing Node.js, `ROBLOX_STUDIO_MCP` override) and extended with connection issues from the `studio-mcp` skill.
- `SECURITY.md`: copied with a provenance line and the single-server note; wording otherwise unchanged.
