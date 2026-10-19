// SessionStart hook: when the session opens inside a Roblox project, tell Claude
// which parts of the kit are usable right now. Prints nothing elsewhere.
import fs from "node:fs";
import path from "node:path";
import { FEATURES_REL, loadPlan, summarize, validatePlan } from "./lib/features.mjs";
import { findProjectRoot, hasTool } from "./lib/toolchain.mjs";
import { studioMcpCommand } from "./studio-mcp.mjs";

const TOOLS = ["rojo", "wally", "luau-lsp", "selene", "stylua", "lune"];

function main() {
  const root = findProjectRoot(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (!root) return;

  const missing = TOOLS.filter((t) => !hasTool(t, root));
  const studio = studioMcpCommand();
  const hasKey = Boolean((process.env.CLAUDE_PLUGIN_OPTION_ROBLOX_API_KEY || process.env.ROBLOX_API_KEY || "").trim());
  const kitConfig = fs.existsSync(path.join(root, "roblox-kit.json"));
  const rojo = fs.existsSync(path.join(root, "default.project.json"));

  const lines = [
    `Roblox Agent Kit: Roblox project detected at ${root}. Load the roblox-agent-kit:roblox-kit skill before doing Roblox work.`,
    `- Toolchain: ${missing.length ? `missing ${missing.join(", ")} (run \`rokit install\` in the project root)` : "all tools available"}`,
    `- Code layout: ${rojo ? "Rojo project (files on disk are the source of truth; Studio edits are not written back)" : "no default.project.json (not a Rojo project)"}`,
    `- Studio MCP: ${studio ? "launcher found; tools work only while Studio is open with 'Enable Studio as MCP server' on" : "Roblox Studio MCP launcher not found on this machine"}`,
    `- Open Cloud: ${hasKey ? "API key configured" : "no API key (cloud tools disabled; docs tools still work)"}; ${kitConfig ? "roblox-kit.json present" : "no roblox-kit.json (universe/place IDs come from plugin config)"}`,
  ];
  const build = gameBuildStatus(root);
  if (build) lines.push(build);
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: lines.join("\n") } }),
  );
}

// One line about an in-progress build-game run, so a new session knows to resume it.
function gameBuildStatus(root) {
  const file = path.join(root, FEATURES_REL);
  if (!fs.existsSync(file)) return null;
  try {
    const plan = loadPlan(file);
    const { errors } = validatePlan(plan);
    if (errors.length) return `- Game build: design/features.json has ${errors.length} validation error(s); run \`node tools/game-plan.mjs validate\` and fix them before building.`;
    const s = summarize(plan);
    if (s.total > 0 && s.done === s.total) return `- Game build: all ${s.total} features in design/features.json are done.`;
    const next = s.next ? `next ${s.next.id} "${s.next.title}"` : "no feature ready (see blocked)";
    return `- Game build in progress: ${s.done}/${s.total} features done, ${next}${s.blocked.length ? `, ${s.blocked.length} blocked` : ""}. To continue, load roblox-agent-kit:build-game and follow its session-start routine.`;
  } catch {
    return "- Game build: design/features.json exists but could not be read (run game-plan validate).";
  }
}

try {
  main();
} catch {
  // Never block a session on a status report.
}
