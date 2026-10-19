# Troubleshooting the Studio connection

Match the symptom, give the user the single fix, then re-run setup from the top. For registering the server or loading its tools, see `connect.md`. Deeper tool-level issues (black screenshots, `multi_edit` failures, sandboxed `execute_luau`) are in the `studio-mcp` skill.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No Studio tools in this session | Studio wasn't installed, or `mcp.bat` didn't exist yet, when the session started | `/mcp` → reconnect `roblox-studio`, or start a new session (`connect.md`) |
| `/mcp` shows `roblox-studio` failed: "could not find Roblox Studio's MCP server" | Studio isn't installed where the launcher looks, or (Windows) the MCP setting was never turned on so `mcp.bat` doesn't exist | Install/update Studio, turn on the setting once, then reconnect. Studio elsewhere: set `ROBLOX_STUDIO_MCP` to the full path of `mcp.bat` / `StudioMCP` |
| `/mcp` shows `roblox-studio` failed with a `node` error | Node.js isn't on the PATH Claude Code uses | Install Node.js (LTS) or fix PATH, then restart Claude Code |
| Tools appear twice | Studio's server is registered twice (manual `Roblox_Studio`, Quick connect, or Roblox's own plugin) | Follow the duplicates section in `connect.md` |
| Tools present, but `list_roblox_studios` is empty | Studio isn't running, no place is open (start page), the MCP setting is off, or Studio hasn't attached yet | Wait/retry ~30 s; then open Studio, open a place, turn on the setting (`install.md` sections C and D) |
| "Unable to reach Roblox Studio" | Same as above | Same as above |
| The MCP setting was on, but now it's off | The setting is per Roblox account (switched accounts), or a Studio update reset it | Turn it on again |
| Connection drops every few minutes | Known Studio-side issue | Toggle the setting off and on; reconnect in `/mcp` |
| Studio is installed, but there's no `StudioMCP` (macOS) or `mcp.bat` (Windows) | Studio is out of date, or (Windows) the setting has never been enabled | Update Studio, open a place, enable the setting |
| A place opened while Studio was still starting never connects | Assistant hadn't finished loading | Close and reopen the place |
| Connection fails right after the setting is turned on | Another program is using port 13469 | Close the other program, then restart Studio |
| Windows: server fails and the Windows username or Roblox folder path has spaces/non-Latin characters | `mcp.bat` path handling | Report it to the user; set `ROBLOX_STUDIO_MCP` to the server executable if a working path exists |
| Tool calls go to the wrong place | Several Studios are open | `list_roblox_studios`, confirm the place by name, use that `studio_id` |
| A tool mentioned in the docs is missing | Studio's tool set varies with its version and feature flags | Use the tools that are there; suggest updating Studio |
| The check says Studio isn't installed but the user says it is | The command ran in a sandbox that remaps `$HOME` / `%LOCALAPPDATA%` | Rerun the `install.md` command outside the sandbox. Don't reinstall if the user says Studio is there |
| A download, install or launch command is blocked | The shell is sandboxed or can't reach the user's desktop | Walk the user through the step instead |

If nothing matches, say which setup step failed and what you saw. Leave the user's places and files unchanged, and don't install third-party tools or MCP servers to work around it.
