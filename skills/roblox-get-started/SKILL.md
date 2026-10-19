---
name: roblox-get-started
description: "Connect Roblox Studio to Claude Code: install Studio if needed, enable Studio as MCP server, confirm with list_roblox_studios. Use when Studio is not connected yet or the Studio tools are missing, failing or duplicated."
---

# Get started with Roblox Studio

This skill gets you to a working Studio connection, then stops and hands off to `roblox-kit`. It's safe to re-run: start at step 1 each time and skip whatever's already done. In a new session, "continue Roblox setup" picks up where the user left off.

Do as much as you can yourself. The user should only have to approve once, sign in, open a place, turn on Studio's MCP setting, and reconnect if needed.

## References

- `references/install.md`: commands to check for, install and open Studio, and where the user turns on its MCP setting.
- `references/connect.md`: how this plugin registers and loads Studio's MCP server in Claude Code, and how to fix duplicates.
- `references/troubleshoot.md`: symptoms and fixes.
- `SECURITY.md`: exactly what the installer step does and its limits.

## Rules

- **One approval, up front.** Before changing anything, list what you'll do (e.g. download Studio from Roblox, install it, open it). Ask once; that covers everything on the list. Ask again only for something that wasn't on it.
- Download only from `setup.rbxcdn.com`, and check the installer's Roblox signature (`install.md`). No mirrors, package managers, third-party MCP servers or `npx` packages.
- Never ask for, read or type the user's Roblox password. The user signs in to Studio themselves.
- **Ask whether the user is signed in** ("Are you signed in to Roblox Studio?") and believe the answer. Don't try to check it yourself.
- Never close or force-quit Studio yourself (unsaved work). Ask the user to quit it.
- Don't edit Studio's settings files or change system security settings. The user turns on the MCP setting in Studio.
- **Install and open Studio outside any sandbox.** A sandboxed shell can point `$HOME` or `%LOCALAPPDATA%` at its own folders, so the installer lands in the wrong place or Studio won't start. The check in `install.md` section A is safe anywhere. If the user says Studio is installed, believe them even if a check said otherwise.
- **Never add a second Studio MCP server.** This plugin already registers one (`roblox-studio`). Don't run `claude mcp add` for Studio, don't turn on Studio's Quick connect for Claude Code, and don't install Roblox's own Studio plugin alongside this one.
- If a step fails, say which step and what you saw, then check `troubleshoot.md`.

## 1. Can this session reach Studio?

Studio runs only on Windows and macOS. If this Claude Code session runs on Linux, in a container or on a remote machine (`uname` prints `Linux`, or the user's files aren't visible), it can't reach a local Studio: say what the user needs, link https://create.roblox.com/docs/studio/setup, and keep helping meanwhile (plan the game, explain concepts, write Luau or a Rojo project they can sync later). Don't leave the user at a dead end.

## 2. Already connected?

If `list_roblox_studios` is available, call it.

- **One or more instances:** go to step 7.
- **Empty list:** the server is running, but Studio is closed, no place is open, or the MCP setting is off. Right after Studio starts, retry every ~2 s for up to ~30 s before concluding that. Then go to step 3.
- **Tool not available, or the call fails:** the server isn't loaded, usually because Studio wasn't installed (or the setting was off) when this session started. Go to step 3, and plan on step 6.

If the tools appear twice, follow the duplicates section in `connect.md` first.

## 3. Check what's there

Without asking, run the read-only check in `install.md` section A.

## 4. Ask once

Tell the user, in one short list, what's missing and what you'll do about it. Mention that Studio is free and comes from Roblox's official download server. Then ask for approval.

If the user would rather install Studio themselves, send them to https://create.roblox.com/docs/studio/setup. Wait until they say it's done, then continue from step 5.

## 5. Install and open

In this order, skipping whatever's already done:

1. **Install** (`install.md` section B).
2. **Open Studio** (`install.md` section C).

Then give the user what's left as **one** short list, and wait for them to say it's done:

- **Sign in:** ask "Are you signed in to Roblox Studio?" If not, ask them to sign in.
- **Open a place:** an existing place, or **Baseplate** on the start page. The Assistant panel only appears with a place open.
- **Turn on the MCP setting**, if it isn't on yet: **Assistant → ⋯ → Settings → MCP Servers** (older versions: **Assistant → ⋯ → Manage MCP Servers**), then turn on **Enable Studio as MCP server** (`install.md` section D). Leave the **Quick connect** toggles off: this plugin is the connection.

## 6. Load the tools

If the Studio tools weren't available at the start of this session, follow `connect.md`: have the user reconnect `roblox-studio` in `/mcp`, or start a new session and say "continue Roblox setup".

## 7. Handshake

Call `list_roblox_studios`:

- **One or more instances:** you're connected. If several are listed, match the user's words to a `name`, or ask which one they mean before changing anything. Keep that `studio_id` for the rest of the conversation.
- **Empty list:** no place is open, or the MCP setting is off. Go back to step 5.
- **Tool unavailable or failing:** go to step 6, then check `troubleshoot.md`.

## 8. Hand off

Tell the user in one line that Studio is connected, then load `roblox-kit` and get on with what they asked for. Useful next steps to offer:

- Start a file-based project with `new-project` (Rojo, tests, checks, CI), or work directly in the open place through `studio-mcp`.
- For Roblox's own guides on specific jobs (debugging, profiling, unit tests), call Studio's `skill` tool.

Don't rerun this skill once connected, and don't add another MCP server.
