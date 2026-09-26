#!/usr/bin/env node
/**
 * Wires an assembled AGENTS.md into its project: the stamp, CLAUDE.md,
 * BACKLOG.md, the rendered page, the hooks that keep the page current, the
 * worktree hooks where the rulebook is out of git, and the registry entry.
 *
 * Until this script existed, all of that was prose in SKILL.md, carried out by
 * whichever model ran the skill: JSON pasted into two settings files, a git hook
 * typed out with its guards, core.hooksPath set, the registry edited by hand.
 * Every step was the same every time, and every step was a place to get it
 * slightly wrong. What is left to the skill is what needs judgment — the four
 * questions, filling the blanks, merging with a rulebook already there.
 *
 * Usage, from the project root, after AGENTS.md has been assembled:
 *   node <skill>/scripts/install.mjs                  # do whatever is missing
 *   node <skill>/scripts/install.mjs --basis adopted  # stamp a rulebook not assembled here
 *   node <skill>/scripts/install.mjs --check          # say what is missing, write nothing
 *   node <skill>/scripts/install.mjs --check --all    # the same for every project in the registry
 *   node <skill>/scripts/install.mjs --pre-commit     # print the git hook, for adding to one already there
 *
 * Every run can be repeated: a step that is already in place is reported `ok`
 * and left alone. Each line starts with what happened to that step:
 *   ok     in place
 *   done   written by this run            (`todo` under --check: would be written)
 *   skip   does not apply to this project, with the reason
 *   hand   needs a person: this script will not decide it, and says why
 *
 * Exit code: 0 when nothing is left, 1 when something is `hand` (or `todo`
 * under --check), 2 when it could not run.
 *
 * The stamp is written only when there is none. Re-stamping an installed copy
 * would erase exactly the signal the sync reads — a section that moved here
 * since the stamp — so an existing stamp is the sync's business, not this one's.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ANCHOR } from "./lib/sections.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "agents-rulebook");
const REGISTRY = join(CONFIG, "recipients.json");
const BACKUP = join(CONFIG, "settings-backups");
// Claude Code's own directory moves with CLAUDE_CONFIG_DIR; the user's hooks go
// wherever Claude Code will read them.
const USER_SETTINGS = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");

const args = process.argv.slice(2);
const check = args.includes("--check");
const all = args.includes("--all");
const basis = args.includes("--basis") ? args[args.indexOf("--basis") + 1] : "install";
if (!["install", "adopted"].includes(basis)) {
  console.error(`error: --basis must be 'install' or 'adopted', got '${basis}'.`);
  process.exit(2);
}
if (all && !check) {
  console.error("error: --all only reports. Installing into every project at once is not something to do by accident.");
  process.exit(2);
}

const home = (p) => p.replace(homedir(), "~");
const tryGit = (cwd, ...a) => {
  try {
    return execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return null; }
};
const readJson = (path) => { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return undefined; } };

// ------------------------------------------------------------------ the hooks
//
// The commands are built from where this skill actually lives, with $HOME kept
// symbolic so a settings file committed to a project works on every machine.
// Each guards itself with `[ -f ]`: a clone without the skill gets a no-op, not
// an error on every edit.

const script = (name) => {
  const p = join(SKILL_ROOT, "scripts", name);
  return p.startsWith(homedir() + "/") ? "$HOME" + p.slice(homedir().length) : p;
};
const RENDER = script("render-rulebook.mjs");
const REFRESH = script("refresh-worktree.mjs");

const RENDER_HOOK = {
  matcher: "Edit|Write",
  hooks: [{
    type: "command", timeout: 20,
    command: `R="${RENDER}"; if [ -f "$R" ]; then node "$R" --hook; else true; fi`,
  }],
};
const REFRESH_START_HOOK = {
  hooks: [{
    type: "command", timeout: 20,
    command: `R="${REFRESH}"; if [ -f "$R" ]; then node "$R" --hook; else true; fi`,
  }],
};
const REFRESH_EDIT_HOOK = {
  matcher: "Edit|Write",
  hooks: [{
    type: "command", timeout: 20,
    command: `IN=$(cat); case "$IN" in *AGENTS.md*|*CLAUDE.md*|*rulebook.json*) R="${REFRESH}"; if [ -f "$R" ]; then printf "%s" "$IN" | node "$R" --hook; fi;; esac; true`,
  }],
};

/*
 * Both guards were paid for on 4 September 2026, the day one project took its
 * rulebook out of git. --diff-filter=d: the merge carrying the file out staged
 * its deletion, the hook rebuilt the page from a file that was leaving, and
 * `set -e` killed the commit. check-ignore: `git add` on an ignored path fails,
 * and the page was ignored now. The question is "is it ignored?", not "is it
 * tracked?" — a project keeping the rulebook in git must still be able to add
 * the page on its first commit, before it is tracked.
 */
const PRE_COMMIT = `#!/bin/sh
set -e
if git diff --cached --name-only --diff-filter=d | grep -qx 'AGENTS.md'; then
  R="${RENDER}"
  if [ -f "$R" ]; then
    node "$R"
    git check-ignore -q .claude/rulebook.html || git add .claude/rulebook.html
  else
    echo "pre-commit: agents-init skill not found; the rulebook page was not rebuilt" >&2
  fi
fi
`;

if (args.includes("--pre-commit")) {
  process.stdout.write(PRE_COMMIT);
  process.exit(0);
}

// A hook entry is recognised by the script it runs, not by its exact text: an
// entry written by hand before this script, or pointing at the skill somewhere
// else, is the same hook and must not be installed twice.
const hasHook = (settings, event, needle) =>
  (settings?.hooks?.[event] ?? []).some((entry) =>
    (entry.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes(needle)));

// ------------------------------------------------------------------ one project

function install(root) {
  const lines = [];
  let open = 0;
  const report = (state, step, text) => {
    if (state === "todo" || state === "hand") open++;
    lines.push(`${state.padEnd(5)} ${step.padEnd(11)} ${text}`);
  };
  const act = (step, text, write) => {
    if (check) return report("todo", step, text);
    write();
    report("done", step, text);
  };

  const agents = join(root, "AGENTS.md");
  if (!existsSync(agents)) {
    // In a worktree of a project whose rulebook is out of git, the file comes
    // from the project's copy, not from an install here.
    const main = tryGit(root, "worktree", "list", "--porcelain")?.match(/^worktree (.+)$/m)?.[1];
    if (main && resolve(main) !== resolve(root) && existsSync(join(main, "AGENTS.md"))) {
      report("hand", "AGENTS.md", `missing in this worktree of ${home(main)} — install there; refresh-worktree.mjs --all brings the copy here`);
    } else {
      report("hand", "AGENTS.md", "not here — assemble it first (SKILL.md, steps 1–3)");
    }
    return { lines, open };
  }

  // ---------------------------------------------------------------- assembly
  // A half-filled file is not stamped or rendered: the stamp would record the
  // blanks as canon, and the page would publish them. A report goes on past
  // them, because the rest of the list is what the person fixing it wants next.
  const problems = assemblyProblems(readFileSync(agents, "utf8"));
  for (const p of problems) report("hand", "AGENTS.md", p);
  if (problems.length && !check) {
    report("hand", "install", "stopped before writing anything: fix AGENTS.md and run again");
    return { lines, open };
  }
  if (!problems.length) report("ok", "AGENTS.md", "every heading anchored, no {{...}} left");

  const top = tryGit(root, "rev-parse", "--show-toplevel");
  const inGit = top !== null;
  const outOfGit = inGit && tryGit(root, "check-ignore", "-q", "AGENTS.md") !== null;

  // ---------------------------------------------------------------- stamp
  const stampPath = join(root, ".claude/rulebook.json");
  if (existsSync(stampPath)) report("ok", "stamp", ".claude/rulebook.json (drift since it is the sync's business)");
  else act("stamp", `.claude/rulebook.json, basis '${basis}'`, () => {
    execFileSync("node", [join(SKILL_ROOT, "scripts/stamp-rulebook.mjs"), "--basis", basis], { cwd: root, stdio: "ignore" });
  });

  // ---------------------------------------------------------------- CLAUDE.md
  // Claude Code 2.1.282 loads AGENTS.md by itself — measured on 26 September
  // 2026 with a code word in AGENTS.md and no CLAUDE.md — and does not load it
  // twice when CLAUDE.md imports it as well. So the import is for older
  // versions, and a CLAUDE.md of the project's own without it is not a gap: the
  // first version of this script called it one, and the verdict was wrong.
  const claude = join(root, "CLAUDE.md");
  if (!existsSync(claude)) act("CLAUDE.md", "one line, @AGENTS.md", () => writeFileSync(claude, "@AGENTS.md\n"));
  else if (/^@AGENTS\.md\s*$/m.test(readFileSync(claude, "utf8"))) report("ok", "CLAUDE.md", "imports @AGENTS.md");
  else report("ok", "CLAUDE.md", "the project's own, without the import; current Claude Code reads AGENTS.md anyway");

  // ---------------------------------------------------------------- BACKLOG.md
  const backlog = join(root, "BACKLOG.md");
  if (existsSync(backlog)) report("ok", "BACKLOG.md", "present");
  else act("BACKLOG.md", "from templates/BACKLOG.md", () => copyFileSync(join(SKILL_ROOT, "templates/BACKLOG.md"), backlog));

  // ---------------------------------------------------------------- page
  // Rendered after the stamp, because the page badges sections against it.
  const render = (...a) => execFileSync("node", [join(SKILL_ROOT, "scripts/render-rulebook.mjs"), ...a], { cwd: root, stdio: "ignore" });
  let pageFresh = false;
  try { render("--check"); pageFresh = true; } catch { /* missing or stale */ }
  // Under --check a stamp about to be written would change the page anyway.
  if (pageFresh && existsSync(stampPath)) report("ok", "page", ".claude/rulebook.html is current");
  else act("page", `.claude/rulebook.html ${existsSync(join(root, ".claude/rulebook.html")) ? "was stale" : "was missing"}`, () => render());

  // ---------------------------------------------------------------- project hook
  const projectSettings = join(root, ".claude/settings.json");
  mergeHooks(projectSettings, ".claude/settings.json", "claude hook", [["PostToolUse", RENDER_HOOK, "render-rulebook.mjs"]],
    "PostToolUse redraws the page when AGENTS.md is edited", report, act);

  // ---------------------------------------------------------------- git hook
  if (!inGit) report("skip", "pre-commit", "not a git repository");
  else if (outOfGit) report("skip", "pre-commit", "AGENTS.md is ignored here: it is never staged, so the hook would have nothing to fire on");
  else preCommit(root, top, report, act);

  // ---------------------------------------------------------------- worktree hooks
  if (!outOfGit) report("skip", "worktrees", inGit ? "AGENTS.md is in git: each worktree follows its branch" : "not a git repository");
  else mergeHooks(USER_SETTINGS, home(USER_SETTINGS), "worktrees", [
    ["SessionStart", REFRESH_START_HOOK, "refresh-worktree.mjs"],
    ["PostToolUse", REFRESH_EDIT_HOOK, "refresh-worktree.mjs"],
  ], "SessionStart and PostToolUse keep every worktree's copy current", report, act);

  // ---------------------------------------------------------------- registry
  // A worktree registers its project: the main checkout is where the copy lives.
  const project = inGit
    ? tryGit(root, "worktree", "list", "--porcelain").match(/^worktree (.+)$/m)?.[1] ?? top
    : root;
  const reg = existsSync(REGISTRY) ? readJson(REGISTRY) : { recipients: [] };
  const list = reg?.recipients;
  const expand = (p) => resolve(p.replace(/^~(?=\/)|^\$HOME(?=\/)/, homedir()));
  if (!Array.isArray(list)) report("hand", "registry", `${home(REGISTRY)} is not {"recipients": [...]} — left alone`);
  else if (list.some((p) => expand(p) === resolve(project))) report("ok", "registry", `${home(project)} is listed`);
  else act("registry", `${home(project)} added to ${home(REGISTRY)}`, () => {
    mkdirSync(CONFIG, { recursive: true });
    writeFileSync(REGISTRY, JSON.stringify({ ...reg, recipients: [...list, home(project)] }, null, 2) + "\n");
  });

  return { lines, open };
}

// Headings without an anchor above them, and blanks nobody filled. Fenced code
// is skipped: a `## ` or `{{` inside a shown example is not part of the file's
// structure.
function assemblyProblems(text) {
  const problems = [];
  const lines = text.split("\n");
  let fence = false, prev = "", unanchored = [], blanks = 0;
  for (const [i, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    if (/^#{2,3} /.test(line) && !new RegExp(ANCHOR.source).test(prev)) unanchored.push(`${i + 1}: ${line}`);
    if (line.includes("{{")) blanks++;
    if (line.trim()) prev = line.trim();
  }
  if (unanchored.length) problems.push(`${unanchored.length} heading(s) without a <!-- rule: --> or <!-- local: --> anchor above, first at line ${unanchored[0]}`);
  if (blanks) problems.push(`${blanks} line(s) still hold {{...}} — fill them or delete the paragraph`);
  return problems;
}

// Adds hook entries to a settings file, keeping everything already in it. The
// previous file is saved first: this may be the user's own settings, and a
// merge that goes wrong there should come back with one copy.
function mergeHooks(path, shown, step, wanted, what, report, act) {
  const exists = existsSync(path);
  const settings = exists ? readJson(path) : {};
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
    return report("hand", step, `${shown} is not a JSON object — left alone`);
  }
  const missing = wanted.filter(([event, , needle]) => !hasHook(settings, event, needle));
  if (!missing.length) return report("ok", step, what);
  act(step, `${what} (${missing.map(([e]) => e).join(", ")} into ${shown})`, () => {
    if (exists) {
      mkdirSync(BACKUP, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      copyFileSync(path, join(BACKUP, `${shown.replace(/[^\w.-]+/g, "_")}.${stamp}`));
    }
    const hooks = { ...(settings.hooks ?? {}) };
    for (const [event, entry] of missing) hooks[event] = [...(hooks[event] ?? []), entry];
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ ...settings, hooks }, null, 2) + "\n");
  });
}

/*
 * The hook goes where the project already keeps its hooks, never over them.
 * On 15 September 2026 valey-site had core.hooksPath = tools/hooks, holding the
 * pre-push gate that lets only a tagged release commit onto main — the branch
 * that deploys the site. `git config core.hooksPath .githooks`, as the step was
 * written, would have switched that gate off without a word. So an existing
 * hooksPath is followed, hooks already sitting in .git/hooks keep git from being
 * re-pointed, and a pre-commit that is somebody else's is never edited: whether
 * the block can go at its end depends on what the script does before it, and
 * that is read by a person.
 */
function preCommit(root, top, report, act) {
  const configured = tryGit(root, "config", "core.hooksPath");
  let dir, setPath = false;
  if (configured) {
    dir = isAbsolute(configured) ? configured : join(top, configured);
  } else {
    const gitHooks = resolve(top, tryGit(root, "rev-parse", "--git-path", "hooks"));
    const own = existsSync(gitHooks) ? readdirSync(gitHooks).filter((f) => !f.endsWith(".sample")) : [];
    if (own.length) {
      return report("hand", "pre-commit",
        `${home(gitHooks)} already holds ${own.join(", ")}; pointing core.hooksPath elsewhere would switch them off. ` +
        `Add the lines from "install.mjs --pre-commit" to its pre-commit instead.`);
    }
    dir = join(top, ".githooks");
    setPath = true;
  }
  const hook = join(dir, "pre-commit");
  const shown = home(relative(top, hook).startsWith("..") ? hook : relative(top, hook));
  if (existsSync(hook)) {
    if (readFileSync(hook, "utf8").includes("render-rulebook.mjs")) report("ok", "pre-commit", `${shown} redraws the page`);
    else report("hand", "pre-commit", `${shown} exists and is not ours — add the lines from "install.mjs --pre-commit" where they will run`);
  } else {
    act("pre-commit", `${shown}${setPath ? ", and core.hooksPath set to .githooks (git does not carry it: once per clone)" : ""}`, () => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(hook, PRE_COMMIT);
      chmodSync(hook, 0o755);
      if (setPath) execFileSync("git", ["-C", top, "config", "core.hooksPath", ".githooks"]);
    });
  }
}

// ------------------------------------------------------------------ main

let roots = [process.cwd()];
if (all) {
  const reg = readJson(REGISTRY);
  if (!Array.isArray(reg?.recipients)) {
    console.error(`error: no registry at ${home(REGISTRY)}.`);
    process.exit(2);
  }
  // A path that is not on this machine is skipped silently, as in the sync:
  // one list serves every computer.
  roots = reg.recipients
    .map((p) => resolve(p.replace(/^~(?=\/)|^\$HOME(?=\/)/, homedir())))
    .filter((p) => existsSync(p));
}

let open = 0;
for (const root of roots) {
  const r = install(root);
  open += r.open;
  if (all) console.log(`\n${home(root)}${r.open ? "" : " — complete"}`);
  for (const l of r.lines) console.log(all ? "  " + l : l);
}
if (open) {
  console.log(`\n${open} step(s) ${check ? "not in place" : "left for a person"}.`);
  if (check && !all) console.log("Run without --check to do the `todo` ones; the `hand` ones say why they are not this script's.");
}
process.exit(open ? 1 : 0);
