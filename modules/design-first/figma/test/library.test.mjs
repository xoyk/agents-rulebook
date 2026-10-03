// The library's masters live in spec.json so anybody can rebuild them; these
// check, without Figma, that the spec is whole and that what bundle.mjs hands to
// use_figma would run. Building it in Figma for real is the procedure's last
// step, and its round trip — dump the rebuilt file, diff with spec.json — is what
// proved the builder on 2026-10-03.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..");
const kit = join(dir, "../../..");
const spec = JSON.parse(readFileSync(join(dir, "spec.json"), "utf8"));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const bundle = (...args) => execFileSync(process.execPath, [join(dir, "bundle.mjs"), ...args], { encoding: "utf8" });

function* walk(n) {
  yield n;
  for (const k of n.kids || []) yield* walk(k);
}

test("every master a spec names is in the spec", () => {
  const ids = new Set();
  for (const m of spec.masters) for (const n of walk(m)) if (n.id) ids.add(n.id);
  const refs = [];
  for (const m of spec.masters) {
    for (const n of walk(m)) {
      if (n.ref) refs.push(n.ref);
      for (const v of Object.values(n.props || {})) if (v && v.ref) refs.push(v.ref);
      for (const d of n.defs || []) if (d.value && d.value.ref) refs.push(d.value.ref);
    }
  }
  assert.ok(refs.length > 0);
  assert.deepEqual(refs.filter((r) => !ids.has(r)), []);
});

test("every variable a paint is bound to is declared", () => {
  const declared = new Set(spec.collections.flatMap((c) => c.vars.map((v) => `${c.name}/${v.name}`)));
  const used = new Set();
  for (const m of spec.masters) for (const n of walk(m)) for (const p of [...(n.fills || []), ...(n.strokes || [])]) if (p.v) used.add(p.v);
  assert.deepEqual([...used].filter((v) => !declared.has(v)), []);
});

test("a master is built before anything that uses it", () => {
  const order = new Map();
  spec.masters.forEach((m, i) => { for (const n of walk(m)) if (n.id) order.set(n.id, i); });
  spec.masters.forEach((m, i) => {
    for (const n of walk(m)) {
      const refs = [n.ref, ...Object.values(n.props || {}).map((v) => v && v.ref), ...(n.defs || []).map((d) => d.value && d.value.ref)].filter(Boolean);
      for (const r of refs) assert.ok(order.get(r) <= i, `${m.n} uses ${r} before it is built`);
    }
  });
});

test("the whole library goes in one call, and it parses", () => {
  const n = bundle("--list").trim().split("\n").length;
  assert.equal(n, spec.masters.length + 1);
  const code = bundle(`0-${n - 1}`);
  assert.ok(code.length <= 48000, `${code.length} characters`);
  new AsyncFunction("figma", code);
  assert.match(bundle("0-1", "--page", "Kit"), /\\"page\\":\\"Kit\\"/);
});

test("bundle.mjs and build.js agree on the checksum", () => {
  const build = readFileSync(join(dir, "build.js"), "utf8");
  const line = build.split("\n").find((l) => l.startsWith("const fnv ="));
  const fnv = new Function(`${line}; return fnv;`)();
  const code = bundle("0-2");
  const parts = JSON.parse(code.slice(code.indexOf("["), code.indexOf(";\nconst REFS")));
  for (const [text, sum] of parts) assert.equal(fnv(text), sum);
});

test("the launch board is built from every step of LAUNCH.md", async () => {
  const plan = readFileSync(join(kit, "skills/project-launch/LAUNCH.md"), "utf8");
  const { phases } = await import(join(kit, "skills/project-launch/board.mjs"));
  const steps = phases(plan).reduce((n, p) => n + p.steps.length, 0);
  assert.equal(steps, (plan.match(/^- \[[ x]\] \*\*/gm) || []).length);
  assert.ok(phases(plan).every((p) => p.steps.every((s) => ["you", "agent", "both"].includes(s.o))), "every step has an owner");
  const code = execFileSync(process.execPath, [join(kit, "skills/project-launch/board.mjs")], { encoding: "utf8" });
  new AsyncFunction("figma", code);
});
