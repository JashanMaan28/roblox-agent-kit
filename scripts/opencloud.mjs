#!/usr/bin/env node
// Roblox Open Cloud + Creator Docs client. No dependencies (Node 18+).
// Used by the roblox-cloud MCP server, and runnable on its own as a CLI for CI:
//
//   node opencloud.mjs run <file.luau> | -e "<code>"  [--version N] [--timeout S]
//   node opencloud.mjs upload <place.rbxl|.rbxlx> [--publish]
//   node opencloud.mjs test [--project default.project.json | --place-file build.rbxl] [--timeout S]
//   node opencloud.mjs docs <question>
//
// Auth: ROBLOX_API_KEY. IDs: --universe/--place flags, ROBLOX_UNIVERSE_ID / ROBLOX_PLACE_ID,
// or a roblox-kit.json ({ "universeId": "...", "placeId": "...", "testPlaceId": "..." })
// in the current directory or any parent.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://apis.roblox.com";
const DOCS = "https://create.roblox.com";
const DOC_HOSTS = new Set(["create.roblox.com", "luau.org", "www.luau.org", "rfcs.luau.org"]);
const TERMINAL = new Set(["COMPLETE", "FAILED", "CANCELLED"]);

// Values like "${user_config.x}" mean an unset plugin option; treat them as empty.
const clean = (v) => {
  const s = v == null ? "" : String(v).trim();
  return s.startsWith("${") ? "" : s;
};

function readKitConfig(cwd) {
  let dir = path.resolve(cwd);
  for (;;) {
    const file = path.join(dir, "roblox-kit.json");
    if (fs.existsSync(file)) {
      try {
        return { ...JSON.parse(fs.readFileSync(file, "utf8")), _file: file };
      } catch (e) {
        throw new Error(`Could not parse ${file}: ${e.message}`);
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return {};
    dir = parent;
  }
}

export function resolveConfig({ cwd = process.cwd(), universeId, placeId, useTestPlace = false } = {}) {
  const env = process.env;
  const kit = readKitConfig(cwd);
  return {
    apiKey: clean(env.RAK_API_KEY) || clean(env.ROBLOX_API_KEY),
    universeId: clean(universeId) || clean(kit.universeId) || clean(env.ROBLOX_UNIVERSE_ID) || clean(env.RAK_UNIVERSE_ID),
    placeId:
      clean(placeId) ||
      (useTestPlace ? clean(kit.testPlaceId) : "") ||
      clean(kit.placeId) ||
      clean(env.ROBLOX_PLACE_ID) ||
      clean(env.RAK_PLACE_ID),
    kitFile: kit._file,
  };
}

function need(cfg, ...keys) {
  const names = { apiKey: "ROBLOX_API_KEY (or the plugin's roblox_api_key option)", universeId: "universeId", placeId: "placeId" };
  const missing = keys.filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(
      `Missing ${missing.map((k) => names[k]).join(", ")}. Pass it explicitly, add it to roblox-kit.json, or set it in the plugin config.`,
    );
  }
}

async function http(method, url, { apiKey, json, body, headers = {}, timeoutMs = 60_000 } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " (check the API key's scopes and that it is allowed for this experience and your IP)"
        : res.status === 429
          ? " (rate limited; wait and retry)"
          : "";
    throw new Error(`${method} ${url} -> HTTP ${res.status}${hint}: ${text.slice(0, 800)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Luau Execution -------------------------------------------------------

export async function runLuau({ apiKey, universeId, placeId, versionId, script, timeoutSeconds = 120 }) {
  need({ apiKey, universeId, placeId }, "apiKey", "universeId", "placeId");
  const base = `${API}/cloud/v2/universes/${universeId}/places/${placeId}`;
  const url = versionId ? `${base}/versions/${versionId}/luau-execution-session-tasks` : `${base}/luau-execution-session-tasks`;
  const timeout = Math.max(1, Math.min(300, Math.round(timeoutSeconds)));
  let task = await http("POST", url, { apiKey, json: { script, timeout: `${timeout}s` } });

  const deadline = Date.now() + (timeout + 90) * 1000;
  let delay = 1000;
  while (!TERMINAL.has(task.state) && Date.now() < deadline) {
    await sleep(delay);
    delay = Math.min(delay * 1.5, 5000);
    task = await http("GET", `${API}/cloud/v2/${task.path}`, { apiKey });
  }

  let logs = [];
  try {
    let pageToken = "";
    do {
      const q = new URLSearchParams({ maxPageSize: "10000", ...(pageToken ? { pageToken } : {}) });
      const page = await http("GET", `${API}/cloud/v2/${task.path}/logs?${q}`, { apiKey });
      for (const entry of page.luauExecutionSessionTaskLogs ?? []) logs.push(...(entry.messages ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  } catch (e) {
    logs.push(`[roblox-agent-kit] could not fetch logs: ${e.message}`);
  }

  return {
    state: TERMINAL.has(task.state) ? task.state : `TIMED_OUT_WAITING (last state ${task.state})`,
    path: task.path,
    results: task.output?.results ?? null,
    error: task.error ?? null,
    logs,
  };
}

// --- Place publishing -------------------------------------------------------

export async function uploadPlace({ apiKey, universeId, placeId, file, publish = false }) {
  need({ apiKey, universeId, placeId }, "apiKey", "universeId", "placeId");
  const ext = path.extname(file).toLowerCase();
  if (ext !== ".rbxl" && ext !== ".rbxlx") throw new Error(`Expected a .rbxl or .rbxlx file, got ${file}`);
  const versionType = publish ? "Published" : "Saved";
  const res = await http(
    "POST",
    `${API}/universes/v1/${universeId}/places/${placeId}/versions?versionType=${versionType}`,
    {
      apiKey,
      body: fs.readFileSync(file),
      headers: { "content-type": ext === ".rbxlx" ? "application/xml" : "application/octet-stream" },
      timeoutMs: 300_000,
    },
  );
  return { versionNumber: res.versionNumber, versionType };
}

// --- DataStores (read-only) ---------------------------------------------------

export async function listDataStores({ apiKey, universeId, prefix, pageToken }) {
  need({ apiKey, universeId }, "apiKey", "universeId");
  const q = new URLSearchParams({ maxPageSize: "100", ...(prefix ? { filter: `id.startsWith("${prefix}")` } : {}), ...(pageToken ? { pageToken } : {}) });
  return http("GET", `${API}/cloud/v2/universes/${universeId}/data-stores?${q}`, { apiKey });
}

const dsBase = (universeId, dataStore, scope) =>
  `${API}/cloud/v2/universes/${universeId}/data-stores/${encodeURIComponent(dataStore)}` +
  (scope && scope !== "global" ? `/scopes/${encodeURIComponent(scope)}` : "");

export async function listEntries({ apiKey, universeId, dataStore, scope, prefix, pageToken }) {
  need({ apiKey, universeId }, "apiKey", "universeId");
  const q = new URLSearchParams({ maxPageSize: "100", ...(prefix ? { filter: `id.startsWith("${prefix}")` } : {}), ...(pageToken ? { pageToken } : {}) });
  return http("GET", `${dsBase(universeId, dataStore, scope)}/entries?${q}`, { apiKey });
}

export async function getEntry({ apiKey, universeId, dataStore, scope, entryId }) {
  need({ apiKey, universeId }, "apiKey", "universeId");
  return http("GET", `${dsBase(universeId, dataStore, scope)}/entries/${encodeURIComponent(entryId)}`, { apiKey });
}

// --- Creator Docs (no key needed) -------------------------------------------------

export async function docsSearch(query, limit = 8) {
  const res = await http("GET", `${DOCS}/docs/api/search?q=${encodeURIComponent(query)}`);
  if (res.error) throw new Error(`Docs search rejected the query: ${JSON.stringify(res)}`);
  return (res.results ?? []).slice(0, limit).map(({ title, url, summary, type }) => ({ title, url, type, summary }));
}

export async function docsFetch(target, { offset = 0, maxChars = 20_000 } = {}) {
  let url = new URL(target, DOCS);
  if (!DOC_HOSTS.has(url.hostname)) throw new Error(`docs_fetch only reads ${[...DOC_HOSTS].join(", ")}`);
  if (url.hostname === "create.roblox.com" && url.pathname.startsWith("/docs") && !/\.(md|txt|json)$/.test(url.pathname)) {
    url = new URL(url.pathname.replace(/\/$/, "") + ".md" + url.search, DOCS);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  let text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}. Use docs_search instead of guessing paths.`);
  if (/^\s*<(!doctype|html)/i.test(text)) {
    text = text
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n");
  }
  const slice = text.slice(offset, offset + maxChars);
  const more = offset + maxChars < text.length;
  return { url: String(url), text: slice + (more ? `\n\n[truncated: ${text.length - offset - maxChars} more chars; call again with offset=${offset + maxChars}]` : "") };
}

// --- Test helper ------------------------------------------------------------------

export const TEST_SCRIPT = `
local ServerStorage = game:GetService("ServerStorage")
local Tests = ServerStorage:FindFirstChild("Tests")
assert(Tests, "ServerStorage.Tests not found; is tests/ mapped in the project file?")
local summary = require(Tests:FindFirstChild("TestRunner")).run(Tests)
for _, r in summary.results do
	print((if r.ok then "PASS " else "FAIL ") .. r.name .. (if r.err then "\\n    " .. r.err else ""))
end
print(string.format("%d passed, %d failed", summary.passed, summary.failed))
return summary.failed, summary.passed
`;

export async function cloudTest({ cfg, cwd = process.cwd(), project = "default.project.json", place, timeoutSeconds = 180, log = () => {} }) {
  need(cfg, "apiKey", "universeId", "placeId");
  let file = place;
  if (!file) {
    fs.mkdirSync(path.join(cwd, "build"), { recursive: true });
    file = path.join(cwd, "build", "cloud-test.rbxl");
    log(`Building ${project} -> ${file}`);
    const r = spawnSync("rojo", ["build", project, "--output", file], { cwd, encoding: "utf8", windowsHide: true });
    if (r.error || r.status !== 0) throw new Error(`rojo build failed: ${r.error?.message ?? r.stderr}`);
  }
  log(`Uploading ${file} as a Saved (unpublished) version of place ${cfg.placeId}`);
  const { versionNumber } = await uploadPlace({ ...cfg, file, publish: false });
  log(`Running tests on version ${versionNumber}`);
  const run = await runLuau({ ...cfg, versionId: versionNumber, script: TEST_SCRIPT, timeoutSeconds });
  const failed = Array.isArray(run.results) ? run.results[0] : null;
  const passed = Array.isArray(run.results) ? run.results[1] : null;
  // Zero tests run is a failure: usually a broken test discovery or an empty test folder.
  return { ...run, versionNumber, ok: run.state === "COMPLETE" && failed === 0 && passed > 0 };
}

// --- CLI ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) opts[key] = true;
      else opts[key] = argv[++i];
    } else if (a === "-e") opts.e = argv[++i];
    else opts._.push(a);
  }
  return opts;
}

async function cli(argv) {
  const opts = parseArgs(argv);
  const [cmd, arg] = opts._;
  const cfg = resolveConfig({ universeId: opts.universe, placeId: opts.place, useTestPlace: cmd === "test" });
  const log = (m) => process.stderr.write(`${m}\n`);

  if (cmd === "run") {
    const script = opts.e ?? (arg ? fs.readFileSync(arg, "utf8") : null);
    if (!script) throw new Error("usage: run <file.luau> | -e <code>");
    const r = await runLuau({ ...cfg, versionId: opts.version, script, timeoutSeconds: Number(opts.timeout ?? 120) });
    for (const l of r.logs) console.log(l);
    console.log(JSON.stringify({ state: r.state, results: r.results, error: r.error }, null, 2));
    return r.state === "COMPLETE" ? 0 : 1;
  }
  if (cmd === "upload") {
    if (!arg) throw new Error("usage: upload <place.rbxl|.rbxlx> [--publish]");
    console.log(JSON.stringify(await uploadPlace({ ...cfg, file: arg, publish: Boolean(opts.publish) })));
    return 0;
  }
  if (cmd === "test") {
    const r = await cloudTest({
      cfg,
      project: opts.project ?? "default.project.json",
      place: opts["place-file"],
      timeoutSeconds: Number(opts.timeout ?? 180),
      log,
    });
    for (const l of r.logs) console.log(l);
    if (r.error) console.log(JSON.stringify(r.error, null, 2));
    console.log(r.ok ? "Cloud tests passed" : `Cloud tests failed (state ${r.state}, results ${JSON.stringify(r.results)})`);
    return r.ok ? 0 : 1;
  }
  if (cmd === "docs") {
    const q = opts._.slice(1).join(" ");
    if (!q) throw new Error("usage: docs <question>");
    console.log(JSON.stringify(await docsSearch(q), null, 2));
    return 0;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 14).join("\n").replace(/^\/\/ ?/gm, ""));
  return cmd ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
