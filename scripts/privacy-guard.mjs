#!/usr/bin/env node
/**
 * Refuses to let this public repository publish what belongs to one person:
 * their machine's paths, their Figma files and team, their tokens and Apple
 * Team, their clients' names. Run by the pre-push hook in .githooks/, and by hand.
 *
 *   node scripts/privacy-guard.mjs                 # the tree at HEAD
 *   node scripts/privacy-guard.mjs --range a..b    # and the messages of the commits in a..b
 *   node scripts/privacy-guard.mjs --pre-push      # as git's pre-push hook: reads the refs on stdin
 *
 * What it looks for is in PATTERNS below — shapes, so it holds for anybody.
 * Names are the other half and cannot live here, because writing them down here
 * would publish them: they are read from a stop-list on this machine, one word
 * or phrase per line, `#` for comments:
 *
 *   ~/.config/agents-rulebook/private-words.txt
 *
 * No stop-list is not an error: the shapes are still checked, and the run says
 * the names were not.
 *
 * Exit code: 0 clean, 1 something found, 2 could not run.
 *
 * Why: on 2026-10-02 this repository's main had to be rewritten and force-pushed
 * to take private working directories out of a story in the README. Nothing had
 * stopped them going out; this does.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "agents-rulebook");
const STOP_LIST = join(CONFIG, "private-words.txt");
const ZERO = /^0+$/;

// A placeholder in angle brackets — /Users/<you>/ — is a format being shown,
// not a leak, and is allowed through.
const PATTERNS = [
  { kind: "a home directory", re: /\/(?:Users|home)\/(?!<)[A-Za-z0-9._-]+\//g },
  { kind: "a Figma file link", re: /figma\.com\/(?:file|design|board|proto|slides)\/[A-Za-z0-9]{15,}/g },
  { kind: "a Figma file key", re: /"(?:file|fileKey|file_key)"\s*:\s*"[A-Za-z0-9]{20,}"/g },
  { kind: "a Figma team or plan", re: /\b(?:team|organization)::\d{6,}/g },
  { kind: "a Figma token", re: /\bfigd_[A-Za-z0-9_-]{10,}/g },
  { kind: "a GitHub token", re: /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/g },
  { kind: "an Apple Team ID", re: /(?:DEVELOPMENT_TEAM\s*=\s*|"teamId"\s*:\s*"|appleTeamId"\s*:\s*")[A-Z0-9]{10}\b/g },
  // git@host is an SSH remote, not a person.
  { kind: "an email address", re: /\b(?!git@)[A-Za-z0-9._%+-]+@(?!example\.(?:com|org)\b|anthropic\.com\b|users\.noreply\.github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
];

function git(args, input) {
  return execFileSync("git", args, { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
}

function stopWords() {
  if (!existsSync(STOP_LIST)) return null;
  return readFileSync(STOP_LIST, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean);
}

function scan(text, where, words, found) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const { kind, re } of PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) found.push({ where: `${where}:${i + 1}`, kind, hit: m[0] });
    }
    for (const w of words || []) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");
      if (re.test(line)) found.push({ where: `${where}:${i + 1}`, kind: "a word on the stop-list", hit: w });
    }
  });
}

function scanTree(rev, words, found) {
  const paths = git(["ls-tree", "-r", "--name-only", rev]).split("\n").filter(Boolean);
  for (const p of paths) {
    const blob = execFileSync("git", ["show", `${rev}:${p}`], { maxBuffer: 64 * 1024 * 1024 });
    if (blob.includes(0)) continue; // binary
    scan(blob.toString("utf8"), p, words, found);
  }
}

function scanMessages(range, words, found) {
  const out = git(["log", "--format=%h%x00%B%x01", ...range]);
  for (const entry of out.split("\x01")) {
    const [hash, body] = entry.replace(/^\n/, "").split("\x00");
    if (hash && body) scan(body, `commit ${hash}`, words, found);
  }
}

function mask(hit) {
  return hit.length <= 8 ? hit : `${hit.slice(0, 6)}…${hit.slice(-2)}`;
}

function main() {
  const argv = process.argv.slice(2);
  const words = stopWords();
  const found = [];
  if (argv[0] === "--pre-push") {
    const input = readFileSync(0, "utf8").trim();
    for (const line of input.split("\n").filter(Boolean)) {
      const [, localSha, , remoteSha] = line.split(/\s+/);
      if (ZERO.test(localSha)) continue; // a deletion publishes nothing
      scanTree(localSha, words, found);
      scanMessages(ZERO.test(remoteSha) ? [localSha, "--not", "--remotes"] : [`${remoteSha}..${localSha}`], words, found);
    }
  } else {
    scanTree("HEAD", words, found);
    const i = argv.indexOf("--range");
    if (i !== -1) scanMessages([argv[i + 1]], words, found);
  }
  if (!words) console.log(`note: no stop-list at ${STOP_LIST.replace(homedir(), "~")} — names were not checked, only shapes.`);
  if (!found.length) {
    console.log("privacy-guard: nothing private found.");
    return 0;
  }
  console.log(`privacy-guard: ${found.length} thing(s) that look private — nothing was pushed.\n`);
  for (const f of found) console.log(`  ${f.where}  ${f.kind}: ${mask(f.hit)}`);
  console.log("\nTake them out, or replace them with a placeholder in angle brackets, and push again.");
  return 1;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error(`privacy-guard could not run: ${e.message.split("\n")[0]}`);
  process.exitCode = 2;
}
