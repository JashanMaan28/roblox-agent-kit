// PostToolUse hook: after Claude writes or edits a .luau/.lua file inside a Roblox
// project, run selene + luau-lsp on that file and feed problems back to Claude.
// Fails open: missing tools, no project, or any internal error exits 0 silently.
import fs from "node:fs";
import path from "node:path";
import {
  ensureDefinitions,
  ensureSourcemap,
  findProjectRoot,
  formatDiagnostic,
  isLuauFile,
  mergeDiagnostics,
  runLuauLsp,
  runSelene,
  samePath,
} from "./lib/toolchain.mjs";

const MAX_LINES = 25;

async function main() {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const file = input.tool_input?.file_path;
  if (!isLuauFile(file) || !fs.existsSync(file)) return 0;
  if (process.env.ROBLOX_AGENT_KIT_HOOK === "off") return 0;

  const root = findProjectRoot(file);
  if (!root) return 0;
  const rel = path.relative(root, file);
  if (rel.startsWith("..") || /(^|[\\/])(Packages|DevPackages|ServerPackages)[\\/]/.test(rel)) return 0;

  const selene = runSelene(root, [rel]);
  const lsp = runLuauLsp(root, [rel], { defs: await ensureDefinitions(), sourcemap: ensureSourcemap(root) });
  const diagnostics = mergeDiagnostics(
    root,
    selene.diagnostics,
    lsp.diagnostics.filter((d) => samePath(d.file, file, root)),
  );
  if (diagnostics.length === 0) return 0;

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const lines = diagnostics.slice(0, MAX_LINES).map(formatDiagnostic);
  if (diagnostics.length > MAX_LINES) lines.push(`... and ${diagnostics.length - MAX_LINES} more`);
  process.stderr.write(
    `roblox-agent-kit: ${errors} error(s), ${diagnostics.length - errors} warning(s) in ${rel}\n${lines.join("\n")}\n` +
      `Fix errors before moving on. Warnings are advisory.\n`,
  );
  return 2;
}

main().then(
  (code) => process.exit(code),
  () => process.exit(0),
);
