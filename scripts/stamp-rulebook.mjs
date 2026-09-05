#!/usr/bin/env node
/**
 * Writes `.claude/rulebook.json` — the record of what a project's AGENTS.md was
 * built from, and what each of its sections looked like at that moment.
 *
 * Anchors say *which* section is which across projects that renamed their
 * headings. This says *what the section held*, which is the other half: without
 * it, a section that differs from the template today is ambiguous — either
 * somebody edited it here, or the template moved on since. One is a candidate
 * for collection, the other for sync, and the diff looks identical.
 *
 * Usage, from the root of the project being stamped:
 *   node <skill>/scripts/stamp-rulebook.mjs [--basis install|adopted] [--check]
 *
 *   --basis install   the file was just assembled from the template (default)
 *   --basis adopted   the file predates stamping; its own text becomes the base
 *   --check           print what would change and write nothing; exit 1 if the
 *                     stamp is missing or stale
 *   --keep-commit     keep the template commit the stamp already records
 *
 * An `overrides` map already in the file is carried over untouched — see the
 * comment above the stamp object.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_OF, parseSections } from "./lib/sections.mjs";

const SKILL_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = ".claude/rulebook.json";


const args = process.argv.slice(2);
const check = args.includes("--check");
const keepCommit = args.includes("--keep-commit");
const basis = args.includes("--basis") ? args[args.indexOf("--basis") + 1] : "install";
if (!["install", "adopted"].includes(basis)) {
  console.error(`error: --basis must be 'install' or 'adopted', got '${basis}'.`);
  process.exit(2);
}

if (!existsSync("AGENTS.md")) {
  console.error("error: no AGENTS.md here. Run this from the project root.");
  process.exit(2);
}
const text = readFileSync("AGENTS.md", "utf8");
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;

// Parsing lives in lib/sections.mjs so the stamp, the sync and the rendered page
// read the file identically — hashing from the anchor, not the heading.
const parsed = parseSections(text);
if (parsed.sections.length === 0) {
  console.error("error: AGENTS.md carries no section anchors. Add them first —");
  console.error("       see 'Section anchors' in the template's tail.");
  process.exit(2);
}
const sections = {};
const local = [];
for (const s of parsed.sections) {
  if (s.id in sections) {
    console.error(`error: duplicate anchor '${s.kind}:${s.id}'.`);
    process.exit(2);
  }
  sections[s.id] = s.hash;
  if (s.kind === "local") local.push(s.id);
}

// Modules are inferred from what is present rather than asked for again: the
// file is the truth about itself, and a stamp that disagrees with it is worse
// than none.
const known = new Set(Object.values(MODULE_OF).flat());
const modules = Object.entries(MODULE_OF)
  .filter(([name, ids]) => name !== "core" && ids.some((id) => id in sections))
  .map(([name]) => name);
const unknown = Object.keys(sections).filter((id) => !known.has(id) && !local.includes(id));

/*
 * The recorded commit does double duty: it is the base for canon-to-canon diffs,
 * and a section the canon had at that commit but the project does not is read as
 * a refusal nobody needs reminding of. So moving it forward silently declines
 * everything the canon grew in between — fine when that is the intent, wrong when
 * the re-stamp was only to record an override or a hand-edit. `--keep-commit`
 * says "the base has not changed, only the file has".
 */
let commit = keepCommit ? previous?.commit ?? null : null;
if (!commit) {
  try {
    commit = execFileSync("git", ["-C", SKILL_ROOT, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    // The skill may not be a checkout; the stamp is still useful without it.
  }
}

/*
 * `overrides` is written by hand and preserved here, never derived: it names the
 * sections this project departs from on purpose, with the reason. A stamp says
 * what a section held; an override says the difference was a decision. Losing it
 * on a re-stamp would turn every declared deviation back into anonymous drift,
 * which is the thing the stamp exists to prevent.
 */
const overrides = previous?.overrides ?? null;
if (overrides) {
  const stray = Object.keys(overrides).filter((id) => !known.has(id));
  if (stray.length) {
    console.log(`overrides name sections the canon does not have: ${stray.join(", ")}`);
    console.log("Either the id is a typo, or the canon dropped the section and the note can go.");
  }
}

const stamp = {
  template: "agents-init",
  source: "https://github.com/xoyk/agents-rulebook",
  commit,
  stamped: new Date().toISOString().slice(0, 10),
  basis,
  modules,
  sections,
  ...(local.length ? { localSections: local } : {}),
  ...(overrides ? { overrides } : {}),
};

const serialised = JSON.stringify(stamp, null, 2) + "\n";

if (check) {
  const had = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
  if (!had) {
    console.error(`${OUT} is missing.`);
    process.exit(1);
  }
  const changed = Object.keys(sections).filter((id) => had.sections?.[id] !== sections[id]);
  const gone = Object.keys(had.sections ?? {}).filter((id) => !(id in sections));
  for (const id of changed) console.log(`edited since the stamp: ${id}`);
  for (const id of gone) console.log(`gone since the stamp:   ${id}`);
  if (!changed.length && !gone.length) console.log("stamp matches the file.");
  process.exit(changed.length || gone.length ? 1 : 0);
}

mkdirSync(".claude", { recursive: true });
writeFileSync(OUT, serialised);

console.log(`${OUT}: ${Object.keys(sections).length} sections, basis '${basis}'`);
if (keepCommit) console.log(`template commit kept at ${(commit ?? "none").slice(0, 7)}`);
console.log(`modules: ${modules.join(", ") || "core only"}`);
if (local.length) console.log(`local:   ${local.join(", ")}`);
if (overrides) console.log(`overrides kept: ${Object.keys(overrides).join(", ")}`);
if (unknown.length) {
  console.log(`\nnot in any module, and not marked local: ${unknown.join(", ")}`);
  console.log("Either they belong in the template, or they want a 'local:' prefix.");
}
