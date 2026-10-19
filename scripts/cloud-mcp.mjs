// roblox-cloud MCP server: Roblox Creator Docs search/fetch, Open Cloud Luau Execution,
// place upload, cloud test runs, and read-only DataStore inspection.
// Minimal MCP (JSON-RPC 2.0 over newline-delimited stdio); no dependencies.
import path from "node:path";
import readline from "node:readline";
import {
  cloudTest,
  docsFetch,
  docsSearch,
  getEntry,
  listDataStores,
  listEntries,
  resolveConfig,
  runLuau,
  uploadPlace,
} from "./opencloud.mjs";

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const projectDir = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
const ids = {
  universeId: { type: "string", description: "Universe (experience) ID. Defaults to roblox-kit.json or plugin config." },
  placeId: { type: "string", description: "Place ID. Defaults to roblox-kit.json or plugin config." },
};
const cfgFor = (a, opts = {}) => resolveConfig({ cwd: projectDir(), universeId: a.universeId, placeId: a.placeId, ...opts });
const abs = (p) => (path.isAbsolute(p) ? p : path.join(projectDir(), p));

const TOOLS = [
  {
    name: "docs_search",
    description:
      "Search the official Roblox Creator Docs (engine API, guides, Open Cloud, DevForum) with a plain-language question. Returns titles, summaries and Markdown URLs to pass to docs_fetch. Use before writing code against an API you are not sure about.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A whole question works best, e.g. 'how do I tween a part's CFrame'" },
        limit: { type: "number", description: "Max results (default 8)" },
      },
      required: ["query"],
    },
    run: async (a) => docsSearch(a.query, a.limit ?? 8),
  },
  {
    name: "docs_fetch",
    description:
      "Read a Roblox Creator Docs page (or luau.org page) as Markdown. Accepts a full URL or a /docs/... path; .md is added automatically. Engine API index: /docs/reference/engine/llms.txt. Open Cloud index: /docs/cloud/llms.txt. Never guess paths; use docs_search.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        offset: { type: "number", description: "Character offset for long pages" },
      },
      required: ["url"],
    },
    run: async (a) => docsFetch(a.url, { offset: a.offset ?? 0 }),
  },
  {
    name: "cloud_config_status",
    description:
      "Show which Open Cloud settings are configured (API key present, universe/place IDs and where they came from). Never reveals the key.",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const c = cfgFor({});
      return {
        apiKeyConfigured: Boolean(c.apiKey),
        universeId: c.universeId || null,
        placeId: c.placeId || null,
        robloxKitJson: c.kitFile ?? null,
        projectDir: projectDir(),
      };
    },
  },
  {
    name: "cloud_run_luau",
    description:
      "Run a Luau script headlessly against a saved place version via Open Cloud Luau Execution (no Studio needed; full server DataModel; max 5 min; 5 tasks/min). Returns state, return values, error, and printed logs. Changes to the DataModel are discarded unless the script calls AssetService:SavePlaceAsync (which publishes by default; never call it unless the user asked). DataStore writes are real and hit live data. Needs API key scope universe.place.luau-execution-session:write.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "Luau source. Use `return` to send values back." },
        versionId: { type: "string", description: "Place version to run against (default: latest saved)" },
        timeoutSeconds: { type: "number", description: "1-300, default 120" },
        ...ids,
      },
      required: ["script"],
    },
    run: async (a) => runLuau({ ...cfgFor(a), versionId: a.versionId, script: a.script, timeoutSeconds: a.timeoutSeconds ?? 120 }),
  },
  {
    name: "cloud_run_tests",
    description:
      "Build the Rojo project, upload it as a Saved (unpublished) version of the test place, and run the ServerStorage.Tests suite there via Luau Execution. Uses testPlaceId from roblox-kit.json when set. Needs scopes universe-places:write and universe.place.luau-execution-session:write.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Rojo project file (default default.project.json)" },
        placeFile: { type: "string", description: "Prebuilt .rbxl to upload instead of building" },
        timeoutSeconds: { type: "number" },
        ...ids,
      },
    },
    run: async (a) =>
      cloudTest({
        cfg: cfgFor(a, { useTestPlace: !a.placeId }),
        cwd: projectDir(),
        project: a.project ?? "default.project.json",
        place: a.placeFile ? abs(a.placeFile) : undefined,
        timeoutSeconds: a.timeoutSeconds ?? 180,
      }),
  },
  {
    name: "cloud_upload_place",
    description:
      "Upload a .rbxl/.rbxlx as a new place version. publish=false (default) saves without going live. publish=true makes it LIVE for players: only do that when the user has explicitly asked to publish in this conversation. Needs scope universe-places:write.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to the place file (relative to the project)" },
        publish: { type: "boolean", description: "true = publish live; default false = save only" },
        ...ids,
      },
      required: ["file"],
    },
    run: async (a) => uploadPlace({ ...cfgFor(a), file: abs(a.file), publish: a.publish === true }),
  },
  {
    name: "datastore_list",
    description: "List standard DataStores in the experience (read-only). Needs scope universe-datastores.control:list.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: { prefix: { type: "string" }, pageToken: { type: "string" }, universeId: ids.universeId },
    },
    run: async (a) => listDataStores({ ...cfgFor(a), prefix: a.prefix, pageToken: a.pageToken }),
  },
  {
    name: "datastore_list_entries",
    description: "List entry keys in a DataStore (read-only). Needs scope universe-datastores.objects:list.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        dataStore: { type: "string" },
        scope: { type: "string", description: "DataStore scope (default global)" },
        prefix: { type: "string" },
        pageToken: { type: "string" },
        universeId: ids.universeId,
      },
      required: ["dataStore"],
    },
    run: async (a) => listEntries({ ...cfgFor(a), ...a }),
  },
  {
    name: "datastore_get_entry",
    description: "Read one DataStore entry's value and metadata (read-only), e.g. to debug a player's saved data. Needs scope universe-datastores.objects:read.",
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        dataStore: { type: "string" },
        entryId: { type: "string", description: "Entry key, e.g. Player_12345" },
        scope: { type: "string" },
        universeId: ids.universeId,
      },
      required: ["dataStore", "entryId"],
    },
    run: async (a) => getEntry({ ...cfgFor(a), ...a }),
  },
];

const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications (initialized, cancelled) need no reply
  try {
    if (method === "initialize") {
      const requested = params?.protocolVersion;
      send({
        id,
        result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "roblox-cloud", version: "0.1.0" },
          instructions:
            "Roblox Creator Docs search/fetch (no setup needed) and Open Cloud tools (need an API key). Prefer docs_search over guessing doc URLs.",
        },
      });
    } else if (method === "ping") {
      send({ id, result: {} });
    } else if (method === "tools/list") {
      send({ id, result: { tools: TOOLS.map(({ run, ...t }) => t) } });
    } else if (method === "tools/call") {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
      try {
        const out = await tool.run(params.arguments ?? {});
        send({ id, result: { content: [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out, null, 2) }] } });
      } catch (e) {
        send({ id, result: { isError: true, content: [{ type: "text", text: String(e?.message ?? e) }] } });
      }
    } else {
      send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) {
    send({ id, error: { code: -32603, message: String(e?.message ?? e) } });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: "Parse error" } });
  }
  handle(msg);
});
rl.on("close", () => process.exit(0));
