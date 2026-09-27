#!/usr/bin/env node

/*
 * What the person reviewing the WIP page has said since the last look, read
 * from the two places they say it: the Ready for dev flag on a section, and
 * comments framed around a frame. Run it at the start of any session that
 * touches design, before changing a section — see MODULE.md, "Approval is a
 * flag, a choice is a framed comment".
 *
 *   node <skill>/modules/design-first/scripts/figma-inbox.mjs            every section on the WIP page
 *   node <skill>/modules/design-first/scripts/figma-inbox.mjs 50:1478    just these sections
 *
 * For each section it prints the state its name claims, the flag Figma holds,
 * what follows from the two together, and every open comment with the frames
 * its frame covers — as letters, A1, B2m, the way the Brief and the captions
 * refer to them.
 *
 * Why REST: the plugin API has no comments at all, and answers
 * `"devStatus" is not a supported API` for the flag.
 *
 * A comment's frame is stored as an offset from a node plus a size and the
 * corner its pin sits on — and the offset is that corner, not the top left.
 * Read as the top left, a frame drawn around A1 in 4FH on 28 September 2026
 * landed on B2, and a choice of option A was reported as B. The offset is also
 * measured against the node as it is now, so a section rebuilt after the
 * comment was left moves the frame with it: read the inbox before editing.
 *
 * --from <dir> reads saved answers instead of the network: file.json (the file
 * read two levels deep), nodes.json (the sections, full depth) and
 * comments.json. That is how it is tested.
 *
 * Exits 0 after printing, 2 when it could not run. Nothing here gates anything:
 * it is an inbox, and what it reports is for the agent to act on or ask about.
 */

import { FIGMA_CONFIG, SAVED, flagValue, figmaGet, readSaved } from './figma-rest.mjs';

const VALUE_FLAGS = new Set(['--file', '--from']);
const WIP = FIGMA_CONFIG.wip ?? {};
const PAGE = WIP.page ?? 'WIP';

function sectionIdArgs() {
  const ids = [];
  for (let i = 2; i < process.argv.length; i += 1) {
    if (VALUE_FLAGS.has(process.argv[i])) { i += 1; continue; }
    ids.push(process.argv[i].replace('-', ':'));
  }
  return ids;
}

/* The WIP page may live in a file of its own; --file still wins over both. */
const fileKey = () => flagValue('--file') ?? WIP.file ?? undefined;

async function load(name, path, what) {
  if (SAVED) {
    const body = readSaved(name);
    if (!body) throw new Error(`--from ${SAVED}: no readable ${name} there.`);
    return body;
  }
  return figmaGet(path, what, fileKey());
}

/* ---------- the canvas ---------- */

const STATES = ['🟡', '🔵', '🟢', '🧪', '⏸️', '🧩'];
const stateOf = (name) => STATES.find((s) => name.startsWith(s)) ?? null;

/* A1, B2m, C3 — the letter is the row, the number the step, m the phone twin. */
const FRAME_CODE = /^([A-Z])(\d+)(m?)(?=$|[\s·.:—-])/u;
const REJECTED_ROW = /^🧪\s*([A-Z])\b/u;

function indexSection(section) {
  const byId = new Map();
  const frames = [];
  const rows = new Set();
  const rejected = new Set();
  (function walk(node) {
    byId.set(node.id, node);
    const code = node.name.match(FRAME_CODE);
    if (code && node.absoluteBoundingBox && node.type !== 'TEXT') {
      frames.push({ code: code[0], row: code[1], box: node.absoluteBoundingBox });
      rows.add(code[1]);
    }
    const text = node.type === 'TEXT' ? node.characters ?? '' : node.name;
    const lost = text.match(REJECTED_ROW);
    if (lost) rejected.add(lost[1]);
    for (const child of node.children ?? []) walk(child);
  })(section);
  return { section, byId, frames, rows, rejected };
}

const contains = (box, x, y) =>
  x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

function overlapShare(frame, r) {
  const w = Math.min(r.x + r.width, frame.x + frame.width) - Math.max(r.x, frame.x);
  const h = Math.min(r.y + r.height, frame.y + frame.height) - Math.max(r.y, frame.y);
  return w > 0 && h > 0 ? (w * h) / (frame.width * frame.height) : 0;
}

/* ---------- where a comment points ---------- */

/*
 * client_meta comes in four shapes: a point on the canvas, a point on a node,
 * and a frame of either kind. The frame's pin corner is where the stored point
 * is, so the frame extends away from it — left and up for bottom-right, which
 * is what a drag from top left to bottom right produces.
 */
function commentGeometry(meta, indexes) {
  if (!meta) return null;
  let x;
  let y;
  let home = null;
  if (meta.node_id) {
    home = indexes.find((ix) => ix.byId.has(meta.node_id));
    if (!home) return { outside: meta.node_id };
    const base = home.byId.get(meta.node_id).absoluteBoundingBox;
    x = base.x + (meta.node_offset?.x ?? 0);
    y = base.y + (meta.node_offset?.y ?? 0);
  } else if (typeof meta.x === 'number') {
    ({ x, y } = meta);
  } else {
    return null;
  }
  let region = null;
  if (meta.region_width || meta.region_height) {
    const corner = meta.comment_pin_corner ?? 'bottom-right';
    const width = meta.region_width ?? 0;
    const height = meta.region_height ?? 0;
    region = {
      x: corner.endsWith('right') ? x - width : x,
      y: corner.startsWith('bottom') ? y - height : y,
      width,
      height,
    };
  }
  if (!home) {
    const cx = region ? region.x + region.width / 2 : x;
    const cy = region ? region.y + region.height / 2 : y;
    home = indexes.find((ix) => contains(ix.section.absoluteBoundingBox, cx, cy));
    if (!home) return { outside: `${Math.round(x)},${Math.round(y)}` };
  }
  return { home, point: { x, y }, region };
}

/*
 * A frame counts as picked when the comment's frame covers at least half of it:
 * a frame drawn by hand around A1 is never exact, and one that clips the edge
 * of its neighbour has not chosen the neighbour. A bare pin picks the innermost
 * lettered frame under it.
 */
const PICK_SHARE = 0.5;

function picked(geo) {
  const { frames } = geo.home;
  let hits;
  if (geo.region) {
    hits = frames.filter((f) => overlapShare(f.box, geo.region) >= PICK_SHARE);
  } else {
    const under = frames.filter((f) => contains(f.box, geo.point.x, geo.point.y));
    const smallest = Math.min(...under.map((f) => f.box.width * f.box.height));
    hits = under.filter((f) => f.box.width * f.box.height === smallest);
  }
  const codes = [...new Set(hits.map((f) => f.code))].sort();
  const rows = [...new Set(hits.map((f) => f.row))].sort();
  return { codes, rows, other: codes.length ? [] : coveredNames(geo) };
}

/*
 * A frame around no lettered frame is still around something — a note, a Brief
 * row — and naming it is what lets the comment be read at all. The outermost
 * covered nodes only: a note, not the note and its three text layers. When
 * nothing is half covered, the node covered most, with its share: in 4FH the
 * first framed comment held 39% of a note and all of its heading.
 */
function coveredNames(geo) {
  if (!geo.region) return [];
  const shares = [];
  for (const node of geo.home.byId.values()) {
    if (node.type === 'TEXT' || !node.absoluteBoundingBox) continue;
    const share = overlapShare(node.absoluteBoundingBox, geo.region);
    if (share > 0) shares.push({ node, share });
  }
  const covered = shares.filter((s) => s.share >= PICK_SHARE).map((s) => s.node);
  if (!covered.length) {
    const best = shares.sort((a, b) => b.share - a.share)[0];
    return best && best.share >= 0.2 ? [`${best.node.name} (${Math.round(best.share * 100)}%)`] : [];
  }
  const outermost = covered.filter((node) => !covered.some((other) => other !== node && (other.children ?? []).includes(node)));
  return [...new Set(outermost.map((node) => node.name))].slice(0, 3);
}

/* ---------- what follows ---------- */

const FLAG = { READY_FOR_DEV: 'Ready for dev', COMPLETED: 'Completed' };

function verdict(ix, comments) {
  const state = stateOf(ix.section.name);
  const flag = ix.section.devStatus?.type ?? null;
  const live = [...ix.rows].filter((r) => !ix.rejected.has(r)).sort();
  const lines = [];

  if (flag === 'READY_FOR_DEV' && (state === '🟡' || state === '🔵')) {
    lines.push('approved in Figma — flip the section to 🟢 and record it in decided');
    if (live.length > 1) {
      const choices = comments.filter((c) => c.pick?.rows.length === 1);
      const rows = [...new Set(choices.map((c) => c.pick.rows[0]))];
      if (rows.length === 1) {
        lines.push(`choice: row ${rows[0]} of ${live.join(', ')}, framed in a comment — fade the others as rejected`);
      } else if (rows.length > 1) {
        lines.push(`choice unclear: comments frame rows ${rows.join(' and ')} — ask before fading anything`);
      } else {
        lines.push(`choice not framed: ${live.length} live rows (${live.join(', ')}) — take the Brief's recommendation, or ask`);
      }
    }
  } else if (flag === 'COMPLETED') {
    lines.push('accepted on a build — promote the section');
  } else if (flag && state !== '🟢') {
    lines.push(`${FLAG[flag] ?? flag} on a section named ${state ?? 'without a state'} — ask what it means`);
  } else if (!flag && state === '🟢') {
    lines.push('🟢 without the flag — approved before the flag was the signal, or the flag was taken off');
  } else if (!flag && state === '🔵') {
    lines.push('waiting for approval');
  }
  return lines;
}

/* ---------- output ---------- */

const when = (iso) => iso.replace('T', ' ').slice(0, 16);
const quote = (text) => text.replace(/\s+/g, ' ').trim();

function printComment(c, replies) {
  const where = c.pick
    ? c.pick.codes.length
      ? `frames ${c.pick.codes.join(', ')}${c.pick.rows.length > 1 ? ' — more than one row' : ''}`
      : `${c.geo.region ? 'frame' : 'pin'} covers no lettered frame${c.pick.other.length ? ` — it covers ${c.pick.other.join(', ')}` : ''}`
    : 'no position';
  console.log(`    • ${c.user.handle} · ${when(c.created_at)} · ${where}`);
  console.log(`      «${quote(c.message)}»`);
  for (const r of replies.get(c.id) ?? []) {
    console.log(`      ↳ ${r.user.handle} · ${when(r.created_at)}: «${quote(r.message)}»`);
  }
}

async function main() {
  const asked = sectionIdArgs();

  const file = await load('file.json', '?depth=2', 'the page list');
  const page = file.document.children.find((p) => p.name === PAGE);
  if (!page) throw new Error(`No page named «${PAGE}» in the file. Set figma.wip.page in .claude/rulebook.json.`);
  const onPage = (page.children ?? []).filter((n) => n.type === 'SECTION').map((n) => n.id);
  const ids = asked.length ? asked : onPage;
  if (!ids.length) {
    console.log(`The «${PAGE}» page holds no sections: everything drawn has reached the code.`);
    return;
  }

  const nodes = await load('nodes.json', `/nodes?ids=${ids.join(',')}`, ids.join(', '));
  const indexes = ids.map((id) => {
    const doc = nodes.nodes[id]?.document;
    if (!doc) throw new Error(`No such node in the file: ${id}`);
    return indexSection(doc);
  });

  const { comments = [] } = await load('comments.json', '/comments', 'the comments');
  const open = comments.filter((c) => !c.resolved_at);
  const replies = new Map();
  for (const c of open.filter((c) => c.parent_id)) {
    replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
  }
  for (const list of replies.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const bySection = new Map(indexes.map((ix) => [ix.section.id, []]));
  const elsewhere = [];
  for (const c of open.filter((c) => !c.parent_id)) {
    const geo = commentGeometry(c.client_meta, indexes);
    if (!geo || geo.outside) { elsewhere.push(c); continue; }
    bySection.get(geo.home.section.id).push({ ...c, geo, pick: picked(geo) });
  }

  for (const ix of indexes) {
    const list = bySection.get(ix.section.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const flag = ix.section.devStatus?.type;
    console.log(`${ix.section.name}  (${ix.section.id})`);
    console.log(`  flag: ${flag ? FLAG[flag] ?? flag : 'none'}`);
    for (const line of verdict(ix, list)) console.log(`  → ${line}`);
    if (list.length) {
      console.log(`  open comments: ${list.length}`);
      for (const c of list) printComment(c, replies);
    }
    console.log('');
  }

  if (elsewhere.length && !asked.length) {
    console.log(`${elsewhere.length} open comment(s) outside the «${PAGE}» sections:`);
    for (const c of elsewhere) {
      const at = c.client_meta?.node_id ? `node ${c.client_meta.node_id}` : 'no node';
      console.log(`    • ${c.user.handle} · ${when(c.created_at)} · ${at} · «${quote(c.message).slice(0, 120)}»`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
