# Connect Studio to Claude Code (Roblox Agent Kit)

How this plugin registers and loads Roblox Studio's built-in MCP server. Rewritten for this plugin; the original covered Roblox's own plugin and other apps.

## Registration

The Roblox Agent Kit registers Studio's server itself, as **`roblox-studio`** in the plugin's `.mcp.json`. There is nothing to add by hand. In `/mcp` it appears as a plugin server, e.g. `plugin:roblox-agent-kit:roblox-studio` (the exact label depends on the Claude Code version). The same plugin also registers `roblox-cloud` (docs and Open Cloud tools), which doesn't need Studio.

The entry runs `node "${CLAUDE_PLUGIN_ROOT}/scripts/studio-mcp.mjs"`, a small cross-platform launcher that:

- on Windows starts `%LOCALAPPDATA%\Roblox\mcp.bat` from its own folder (it breaks when started from a path with spaces);
- on macOS starts `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP` or `~/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`;
- honours an override path in the `ROBLOX_STUDIO_MCP` environment variable;
- otherwise exits with "could not find Roblox Studio's MCP server", which shows the server as failed in `/mcp`.

It needs `node` on the PATH of the environment Claude Code starts servers in.

**Never register a second Studio MCP server.** That means no `claude mcp add … mcp.bat` / `StudioMCP`, no Studio **Quick connect** toggle for Claude Code, and not installing Roblox's own "Roblox Studio" Claude Code plugin next to this one. Each of those starts another copy of the same server, the tools appear twice, and calls go to whichever loaded first.

## Loading the tools

The server process starts with the session. If Studio wasn't installed, or `mcp.bat` didn't exist yet (on Windows it appears only after **Enable Studio as MCP server** has been turned on once), the server failed at startup and its tools aren't loaded:

1. Have the user run `/mcp`, select the `roblox-studio` server from this plugin and reconnect it.
2. If that doesn't bring the tools back, have them start a new Claude Code session and say **continue Roblox setup**.

If the user asked for more than setup (e.g. "make a game") and has to start a new session, ask them to repeat that request there. Don't say setup is finished while the tools are still missing.

After the tools load, Studio attaches to the server a few seconds later: poll `list_roblox_studios` every ~2 s for up to ~30 s before deciding nothing is connected.

## Where this can run

- **Claude Code on the user's Windows PC or Mac** can run the `install.md` commands directly and reach a local Studio.
- **Claude Code on Linux, in a container, over SSH or in a cloud sandbox** can't reach the user's Studio (there is no Linux Studio). Say so, and keep helping without Studio: files, Rojo projects, `check`, docs and Open Cloud tools still work.

## Duplicates

If the Studio tools appear twice, the user probably also added Studio's server some other way. Check with `claude mcp list` and look for:

- a manual entry such as `Roblox_Studio` (what Studio's Quick connect and Roblox's docs create);
- Roblox's own plugin's servers (`plugin:roblox-studio:windows` / `plugin:roblox-studio:macos`).

With the user's approval, remove the extra one and keep this plugin's:

```sh
claude mcp remove Roblox_Studio
```

(without `--scope` it removes the entry from whichever scope holds it), turn off the Quick connect toggle for Claude Code in Studio's MCP Servers settings, and/or uninstall Roblox's plugin with `/plugin`. Then have the user start a new session.
