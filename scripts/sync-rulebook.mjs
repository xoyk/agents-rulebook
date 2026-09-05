#!/usr/bin/env node
/**
 * Reports how a project's AGENTS.md stands against the template it came from.
 *
 * The stamp written by `stamp-rulebook.mjs` records what each section looked
 * like when it arrived. With that base, a difference stops being ambiguous and
 * becomes a three-way question: did the canon move, did this copy move, or
 * both. Those have different answers — take the update, leave it alone, or read
 * both texts — and only the base tells them apart.
 *
 * Detection compares canon to canon (two revisions of the template) and copy to
 * copy (the file against its own stamp). It never compares the template's text
 * to the project's, because a filled-in `{{...}}` differs there by design.
 *
 * Reporting is the default and `--apply` is opt-in, because a rule arrives in a
 * project after a human has read the diff. What `--apply` automates is only the
 * mechanical half: a section the canon moved and this copy never touched, or one
 * the canon grew. It refuses `conflict` and anything declared an override, it
 * refuses text still carrying `{{...}}`, and it refuses to write over an
 * AGENTS.md with uncommitted changes — so what it did is always one `git diff`
 * away from being read and one `git checkout` away from being undone.
 *
 * Usage:
 *   node <skill>/scripts/sync-rulebook.mjs              # this project
 *   node <skill>/scripts/sync-rulebook.mjs --all        # every recipient
 *   node <skill>/scripts/sync-rulebook.mjs --diff       # show the canon diffs
 *   node <skill>/scripts/sync-rulebook.mjs --apply      # write update/new sections
 *
 * Exit code is 1 when any recipient has something to look at, so it can gate a
 * hook or a scheduled run.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SKILL_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/*
 * The registry names private working directories, so it lives outside the
 * repository — this one is public. Machine-local either way: a path that is not
 * on this machine is skipped, so one file serves every computer.
 */
const REGISTRY = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "agents-rulebook/recipients.json",
);
const TEMPLATES = [
  "templates/AGENTS.core.md",
  "modules/design-first/MODULE.md",
  "modules/release/MODULE.md",
  "modules/publishing/MODULE.md",
  "templates/AGENTS.tail.md",
];

const args = process.argv.slice(2);
const all = args.includes("--all");
const wantDiff = args.includes("--diff");
const apply = args.includes("--apply");

const ANCHOR = /^<!-- (rule|local):([a-z0-9-]+) -->$/gm;

/** Split anchored markdown into {id: {body, kind}}, hashed the way the stamp does. */
function split(text) {
  const marks = [...text.matchAll(ANCHOR)];
  const out = {};
  marks.forEach((m, i) => {
    const to = i + 1 < marks.length ? marks[i + 1].index : text.length;
    out[m[2]] = { kind: m[1], body: text.slice(m.index, to).trimEnd() };
  });
  return out;
}

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

function git(...argv) {
  return execFileSync("git", ["-C", SKILL_ROOT, ...argv], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"], // a missing path at a revision is an answer, not noise
  });
}

/** The canon's sections as of a revision. Missing files at that revision are skipped. */
function canonAt(rev) {
  const out = {};
  for (const path of TEMPLATES) {
    let text;
    try {
      text = git("show", `${rev}:agents-init/${path}`);
    } catch {
      try {
        text = git("show", `${rev}:${path}`);
      } catch {
        continue; // the module did not exist yet at that revision
      }
    }
    Object.assign(out, split(text));
  }
  return out;
}

/** One project's verdicts. Returns null when there is nothing to compare against. */
function examine(root) {
  const agents = join(root, "AGENTS.md");
  const stampPath = join(root, ".claude/rulebook.json");
  if (!existsSync(agents)) return { root, error: "no AGENTS.md" };
  if (!existsSync(stampPath)) return { root, error: "not stamped — run stamp-rulebook.mjs" };

  const stamp = JSON.parse(readFileSync(stampPath, "utf8"));
  if (!stamp.commit) return { root, error: "stamp records no template commit" };

  let base;
  try {
    base = canonAt(stamp.commit);
  } catch {
    return { root, error: `template commit ${stamp.commit.slice(0, 7)} is not in the skills checkout` };
  }
  const head = canonAt("HEAD");
  const mine = split(readFileSync(agents, "utf8"));

  const overrides = stamp.overrides ?? {};
  const rows = [];
  for (const id of new Set([...Object.keys(head), ...Object.keys(mine)])) {
    if (mine[id]?.kind === "local") continue; // never ours to touch

    // A declared override is a decision with a reason, not drift. It is reported
    // so it stays visible and never applied over, and it says when the canon has
    // moved underneath it — a deviation can outlive the thing it deviated from.
    if (id in overrides) {
      const moved = id in head && id in base && hash(base[id].body) !== hash(head[id].body);
      rows.push({ id, verdict: "override", reason: overrides[id], canonMoved: moved });
      continue;
    }

    const inCanon = id in head;
    const held = id in mine;
    const inBase = id in base;
    const canonMoved = inCanon && inBase && hash(base[id].body) !== hash(head[id].body);
    const stamped = stamp.sections?.[id];
    const localMoved = held && stamped !== undefined && hash(mine[id].body) !== stamped;

    if (!held) {
      // A section the canon has and this project does not. Two different
      // silences: one the project chose, one it has not heard about yet. If the
      // section already stood in the canon when this copy was stamped, its
      // absence is a decision — release sections on a project with no store,
      // say — and reporting it every run trains the reader to skip the report.
      // Only a section that appeared *since* the stamp is news.
      if (inBase) continue;
      const modules = new Set(stamp.modules ?? []);
      const own = moduleOf(id);
      if (own === "core" || modules.has(own)) rows.push({ id, verdict: "new" });
      continue;
    }
    if (!inCanon) {
      rows.push({ id, verdict: stamped === undefined ? "unstamped" : "dropped-from-canon" });
      continue;
    }
    if (!inBase) {
      // The copy carried this section before the canon did — it is where the
      // rule was harvested from. There is nothing to take, and calling it an
      // update would point the arrow backwards.
      rows.push({ id, verdict: "predates-canon" });
      continue;
    }
    if (canonMoved && localMoved) rows.push({ id, verdict: "conflict" });
    else if (canonMoved) rows.push({ id, verdict: "update" });
    else if (localMoved) rows.push({ id, verdict: "ours" });
  }

  return { root, stamp, rows };
}

const MODULE_OF = {
  "design-first": ["design-first", "wip-section", "archiving", "placement",
                   "painting", "design-file-shared"],
  release: ["release-notes", "release-tree", "build-numbers",
            "finishing-release", "pushing"],
  publishing: ["publishing", "publishing-is-overwriting", "public-invented-data"],
};
function moduleOf(id) {
  for (const [name, ids] of Object.entries(MODULE_OF)) if (ids.includes(id)) return name;
  return "core";
}

function recipients() {
  if (!existsSync(REGISTRY)) {
    console.error(`error: no ${REGISTRY}. Create it, or run without --all:`);
    console.error('       {"recipients": ["~/Projects/some-project"]}');
    process.exit(2);
  }
  const list = JSON.parse(readFileSync(REGISTRY, "utf8")).recipients ?? [];
  return list.map((p) => resolve(p.replace(/^~(?=\/)|^\$HOME(?=\/)/, homedir())));
}

const LABEL = {
  update: "canon moved, this copy did not — take it",
  conflict: "both moved — read both texts",
  ours: "this copy moved, canon did not — yours to keep or to offer",
  new: "canon grew a section since this copy was stamped",
  "predates-canon": "this copy had the section before the canon did — nothing to take",
  "dropped-from-canon": "canon no longer carries this section",
  unstamped: "section is newer than the stamp — restamp",
  override: "this project departs from the canon on purpose",
};
const ACTIONABLE = new Set(["update", "conflict", "new"]);
const WRITABLE = new Set(["update", "new"]);

const targets = all ? recipients() : [process.cwd()];
let anything = false;

for (const root of targets) {
  const short = root.replace(homedir(), "~");
  if (!existsSync(root)) {
    console.log(`${short}\n  not on this machine — skipped\n`);
    continue;
  }
  const r = examine(root);
  if (r.error) {
    console.log(`${short}\n  ${r.error}\n`);
    anything = true;
    continue;
  }
  const groups = {};
  for (const row of r.rows) (groups[row.verdict] ??= []).push(row.id);

  const head = git("rev-parse", "--short", "HEAD").trim();
  const from = r.stamp.commit.slice(0, 7);
  console.log(`${short}  (stamped at ${from}, canon at ${head})`);
  if (!r.rows.length) {
    console.log("  in step with the canon\n");
    continue;
  }
  for (const [verdict, ids] of Object.entries(groups)) {
    console.log(`  ${verdict}: ${ids.join(", ")}`);
    console.log(`    ${LABEL[verdict]}`);
    if (verdict === "override") {
      for (const row of r.rows.filter((x) => x.verdict === "override")) {
        const note = row.canonMoved ? "  [canon moved since the stamp — worth re-reading]" : "";
        console.log(`      ${row.id}: ${row.reason}${note}`);
      }
    }
    if (ACTIONABLE.has(verdict)) anything = true;
  }
  if (apply) {
    const written = applyTo(root, r, canonAt("HEAD"));
    if (written.length) {
      console.log(`  applied: ${written.join(", ")}`);
      restamp(root, r.stamp);
    }
  }
  if (wantDiff) {
    const ids = [...(groups.update ?? []), ...(groups.conflict ?? []), ...(groups.new ?? [])];
    for (const id of ids) {
      console.log(`\n  --- canon diff for ${id} (${from}..${head}) ---`);
      const base = canonAt(r.stamp.commit)[id];
      const now = canonAt("HEAD")[id];
      console.log(unified(base?.body ?? "", now?.body ?? "").replace(/^/gm, "  "));
    }
  }
  console.log();
}

/**
 * Writes the sections that are safe to write, one at a time, re-reading the file
 * between each so positions never go stale. Everything it declines to do, it says
 * out loud: a silent skip here reads as "applied" and is how a project ends up
 * believing it carries a rule it does not.
 */
function applyTo(root, r, head) {
  const path = join(root, "AGENTS.md");
  const dirty = (() => {
    try {
      return execFileSync("git", ["-C", root, "status", "--porcelain", "--", "AGENTS.md"], {
        encoding: "utf8",
      }).trim().length > 0;
    } catch {
      return false; // not a checkout: nothing to protect, nothing to promise
    }
  })();
  if (dirty) {
    console.log("  --apply declined: AGENTS.md has uncommitted changes.");
    console.log("    Commit or discard them first — an applied rule has to be readable as its own diff.");
    return [];
  }

  const order = Object.keys(head);
  const done = [];
  for (const row of r.rows.filter((x) => WRITABLE.has(x.verdict))) {
    const incoming = head[row.id]?.body;
    if (!incoming) continue;
    if (/\{\{/.test(incoming)) {
      console.log(`  --apply skipped ${row.id}: the canon text still carries {{...}} to fill by hand.`);
      continue;
    }
    const text = readFileSync(path, "utf8");
    const marks = [...text.matchAll(new RegExp(ANCHOR.source, "gm"))];
    const at = (id) => marks.findIndex((m) => m[2] === id);

    if (row.verdict === "update") {
      const i = at(row.id);
      if (i === -1) continue;
      const from = marks[i].index;
      const to = i + 1 < marks.length ? marks[i + 1].index : text.length;
      const tail = to < text.length ? "\n\n" : "\n";
      writeFileSync(path, text.slice(0, from) + incoming + tail + text.slice(to));
      done.push(row.id);
      continue;
    }

    // A new section goes where the canon keeps it: after the nearest preceding
    // canon section this file actually has, or before the nearest following one.
    // Appending everything to the end would order the file by the order updates
    // happened to arrive, which is no order at all.
    const idx = order.indexOf(row.id);
    let insertAt = null;
    for (let k = idx - 1; k >= 0 && insertAt === null; k--) {
      const i = at(order[k]);
      if (i !== -1) insertAt = i + 1 < marks.length ? marks[i + 1].index : text.length;
    }
    for (let k = idx + 1; k < order.length && insertAt === null; k++) {
      const i = at(order[k]);
      if (i !== -1) insertAt = marks[i].index;
    }
    if (insertAt === null) insertAt = text.length;
    const block = incoming + (insertAt < text.length ? "\n\n" : "\n");
    const head_ = text.slice(0, insertAt);
    writeFileSync(path, head_ + (head_.endsWith("\n\n") || head_ === "" ? "" : "\n") + block + text.slice(insertAt));
    done.push(row.id);
  }
  return done;
}

/** The stamp is derived from the file, so a write that skips it leaves a lie behind. */
function restamp(root, stamp) {
  const script = join(SKILL_ROOT, "scripts/stamp-rulebook.mjs");
  const out = execFileSync(process.execPath, [script, "--basis", stamp.basis ?? "install"], {
    cwd: root,
    encoding: "utf8",
  });
  console.log(out.trim().replace(/^/gm, "  "));
}

/** A plain line diff — enough to read a rule change, with no dependency. */
function unified(a, b) {
  const A = a.split("\n");
  const B = b.split("\n");
  const out = [];
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) {
      out.push(`  ${A[i]}`);
      i++;
      j++;
    } else if (j < B.length && !A.slice(i).includes(B[j])) {
      out.push(`+ ${B[j]}`);
      j++;
    } else if (i < A.length) {
      out.push(`- ${A[i]}`);
      i++;
    } else {
      out.push(`+ ${B[j]}`);
      j++;
    }
  }
  return out.join("\n");
}

process.exit(anything ? 1 : 0);
