// Reference-image generator for Roblox work: concept art, UI mockups, icons, thumbnails,
// textures, character turnarounds. Zero dependencies (Node 18+).
// Adapted from JashanMaan28/imagegen-in-cc (MIT): same provider set and style-profile format,
// rewritten in Node so it runs natively on Windows without bash, python or Pillow.
//
//   node refimage.mjs detect
//   node refimage.mjs presets
//   node refimage.mjs generate --prompt "..." [--output path.png] [--preset NAME] [--provider NAME]
//        [--input ref.png]... [--ref NAME]... [--size WxH] [--aspect W:H] [--quality low|medium|high]
//        [--variants N] [--fit WxH] [--no-fit] [--no-profile] [--model M] [--timeout S] [--dry-run]
//   node refimage.mjs fit <in.png> <out.png> <WxH>
//   node refimage.mjs history [N]
//
// Providers (auto order): codex, openai, gemini, xai, together. Override with --provider or
// IMAGEGEN_PROVIDER. Style profile: nearest .imagegen/style.json (same format as imagegen-in-cc).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const PROVIDERS = ["codex", "openai", "gemini", "xai", "together"];
const EDIT_PROVIDERS = new Set(["codex", "openai", "gemini"]);

// Sizes from the Creator Docs (checked 2026-10-18): icons/badges/passes/products 512x512
// (passes, products and badges are trimmed to a circle), thumbnails 16:9 ideally 1920x1080,
// textures 256-1024 depending on object size.
export const PRESETS = {
  concept: { aspect: "16:9", hint: "Concept art / key art for a Roblox experience: readable shapes, clear focal point, Roblox-style proportions and materials." },
  environment: { aspect: "16:9", hint: "Environment concept for a Roblox map: show layout, landmarks, paths and scale cues (a blocky Roblox avatar for scale)." },
  "level-layout": { aspect: "1:1", hint: "Top-down orthographic level layout plan for a Roblox map: clear zones, paths, spawn, landmarks, flat colors, no perspective, no text labels." },
  "ui-mockup": { aspect: "16:9", hint: "Game UI mockup for a Roblox experience on a 16:9 screen: HUD and menus only over a softly blurred gameplay background, large touch-friendly buttons, clear hierarchy, safe margins at the edges." },
  "ui-mobile": { aspect: "9:16", hint: "Portrait phone screenshot mockup of a Roblox game UI: thumb-reachable buttons near the bottom corners, large tap targets, top safe area kept clear." },
  "ui-element": { aspect: "1:1", hint: "Single game UI element (button/frame/panel) for a Roblox UI, centered, flat front view, crisp edges, on a plain neutral background." },
  icon: { aspect: "1:1", fit: "512x512", hint: "Roblox experience icon: one bold subject, high contrast, readable when shrunk to 150x150, no small details, no text." },
  thumbnail: { aspect: "16:9", fit: "1920x1080", hint: "Roblox experience thumbnail (16:9): exciting moment of gameplay, strong focal subject, saturated colors, readable at small size, no text." },
  badge: { aspect: "1:1", fit: "512x512", hint: "Roblox badge image: a single emblem centered inside a circle, everything important within the central circle because the corners are trimmed, no text." },
  "pass-icon": { aspect: "1:1", fit: "512x512", hint: "Roblox game pass / developer product icon: one clear item centered, important content inside the central circle because the corners are trimmed, no text." },
  texture: { aspect: "1:1", fit: "1024x1024", hint: "Seamless tileable texture, flat orthographic top-down view, even lighting, no shadows, no perspective, no objects or text; edges must tile." },
  decal: { aspect: "1:1", fit: "1024x1024", hint: "Decal artwork for a Roblox part face: flat front view, centered, plain solid background, no perspective." },
  turnaround: { aspect: "16:9", hint: "Character or prop turnaround sheet for 3D modeling: the same subject shown front, side and back in a row, neutral A-pose for characters, orthographic, flat even lighting, plain light-grey background, consistent proportions across views, no text." },
  prop: { aspect: "1:1", hint: "Single prop reference for a Roblox model: three-quarter view, centered, plain light-grey background, clear silhouette and materials, low-poly friendly shapes." },
  skybox: { aspect: "16:9", hint: "Wide sky and horizon mood reference for a Roblox skybox: no ground objects in the foreground, consistent light direction." },
  moodboard: { aspect: "16:9", hint: "Mood board collage for a Roblox experience: 6-9 tiles showing palette, lighting, materials, props and characters in one coherent style, no text." },
};

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { inputs: [], refs: [], _: [] };
  const flags = new Set(["no-profile", "dry-run", "no-fit"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { opts._.push(a); continue; }
    const key = a.slice(2);
    if (flags.has(key)) { opts[key] = true; continue; }
    const val = argv[++i];
    if (val === undefined) throw new Error(`${a} needs a value`);
    if (key === "input") opts.inputs.push(val);
    else if (key === "ref") opts.refs.push(val);
    else opts[key] = val;
  }
  return opts;
}

// ---------------------------------------------------------------------------
// providers: detection
// ---------------------------------------------------------------------------
function findOnPath(names) {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const d of dirs) for (const n of names) {
    const p = path.join(d, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function codexBin() {
  if (process.env.IMAGEGEN_CODEX_BIN) return process.env.IMAGEGEN_CODEX_BIN;
  return process.platform === "win32" ? findOnPath(["codex.exe", "codex.cmd", "codex.bat"]) : findOnPath(["codex"]);
}

const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export function available(p) {
  switch (p) {
    case "codex": return !!codexBin();
    case "openai": return !!process.env.OPENAI_API_KEY;
    case "gemini": return !!geminiKey();
    case "xai": return !!process.env.XAI_API_KEY;
    case "together": return !!process.env.TOGETHER_API_KEY;
    default: return false;
  }
}

const HINTS = {
  codex: "install Codex CLI and run `codex login` (uses your ChatGPT plan, no API key)",
  openai: "set OPENAI_API_KEY",
  gemini: "set GEMINI_API_KEY (or GOOGLE_API_KEY)",
  xai: "set XAI_API_KEY",
  together: "set TOGETHER_API_KEY (FLUX.1-schnell-Free is free)",
};

function pickProvider(preferred) {
  if (preferred) {
    if (!PROVIDERS.includes(preferred)) throw new Error(`unknown provider '${preferred}' (known: ${PROVIDERS.join(", ")})`);
    if (!available(preferred)) throw new Error(`provider '${preferred}' is not available: ${HINTS[preferred]}`);
    return preferred;
  }
  const p = PROVIDERS.find(available);
  if (!p) throw new Error("no image provider available; run `refimage.mjs detect` for setup hints");
  return p;
}

// ---------------------------------------------------------------------------
// style profile (.imagegen/style.json, imagegen-in-cc format, read-only here)
// ---------------------------------------------------------------------------
function findStyleFile(start) {
  if (process.env.IMAGEGEN_STYLE_FILE) return process.env.IMAGEGEN_STYLE_FILE;
  let dir = path.resolve(start);
  for (;;) {
    const f = path.join(dir, ".imagegen", "style.json");
    if (fs.existsSync(f)) return f;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function loadStyle(cwd) {
  const file = findStyleFile(cwd);
  if (!file) return null;
  let prof;
  try { prof = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error(`style profile ${file} is not valid JSON: ${e.message}`); }
  const palette = Array.isArray(prof.palette) ? prof.palette : typeof prof.palette === "string" ? prof.palette.split(/[,\s]+/) : [];
  const bits = [];
  const lead = `Art direction${prof.name ? ` for ${prof.name}` : ""}`;
  if (prof.aesthetic) bits.push(`${lead}: ${String(prof.aesthetic).replace(/\.$/, "")}.`);
  if (palette.filter(Boolean).length) bits.push(`Use this color palette: ${palette.filter(Boolean).join(", ")}.`);
  if (prof.avoid) bits.push(`Avoid: ${String(prof.avoid).replace(/\.$/, "")}.`);
  if (prof.notes) bits.push(`${String(prof.notes).replace(/\.$/, "")}.`);
  const root = path.dirname(path.dirname(file));
  const refs = {};
  for (const [k, v] of Object.entries(prof.refs ?? {})) refs[k] = path.isAbsolute(v) ? v : path.join(root, v);
  return { file, name: prof.name ?? "", fragment: bits.join(" "), defaults: prof.defaults ?? {}, refs };
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------
const log = (m) => process.stderr.write(`[refimage] ${m}\n`);

function nearestAspect(size) {
  const [w, h] = size.split("x").map(Number);
  const ratios = { "1:1": 1, "16:9": 16 / 9, "9:16": 9 / 16, "4:3": 4 / 3, "3:4": 3 / 4, "3:2": 3 / 2, "2:3": 2 / 3, "21:9": 21 / 9 };
  return Object.keys(ratios).reduce((a, b) => (Math.abs(ratios[a] - w / h) < Math.abs(ratios[b] - w / h) ? a : b));
}

function dims(job) { // [w, h] from --size, else from the aspect ratio at ~1 megapixel
  if (job.size) return job.size.split("x").map(Number);
  if (!job.aspect) return [1024, 1024];
  const [a, b] = job.aspect.split(":").map(Number);
  const h = Math.sqrt((1024 * 1024 * b) / a);
  return [Math.round((h * a) / b / 16) * 16, Math.round(h / 16) * 16];
}

function openaiSize(job) {
  if (!job.size && !job.aspect) return "auto";
  const [w, h] = dims(job);
  return w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";
}

async function postJson(url, body, headers) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { ok: res.ok, status: res.status, json };
}

async function saveB64OrUrl(item, out) {
  if (item?.b64_json) return fs.writeFileSync(out, Buffer.from(item.b64_json, "base64"));
  if (item?.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`download failed: HTTP ${r.status}`);
    return fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  }
  throw new Error("no image in response");
}

const errSnippet = (j) => JSON.stringify(j.error ?? j).slice(0, 500);

async function genOpenAI(job) {
  const models = job.model ? [job.model] : process.env.OPENAI_IMAGE_MODEL ? [process.env.OPENAI_IMAGE_MODEL] : ["gpt-image-2", "gpt-image-1"];
  const auth = { authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  for (const m of models) {
    let res;
    if (job.inputs.length) {
      const form = new FormData();
      form.append("model", m);
      form.append("prompt", job.prompt);
      form.append("size", openaiSize(job));
      if (job.quality) form.append("quality", job.quality);
      for (const f of job.inputs) form.append("image[]", new Blob([fs.readFileSync(f)], { type: mime(f) }), path.basename(f));
      const r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: auth, body: form });
      res = { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
    } else {
      res = await postJson("https://api.openai.com/v1/images/generations", { model: m, prompt: job.prompt, n: 1, size: openaiSize(job), ...(job.quality ? { quality: job.quality } : {}) }, auth);
    }
    if (res.ok) return saveB64OrUrl(res.json.data?.[0], job.output);
    log(`openai model ${m} failed (HTTP ${res.status}): ${errSnippet(res.json)}`);
  }
  throw new Error("openai: all models failed");
}

async function genGemini(job) {
  const models = job.model ? [job.model] : process.env.GEMINI_IMAGE_MODEL ? [process.env.GEMINI_IMAGE_MODEL] : ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];
  const parts = job.inputs.map((f) => ({ inline_data: { mime_type: mime(f), data: fs.readFileSync(f).toString("base64") } }));
  parts.push({ text: job.prompt });
  const generationConfig = { responseModalities: ["TEXT", "IMAGE"], ...(job.aspect ? { imageConfig: { aspectRatio: job.aspect } } : {}) };
  for (const m of models) {
    const res = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { contents: [{ parts }], generationConfig }, { "x-goog-api-key": geminiKey() });
    if (res.ok) {
      for (const c of res.json.candidates ?? []) for (const p of c.content?.parts ?? []) {
        const blob = p.inlineData ?? p.inline_data;
        if (blob?.data) return fs.writeFileSync(job.output, Buffer.from(blob.data, "base64"));
      }
      log(`gemini model ${m} returned no image: ${errSnippet(res.json)}`);
    } else log(`gemini model ${m} failed (HTTP ${res.status}): ${errSnippet(res.json)}`);
  }
  throw new Error("gemini: all models failed");
}

async function genXai(job) {
  const res = await postJson("https://api.x.ai/v1/images/generations", { model: job.model || process.env.XAI_IMAGE_MODEL || "grok-imagine-image", prompt: job.prompt, n: 1, response_format: "b64_json" }, { authorization: `Bearer ${process.env.XAI_API_KEY}` });
  if (!res.ok) throw new Error(`xai failed (HTTP ${res.status}): ${errSnippet(res.json)}`);
  return saveB64OrUrl(res.json.data?.[0], job.output);
}

async function genTogether(job) {
  const model = job.model || process.env.TOGETHER_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell-Free";
  const [width, height] = dims(job);
  const body = { model, prompt: job.prompt, n: 1, response_format: "b64_json", width, height, ...(/schnell/i.test(model) ? { steps: 4 } : {}) };
  const res = await postJson("https://api.together.xyz/v1/images/generations", body, { authorization: `Bearer ${process.env.TOGETHER_API_KEY}` });
  if (!res.ok) throw new Error(`together failed (HTTP ${res.status}): ${errSnippet(res.json)}`);
  return saveB64OrUrl(res.json.data?.[0], job.output);
}

function newestImageSince(dir, since) {
  let best = null;
  const walk = (d, depth) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (/\.(png|jpe?g|webp)$/i.test(e.name)) {
        const t = fs.statSync(p).mtimeMs;
        if (t >= since && (!best || t > best.t)) best = { p, t };
      }
    }
  };
  walk(dir, 0);
  return best?.p ?? null;
}

// Codex runs a full agent turn with its built-in image tool. It is asked to save to the exact
// path; if its sandbox blocks the write, the image is recovered from $CODEX_HOME/generated_images.
async function genCodex(job) {
  const bin = codexBin();
  const outAbs = path.resolve(job.output);
  const workdir = path.dirname(outAbs);
  const task = [
    job.inputs.length
      ? `Use your image generation tool to create a new image based on the attached reference image(s). Instruction: ${job.prompt}`
      : `Use your image generation tool to create this image: ${job.prompt}`,
    job.size ? `Image size: ${job.size}.` : job.aspect ? `Aspect ratio: ${job.aspect}.` : "",
    job.quality ? `Quality: ${job.quality}.` : "",
    `Save the final image to exactly this path: ${outAbs} (overwrite if it exists).`,
    "Do not create or modify any other files. Do not run other tools. Reply with only the saved file path.",
  ].filter(Boolean).join(" ");
  const args = ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "workspace-write", "-C", workdir,
    "-c", `model_reasoning_effort="${process.env.IMAGEGEN_CODEX_EFFORT || "low"}"`];
  if (job.model) args.push("-m", job.model);
  for (const f of job.inputs) args.push("-i", path.resolve(f));
  args.push("-"); // prompt on stdin: no shell quoting issues on any platform
  const started = Date.now() - 2000;
  const isCmd = /\.(cmd|bat)$/i.test(bin);
  const q = (s) => (/[\s"&|<>^]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  log(`running codex exec (a full agent turn; usually 1-3 minutes)...`);
  await new Promise((resolve, reject) => {
    const child = isCmd
      ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", [q(bin), ...args.map(q)].join(" ")], { windowsVerbatimArguments: true, stdio: ["pipe", "pipe", "pipe"], windowsHide: true })
      : spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let tail = "";
    const keep = (d) => { tail = (tail + d.toString()).slice(-4000); };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(() => { child.kill(); reject(new Error(`codex timed out after ${job.timeout}s`)); }, job.timeout * 1000);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`codex exec exited ${code}: ${tail.trim().split(/\r?\n/).slice(-8).join("\n")}`));
    });
    child.stdin.end(task);
  });
  if (fs.existsSync(outAbs) && fs.statSync(outAbs).mtimeMs >= started && fs.statSync(outAbs).size > 0) return;
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const recovered = newestImageSince(path.join(codexHome, "generated_images"), started);
  if (!recovered) throw new Error(`codex finished but no image was written to ${outAbs} or ${codexHome}/generated_images`);
  log(`codex saved to ${recovered}; copying to ${outAbs}`);
  fs.copyFileSync(recovered, outAbs);
}

const GEN = { codex: genCodex, openai: genOpenAI, gemini: genGemini, xai: genXai, together: genTogether };

function mime(f) {
  const ext = path.extname(f).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
}

export function sniffFormat(file) {
  const b = fs.readFileSync(file).subarray(0, 12);
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "unknown";
}

export async function generate(o, cwd = process.cwd()) {
  if (!o.prompt) throw new Error("--prompt is required");
  const preset = o.preset ? PRESETS[o.preset] : null;
  if (o.preset && !preset) throw new Error(`unknown preset '${o.preset}' (known: ${Object.keys(PRESETS).join(", ")})`);
  const style = o["no-profile"] ? null : loadStyle(cwd);
  const inputs = [...o.inputs];
  for (const r of o.refs) {
    if (!style?.refs[r]) throw new Error(`--ref '${r}' is not in the style profile (add "refs": {"${r}": "path.png"} to .imagegen/style.json)`);
    inputs.push(style.refs[r]);
  }
  for (const f of inputs) if (!fs.existsSync(f)) throw new Error(`input image not found: ${f}`);
  const provider = pickProvider(o.provider || style?.defaults?.provider || process.env.IMAGEGEN_PROVIDER || "");
  if (inputs.length && !EDIT_PROVIDERS.has(provider)) throw new Error(`${provider} can't take reference images; use codex, openai or gemini`);
  const size = o.size || "";
  const aspect = o.aspect || preset?.aspect || (size ? nearestAspect(size) : "");
  const fit = o["no-fit"] ? "" : o.fit || preset?.fit || "";
  const sentence = (t) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
  const prompt = [o.prompt, preset?.hint, style?.fragment].filter(Boolean).map(sentence).join(" ");
  const n = Number(o.variants || 1);
  if (!(n >= 1 && n <= 4)) throw new Error("--variants must be 1-4");
  let output = o.output || path.join("art", "refs", `${o.preset || "ref"}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.png`);
  if (!/\.png$/i.test(output)) output += ".png";
  const job = { prompt, size, aspect, quality: o.quality || style?.defaults?.quality || "", model: o.model || "", inputs, timeout: Number(o.timeout || 600) };

  if (o["dry-run"]) {
    return { dryRun: true, provider, output, size, aspect, fit, inputs, prompt, profile: style?.file ?? null };
  }
  const results = [];
  for (let i = 1; i <= n; i++) {
    const out = n > 1 ? output.replace(/\.png$/i, `-${i}.png`) : output;
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await GEN[provider]({ ...job, output: out });
    if (!fs.existsSync(out) || fs.statSync(out).size === 0) throw new Error(`${provider} reported success but ${out} is empty`);
    let note = "";
    if (fit) {
      const fmt = sniffFormat(out);
      if (fmt === "png") {
        try { fitPng(out, out, fit); note = ` fitted to ${fit}`; } catch (e) { note = ` (not fitted: ${e.message})`; }
      } else note = ` (provider returned ${fmt}; not fitted to ${fit})`;
    }
    record(cwd, { provider, preset: o.preset, prompt: o.prompt, size, aspect, fit, inputs, output: out });
    results.push({ provider, output: out, bytes: fs.statSync(out).size, note });
  }
  return { results };
}

function record(cwd, entry) {
  if (process.env.IMAGEGEN_NO_HISTORY) return;
  const f = path.join(cwd, ".imagegen", "history.jsonl");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify({ ts: new Date().toISOString(), ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v && (!Array.isArray(v) || v.length))) }) + "\n");
}

// ---------------------------------------------------------------------------
// PNG cover-fit (decode -> center crop to aspect -> box-filter resize -> encode), zlib only
// ---------------------------------------------------------------------------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

export function decodePng(buf) {
  let pos = 8, w, h, depth, ctype, interlace, plte = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error("only 8-bit non-interlaced PNGs can be fitted");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error(`unsupported PNG color type ${ctype}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, px = Buffer.alloc(h * stride);
  for (let y = 0, i = 0; y < h; y++) {
    const f = raw[i++], row = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++, i++) {
      const a = x >= ch ? row[x - ch] : 0, b = prev ? prev[x] : 0, c = prev && x >= ch ? prev[x - ch] : 0;
      let v = raw[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[x] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * ch, d = i * 4;
    if (ctype === 6) px.copy(rgba, d, s, s + 4);
    else if (ctype === 2) { rgba[d] = px[s]; rgba[d + 1] = px[s + 1]; rgba[d + 2] = px[s + 2]; rgba[d + 3] = 255; }
    else if (ctype === 0 || ctype === 4) { rgba[d] = rgba[d + 1] = rgba[d + 2] = px[s]; rgba[d + 3] = ctype === 4 ? px[s + 1] : 255; }
    else { const k = px[s]; rgba[d] = plte[k * 3]; rgba[d + 1] = plte[k * 3 + 1]; rgba[d + 2] = plte[k * 3 + 2]; rgba[d + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { w, h, rgba };
}

export function encodePng({ w, h, rgba }) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// Cover fit: center-crop to the target aspect, then resample (area average when shrinking,
// bilinear when enlarging).
export function fitPng(inFile, outFile, size) {
  const [tw, th] = size.split("x").map(Number);
  if (!(tw > 0 && th > 0)) throw new Error(`bad size '${size}', expected WxH`);
  const src = decodePng(fs.readFileSync(inFile));
  let cw = src.w, ch = Math.round(src.w * th / tw);
  if (ch > src.h) { ch = src.h; cw = Math.round(src.h * tw / th); }
  const ox = (src.w - cw) / 2, oy = (src.h - ch) / 2, sx = cw / tw, sy = ch / th;
  const out = Buffer.alloc(tw * th * 4);
  const at = (x, y, c) => src.rgba[(Math.min(src.h - 1, Math.max(0, y)) * src.w + Math.min(src.w - 1, Math.max(0, x))) * 4 + c];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const d = (y * tw + x) * 4;
    if (sx >= 1 && sy >= 1) {
      const x0 = Math.floor(ox + x * sx), x1 = Math.max(x0 + 1, Math.floor(ox + (x + 1) * sx));
      const y0 = Math.floor(oy + y * sy), y1 = Math.max(y0 + 1, Math.floor(oy + (y + 1) * sy));
      const acc = [0, 0, 0, 0];
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) for (let c = 0; c < 4; c++) acc[c] += at(xx, yy, c);
      const n = (x1 - x0) * (y1 - y0);
      for (let c = 0; c < 4; c++) out[d + c] = Math.round(acc[c] / n);
    } else {
      const fx = ox + (x + 0.5) * sx - 0.5, fy = oy + (y + 0.5) * sy - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
      for (let c = 0; c < 4; c++) {
        const top = at(x0, y0, c) * (1 - ax) + at(x0 + 1, y0, c) * ax, bot = at(x0, y0 + 1, c) * (1 - ax) + at(x0 + 1, y0 + 1, c) * ax;
        out[d + c] = Math.round(top * (1 - ay) + bot * ay);
      }
    }
  }
  fs.writeFileSync(outFile, encodePng({ w: tw, h: th, rgba: out }));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function detect() {
  const lines = ["provider  status", "--------  ------"];
  for (const p of PROVIDERS) lines.push(`${p.padEnd(8)}  ${available(p) ? `ready${p === "codex" ? ` (${codexBin()})` : ""}` : `unavailable: ${HINTS[p]}`}`);
  const style = loadStyle(process.cwd());
  lines.push("", `default: ${process.env.IMAGEGEN_PROVIDER || style?.defaults?.provider || PROVIDERS.find(available) || "none"}`);
  lines.push(`style profile: ${style ? style.file : "none (.imagegen/style.json)"}`);
  return { text: lines.join("\n"), ok: PROVIDERS.some(available) };
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const o = parseArgs(rest);
  switch (cmd) {
    case "detect": { const d = detect(); console.log(d.text); return d.ok ? 0 : 3; }
    case "presets":
      for (const [k, v] of Object.entries(PRESETS)) console.log(`${k.padEnd(13)} ${v.aspect.padEnd(5)} ${(v.fit ? `-> ${v.fit}` : "").padEnd(13)} ${v.hint}`);
      return 0;
    case "generate": {
      const r = await generate(o);
      if (r.dryRun) { console.log(JSON.stringify(r, null, 2)); return 0; }
      for (const x of r.results) console.log(`OK ${x.provider} ${x.output} (${x.bytes} bytes)${x.note}`);
      return 0;
    }
    case "fit": {
      const [i, out, size] = o._;
      if (!i || !out || !size) throw new Error("usage: fit <in.png> <out.png> <WxH>");
      fitPng(i, out, size);
      console.log(`OK ${out} ${size}`);
      return 0;
    }
    case "history": {
      const f = path.join(process.cwd(), ".imagegen", "history.jsonl");
      if (!fs.existsSync(f)) { console.log("no history yet"); return 0; }
      const lines = fs.readFileSync(f, "utf8").trim().split("\n").slice(-Number(o._[0] || 10));
      for (const l of lines) { try { const e = JSON.parse(l); console.log(`${e.ts}  ${e.provider}  ${e.preset ?? "-"}  ${e.output}\n    ${(e.prompt ?? "").slice(0, 120)}`); } catch {} }
      return 0;
    }
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(4, 15).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
      return cmd ? 1 : 0;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { log(`error: ${e.message}`); process.exit(1); });
}
