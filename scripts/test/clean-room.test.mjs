// A fresh clone on a machine that has never seen this person: no
// ~/.config/agents-rulebook, no Claude Code settings, no Figma token, no Apple
// Team. Everything this repository ships must install and run there, and every
// personal resource it can use must be missing gracefully — named, with what is
// lost without it, never a stack trace. The repository is public; this is the
// only machine most of its readers will ever be.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULES = ["design-first", "release", "publishing", "team-feed", "apple"];

function room() {
  const dir = mkdtempSync(join(tmpdir(), "rulebook-clean-"));
  const home = join(dir, "home");
  const project = join(dir, "project");
  mkdirSync(home);
  mkdirSync(project);
  // Nothing from the person's environment: not HOME, not the config, not a
  // token. PATH only, so node and git are found.
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    CLAUDE_CONFIG_DIR: join(home, ".claude"),
    GIT_CONFIG_GLOBAL: join(home, ".gitconfig"),
    GIT_AUTHOR_NAME: "Clean Room",
    GIT_AUTHOR_EMAIL: "clean@example.com",
    GIT_COMMITTER_NAME: "Clean Room",
    GIT_COMMITTER_EMAIL: "clean@example.com",
  };
  return { dir, home, project, env };
}

function assemble(project) {
  const parts = [
    "templates/AGENTS.core.md",
    ...MODULES.map((m) => `modules/${m}/MODULE.md`),
    "templates/AGENTS.tail.md",
  ].map((p) => readFileSync(join(KIT, p), "utf8"));
  // Step 3 of SKILL.md fills every {{...}}; any value will do here.
  writeFileSync(join(project, "AGENTS.md"), parts.join("\n").replace(/\{\{[^}]*\}\}/g, "x"));
}

function run(script, args, { cwd, env }) {
  return spawnSync(process.execPath, [join(KIT, script), ...args], { cwd, env, encoding: "utf8" });
}

const STACK = /\n\s+at .+:\d+:\d+/;

test("a fresh install with every module needs nothing but the Apple Team", () => {
  const r = room();
  assemble(r.project);
  const out = run("scripts/install.mjs", ["--git-init"], { cwd: r.project, env: r.env });
  const text = out.stdout + out.stderr;
  assert.equal(out.status, 1, text);
  assert.doesNotMatch(text, STACK);
  const hand = text.split("\n").filter((l) => l.startsWith("hand"));
  assert.deepEqual(hand.map((l) => l.split(/\s{2,}/)[1]), ["apple team"], text);
  for (const f of ["AGENTS.md", "BACKLOG.md", ".claude/rulebook.json", ".claude/rulebook.html"]) {
    assert.ok(existsSync(join(r.project, f)), `${f} was not written`);
  }
  // The registry went to the room's config, not to anybody's real one.
  assert.ok(existsSync(join(r.home, ".config/agents-rulebook/recipients.json")));
});

test("a second run changes nothing and says so", () => {
  const r = room();
  assemble(r.project);
  run("scripts/install.mjs", ["--git-init"], { cwd: r.project, env: r.env });
  const out = run("scripts/install.mjs", ["--check"], { cwd: r.project, env: r.env });
  assert.equal(out.status, 1);
  assert.doesNotMatch(out.stdout, /^todo/m, out.stdout);
});

test("the Figma tools say what they need instead of failing", () => {
  const r = room();
  for (const tool of ["figma-audit.mjs", "figma-inbox.mjs"]) {
    const out = run(`modules/design-first/scripts/${tool}`, ["1:2"], { cwd: r.project, env: r.env });
    const text = out.stdout + out.stderr;
    assert.equal(out.status, 2, `${tool}: ${text}`);
    assert.match(text, /Figma file key/, tool);
    assert.doesNotMatch(text, STACK, tool);
  }
});

test("every machine-local file the kit mentions is optional where it is mentioned", () => {
  // A procedure that names a file under ~/.config/agents-rulebook must also say
  // what happens without it, in the same file — a fresh machine has none.
  const local = /~\/\.config\/agents-rulebook\/([a-z-]+\.json)/g;
  const without = /\b(no file|not set|without|absent|missing|falls? back|skip|none on this machine|optional)\b/i;
  const files = execFileSync("git", ["-C", KIT, "ls-files", "*.md"], { encoding: "utf8" }).trim().split("\n");
  const silent = [];
  for (const f of files) {
    const text = readFileSync(join(KIT, f), "utf8");
    if (local.test(text) && !without.test(text)) silent.push(f);
    local.lastIndex = 0;
  }
  assert.deepEqual(silent, [], `these name a machine-local file and never say what happens without it: ${silent.join(", ")}`);
});

test("the launch plan installs as it is", () => {
  const plan = readFileSync(join(KIT, "skills/project-launch/LAUNCH.md"), "utf8");
  assert.doesNotMatch(plan, /\{\{/);
  assert.match(plan, /^## 0\. /m);
});
