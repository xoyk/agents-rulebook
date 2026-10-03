#!/usr/bin/env node
/**
 * Wires an assembled AGENTS.md into its project: the stamp, BACKLOG.md, the rendered page, the hooks that keep the page current, the
 * worktree hooks where the rulebook is out of git, and the registry entry.
 *
 * Until this script existed, all of that was prose in SKILL.md, carried out by
 * whichever model ran the skill: JSON pasted into two settings files, a git hook
 * typed out with its guards, core.hooksPath set, the registry edited by hand.
 * Every step was the same every time, and every step was a place to get it
 * slightly wrong. What is left to the skill is what needs judgment — the five
 * questions, filling the blanks, merging with a rulebook already there.
 *
 * Usage, from the project root, after AGENTS.md has been assembled:
 *   node <skill>/scripts/install.mjs                  # do whatever is missing
 *   node <skill>/scripts/install.mjs --basis adopted  # stamp a rulebook not assembled here
 *   node <skill>/scripts/install.mjs --git-init       # no repository here yet: create a local one first
 *   node <skill>/scripts/install.mjs --apple-team <id> # keep the Apple Team for this machine (apple module)
 *   node <skill>/scripts/install.mjs --check          # say what is missing, write nothing
 *   node <skill>/scripts/install.mjs --check --all    # the same for every project in the registry
 *   node <skill>/scripts/install.mjs --pre-commit     # print the git hook, for adding to one already there
 *   node <skill>/scripts/install.mjs --forget <path>  # take a project out of the registry
 *
 * Every run can be repeated: a step that is already in place is reported `ok`
 * and left alone. Each line starts with what happened to that step:
 *   ok     in place
 *   done   written by this run            (`todo` under --check: would be written)
 *   skip   does not apply to this project, with the reason
 *   hand   needs a person: this script will not decide it, and says why
 *   note   worth a look, not a gap: a project nobody has committed to in weeks
 *
 * Exit code: 0 when nothing is left, 1 when something is `hand` (or `todo`
 * under --check), 2 when it could not run.
 *
 * The stamp is written only when there is none. Re-stamping an installed copy
 * would erase exactly the signal the sync reads — a section that moved here
 * since the stamp — so an existing stamp is the sync's business, not this one's.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ANCHOR } from "./lib/sections.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "agents-rulebook");
const REGISTRY = join(CONFIG, "recipients.json");
// Written into a registry this script creates, and into one that has no
// comment yet. The one it replaces said "both computers can share one list":
// nothing shares it — the file is on one machine, in no repository — and a
// comment that promises a sync makes a missing project look like a sync bug.
const REGISTRY_COMMENT =
  "Projects carrying a copy of the agents-rulebook, on this machine. Not synced and not in git: " +
  "another computer has its own list, or none. A path that is not here is skipped. " +
  "install.mjs adds a project; install.mjs --forget <path> takes one out.";
// A project with no commit for this long is named in --check --all. Not a gap:
// a quiet project is fine, an archived one is a line nobody meant to keep.
const QUIET_DAYS = 21;
const BACKUP = join(CONFIG, "settings-backups");
// Claude Code's own directory moves with CLAUDE_CONFIG_DIR; the user's hooks go
// wherever Claude Code will read them.
const USER_SETTINGS = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");

const args = process.argv.slice(2);
const check = args.includes("--check");
const all = args.includes("--all");
const gitInit = args.includes("--git-init");
const appleTeamArg = args.includes("--apple-team") ? args[args.indexOf("--apple-team") + 1] : null;
if (appleTeamArg !== null && !/^[A-Z0-9]{10}$/.test(appleTeamArg ?? "")) {
  console.error(`error: --apple-team takes a 10-character Team ID, got '${appleTeamArg}'.`);
  process.exit(2);
}
const basis = args.includes("--basis") ? args[args.indexOf("--basis") + 1] : "install";
if (!["install", "adopted"].includes(basis)) {
  console.error(`error: --basis must be 'install' or 'adopted', got '${basis}'.`);
  process.exit(2);
}
if (gitInit && all) {
  console.error("error: --git-init answers a question asked about one project; it does not go with --all.");
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
// Real paths, so an entry spelled through a symlink matches what git reports.
const expand = (p) => {
  const abs = resolve(p.replace(/^~(?=\/)|^\$HOME(?=\/)/, homedir()));
  try { return realpathSync(abs); } catch { return abs; }
};
// The main checkout of the repository `dir` belongs to: the first entry of
// `git worktree list`. Null outside git.
const mainOf = (dir) => {
  const out = existsSync(dir) ? tryGit(dir, "worktree", "list", "--porcelain") : null;
  const first = out?.match(/^worktree (.+)$/m)?.[1];
  return first ? expand(first) : null;
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

  // ---------------------------------------------------------------- git
  /*
   * Every rule in the core assumes a repository, and so do the pre-commit hook
   * and the worktree hooks, so a project without one is asked whether to start
   * one — SKILL.md, step 2 — and --git-init is the answer yes. It is local only:
   * `git init` on branch main, the name the rulebook uses throughout, with no
   * remote and nothing committed. Adding a remote is a choice about where the
   * work is visible, and the first commit is the person reading the agreements
   * and deciding they are right; neither belongs to an install.
   *
   * On 26 September 2026 one project was installed as a plain directory. The
   * script said `skip pre-commit: not a git repository`, a line that reads like
   * a decision although nobody had made one, and the agent then ran `git init`
   * on its own initiative. The init was right and the manner was wrong: whether
   * a directory becomes a repository is the user's question, and it had not
   * been asked.
   */
  let top = tryGit(root, "rev-parse", "--show-toplevel");
  if (top === null) {
    if (!gitInit) report("skip", "git", "not a git repository; --git-init creates a local one (no remote, no commit)");
    else act("git", "local repository on main: no remote, nothing committed", () => {
      execFileSync("git", ["-C", root, "init", "-q", "-b", "main"], { stdio: "ignore" });
    });
    if (gitInit && !check) top = tryGit(root, "rev-parse", "--show-toplevel");
  } else if (gitInit) {
    report("ok", "git", `already inside ${home(top)} — --git-init did nothing`);
  }
  const inGit = top !== null;
  const outOfGit = inGit && tryGit(root, "check-ignore", "-q", "AGENTS.md") !== null;

  // ---------------------------------------------------------------- stamp
  const stampPath = join(root, ".claude/rulebook.json");
  if (existsSync(stampPath)) report("ok", "stamp", ".claude/rulebook.json (drift since it is the sync's business)");
  else act("stamp", `.claude/rulebook.json, basis '${basis}'`, () => {
    execFileSync("node", [join(SKILL_ROOT, "scripts/stamp-rulebook.mjs"), "--basis", basis], { cwd: root, stdio: "ignore" });
  });

  // No CLAUDE.md step. Claude Code 2.1.282 loads AGENTS.md by itself — measured
  // on 26 September 2026 with a code word in AGENTS.md, no CLAUDE.md, and user
  // settings and hooks switched off; the control without AGENTS.md answered
  // NONE. The one-line `@AGENTS.md` pointer the canon used to install is
  // redundant there, and a CLAUDE.md a project already has is its own business.

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
  if (!inGit && gitInit) report("todo", "pre-commit", ".githooks/pre-commit, once --git-init has created the repository");
  else if (!inGit) report("skip", "pre-commit", "not a git repository");
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
  const project = inGit ? mainOf(root) ?? top : root;
  const reg = existsSync(REGISTRY) ? readJson(REGISTRY) : { recipients: [] };
  const list = reg?.recipients;
  if (!Array.isArray(list)) report("hand", "registry", `${home(REGISTRY)} is not {"recipients": [...]} — left alone`);
  else {
    /*
     * An entry that is a worktree of this project stands in for it, and badly:
     * the day the worktree is removed, the project drops out of every report
     * without a word. On 26 September 2026 the registry listed one project's
     * worktree and not the project itself. So such an entry is replaced by the
     * project.
     */
    const here = expand(project);
    const listed = list.some((p) => expand(p) === here);
    const standIns = list.filter((p) => expand(p) !== here && mainOf(expand(p)) === here);
    const recipients = [
      ...list.filter((p) => !standIns.includes(p)),
      ...(listed ? [] : [home(project)]),
    ];
    const write = () => {
      mkdirSync(CONFIG, { recursive: true });
      writeFileSync(REGISTRY, JSON.stringify({ comment: REGISTRY_COMMENT, ...reg, recipients }, null, 2) + "\n");
    };
    if (standIns.length) act("registry", `${standIns.join(", ")} is a worktree of ${home(project)} — the project is listed instead`, write);
    else if (!listed) act("registry", `${home(project)} added to ${home(REGISTRY)}`, write);
    else report("ok", "registry", `${home(project)} is listed`);

    // Any local branch, not HEAD: a main checkout left on an old branch while
    // the work goes on in worktrees is not a quiet project.
    const last = Number(tryGit(project, "for-each-ref", "--sort=-committerdate", "--count=1", "--format=%(committerdate:unix)", "refs/heads"));
    const days = last ? Math.floor((Date.now() / 1000 - last) / 86400) : 0;
    if (days >= QUIET_DAYS) {
      report("note", "registry", `no commit in ${days} days — if the project is retired: install.mjs --forget "${home(project)}"`);
    }
  }

  // ---------------------------------------------------------------- apple team
  if (readFileSync(agents, "utf8").includes("<!-- rule:apple-team -->")) {
    appleTeam(root, Array.isArray(list) ? list.map(expand) : [], report, act);
  }

  return { lines, open };
}

/*
 * The apple module's Team: one per person, kept once per machine and copied into
 * the project's local signing file — modules/apple/MODULE.md, "The Team is found,
 * not asked for twice". On 28 September 2026 4FH needed it on its first device
 * build, and it was found in another project on the machine in one search; the
 * user asked for the install to do that search. It is offered, never picked:
 * two teams on one machine is ordinary.
 */
const APPLE = join(CONFIG, "apple.json");
const SKIP_DIRS = new Set(["node_modules", ".git", "DerivedData", "Pods", "build", ".build", "worktrees"]);

function appleTeam(root, recipients, report, act) {
  if (appleTeamArg) {
    act("apple team", `${appleTeamArg} kept for this machine in ${home(APPLE)}`, () => {
      mkdirSync(CONFIG, { recursive: true });
      writeFileSync(APPLE, JSON.stringify({ teamId: appleTeamArg }, null, 2) + "\n");
    });
  }
  const team = appleTeamArg ?? readJson(APPLE)?.teamId ?? null;
  if (!team) {
    const found = new Map();
    for (const r of recipients) {
      if (resolve(r) === resolve(root) || !existsSync(r)) continue;
      for (const id of teamIdsIn(r)) found.set(id, [...(found.get(id) ?? []), home(r)]);
    }
    if (!found.size) return report("hand", "apple team", "none on this machine and none in the registry's projects — pass --apple-team <id> (Xcode → Settings → Accounts)");
    const offers = [...found].map(([id, where]) => `${id} (in ${where.join(", ")})`).join("; ");
    return report("hand", "apple team", `not kept on this machine yet; found ${offers} — confirm one with --apple-team <id>`);
  }
  if (!appleTeamArg) report("ok", "apple team", `${team} (${home(APPLE)})`);

  // Where this project takes its Team from: an xcconfig that optionally
  // includes a local file, or an Expo app.json.
  const include = findFiles(root, (f) => f.endsWith(".xcconfig"))
    .find((f) => /#include\?\s+"Signing\.local\.xcconfig"/.test(readFileSync(f, "utf8")));
  if (include) {
    const local = join(dirname(include), "Signing.local.xcconfig");
    const shown = home(relative(root, local));
    if (!existsSync(local)) {
      if (tryGit(root, "check-ignore", "-q", local) === null && tryGit(root, "rev-parse", "--show-toplevel") !== null) {
        return report("hand", "signing", `${shown} is not ignored by git — ignore it before the Team goes in`);
      }
      return act("signing", `${shown} with DEVELOPMENT_TEAM = ${team}`, () =>
        writeFileSync(local, `// The Team for device builds — not committed (see ${relative(dirname(local), include)}).\nDEVELOPMENT_TEAM = ${team}\nCODE_SIGN_STYLE = Automatic\n`));
    }
    const has = readFileSync(local, "utf8").match(/DEVELOPMENT_TEAM\s*=\s*([A-Z0-9]{10})/)?.[1];
    if (has === team) return report("ok", "signing", `${shown} signs with ${team}`);
    return report("hand", "signing", `${shown} has ${has ?? "no Team"}, the machine keeps ${team} — left alone`);
  }
  const expo = findFiles(root, (f) => f.endsWith("/app.json")).find((f) => readJson(f)?.expo?.ios);
  if (expo) {
    const has = readJson(expo).expo.ios.appleTeamId;
    if (has === team) return report("ok", "signing", `${home(relative(root, expo))} ios.appleTeamId is ${team}`);
    return report("hand", "signing", `${home(relative(root, expo))} ios.appleTeamId is ${has ?? "unset"} — set it to ${team}`);
  }
  report("hand", "signing", 'no xcconfig with #include? "Signing.local.xcconfig" and no Expo app.json — wire one, as the apple module says');
}

// Team IDs a project already signs with: xcconfigs, Xcode project files, Expo app.json.
function teamIdsIn(root) {
  const ids = new Set();
  for (const f of findFiles(root, (f) => f.endsWith(".xcconfig") || f.endsWith(".pbxproj") || f.endsWith("/app.json"))) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/(?:DEVELOPMENT_TEAM\s*=\s*"?|"appleTeamId"\s*:\s*")([A-Z0-9]{10})\b/g)) ids.add(m[1]);
  }
  return ids;
}

// A shallow walk: four levels, none of the directories that hold copies or builds.
function findFiles(root, want, depth = 4, out = []) {
  let entries = [];
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory() && !e.name.endsWith(".xcodeproj")) {
      if (depth > 0 && !SKIP_DIRS.has(e.name)) findFiles(p, want, depth - 1, out);
    } else if (e.isDirectory()) {
      const pbx = join(p, "project.pbxproj");
      if (existsSync(pbx) && want(pbx)) out.push(pbx);
    } else if (want(p)) out.push(p);
  }
  return out;
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

// Nothing else takes a project out of the registry: a path that is gone is
// skipped rather than dropped, since it may only be missing on this machine.
// So retiring a project — the archived AI valey stayed listed for three weeks
// after it was emptied — is a word somebody says, and this is where it is said.
if (args.includes("--forget")) {
  const target = args[args.indexOf("--forget") + 1];
  const reg = readJson(REGISTRY);
  if (!target || !Array.isArray(reg?.recipients)) {
    console.error(target ? `error: no registry at ${home(REGISTRY)}.` : "error: --forget needs the path to take out.");
    process.exit(2);
  }
  const keep = reg.recipients.filter((p) => expand(p) !== expand(target));
  if (keep.length === reg.recipients.length) {
    console.error(`error: ${target} is not in ${home(REGISTRY)}.`);
    process.exit(2);
  }
  writeFileSync(REGISTRY, JSON.stringify({ ...reg, recipients: keep }, null, 2) + "\n");
  console.log(`${home(expand(target))} taken out of ${home(REGISTRY)}. Its files are untouched.`);
  process.exit(0);
}

let roots = [process.cwd()];
if (all) {
  const reg = readJson(REGISTRY);
  if (!Array.isArray(reg?.recipients)) {
    console.error(`error: no registry at ${home(REGISTRY)}.`);
    process.exit(2);
  }
  // A path that is not on this machine is skipped silently, as in the sync.
  roots = reg.recipients.map(expand).filter((p) => existsSync(p));
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
