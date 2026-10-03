#!/usr/bin/env node
/**
 * Prints the use_figma code that builds the `Launch checklist` board from
 * LAUNCH.md — every phase a card, every step a `Launch step` instance with its
 * owner and long-wait flag. Built from the plan itself, so the board cannot say
 * something the plan does not.
 *
 *   node board.mjs [--page <name>]     # default page: Components
 *
 * Run it in a file that already has the `Launch step` master — a library built
 * with modules/design-first/figma/bundle.mjs, or a project's own Kit page — and
 * it adds the board as a component beside it.
 *
 * A board that is already there is updated in place, never replaced: a project's
 * instance remembers each step's state against that step's node, so a step that
 * is still in the plan keeps its node — found by its text — and its state in
 * every project. New steps are added, steps gone from the plan are removed.
 * Replacing the board would give it a new key and clear every project's ticks.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function phases(text) {
  const out = [];
  let cur = null;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^## (\d+)\. (.+)$/);
    if (h) {
      cur = { n: h[1], title: h[2].replace(" ⏳", ""), wait: h[2].includes("⏳"), steps: [] };
      out.push(cur);
      continue;
    }
    const s = lines[i].match(/^- \[[ x]\] \*\*(.+?)\*\*(.*)$/);
    if (s && cur) {
      let body = s[2];
      for (let j = i + 1; j < lines.length && lines[j].startsWith("  "); j += 1) body += " " + lines[j].trim();
      const owners = [...body.matchAll(/\*(you|agent|both)\*/g)].map((m) => m[1]);
      cur.steps.push({
        t: s[1].replace(" ⏳", "").replace(/[.,]$/, ""),
        o: owners.at(-1) || "",
        w: s[1].includes("⏳") || body.includes("⏳"),
      });
    }
  }
  return out;
}

const BUILD = `
const PAGE_NAME = PAGE;
const page = figma.root.children.find((p) => p.name === PAGE_NAME);
if (!page) throw new Error('no page "' + PAGE_NAME + '" — build the masters first');
await figma.setCurrentPageAsync(page);
const set = page.findOne((n) => n.type === 'COMPONENT_SET' && n.name === 'Launch step');
if (!set) throw new Error('no Launch step master on "' + PAGE_NAME + '" — build the masters first');
const open = set.children.find((c) => c.name === 'State=Open');
const K = (s) => Object.keys(set.componentPropertyDefinitions).find((k) => k.startsWith(s + '#'));
const vars = new Map();
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) for (const id of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); vars.set(c.name + '/' + v.name, { v, value: v.valuesByMode[c.defaultModeId] }); }
const P = (name) => { const x = vars.get(name); const c = x.value; return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }, 'color', x.v); };
for (const s of ['Regular', 'Semi Bold', 'Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const text = (s, style, size, color, lh) => { const t = figma.createText(); t.fontName = { family: 'Inter', style }; t.fontSize = size; if (lh) t.lineHeight = { unit: 'PIXELS', value: lh }; t.characters = s; t.fills = [P(color)]; return t; };
const section = set.parent;
let board = section.children.find((n) => n.type === 'COMPONENT' && n.name === 'Launch checklist');
const fresh = !board;
let head, sub, grid;
if (fresh) {
  board = figma.createComponent(); board.name = 'Launch checklist'; section.appendChild(board);
  board.layoutMode = 'VERTICAL'; board.itemSpacing = 32; board.paddingTop = board.paddingBottom = board.paddingLeft = board.paddingRight = 48; board.cornerRadius = 24; board.fills = [P('Cover/cover/ground')];
  head = figma.createFrame(); head.name = 'Header'; head.layoutMode = 'VERTICAL'; head.itemSpacing = 8; head.fills = []; board.appendChild(head);
  head.appendChild(text('Launch', 'Bold', 40, 'Rulebook/kit/text'));
  sub = text('From an empty folder to the stores, the landing page and the promotion after it. Mirrors LAUNCH.md from the rulebook kit’s project-launch procedure: open, done or struck out, whose step it is, and the waits no work shortens.', 'Regular', 16, 'Rulebook/kit/label', 22); head.appendChild(sub);
  grid = figma.createFrame(); grid.name = 'Phases'; grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 24; grid.counterAxisSpacing = 24; grid.fills = []; board.appendChild(grid);
  grid.resize(4 * 360 + 3 * 24, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSizingMode = 'AUTO';
} else {
  head = board.children.find((n) => n.name === 'Header'); sub = head.children[1]; grid = board.children.find((n) => n.name === 'Phases');
}
let steps = 0, kept = 0, added = 0, removed = 0;
const cards = [];
PHASES.forEach((ph, pi) => {
  const name = 'Phase ' + ph.n + ' · ' + ph.title;
  let card = grid.children.find((c) => c.name.startsWith('Phase ' + ph.n + ' · '));
  if (!card) {
    card = figma.createFrame(); card.layoutMode = 'VERTICAL'; card.itemSpacing = 2; card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 20; card.cornerRadius = 16; card.fills = [P('Rulebook/kit/card')];
    grid.appendChild(card); card.resize(360, 100); card.primaryAxisSizingMode = 'AUTO'; card.counterAxisSizingMode = 'FIXED';
    const tr = figma.createFrame(); tr.name = 'Title'; tr.layoutMode = 'HORIZONTAL'; tr.itemSpacing = 8; tr.counterAxisAlignItems = 'BASELINE'; tr.fills = []; tr.paddingBottom = 8; card.appendChild(tr);
    tr.appendChild(text(name.replace('Phase ', ''), 'Semi Bold', 17, 'Rulebook/kit/text'));
    tr.layoutSizingHorizontal = 'FILL'; tr.layoutSizingVertical = 'HUG';
  }
  card.name = name;
  const tr = card.children.find((c) => c.name === 'Title');
  tr.children[0].characters = ph.n + ' · ' + ph.title;
  const wait = tr.children.find((c, i) => i > 0);
  if (ph.wait && !wait) tr.appendChild(text('wait', 'Semi Bold', 11, 'Rulebook/kit/note-edge'));
  if (!ph.wait && wait) wait.remove();
  grid.insertChild(pi, card);
  cards.push(card);
  const have = card.children.filter((c) => c.type === 'INSTANCE');
  ph.steps.forEach((st, si) => {
    let i = have.find((x) => x.name === st.t);
    if (i) kept += 1; else { i = open.createInstance(); card.appendChild(i); i.name = st.t; i.layoutSizingHorizontal = 'FILL'; added += 1; }
    i.setProperties({ [K('Step')]: st.t, [K('Owner')]: st.o, [K('Long wait')]: st.w });
    card.insertChild(si + 1, i);
    steps += 1;
  });
  for (const x of have) if (!ph.steps.some((st) => st.t === x.name)) { x.remove(); removed += 1; }
});
for (const c of [...grid.children]) if (!cards.includes(c)) c.remove();
if (fresh) { board.x = set.x; board.y = set.y + set.height + 80; }
head.layoutSizingHorizontal = 'FILL'; sub.layoutSizingHorizontal = 'FILL'; sub.textAutoResize = 'HEIGHT';
board.counterAxisSizingMode = 'AUTO'; board.primaryAxisSizingMode = 'AUTO';
board.description = 'The launch path as one board, built from LAUNCH.md by the rulebook kit’s skills/project-launch/board.mjs. Insert one instance per project, then set each step’s State: Open, Done or Struck. Rebuild it when LAUNCH.md changes.';
const right = Math.max(...section.children.map((n) => n.x + n.width)) + 80, bottom = Math.max(...section.children.map((n) => n.y + n.height)) + 80;
if (right > section.width || bottom > section.height) section.resizeWithoutConstraints(Math.max(section.width, right), Math.max(section.height, bottom));
return { board: board.id, fresh, phases: PHASES.length, steps, kept, added, removed };
`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--page");
  const page = i === -1 ? "Components" : process.argv[i + 1];
  const plan = phases(readFileSync(join(here, "LAUNCH.md"), "utf8"));
  process.stdout.write(`const PAGE = ${JSON.stringify(page)};\nconst PHASES = ${JSON.stringify(plan)};\n${BUILD}`);
}
