// Shared helpers for the Luau toolchain: project discovery, running tools,
// Roblox type definitions, and parsing selene / luau-lsp output.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CACHE_DIR = path.join(os.homedir(), ".roblox-agent-kit");
const DEFS_URL =
  "https://raw.githubusercontent.com/JohnnyMorganz/luau-lsp/main/scripts/globalTypes.None.d.luau";
const DEFS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PROJECT_MARKERS = ["default.project.json", "rokit.toml", "aftman.toml", "wally.toml", "selene.toml"];

export function isLuauFile(file) {
  return /\.(luau|lua)$/i.test(file ?? "");
}

// Walks up from `start` to the nearest directory holding a Roblox project marker.
export function findProjectRoot(start) {
  let dir = path.resolve(start);
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir);
  for (;;) {
    if (PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function run(cmd, args, { cwd, timeout = 120_000, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, timeout, input, encoding: "utf8", windowsHide: true });
  return {
    missing: r.error?.code === "ENOENT",
    ok: !r.error && r.status === 0,
    code: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? (r.error ? String(r.error.message) : ""),
  };
}

const toolCache = new Map();
export function hasTool(name, cwd) {
  const key = `${name}@${cwd ?? ""}`;
  if (!toolCache.has(key)) toolCache.set(key, !run(name, ["--version"], { cwd, timeout: 20_000 }).missing);
  return toolCache.get(key);
}

// Downloads (and caches for a week) the Roblox global type definitions luau-lsp needs.
export async function ensureDefinitions() {
  const file = path.join(CACHE_DIR, "globalTypes.None.d.luau");
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < DEFS_MAX_AGE_MS;
  if (fresh) return file;
  try {
    const res = await fetch(DEFS_URL, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, await res.text());
  } catch {
    // Offline: fall back to a stale copy if there is one.
  }
  return fs.existsSync(file) ? file : null;
}

export function ensureSourcemap(root) {
  const project = path.join(root, "default.project.json");
  if (!fs.existsSync(project) || !hasTool("rojo", root)) return null;
  const out = path.join(root, "sourcemap.json");
  const r = run("rojo", ["sourcemap", "default.project.json", "--output", "sourcemap.json", "--include-non-scripts"], {
    cwd: root,
    timeout: 60_000,
  });
  return r.ok && fs.existsSync(out) ? out : null;
}

// selene --display-style=quiet lines look like: path:line:col: severity[code]: message
export function runSelene(root, targets) {
  if (!hasTool("selene", root)) return { skipped: "selene not installed", diagnostics: [] };
  const r = run("selene", ["--display-style=quiet", ...targets], { cwd: root });
  const diagnostics = [];
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = line.match(/^(.*?):(\d+):(\d+): (error|warning)\[([^\]]+)\]: (.*)$/);
    if (m) {
      diagnostics.push({
        tool: "selene",
        file: m[1],
        line: Number(m[2]),
        col: Number(m[3]),
        severity: m[4],
        code: m[5],
        message: m[6],
      });
    } else if (/parse error/i.test(line) && !/^\d+ parse errors$/.test(line.trim())) {
      diagnostics.push({ tool: "selene", file: "", line: 0, col: 0, severity: "error", code: "parse", message: line });
    }
  }
  return { diagnostics };
}

// luau-lsp --formatter=plain lines look like:
//   path [game/Path]:line:col-col: (W0) Kind: message
export function runLuauLsp(root, targets, { defs, sourcemap }) {
  if (!hasTool("luau-lsp", root)) return { skipped: "luau-lsp not installed", diagnostics: [] };
  const args = ["analyze", "--platform=roblox", "--formatter=plain"];
  if (defs) args.push(`--definitions=@roblox=${defs}`);
  if (sourcemap) args.push(`--sourcemap=${sourcemap}`);
  for (const dir of ["Packages", "DevPackages", "ServerPackages"]) {
    if (fs.existsSync(path.join(root, dir))) args.push(`--ignore=${dir}/**`);
  }
  args.push("--ignore=**/_Index/**");
  const r = run("luau-lsp", [...args, ...targets], { cwd: root, timeout: 180_000 });
  const diagnostics = [];
  for (const line of (r.stdout + "\n" + r.stderr).split(/\r?\n/)) {
    const m = line.match(/^(.*?)(?: \[[^\]]*\])?:(\d+):(\d+)(?:-\d+)?: \(\w+\) (\w+): (.*)$/);
    if (!m) continue;
    diagnostics.push({
      tool: "luau-lsp",
      file: m[1],
      line: Number(m[2]),
      col: Number(m[3]),
      severity: /Error$/.test(m[4]) ? "error" : "warning",
      code: m[4],
      message: m[5],
    });
  }
  return { diagnostics };
}

export function runStylua(root, targets, { fix }) {
  if (!hasTool("stylua", root)) return { skipped: "stylua not installed", unformatted: [] };
  const r = run("stylua", fix ? targets : ["--check", "--output-format=summary", ...targets], { cwd: root });
  if (fix) return { fixed: r.ok, unformatted: [], error: r.ok ? undefined : r.stderr.trim() };
  const unformatted = r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => isLuauFile(l));
  return { unformatted, error: !r.ok && unformatted.length === 0 ? (r.stderr || r.stdout).trim() : undefined };
}

export function samePath(a, b, root) {
  const norm = (p) => {
    const abs = path.resolve(root, p);
    return process.platform === "win32" ? abs.toLowerCase() : abs;
  };
  return norm(a) === norm(b);
}

// Combines selene + luau-lsp results with project-relative paths, dropping luau-lsp lint
// warnings on lines selene already flagged (both report e.g. unused variables).
export function mergeDiagnostics(root, ...lists) {
  const all = lists.flat().map((d) => ({ ...d, file: d.file ? path.relative(root, path.resolve(root, d.file)) : d.file }));
  const key = (d) => `${d.file.toLowerCase()}:${d.line}`;
  const seleneLines = new Set(all.filter((d) => d.tool === "selene").map(key));
  return all.filter((d) => !(d.tool === "luau-lsp" && d.severity === "warning" && seleneLines.has(key(d))));
}

export function formatDiagnostic(d) {
  return `${d.file}:${d.line}:${d.col} ${d.severity} [${d.tool}/${d.code}] ${d.message}`;
}
