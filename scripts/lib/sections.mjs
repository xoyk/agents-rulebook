/**
 * The one reading of AGENTS.md that every script here shares: where a section
 * starts and ends, what it is called, and what it hashes to.
 *
 * A section runs from its anchor to the next one, or to the end of the file.
 * Hashing from the anchor rather than from the heading means a heading renamed
 * to suit the project registers as an edit — which it is, and which the reader
 * of a diff wants to see. The stamp, the sync and the rendered page must agree
 * on this to the byte, so it lives in one place.
 */
import { createHash } from "node:crypto";

/** Which module each canonical id belongs to. Ids absent here are unknown. */
export const MODULE_OF = {
  core: ["reporting-back", "honest-reporting", "agent-names", "backlog",
         "parallel-work", "worktree-limits", "commits", "pushing",
         "merge-and-release", "user-only", "extending", "section-anchors",
         "canon-precedence"],
  "design-first": ["design-first", "wip-section", "archiving", "placement",
                   "painting", "design-file-shared"],
  release: ["release-notes", "release-tree", "build-numbers",
            "finishing-release"],
  publishing: ["publishing", "publishing-is-overwriting", "public-invented-data"],
};

export const ANCHOR = /^<!-- (rule|local):([a-z0-9-]+) -->$/gm;

export const hashSection = (body) =>
  createHash("sha256").update(body).digest("hex").slice(0, 12);

/**
 * Returns { preamble, sections }, sections in file order:
 *   { kind: "rule"|"local", id, body, from, to, hash }
 * `body` starts at the anchor line and is right-trimmed, exactly what the stamp
 * hashes. Duplicate anchors are left to the caller to reject.
 */
export function parseSections(text) {
  const marks = [...text.matchAll(ANCHOR)];
  const sections = marks.map((m, i) => {
    const from = m.index;
    const to = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const body = text.slice(from, to).trimEnd();
    return { kind: m[1], id: m[2], body, from, to, hash: hashSection(body) };
  });
  const preamble = marks.length ? text.slice(0, marks[0].index) : text;
  return { preamble, sections };
}

export function moduleOf(id) {
  for (const [name, ids] of Object.entries(MODULE_OF)) if (ids.includes(id)) return name;
  return null;
}
