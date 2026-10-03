// The guard against publishing one person's things, run on throwaway
// repositories. Every leak below is assembled from pieces at run time, so this
// file itself carries nothing the guard would stop.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = resolve(dirname(fileURLToPath(import.meta.url)), "../privacy-guard.mjs");

function repo(files, { words } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "guard-"));
  const home = join(dir, "home");
  const work = join(dir, "work");
  mkdirSync(join(home, ".config/agents-rulebook"), { recursive: true });
  mkdirSync(work);
  if (words) writeFileSync(join(home, ".config/agents-rulebook/private-words.txt"), `# test\n${words.join("\n")}\n`);
  const env = {
    PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: join(home, ".config"),
    GIT_CONFIG_GLOBAL: join(home, ".gitconfig"),
    GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com",
  };
  const git = (...a) => execFileSync("git", a, { cwd: work, env, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  for (const [name, text] of Object.entries(files)) writeFileSync(join(work, name), text);
  git("add", "-A");
  git("commit", "-q", "-m", "one");
  return { work, env, git };
}

const guard = ({ work, env }, args = [], input) =>
  spawnSync(process.execPath, [GUARD, ...args], { cwd: work, env, input, encoding: "utf8" });

const home = "/" + "Users/" + "alice/Projects/secret";
const figma = "figma.com/" + "design/" + "AbCdEfGhIjKlMnOpQrStUv";
const token = "figd" + "_" + "x".repeat(24);
const team = "DEVELOPMENT_TEAM" + " = " + "ABCDE12345";

test("a clean tree passes", () => {
  const r = repo({ "README.md": "Nothing here but ~/.config/agents-rulebook and /Users/<you>/ placeholders.\n" });
  const out = guard(r);
  assert.equal(out.status, 0, out.stdout);
});

test("paths, Figma files, tokens and Apple Teams are stopped", () => {
  const r = repo({ "notes.md": `${home}\nsee ${figma}\n${token}\n${team}\n` });
  const out = guard(r);
  assert.equal(out.status, 1);
  for (const kind of ["a home directory", "a Figma file link", "a Figma token", "an Apple Team ID"]) {
    assert.match(out.stdout, new RegExp(kind), kind);
  }
  assert.doesNotMatch(out.stdout, /x{20}/, "a token is printed masked, not whole");
});

test("a stop-listed name is stopped wherever it is, and the list stays off the repository", () => {
  const r = repo({ "story.md": "On Monday the Zanzibar team asked for it.\n" }, { words: ["zanzibar"] });
  const out = guard(r);
  assert.equal(out.status, 1);
  assert.match(out.stdout, /story\.md:1 {2}a word on the stop-list/);
});

test("without a stop-list the shapes are still checked, and the run says so", () => {
  const r = repo({ "a.md": "fine\n" });
  const out = guard(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /no stop-list/);
});

test("as a pre-push hook it reads the commit messages being pushed", () => {
  const r = repo({ "a.md": "fine\n" }, { words: ["zanzibar"] });
  writeFileSync(join(r.work, "b.md"), "still fine\n");
  r.git("add", "-A");
  r.git("commit", "-q", "-m", "work for Zanzibar");
  const sha = r.git("rev-parse", "HEAD").trim();
  const first = r.git("rev-parse", "HEAD~1").trim();
  const out = guard(r, ["--pre-push"], `refs/heads/main ${sha} refs/heads/main ${first}\n`);
  assert.equal(out.status, 1, out.stdout);
  assert.match(out.stdout, /commit [0-9a-f]+:1 {2}a word on the stop-list/);
});

test("an SSH remote is not an email address", () => {
  const r = repo({ "a.md": "git clone git" + "@github.com:someone/thing.git\n" });
  assert.equal(guard(r).status, 0);
});
