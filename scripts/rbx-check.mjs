#!/usr/bin/env node
// Whole-project check without Studio: StyLua, selene, luau-lsp type check, and a Rojo build.
//   node rbx-check.mjs [--fix] [--json] [paths...]
// --fix formats with StyLua instead of only checking. Exits 1 when anything fails.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensureDefinitions,
  ensureSourcemap,
  findProjectRoot,
  formatDiagnostic,
  hasTool,
  mergeDiagnostics,
  run,
  runLuauLsp,
  runSelene,
  runStylua,
} from "./lib/toolchain.mjs";

const argv = process.argv.slice(2);
const fix = argv.includes("--fix");
const asJson = argv.includes("--json");
const paths = argv.filter((a) => !a.startsWith("--"));

const root = findProjectRoot(process.cwd());
if (!root) {
  console.error("rbx-check: no Roblox project found (looked for default.project.json, rokit.toml, selene.toml, ...).");
  process.exit(1);
}
const targets = paths.length ? paths.map((p) => path.relative(root, path.resolve(p))) : ["src", "tests"].filter((d) => fs.existsSync(path.join(root, d)));
if (targets.length === 0) targets.push(".");

const report = { root, targets, skipped: [] };

const stylua = runStylua(root, targets, { fix });
if (stylua.skipped) report.skipped.push(stylua.skipped);
report.format = fix ? { fixed: stylua.fixed, error: stylua.error } : { unformatted: stylua.unformatted, error: stylua.error };

const selene = runSelene(root, targets);
if (selene.skipped) report.skipped.push(selene.skipped);

const sourcemap = ensureSourcemap(root);
const lsp = runLuauLsp(root, targets, { defs: await ensureDefinitions(), sourcemap });
if (lsp.skipped) report.skipped.push(lsp.skipped);
report.diagnostics = mergeDiagnostics(root, selene.diagnostics, lsp.diagnostics);

if (fs.existsSync(path.join(root, "default.project.json"))) {
  if (hasTool("rojo", root)) {
    const out = path.join(os.tmpdir(), `rbx-check-${process.pid}.rbxl`);
    const b = run("rojo", ["build", "default.project.json", "--output", out], { cwd: root });
    report.build = b.ok ? { ok: true } : { ok: false, error: (b.stderr || b.stdout).trim() };
    fs.rmSync(out, { force: true });
  } else report.skipped.push("rojo not installed");
}

const errors = report.diagnostics.filter((d) => d.severity === "error");
const warnings = report.diagnostics.length - errors.length;
report.ok =
  errors.length === 0 && !report.format.error && (fix || report.format.unformatted.length === 0) && report.build?.ok !== false;

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`rbx-check: ${root} [${targets.join(", ")}]`);
  if (report.skipped.length) console.log(`skipped: ${report.skipped.join("; ")} (run \`rokit install\`)`);
  if (fix) console.log(`format: ${stylua.fixed ? "formatted with StyLua" : `failed: ${stylua.error ?? "skipped"}`}`);
  else if (report.format.unformatted.length) console.log(`format: ${report.format.unformatted.length} file(s) need StyLua:\n  ${report.format.unformatted.join("\n  ")}`);
  else if (report.format.error) console.log(`format: StyLua error: ${report.format.error}`);
  else console.log("format: ok");
  console.log(`lint/types: ${errors.length} error(s), ${warnings} warning(s)`);
  for (const d of report.diagnostics) console.log(`  ${formatDiagnostic(d)}`);
  if (report.build) console.log(`rojo build: ${report.build.ok ? "ok" : `FAILED\n${report.build.error}`}`);
  console.log(report.ok ? "PASS" : "FAIL");
}
process.exit(report.ok ? 0 : 1);
