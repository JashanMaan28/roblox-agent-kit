// Cross-platform launcher for Roblox Studio's built-in MCP server (StudioMCP).
// Studio ships the server; this only finds it and pipes stdio through.
// Override the location with ROBLOX_STUDIO_MCP=<path to mcp.bat or StudioMCP>.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function studioMcpCommand() {
  const override = process.env.ROBLOX_STUDIO_MCP;
  const candidates = [];
  if (override) candidates.push(override);
  if (process.platform === "win32") {
    candidates.push(path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "Roblox", "mcp.bat"));
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP",
      path.join(os.homedir(), "Applications", "RobloxStudio.app", "Contents", "MacOS", "StudioMCP"),
    );
  }
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) return null;
  // Run from the server's own folder: mcp.bat breaks when started from a cwd whose path has spaces.
  const cwd = path.dirname(found);
  return /\.(bat|cmd)$/i.test(found)
    ? { cmd: "cmd.exe", args: ["/c", found], cwd }
    : { cmd: found, args: [], cwd };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = studioMcpCommand();
  if (!target) {
    process.stderr.write(
      "roblox-studio MCP: could not find Roblox Studio's MCP server. Install Roblox Studio (Windows or macOS), " +
        "turn on 'Enable Studio as MCP server' (Assistant > ... > Manage MCP Servers, or Assistant Settings > MCP Servers), " +
        "or set ROBLOX_STUDIO_MCP.\n",
    );
    process.exit(1);
  }
  const child = spawn(target.cmd, [...target.args, ...process.argv.slice(2)], {
    cwd: target.cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
  child.on("error", (err) => {
    process.stderr.write(`roblox-studio MCP: failed to start ${target.cmd}: ${err.message}\n`);
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
