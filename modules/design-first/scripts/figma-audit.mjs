#!/usr/bin/env node

/*
 * Audits Figma frames for the painting faults that do not show up on the
 * canvas. Run it before promoting a WIP section into the production flows —
 * see AGENTS.md, "Figma design workflow".
 *
 * Run from the project root, which is where the file key and the token are
 * read from — the script itself lives in the skill and is shared by every
 * project, so it carries no project's identity:
 *
 *   node <skill>/modules/design-first/scripts/figma-audit.mjs 850:670
 *   node <skill>/modules/design-first/scripts/figma-audit.mjs 969:1337 975:1395
 *
 * The file key comes from --file, then FIGMA_FILE_KEY, then "figma.file" in
 * .claude/rulebook.json, then .env. The token comes from FIGMA_TOKEN or .env,
 * and never from anywhere a repository can reach.
 *
 * Exits 1 when it finds a fault that gates a promotion; a stale base fill is
 * printed but does not fail the run, because nobody can see one. Exits 0 and
 * says so when the frames are clean.
 *
 * Why REST and not a `use_figma` script: the plugin API needs the desktop app
 * open on the right file, which makes it useless as a check somebody can just
 * run. The Variables REST API is Enterprise-only and answers 403 on this plan,
 * so nothing here resolves a variable id to a name or a value — every rule
 * below is built to work without that.
 */

import { readFileSync } from 'node:fs';

/*
 * Both of these are the project's, not the script's. The hard-coded key that
 * used to sit here is why the audit could only ever exist in the one repository
 * it was written for, while the rule it checks travelled to four.
 */
function readEnvFile() {
  try {
    return readFileSync('.env', 'utf8');
  } catch {
    return '';
  }
}

function readFileKey() {
  const i = process.argv.indexOf('--file');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (process.env.FIGMA_FILE_KEY) return process.env.FIGMA_FILE_KEY;
  try {
    const stamp = JSON.parse(readFileSync('.claude/rulebook.json', 'utf8'));
    if (stamp.figma?.file) return stamp.figma.file;
  } catch {
    /* no stamp, or no figma block in it */
  }
  const match = readEnvFile().match(/^FIGMA_FILE_KEY=(.+)$/m);
  if (match) return match[1].trim();
  throw new Error(
    'No Figma file key. Pass --file <key>, set FIGMA_FILE_KEY, or add\n' +
    '  "figma": { "file": "<key>" }\nto .claude/rulebook.json.',
  );
}

/*
 * Every ground a dark label may legitimately sit on: the accents, the status
 * colours that carry dark text, and the institution palette, where a brand
 * colour wears a letter chosen to stay legible on it. Anywhere else, dark text
 * is the fault that painted 64 labels in a surface colour. Kept as literals
 * because the variable values are unreachable over REST on this plan — when a
 * token moves, this list moves with it.
 */
const ACCENT_GROUNDS = new Set([
  '#ceff68', '#a8d94f', '#3fae96', // accent/lime, lime-dim, green
  '#ffaf33', '#6fd39a', '#ff5c77', '#7fa8dc', // status/warning, positive, negative, info
  '#ef3124', '#ff6200', '#ffdd2d', '#21a038', '#00a758', '#36a18b', // institution tiles
]);

/*
 * Every colour the Budgy Mobile collection defines, plus the institution brand
 * palette and plain white. Used only to tell "left over from this design" from
 * "left over from the one before it" — a leftover in a token is harmless, a
 * leftover in the light marketing palette is the debris a repaint missed.
 *
 * Hardcoded for the same reason as ACCENT_GROUNDS: the Variables REST API is
 * Enterprise-only on this plan. When a token moves, this list moves with it.
 */
const MOBILE_PALETTE = new Set([
  '#11291f', '#16352a', '#1d4235', '#173829', '#0d2018',
  '#27523f', '#1e4234',
  '#f2f7f3', '#a8bdb1', '#8fa79b',
  '#ceff68', '#a8d94f', '#3fae96', '#1e4a3e',
  '#6fd39a', '#ffaf33', '#ff5c77', '#7fa8dc',
  '#3a2e18', '#3a211d', '#d04e5a', '#ff8599',
  '#8fa6ee', '#232e52', '#b196ec', '#33285a', '#e58fc4', '#4a2440',
  '#6fc3d6', '#1b3f4a', '#9aa8c0', '#2a3340',
  '#ef3124', '#ff6200', '#ffdd2d', '#21a038', '#00a758', '#36a18b',
  '#ffffff',
]);

/* Below this relative luminance a fill counts as dark for the rule above. */
const DARK_TEXT_LUMINANCE = 0.4;

function readToken() {
  const fromEnv = process.env.FIGMA_TOKEN;
  if (fromEnv) return fromEnv;
  // The project's .env, read from the working directory. It used to be resolved
  // relative to this file, which was the project root only while the script was
  // vendored into the project; from the skill it would read the skill's own.
  const match = readEnvFile().match(/^FIGMA_TOKEN=(.+)$/m);
  if (!match) throw new Error('FIGMA_TOKEN is not set and .env does not carry it.');
  return match[1].trim();
}

async function fetchNodes(token, ids) {
  const url = `https://api.figma.com/v1/files/${readFileKey()}/nodes?ids=${ids.join(',')}`;
  const response = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!response.ok) {
    throw new Error(`Figma answered ${response.status} ${response.statusText} for ${ids.join(', ')}`);
  }
  const body = await response.json();
  const missing = ids.filter((id) => !body.nodes[id.replace('-', ':')]?.document);
  if (missing.length) throw new Error(`No such node in the file: ${missing.join(', ')}`);
  return body.nodes;
}

const toHex = (color = {}) =>
  '#' + ['r', 'g', 'b'].map((channel) => Math.round((color[channel] ?? 0) * 255).toString(16).padStart(2, '0')).join('');

const luminance = (hex) =>
  (parseInt(hex.slice(1, 3), 16) * 0.299 +
    parseInt(hex.slice(3, 5), 16) * 0.587 +
    parseInt(hex.slice(5, 7), 16) * 0.114) /
  255;

const solidFill = (node) => {
  const fill = (node.fills ?? []).find((f) => f.type === 'SOLID' && f.visible !== false);
  return fill ? toHex(fill.color) : null;
};

/*
 * The colours a text node actually renders.
 *
 * A text node has a base fill and a table of per-character overrides, and
 * `characterStyleOverrides` says which override each character uses. When every
 * character is overridden — which is the normal state of any label whose runs
 * differ — the base fill renders nothing at all. Reading it as a rendered colour
 * is how the first version of this file reported seventeen labels as invisible
 * that were on screen and correct the whole time.
 */
function effectiveTextFills(node) {
  const characters = node.characters ?? '';
  const table = node.styleOverrideTable ?? {};
  const overrides = node.characterStyleOverrides ?? [];
  const base = solidFill(node);
  const fills = new Set();

  if (!characters.length) return base ? [base] : [];

  for (let index = 0; index < characters.length; index += 1) {
    const id = overrides[index];
    const override = id ? table[String(id)] : null;
    const run = (override?.fills ?? []).find((f) => f.type === 'SOLID' && f.visible !== false);
    if (run) fills.add(toHex(run.color));
    else if (base) fills.add(base);
  }

  return [...fills];
}

const label = (node) =>
  node.type === 'TEXT' ? JSON.stringify(node.characters?.slice(0, 36) ?? '') : `${node.name} [${node.type}]`;

/*
 * Fault 1 — a bound colour variable sitting on a black literal.
 *
 * `setBoundVariableForPaint` writes the variable's value into the paint when it
 * can resolve it, and silently leaves the placeholder you built the paint from
 * when it cannot — which is why the safe way to build one is from the
 * variable's own value (mobile/scripts/figma/painting.js, `tokenPaint`).
 * Nothing on the canvas says which happened. Pure black is never a legitimate
 * token in either collection — the darkest is #0d2018 — so a bound paint whose
 * literal is #000000 is this fault and nothing else. Measured against the whole
 * file: 19,256 solid fills, zero false positives.
 */
function blackBoundPaints(node, frame, found) {
  for (const fill of node.fills ?? []) {
    if (fill.type !== 'SOLID' || fill.visible === false) continue;
    if (!fill.boundVariables?.color) continue;
    if (toHex(fill.color) !== '#000000') continue;
    found.push({ rule: 'black bound paint', frame, node: label(node), detail: 'bound to a variable, literal #000000' });
  }
}

/*
 * A label made only of pictographs is not text this rule can judge.
 *
 * An emoji brings its own colours; the node's fill paints nothing and is
 * routinely left at black. Judging it produced 55 findings across two sections
 * on 2026-08-25 — every one of them an envelope's 🏠 or 🛒, none of them real,
 * and frames approved weeks earlier were flagged beside new ones. A gate that
 * is never clean is a gate that stops being read, which costs more than the
 * rule was ever worth here.
 *
 * Only *entirely* pictographic labels are skipped. A mixed label — an emoji
 * next to words — still has characters whose colour is the fill, so it stays
 * under the rule.
 */
const PICTOGRAPHIC = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u;

function isPictographic(characters) {
  const text = (characters ?? '').trim();
  return text.length > 0 && PICTOGRAPHIC.test(text);
}

/*
 * Fault 2 — dark text anywhere but on an accent.
 *
 * The nearest painted ancestor is the ground the text actually sits on;
 * parentage in the layer tree is irrelevant to what a reader sees.
 *
 * Every run is checked, not just the node's own fill. Text whose runs differ
 * reads as `figma.mixed` to the plugin API, so a repaint sweep guarded by
 * `Array.isArray(node.fills)` skips it in silence and reports the frame clean
 * while a run still carries the palette being replaced — which is exactly how
 * labels from the light marketing palette survived onto dark surfaces. Merely
 * having mixed runs is not a fault, though: a money row that tints its currency
 * code is the normal case, so only the colours are judged, never the split.
 */
function darkTextOffAccent(node, ancestry, frame, found) {
  if (node.type !== 'TEXT') return;
  if (isPictographic(node.characters)) return;

  const fills = effectiveTextFills(node);
  const dark = fills.filter((hex) => luminance(hex) <= DARK_TEXT_LUMINANCE);
  if (!dark.length) return;

  const ground = ancestry.map(solidFill).reverse().find(Boolean) ?? null;
  if (ground && ACCENT_GROUNDS.has(ground)) return;
  /*
   * A light ground is not this rule's business either. What it hunts is dark
   * text left on the dark palette, where it disappears; dark text on something
   * light is how a light surface is supposed to read — the avatar on
   * `Envelope — Transactions tab` is one, a letter on #E8E8ED. Judged by
   * luminance rather than by another hardcoded list, because the next light
   * surface will not be on the list.
   */
  if (ground && luminance(ground) > DARK_TEXT_LUMINANCE) return;

  for (const hex of dark) {
    found.push({
      rule: 'dark text off accent',
      frame,
      node: label(node),
      detail: `${hex} on ${ground ?? 'nothing painted'}${fills.length > 1 ? ' (one run of several)' : ''}`,
    });
  }
}

/*
 * Fault 3 — a base fill left behind under a fully-overridden label.
 *
 * Not visible and not urgent: no character uses it. It is a trap rather than a
 * defect — type one more character into the label and the old palette appears
 * in the middle of it, which is exactly how a repaint leaves the frame looking
 * finished and still wrong. Reported separately from the two faults above so a
 * promotion is never blocked by something nobody can see.
 */
function staleBaseFill(node, frame, found) {
  if (node.type !== 'TEXT') return;
  const base = solidFill(node);
  if (!base) return;
  const characters = node.characters ?? '';
  if (!characters.length) return;

  const table = node.styleOverrideTable ?? {};
  const overrides = node.characterStyleOverrides ?? [];
  const usesBase = [...characters].some((_, index) => {
    const id = overrides[index];
    const override = id ? table[String(id)] : null;
    return !(override?.fills ?? []).some((f) => f.type === 'SOLID' && f.visible !== false);
  });
  if (usesBase) return;
  /* A leftover in one of our own colours is not debris worth anybody's time. */
  if (MOBILE_PALETTE.has(base)) return;

  found.push({
    rule: 'stale base fill',
    frame,
    node: label(node),
    detail: `${base} under a fully-overridden label — renders nothing, appears if the text grows`,
  });
}

/*
 * Fault 4 — a label painted the colour of the thing it sits on.
 *
 * The two rules above both judge a label against the palette: one hunts black,
 * the other hunts dark text on a dark ground. Neither notices a label that is
 * *light* on a *light* ground, because there is nothing wrong with either
 * colour on its own — and that is how `Month` came to be #F2F7F3 on a #F2F7F3
 * pill in both calendar frames, invisible, through an audit that called the
 * section clean and an approval that read the screenshot.
 *
 * Same-on-same is never deliberate, whichever colours they are, so this needs
 * no list and no luminance threshold: it compares the label's own colour with
 * its nearest painted ancestor and reports an exact match.
 */
function textMatchesGround(node, ancestry, frame, found) {
  if (node.type !== 'TEXT') return;
  if (!(node.characters ?? '').length) return;

  /*
   * Only an *opaque* ground can hide a label. A tinted wash — the 10% lime
   * behind `Checked today` on an account card, say — carries the same hex as
   * the text on top of it and is exactly what a chip in an accent colour is
   * supposed to look like. Reading the hex alone reported four of those.
   */
  const ground =
    ancestry
      .map((ancestor) => {
        const fill = (ancestor.fills ?? []).find(
          (f) => f.type === 'SOLID' && f.visible !== false,
        );
        return fill && (fill.opacity ?? 1) === 1 ? toHex(fill.color) : null;
      })
      .reverse()
      .find(Boolean) ?? null;
  if (!ground) return;

  for (const hex of effectiveTextFills(node)) {
    if (hex !== ground) continue;
    found.push({
      rule: 'text the colour of its ground',
      frame,
      node: label(node),
      detail: `${hex} on ${ground} — the label is there and cannot be read`,
    });
  }
}

function walk(node, ancestry, frame, found) {
  blackBoundPaints(node, frame, found);
  darkTextOffAccent(node, ancestry, frame, found);
  textMatchesGround(node, ancestry, frame, found);
  staleBaseFill(node, frame, found);
  const nextAncestry = [...ancestry, node];
  for (const child of node.children ?? []) walk(child, nextAncestry, frame, found);
}

/*
 * The faults that gate a promotion. Every rule above is printed either way;
 * only these decide the exit code. `stale base fill` is deliberately not among
 * them — it renders nothing, so failing on it would block a promotion over
 * something nobody can see (AGENTS.md, "Painting"). Membership is by exclusion
 * so a rule added later gates by default: a new fault that turns out to be
 * invisible is a smaller surprise than one that silently stops gating.
 */
const ADVISORY_RULES = new Set(['stale base fill']);

function reportByRule(items) {
  const byRule = new Map();
  for (const item of items) {
    if (!byRule.has(item.rule)) byRule.set(item.rule, []);
    byRule.get(item.rule).push(item);
  }
  for (const [rule, entries] of byRule) {
    console.log(`${rule} — ${entries.length}`);
    for (const entry of entries) console.log(`  ${entry.frame}: ${entry.node} — ${entry.detail}`);
    console.log('');
  }
}

async function main() {
  const flagged = process.argv.indexOf('--file');
  const ids = process.argv
    .slice(2)
    .filter((a, i) => a !== '--file' && i + 2 !== flagged + 1)
    .map((id) => id.replace('-', ':'));
  if (!ids.length) {
    console.error('Usage: figma-audit.mjs [--file <key>] <node-id> [node-id...]');
    process.exit(2);
  }

  const nodes = await fetchNodes(readToken(), ids);
  const found = [];
  let scanned = 0;

  for (const entry of Object.values(nodes)) {
    const root = entry.document;
    /* A section or page is a container, so audit each frame under its own name. */
    const targets = root.type === 'SECTION' || root.type === 'CANVAS' ? (root.children ?? []) : [root];
    for (const target of targets) {
      scanned += 1;
      walk(target, [], target.name, found);
    }
  }

  if (!found.length) {
    console.log(`Clean: ${scanned} frame(s) audited, nothing found.`);
    return;
  }

  const blocking = found.filter((item) => !ADVISORY_RULES.has(item.rule));
  const advisory = found.filter((item) => ADVISORY_RULES.has(item.rule));

  if (blocking.length) {
    console.log(`${blocking.length} blocking finding(s) across ${scanned} frame(s):\n`);
    reportByRule(blocking);
  } else {
    console.log(`Nothing blocking: ${scanned} frame(s) audited, no fault that gates a promotion.\n`);
  }

  if (advisory.length) {
    console.log(`${advisory.length} finding(s) that do not block a promotion:\n`);
    reportByRule(advisory);
  }

  if (blocking.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
