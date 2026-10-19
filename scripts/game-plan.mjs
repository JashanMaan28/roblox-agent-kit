#!/usr/bin/env node
// Work with design/features.json, the feature list game-spec writes and build-game executes.
//   node game-plan.mjs validate                     schema, ids, dependencies, evidence coverage
//   node game-plan.mjs status [--json]              progress per milestone, blocked features, next feature
//   node game-plan.mjs next [--json]                the feature to work on now, with its acceptance criteria
//   node game-plan.mjs start <ID>                   mark a ready feature in_progress
//   node game-plan.mjs done <ID> --evidence "<AC-ID>=<what proved it>" [--evidence ...]
//   node game-plan.mjs block <ID> --reason "<why>"  |  unblock <ID>
//   node game-plan.mjs guard [--base <git-ref>]     fail if requirements changed without a spec revision
// Options: --file <path> (default: nearest design/features.json above the current directory).
// Exits 1 on any error; the file is only written when the result validates.
import fs from "node:fs";
import path from "node:path";
import {
  FEATURES_REL,
  findFeaturesFile,
  guardPlan,
  loadPlan,
  nextFeature,
  parseVisualEvidence,
  savePlan,
  summarize,
  validatePlan,
} from "./lib/features.mjs";
import { run } from "./lib/toolchain.mjs";

const argv = process.argv.slice(2);
const command = argv[0];
const valueFlags = new Set(["--file", "--base", "--reason", "--evidence"]);
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !valueFlags.has(all[i - 1]));
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const optAll = (name) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
const asJson = argv.includes("--json");

function fail(message) {
  console.error(`game-plan: ${message}`);
  process.exit(1);
}

const USAGE = "usage: game-plan <validate|status|next|start|done|block|unblock|guard> [args] [--file design/features.json]";
if (!command || command === "--help" || command === "-h") {
  console.log(USAGE);
  process.exit(command ? 0 : 1);
}

const file = opt("file") ? path.resolve(opt("file")) : findFeaturesFile(process.cwd());
if (!file || !fs.existsSync(file)) fail(`no ${FEATURES_REL} found (run game-spec first, or pass --file)`);

let plan;
try {
  plan = loadPlan(file);
} catch (e) {
  fail(e.message);
}

function report({ errors, warnings }) {
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
}

function requireValid(p) {
  const result = validatePlan(p);
  if (result.errors.length) {
    report(result);
    fail(`${result.errors.length} error(s); ${path.relative(process.cwd(), file) || file} not written`);
  }
  return result;
}

function featureById(id) {
  if (!id) fail(`${command} needs a feature id`);
  const f = plan.features?.find((x) => x.id === id);
  if (!f) fail(`no feature ${id}`);
  return f;
}

function describe(f) {
  const lines = [`${f.id} [${f.milestone}] ${f.title} (${f.status})`, `  ${f.description}`];
  if (f.depends_on?.length) lines.push(`  depends on: ${f.depends_on.join(", ")}`);
  if (f.skills?.length) lines.push(`  skills: ${f.skills.join(", ")}`);
  if (f.spec_refs?.length) lines.push(`  spec: ${f.spec_refs.join("; ")}`);
  for (const ac of f.acceptance ?? []) {
    lines.push(`  ${ac.id} [${(ac.verify ?? []).join("+")}]`);
    lines.push(`    given ${ac.given}`, `    when  ${ac.when}`, `    then  ${ac.then}`);
  }
  if (f.notes) lines.push(`  notes: ${f.notes}`);
  return lines.join("\n");
}

switch (command) {
  case "validate": {
    const result = validatePlan(plan);
    report(result);
    if (result.errors.length) process.exit(1);
    console.log(`ok: ${plan.features.length} features, ${result.warnings.length} warning(s)`);
    break;
  }

  case "status": {
    const s = summarize(plan);
    if (asJson) {
      console.log(JSON.stringify({ ...s, next: s.next?.id ?? null }, null, 2));
      break;
    }
    console.log(`${s.game} (scope ${s.scope}, spec rev ${s.specRevision}): ${s.done}/${s.total} features done`);
    for (const m of s.perMilestone) console.log(`  ${m.id} ${m.title}: ${m.done}/${m.total}`);
    for (const b of s.blocked) console.log(`  blocked ${b.id}: ${b.reason}`);
    console.log(s.next ? `next: ${s.next.id} ${s.next.title}` : s.done === s.total ? "all features done" : "no feature is ready (check blocked features)");
    break;
  }

  case "next": {
    const f = nextFeature(plan);
    if (asJson) console.log(JSON.stringify(f, null, 2));
    else console.log(f ? describe(f) : "no feature is ready");
    break;
  }

  case "start": {
    const f = featureById(positional[0]);
    if (f.status === "done") fail(`${f.id} is already done`);
    const other = plan.features.find((x) => x.status === "in_progress" && x.id !== f.id);
    if (other) fail(`${other.id} is still in progress; finish or block it first`);
    const notDone = (f.depends_on ?? []).filter((d) => plan.features.find((x) => x.id === d)?.status !== "done");
    if (notDone.length) fail(`${f.id} depends on unfinished ${notDone.join(", ")}`);
    f.status = "in_progress";
    f.blocked_reason = null;
    requireValid(plan);
    savePlan(file, plan);
    console.log(describe(f));
    break;
  }

  case "done": {
    const f = featureById(positional[0]);
    const entries = optAll("evidence");
    if (!entries.length) fail(`done needs --evidence "<AC-ID>=<result>" for each acceptance criterion`);
    const at = new Date().toISOString();
    for (const entry of entries) {
      const eq = entry.indexOf("=");
      if (eq <= 0 || !entry.slice(eq + 1).trim()) fail(`bad --evidence "${entry}" (expected <AC-ID>=<result>)`);
      const ac = entry.slice(0, eq).trim();
      const result = entry.slice(eq + 1).trim();
      const criterion = f.acceptance?.find((a) => a.id === ac);
      if (criterion?.verify?.includes("visual")) {
        const visual = parseVisualEvidence(result);
        if (!visual.ok) fail(`${ac} is a visual check: ${visual.reason}`);
        const projectDir = path.dirname(path.dirname(file));
        if (visual.ref !== "none" && !fs.existsSync(path.resolve(projectDir, visual.ref))) {
          fail(`${ac}: reference image ${visual.ref} not found (paths are relative to the project root)`);
        }
      }
      f.evidence.push({ ac, result, at });
    }
    f.status = "done";
    f.blocked_reason = null;
    requireValid(plan);
    savePlan(file, plan);
    const next = nextFeature(plan);
    console.log(`${f.id} done (${f.evidence.length} evidence entries). Next: ${next ? `${next.id} ${next.title}` : "none ready"}`);
    break;
  }

  case "block": {
    const f = featureById(positional[0]);
    const reason = opt("reason");
    if (!reason?.trim()) fail(`block needs --reason "<why>"`);
    if (f.status === "done") fail(`${f.id} is done; it can't be blocked`);
    f.status = "blocked";
    f.blocked_reason = reason.trim();
    requireValid(plan);
    savePlan(file, plan);
    console.log(`${f.id} blocked: ${f.blocked_reason}`);
    break;
  }

  case "unblock": {
    const f = featureById(positional[0]);
    if (f.status !== "blocked") fail(`${f.id} is not blocked`);
    f.status = "todo";
    f.blocked_reason = null;
    requireValid(plan);
    savePlan(file, plan);
    console.log(`${f.id} back to todo`);
    break;
  }

  case "guard": {
    const base = opt("base") ?? "HEAD";
    const projectDir = path.dirname(path.dirname(file));
    const rel = path.relative(projectDir, file).split(path.sep).join("/");
    const shown = run("git", ["show", `${base}:./${rel}`], { cwd: projectDir });
    if (shown.missing) fail("git not found");
    const { errors: validationErrors } = validatePlan(plan);
    for (const e of validationErrors) console.log(`error: ${e}`);
    if (!shown.ok) {
      if (validationErrors.length) process.exit(1);
      console.log(`ok: ${rel} is not in ${base} yet; nothing to compare`);
      break;
    }
    let previous;
    try {
      previous = JSON.parse(shown.stdout);
    } catch {
      fail(`${rel} at ${base} is not valid JSON`);
    }
    const { errors, bumped } = guardPlan(previous, plan);
    for (const e of errors) console.log(`error: ${e}`);
    if (errors.length || validationErrors.length) process.exit(1);
    console.log(
      bumped
        ? `ok: spec revision ${previous.spec_revision} -> ${plan.spec_revision}; record why in design/DECISIONS.md`
        : `ok: requirements unchanged since ${base}`,
    );
    break;
  }

  default:
    fail(`unknown command "${command}"\n${USAGE}`);
}
