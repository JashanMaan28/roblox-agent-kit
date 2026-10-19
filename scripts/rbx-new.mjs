#!/usr/bin/env node
// Scaffold a new Roblox project wired for Claude Code.
//   node rbx-new.mjs <dir> [--name my-game] [--scope my-scope] [--no-install] [--no-git]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasTool, run } from "./lib/toolchain.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(here, "..", "template");
const TEXT_EXT = /\.(json|toml|luau|lua|md|yml|yaml|template|txt)$|^\.(luaurc|styluaignore)$/;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const dirArg = argv.find((a, i) => !a.startsWith("--") && !["--name", "--scope"].includes(argv[i - 1]));
if (!dirArg) {
  console.error("usage: rbx-new <dir> [--name my-game] [--scope my-scope] [--no-install] [--no-git]");
  process.exit(1);
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "game";
const target = path.resolve(dirArg);
const name = slug(opt("name") ?? path.basename(target));
const scope = slug(opt("scope") ?? os.userInfo().username);

if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`rbx-new: ${target} is not empty; refusing to overwrite.`);
  process.exit(1);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name === "gitignore.template" ? ".gitignore" : entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (TEXT_EXT.test(entry.name)) {
      fs.writeFileSync(to, fs.readFileSync(from, "utf8").replaceAll("{{name}}", name).replaceAll("{{scope}}", scope));
    } else fs.copyFileSync(from, to);
  }
}

copyDir(templateDir, target);
// Project-local copies of the kit's CLIs so CI and teammates without the plugin can use them.
fs.mkdirSync(path.join(target, "tools", "lib"), { recursive: true });
fs.copyFileSync(path.join(here, "opencloud.mjs"), path.join(target, "tools", "rbx-cloud.mjs"));
fs.copyFileSync(path.join(here, "rbx-check.mjs"), path.join(target, "tools", "rbx-check.mjs"));
fs.copyFileSync(path.join(here, "lib", "toolchain.mjs"), path.join(target, "tools", "lib", "toolchain.mjs"));
console.log(`Created ${name} at ${target}`);

const steps = [];
if (!flag("no-install")) {
  if (hasTool("rokit")) {
    const tools = [...fs.readFileSync(path.join(target, "rokit.toml"), "utf8").matchAll(/"([\w-]+\/[\w-]+)@/g)].map((m) => m[1]);
    run("rokit", ["trust", ...tools], { cwd: target });
    const r = run("rokit", ["install"], { cwd: target, timeout: 600_000 });
    steps.push(`rokit install: ${r.ok ? "ok" : `failed\n${r.stderr || r.stdout}`}`);
    if (r.ok) {
      const w = run("wally", ["install"], { cwd: target, timeout: 300_000 });
      steps.push(`wally install: ${w.ok ? "ok" : `failed\n${w.stderr || w.stdout}`}`);
      const s = run("rojo", ["sourcemap", "default.project.json", "--output", "sourcemap.json", "--include-non-scripts"], { cwd: target });
      steps.push(`rojo sourcemap: ${s.ok ? "ok" : `failed\n${s.stderr}`}`);
    }
  } else {
    steps.push("rokit not found: install it (https://github.com/rojo-rbx/rokit), then run `rokit install` in the project.");
  }
}
if (!flag("no-git") && hasTool("git")) {
  const g = run("git", ["init", "-q"], { cwd: target });
  steps.push(`git init: ${g.ok ? "ok" : "failed"}`);
}
for (const s of steps) console.log(`- ${s}`);
console.log(`
Next:
  cd ${path.relative(process.cwd(), target) || "."}
  rojo serve                      # then click Connect in Studio's Rojo plugin
  node tools/rbx-check.mjs        # format/lint/type-check/build
  fill roblox-kit.json            # universeId/placeId/testPlaceId for Open Cloud tools`);
