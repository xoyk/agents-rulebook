#!/usr/bin/env node
/**
 * Brings a worktree's rulebook up to its project's copy, in projects where the
 * rulebook is kept out of git.
 *
 * A tracked AGENTS.md needs none of this: it travels with branches. An ignored
 * one reaches a worktree as a copy made when the tree was created, and goes
 * stale the first time the project's copy changes. On 12 September 2026 one
 * project had eighteen worktrees; eleven carried a stale copy, six had none.
 *
 * The obvious fix is a symlink to the project's copy, and it does not work.
 * Claude Code does not load an instruction file that resolves outside the
 * project it runs in: seventeen worktrees were linked that day, and the next
 * session in one of them started with no rulebook at all. Measured on Claude
 * Code 2.1.263: a plain file, a link into the project's own tree and a hard
 * link all load; a link out of the tree and an absolute `@/path` import do not.
 * A hard link loads but does not last — Claude Code's Edit saves by replacing
 * the file, and the next edit of the project's copy leaves every worktree
 * holding the old inode. So a worktree keeps a real copy, and this script
 * keeps the copy current, from two hooks:
 *
 * - **PostToolUse on Edit|Write.** When the project's own AGENTS.md is edited,
 *   every worktree is refreshed on the spot, so the next session anywhere starts
 *   on the new text.
 * - **SessionStart.** Catches what the first hook cannot see — an edit made in
 *   an editor, or by `sync-rulebook.mjs --apply`. It cannot win the race with
 *   the instructions, though: Claude Code loads them while SessionStart hooks
 *   run, and a hook that took a second lost every time it was measured. What a
 *   SessionStart hook does get is its stdout into the session's context, and
 *   that is awaited. So when it had to replace AGENTS.md it says so, and the
 *   session re-reads the file instead of working from the old text.
 *
 * Usage:
 *   node <skill>/scripts/refresh-worktree.mjs          # the worktree you are in
 *   node <skill>/scripts/refresh-worktree.mjs --all    # every worktree of this repository
 *   node <skill>/scripts/refresh-worktree.mjs --dry    # say what would change, write nothing
 *   node <skill>/scripts/refresh-worktree.mjs --hook   # either hook: the event on stdin, never fails
 *
 * A file is refreshed only where the project decided to keep it out of git:
 * untracked in the worktree *and* ignored there. A tracked file follows its
 * branch, and an untracked file that is not ignored would appear in somebody's
 * `git status` — neither is this script's to write. A copy that differed is
 * saved to ~/.config/agents-rulebook/worktree-copies/<tree>/ before it is
 * replaced: the worktree's copy is not a place to edit the rulebook, but an edit
 * made there anyway should be recoverable rather than silently gone.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const FILES = ["AGENTS.md", "CLAUDE.md", ".claude/rulebook.json"];
const BACKUP = join(homedir(), ".config", "agents-rulebook", "worktree-copies");

const args = process.argv.slice(2);
const hook = args.includes("--hook");
const dry = args.includes("--dry");
const all = args.includes("--all");

const git = (cwd, ...a) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const tryGit = (cwd, ...a) => { try { return git(cwd, ...a); } catch { return null; } };
const present = (p) => { try { lstatSync(p); return true; } catch { return false; } };
const say = (line) => (hook ? process.stderr : process.stdout).write(line + "\n");

function main() {
  let cwd = process.cwd();
  let edited = null; // PostToolUse: the file that was just written
  if (hook) {
    let ev = {};
    try { ev = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { /* not ours */ }
    cwd = ev.cwd || cwd;
    if (ev.hook_event_name === "PostToolUse") {
      edited = ev.tool_input?.file_path || ev.tool_response?.filePath || "";
      if (!FILES.some((f) => edited.endsWith("/" + f))) return;
      cwd = dirname(edited);
    }
  }
  const top = tryGit(cwd, "rev-parse", "--show-toplevel");
  if (!top) { if (!hook) say("not inside a git repository"); return; }

  // The first entry of `worktree list` is the main checkout: the project copy.
  const trees = git(top, "worktree", "list", "--porcelain").split("\n\n")
    .map((b) => b.match(/^worktree (.+)$/m)?.[1]).filter(Boolean);
  const [project, ...others] = trees;
  // An edit of the project's own copy fans out to every worktree; an edit made
  // inside a worktree is left alone — that copy is not where the rulebook lives.
  if (edited && top !== project) return;
  const fanOut = all || !!edited;
  const targets = fanOut ? others.filter((t) => existsSync(t)) : top === project ? [] : [top];
  if (!targets.length && !hook) say(all ? "no worktrees" : "this is the main checkout — nothing to refresh from");

  let changed = 0;
  let rulesReplaced = false;
  for (const tree of targets) {
    for (const f of FILES) {
      const source = join(project, f), dest = join(tree, f);
      if (!existsSync(source)) continue;
      if (tryGit(tree, "ls-files", "--error-unmatch", "--", f) !== null) continue; // tracked: follows its branch
      if (tryGit(tree, "check-ignore", "-q", "--", f) === null) continue;          // not ignored: not ours to write
      const isLink = present(dest) && lstatSync(dest).isSymbolicLink();
      const want = readFileSync(source);
      if (!isLink && present(dest) && readFileSync(dest).equals(want)) continue;
      const why = isLink ? "was a link" : present(dest) ? "was stale" : "was missing";
      changed++;
      say(`${basename(tree)}: ${f} ${why}${dry ? " — would refresh" : " — refreshed"}`);
      if (dry) continue;
      if (present(dest)) {
        if (!isLink) {
          const saved = join(BACKUP, basename(tree), f);
          mkdirSync(dirname(saved), { recursive: true });
          copyFileSync(dest, saved);
        }
        rmSync(dest);
      }
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(source, dest);
      if (f !== ".claude/rulebook.json") rulesReplaced = true;
    }
  }
  if (!hook && targets.length && !changed) say("up to date");
  // SessionStart stdout lands in the session's context. The instructions were
  // probably loaded from the old file, so the session is told to read it again.
  if (hook && !edited && rulesReplaced) {
    process.stdout.write(
      "This worktree's AGENTS.md was out of date and has just been replaced with the project's current copy. " +
      "The instructions loaded at the start of this session may be the old text: read ./AGENTS.md again before relying on them.\n",
    );
  }
}

try { main(); } catch (e) {
  // A hook must never stand between the user and their session.
  if (!hook) { console.error(e.message); process.exit(1); }
}
