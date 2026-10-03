#!/usr/bin/env node
/**
 * Prints the code for one call of build.js: one part of spec.json, its
 * checksum, and the names of every master, followed by build.js itself.
 *
 *   node bundle.mjs --list      # the parts, in the order they must run
 *   node bundle.mjs <n>         # the code to pass to use_figma for part n
 *   node bundle.mjs <a>-<b>     # parts a to b in one call, while it stays under the tool's limit
 *   … --page Kit                # build onto another page: a project with no library builds
 *                               # the masters into its own file's Kit page
 *
 * Part 0 is the variables; every other part is one master. A whole spec in one
 * call would be more than the tool takes and more than anyone can pass along
 * without a slip, so it goes a master at a time, each one checked on arrival.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, "spec.json"), "utf8"));
const build = readFileSync(join(here, "build.js"), "utf8");

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };

const pageAt = process.argv.indexOf("--page");
const page = pageAt === -1 ? spec.page : process.argv[pageAt + 1];
const refs = {};
for (const m of spec.masters) {
  refs[m.id] = m.n;
  if (m.t === "COMPONENT_SET") for (const v of m.kids) refs[v.id] = `${m.n} :: ${v.n}`;
}
const parts = [
  { label: "variables", text: JSON.stringify({ page, collections: spec.collections }) },
  ...spec.masters.map((m) => ({ label: m.n, text: JSON.stringify({ page, master: m }) })),
];

const arg = process.argv[2];
if (arg === "--list" || arg === undefined) {
  parts.forEach((p, i) => console.log(`${i}\t${p.label}\t${p.text.length} chars`));
  process.exit(0);
}
const [a, b = a] = arg.split("-").map(Number);
if (![a, b].every((n) => Number.isInteger(n) && parts[n]) || b < a) {
  console.error(`No parts ${arg}; there are ${parts.length} (0–${parts.length - 1}). See --list.`);
  process.exit(2);
}
const chosen = parts.slice(a, b + 1).map((p) => [p.text, fnv(p.text)]);
const code = `const PARTS = ${JSON.stringify(chosen)};\nconst REFS = ${JSON.stringify(refs)};\n\n${build}`;
// use_figma takes at most 50,000 characters of code.
if (code.length > 48000) {
  console.error(`Parts ${arg} come to ${code.length} characters, more than one call takes; split the range.`);
  process.exit(2);
}
process.stdout.write(code);
