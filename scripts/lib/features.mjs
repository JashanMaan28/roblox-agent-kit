// Shared logic for design/features.json, the machine-readable feature list that
// game-spec writes and build-game works through. Used by game-plan.mjs and the
// SessionStart hook.
import fs from "node:fs";
import path from "node:path";

export const FEATURES_REL = path.join("design", "features.json");
export const STATUSES = ["todo", "in_progress", "done", "blocked"];
export const VERIFY_KINDS = ["static", "unit", "engine", "playtest", "review", "visual"];
// Visual evidence is a judge's verdict against a reference image, written as
//   visual ref=art/refs/zone-lava.png judge=subagent palette=4 lighting=5 readability=4 composition=4 mood=4
// (ref=none when no reference image exists). Every score must be >= VISUAL_FLOOR; a score
// below VISUAL_PASS is only accepted when the entry also says "debt" (logged for the polish gate).
export const VISUAL_PASS = 4;
export const VISUAL_FLOOR = 3;
export const SCOPES = ["mvp", "launch"];
// Fields that define *what* must be built. Only a spec revision may change them.
export const FROZEN_FIELDS = ["milestone", "title", "description", "depends_on", "acceptance"];

const FEATURE_ID = /^[A-Z][A-Z0-9]*-\d{2,}$/;
const NON_SCORE_KEYS = new Set(["ref", "judge", "round", "rounds", "camera"]);

// Parses a visual evidence string. Returns { ok, ref, reason }.
export function parseVisualEvidence(result) {
  const text = String(result ?? "");
  const ref = text.match(/\bref=(\S+)/)?.[1];
  if (!ref) return { ok: false, reason: 'needs "ref=<image path>" (or ref=none)' };
  if (!/\bjudge=\S+/.test(text)) return { ok: false, ref, reason: 'needs "judge=<who scored it>"' };
  const scores = [...text.matchAll(/\b([a-z][a-z-]*)=(\d+(?:\.\d+)?)\b/gi)]
    .filter((m) => !NON_SCORE_KEYS.has(m[1].toLowerCase()))
    .map((m) => Number(m[2]));
  if (scores.length < 3) return { ok: false, ref, reason: "needs at least 3 rubric scores (name=1..5)" };
  if (scores.some((n) => n < 1 || n > 5)) return { ok: false, ref, reason: "scores must be 1..5" };
  const min = Math.min(...scores);
  if (min < VISUAL_FLOOR) return { ok: false, ref, reason: `a score of ${min} is below the floor (${VISUAL_FLOOR})` };
  if (min < VISUAL_PASS && !/\bdebt\b/i.test(text)) {
    return { ok: false, ref, reason: `a score of ${min} is below ${VISUAL_PASS}: fix it, or record it as "debt"` };
  }
  return { ok: true, ref };
}

// Walks up from `start` to the nearest directory containing design/features.json.
export function findFeaturesFile(start) {
  let dir = path.resolve(start);
  for (;;) {
    const candidate = path.join(dir, FEATURES_REL);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadPlan(file) {
  const text = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
}

export function savePlan(file, plan) {
  fs.writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
}

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// Returns { errors: string[], warnings: string[] }.
export function validatePlan(plan) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { errors: ["root must be a JSON object"], warnings };
  }
  if (plan.schema_version !== 1) err("schema_version must be 1");
  if (!isNonEmptyString(plan.game)) err("game must be a non-empty string");
  if (!Number.isInteger(plan.spec_revision) || plan.spec_revision < 1) err("spec_revision must be an integer >= 1");
  if (!SCOPES.includes(plan.scope)) err(`scope must be one of ${SCOPES.join(", ")}`);

  const milestoneOrder = new Map();
  if (!Array.isArray(plan.milestones) || plan.milestones.length === 0) {
    err("milestones must be a non-empty array");
  } else {
    plan.milestones.forEach((m, i) => {
      if (!m || !isNonEmptyString(m.id) || !isNonEmptyString(m.title)) err(`milestones[${i}] needs id and title`);
      else if (milestoneOrder.has(m.id)) err(`duplicate milestone ${m.id}`);
      else milestoneOrder.set(m.id, i);
    });
  }

  if (!Array.isArray(plan.features) || plan.features.length === 0) {
    err("features must be a non-empty array");
    return { errors, warnings };
  }

  const byId = new Map();
  for (const [i, f] of plan.features.entries()) {
    const where = f && isNonEmptyString(f.id) ? f.id : `features[${i}]`;
    if (!f || typeof f !== "object") {
      err(`${where}: must be an object`);
      continue;
    }
    if (!isNonEmptyString(f.id) || !FEATURE_ID.test(f.id)) err(`${where}: id must look like ABC-01`);
    else if (byId.has(f.id)) err(`${where}: duplicate id`);
    else byId.set(f.id, f);
    if (!milestoneOrder.has(f.milestone)) err(`${where}: milestone "${f.milestone}" is not in milestones`);
    if (!isNonEmptyString(f.title)) err(`${where}: title is required`);
    if (!isNonEmptyString(f.description)) err(`${where}: description is required`);
    if (!Array.isArray(f.depends_on)) err(`${where}: depends_on must be an array (use [] for none)`);
    if (f.skills !== undefined && !(Array.isArray(f.skills) && f.skills.every(isNonEmptyString))) {
      err(`${where}: skills must be an array of skill names`);
    }
    if (!STATUSES.includes(f.status)) err(`${where}: status must be one of ${STATUSES.join(", ")}`);
    if (!Array.isArray(f.evidence)) err(`${where}: evidence must be an array (use [] when empty)`);

    const acIds = new Set();
    if (!Array.isArray(f.acceptance) || f.acceptance.length === 0) {
      err(`${where}: needs at least one acceptance criterion`);
    } else {
      for (const [j, ac] of f.acceptance.entries()) {
        const acWhere = `${where}.acceptance[${j}]`;
        if (!ac || typeof ac !== "object") {
          err(`${acWhere}: must be an object`);
          continue;
        }
        if (!isNonEmptyString(ac.id) || !ac.id.startsWith(`${f.id}-AC`)) err(`${acWhere}: id must be ${f.id}-AC<n>`);
        else if (acIds.has(ac.id)) err(`${acWhere}: duplicate id ${ac.id}`);
        else acIds.add(ac.id);
        for (const key of ["given", "when", "then"]) {
          if (!isNonEmptyString(ac[key])) err(`${acWhere}: "${key}" is required`);
        }
        if (!Array.isArray(ac.verify) || ac.verify.length === 0 || !ac.verify.every((v) => VERIFY_KINDS.includes(v))) {
          err(`${acWhere}: verify must be a non-empty array of ${VERIFY_KINDS.join(", ")}`);
        }
      }
    }

    if (Array.isArray(f.evidence)) {
      for (const [j, e] of f.evidence.entries()) {
        if (!e || !isNonEmptyString(e.ac) || !isNonEmptyString(e.result)) {
          err(`${where}.evidence[${j}]: needs "ac" and "result"`);
        } else if (!acIds.has(e.ac)) {
          err(`${where}.evidence[${j}]: "${e.ac}" is not one of this feature's acceptance ids`);
        }
      }
    }
    if (f.status === "blocked" && !isNonEmptyString(f.blocked_reason)) err(`${where}: blocked needs blocked_reason`);
    if (f.status === "done" && Array.isArray(f.evidence)) {
      const covered = new Set(f.evidence.map((e) => e?.ac));
      const missing = [...acIds].filter((id) => !covered.has(id));
      if (missing.length) err(`${where}: done without evidence for ${missing.join(", ")}`);
      for (const ac of Array.isArray(f.acceptance) ? f.acceptance : []) {
        if (!ac?.verify?.includes?.("visual") || !covered.has(ac.id)) continue;
        const entries = f.evidence.filter((e) => e?.ac === ac.id);
        if (!entries.some((e) => parseVisualEvidence(e.result).ok)) {
          const reason = parseVisualEvidence(entries.at(-1)?.result).reason;
          err(`${where}: ${ac.id} is a visual check without a passing visual verdict (${reason})`);
        }
      }
    }
  }

  // Dependencies: exist, not later milestones, no cycles, done only after deps are done.
  for (const f of byId.values()) {
    if (!Array.isArray(f.depends_on)) continue;
    for (const dep of f.depends_on) {
      const d = byId.get(dep);
      if (!d) {
        err(`${f.id}: depends on unknown feature ${dep}`);
        continue;
      }
      if (dep === f.id) err(`${f.id}: depends on itself`);
      if ((milestoneOrder.get(d.milestone) ?? 0) > (milestoneOrder.get(f.milestone) ?? 0)) {
        warn(`${f.id} (${f.milestone}) depends on ${dep} from a later milestone (${d.milestone})`);
      }
      if (f.status === "done" && d.status !== "done") err(`${f.id}: done but its dependency ${dep} is ${d.status}`);
    }
  }
  const cycle = findCycle(byId);
  if (cycle) err(`dependency cycle: ${cycle.join(" -> ")}`);

  const active = [...byId.values()].filter((f) => f.status === "in_progress");
  if (active.length > 1) warn(`${active.length} features in progress (${active.map((f) => f.id).join(", ")}); work one at a time`);

  return { errors, warnings };
}

function findCycle(byId) {
  const state = new Map(); // 1 = visiting, 2 = done
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const dep of byId.get(id)?.depends_on ?? []) {
      if (!byId.has(dep)) continue;
      const found = visit(dep);
      if (found) return found;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const id of byId.keys()) {
    const found = visit(id);
    if (found) return found;
  }
  return null;
}

// The feature to work on now: the one in progress, else the first todo (milestone order,
// then file order) whose dependencies are all done.
export function nextFeature(plan) {
  const features = plan.features ?? [];
  const inProgress = features.find((f) => f.status === "in_progress");
  if (inProgress) return inProgress;
  const status = new Map(features.map((f) => [f.id, f.status]));
  const order = new Map((plan.milestones ?? []).map((m, i) => [m.id, i]));
  const ready = features
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.status === "todo" && (f.depends_on ?? []).every((d) => status.get(d) === "done"))
    .sort((a, b) => (order.get(a.f.milestone) ?? 0) - (order.get(b.f.milestone) ?? 0) || a.i - b.i);
  return ready[0]?.f ?? null;
}

export function summarize(plan) {
  const features = plan.features ?? [];
  const perMilestone = (plan.milestones ?? []).map((m) => {
    const list = features.filter((f) => f.milestone === m.id);
    return { id: m.id, title: m.title, done: list.filter((f) => f.status === "done").length, total: list.length };
  });
  return {
    game: plan.game,
    scope: plan.scope,
    specRevision: plan.spec_revision,
    done: features.filter((f) => f.status === "done").length,
    total: features.length,
    perMilestone,
    blocked: features.filter((f) => f.status === "blocked").map((f) => ({ id: f.id, reason: f.blocked_reason })),
    next: nextFeature(plan),
  };
}

const frozenView = (f) => JSON.stringify(FROZEN_FIELDS.map((k) => f[k] ?? null));

// Compares the working plan with a previous version (e.g. the last commit).
// Requirements may only change together with a spec_revision bump, and a changed
// feature can't stay "done" on evidence gathered for the old requirements.
export function guardPlan(previous, current) {
  const errors = [];
  const prevById = new Map((previous.features ?? []).map((f) => [f.id, f]));
  const curById = new Map((current.features ?? []).map((f) => [f.id, f]));
  const bumped = (current.spec_revision ?? 0) > (previous.spec_revision ?? 0);
  if ((current.spec_revision ?? 0) < (previous.spec_revision ?? 0)) errors.push("spec_revision went down");

  for (const [id, prev] of prevById) {
    const cur = curById.get(id);
    if (!cur) {
      if (!bumped) errors.push(`${id} was removed without a spec_revision bump`);
      continue;
    }
    if (frozenView(prev) !== frozenView(cur)) {
      if (!bumped) {
        const changed = FROZEN_FIELDS.filter((k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(cur[k] ?? null));
        errors.push(`${id}: ${changed.join(", ")} changed without a spec_revision bump (requirements are frozen)`);
      } else if (cur.status === "done" && (cur.evidence?.length ?? 0) <= (prev.evidence?.length ?? 0)) {
        errors.push(`${id}: requirements changed but it is still "done" on old evidence; set it back to todo and re-verify`);
      }
    }
    if (prev.status === "done" && cur.status === "done" && (cur.evidence?.length ?? 0) < (prev.evidence?.length ?? 0)) {
      errors.push(`${id}: evidence entries were deleted`);
    }
  }
  if (!bumped) {
    for (const id of curById.keys()) {
      if (!prevById.has(id)) errors.push(`${id} was added without a spec_revision bump`);
    }
  }
  return { errors, bumped };
}
