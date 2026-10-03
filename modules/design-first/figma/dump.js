// Run inside a Figma file with the use_figma tool (Plugin API), in the library
// file whose masters are the source. Returns the masters as a spec — the JSON
// that build.js turns back into the same masters in any other file. Kept here,
// with the spec it writes, so the library is something anybody can rebuild from
// this repository, not a file only its owner can open.
//
// SECTIONS names the sections on the page to read; masters are their direct
// children. SKIP leaves out masters built another way: the launch board is built
// from LAUNCH.md by board.js, so it cannot drift from the plan. Defaults are
// omitted from the spec to keep it small and readable.
//
// The tool's answer is cut at about 20 kB and the spec is larger, so it is not
// returned: it is written into a text layer, TRANSFER, on the page, read from
// there byte for byte by fetch-text.mjs over the REST API, and the layer is
// deleted by cleanup.js. Nothing is copied by hand, so nothing is mistyped.

const PAGE = 'Components';
const SECTIONS = ['WIP section masters', 'Cover', 'Launch checklist'];
const SKIP = ['Launch checklist'];
const TRANSFER = 'rulebook-spec-transfer';

const page = figma.root.children.find((p) => p.name === PAGE);
await figma.setCurrentPageAsync(page);

const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const varNames = new Map();
const varName = async (id) => {
  if (!varNames.has(id)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    varNames.set(id, `${c.name}/${v.name}`);
  }
  return varNames.get(id);
};
const paints = async (ps) => {
  if (!Array.isArray(ps)) return undefined;
  const out = [];
  for (const p of ps) {
    if (p.type !== 'SOLID') continue;
    const o = { c: hex(p.color) };
    if (p.opacity !== undefined && p.opacity !== 1) o.a = +p.opacity.toFixed(3);
    if (p.visible === false) o.hide = true;
    if (p.boundVariables && p.boundVariables.color) o.v = await varName(p.boundVariables.color.id);
    out.push(o);
  }
  return out;
};
const effects = (es) => (es || []).filter((e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW').map((e) => ({
  t: e.type, c: hex(e.color), a: +e.color.a.toFixed(3), x: e.offset.x, y: e.offset.y, r: e.radius, s: e.spread || 0,
}));

const ids = new Map(); // source node id -> spec id
let next = 1;
const specId = (n) => { if (!ids.has(n.id)) ids.set(n.id, 'k' + next++); return ids.get(n.id); };
const propName = (k) => k.replace(/#[^#]*$/, '');

async function node(n, parentAuto) {
  const o = { t: n.type, n: n.name };
  if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') o.id = specId(n);
  if (!parentAuto || n.layoutPositioning === 'ABSOLUTE') { o.x = +n.x.toFixed(2); o.y = +n.y.toFixed(2); }
  o.w = +n.width.toFixed(2); o.h = +n.height.toFixed(2);
  if (n.visible === false) o.vis = false;
  if (n.opacity !== undefined && n.opacity !== 1) o.op = +n.opacity.toFixed(3);
  if (n.type !== 'INSTANCE') {
    if ('fills' in n) { const f = await paints(n.fills); if (f && f.length) o.fills = f; }
    if ('strokes' in n) { const s = await paints(n.strokes); if (s && s.length) {
        o.strokes = s;
        // One weight, or one per side — a note's edge is a single 8 px rule on the left.
        if (n.strokeWeight === figma.mixed) o.swi = [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight];
        else o.sw = n.strokeWeight;
        if (n.strokeAlign !== 'INSIDE') o.sa = n.strokeAlign;
      } }
    if ('strokeCap' in n && n.strokeCap && n.strokeCap !== 'NONE' && n.strokeCap !== figma.mixed) o.sc = n.strokeCap;
    if ('strokeJoin' in n && n.strokeJoin && n.strokeJoin !== 'MITER' && n.strokeJoin !== figma.mixed) o.sj = n.strokeJoin;
    if ('cornerRadius' in n) {
      if (n.cornerRadius === figma.mixed) o.r = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
      else if (n.cornerRadius) o.r = n.cornerRadius;
    }
    if ('effects' in n && n.effects.length) { const e = effects(n.effects); if (e.length) o.fx = e; }
    if ('clipsContent' in n && n.clipsContent && n.type !== 'COMPONENT_SET') o.clip = true;
    // Figma hands descriptions back HTML-escaped and escapes them again on the way in;
    // the spec keeps the plain text.
    if (n.description) o.desc = n.description.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  if ('layoutMode' in n && n.layoutMode !== 'NONE' && n.type !== 'INSTANCE') {
    o.lm = n.layoutMode;
    if (n.layoutWrap === 'WRAP') { o.wrap = true; o.cgap = n.counterAxisSpacing; }
    o.pad = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft];
    o.gap = n.itemSpacing;
    o.pa = n.primaryAxisAlignItems; o.ca = n.counterAxisAlignItems;
    o.psm = n.primaryAxisSizingMode; o.csm = n.counterAxisSizingMode;
  }
  if (parentAuto) {
    if (n.layoutSizingHorizontal) o.lsh = n.layoutSizingHorizontal;
    if (n.layoutSizingVertical) o.lsv = n.layoutSizingVertical;
    if (n.layoutPositioning === 'ABSOLUTE') o.abs = true;
  }
  if (n.componentPropertyReferences) o.cpr = Object.fromEntries(Object.entries(n.componentPropertyReferences).map(([k, v]) => [k, propName(v)]));
  if (n.type === 'TEXT') {
    o.chars = n.characters;
    o.font = n.fontName; o.fs = n.fontSize;
    if (n.lineHeight.unit !== 'AUTO') o.lh = n.lineHeight;
    if (n.letterSpacing.value) o.ls = n.letterSpacing;
    if (n.textCase !== 'ORIGINAL') o.tc = n.textCase;
    if (n.textDecoration !== 'NONE') o.td = n.textDecoration;
    o.tar = n.textAutoResize;
    if (n.textAlignHorizontal !== 'LEFT') o.tah = n.textAlignHorizontal;
  }
  if (n.type === 'VECTOR') o.vp = n.vectorPaths;
  if (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent.type !== 'COMPONENT_SET')) {
    o.defs = [];
    for (const [k, d] of Object.entries(n.componentPropertyDefinitions)) {
      if (d.type === 'VARIANT') continue; // a set's variants carry these in their names
      let value = d.defaultValue;
      // A swap's default is a node id in this file; in the spec it is the master it names.
      if (d.type === 'INSTANCE_SWAP') value = { ref: specId(await figma.getNodeByIdAsync(value)) };
      o.defs.push({ name: propName(k), type: d.type, value });
    }
  }
  if (n.type === 'INSTANCE') {
    const main = await n.getMainComponentAsync();
    o.ref = specId(main);
    const props = {};
    for (const [k, p] of Object.entries(n.componentProperties)) {
      if (p.type === 'INSTANCE_SWAP') { const sw = await figma.getNodeByIdAsync(p.value); props[propName(k)] = { ref: specId(sw) }; }
      else props[propName(k)] = p.value;
    }
    o.props = props;
    // Text set on the instance by hand rather than through a property.
    const texts = [];
    const walk = (x, path) => { if (x.type === 'TEXT' && !x.componentPropertyReferences?.characters) texts.push([path, x.characters]); if ('children' in x) x.children.forEach((c, i) => walk(c, path.concat(i))); };
    n.children.forEach((c, i) => walk(c, [i]));
    const mainTexts = [];
    const walkM = (x, path) => { if (x.type === 'TEXT') mainTexts.push([path.join('.'), x.characters]); if ('children' in x) x.children.forEach((c, i) => walkM(c, path.concat(i))); };
    main.children.forEach((c, i) => walkM(c, [i]));
    const m = new Map(mainTexts);
    const diff = texts.filter(([p, ch]) => m.get(p.join('.')) !== ch);
    if (diff.length) o.texts = diff;
    return o;
  }
  if ('children' in n && n.children.length) {
    const auto = 'layoutMode' in n && n.layoutMode !== 'NONE';
    o.kids = [];
    for (const c of n.children) o.kids.push(await node(c, auto));
  }
  return o;
}

const masters = [];
for (const s of page.children.filter((x) => x.type === 'SECTION' && SECTIONS.includes(x.name))) {
  for (const m of s.children) if (!SKIP.includes(m.name)) masters.push({ section: s.name, ...(await node(m, false)) });
}

const collections = [];
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
  const vars = [];
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const values = {};
    for (const m of c.modes) {
      const val = v.valuesByMode[m.modeId];
      values[m.name] = val && val.type === 'VARIABLE_ALIAS' ? { alias: await varName(val.id) } : (val && val.r !== undefined ? hex(val) + (val.a !== undefined && val.a !== 1 ? Math.round(val.a * 255).toString(16).padStart(2, '0') : '') : val);
    }
    vars.push({ name: v.name, type: v.resolvedType, values });
  }
  collections.push({ name: c.name, modes: c.modes.map((m) => m.name), vars });
}

const spec = JSON.stringify({ version: 1, page: PAGE, collections, masters }, null, 1);
for (const old of page.findAll((x) => x.name === TRANSFER)) old.remove();
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const t = figma.createText();
t.name = TRANSFER;
t.fontName = { family: 'Inter', style: 'Regular' };
t.characters = spec;
t.x = -100000; t.y = -100000;
page.appendChild(t);
return { node: t.id, length: spec.length, masters: masters.map((m) => m.n) };
