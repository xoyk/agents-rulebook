// Builds masters from spec.json into the open Figma file, with the use_figma
// tool (Plugin API). Not run as it stands: bundle.mjs prepends one master's
// part of the spec, so each call is small enough to pass whole —
//
//   node modules/design-first/figma/bundle.mjs --list      # the parts, in order
//   node modules/design-first/figma/bundle.mjs <n>          # the code for part n
//
// and the agent runs the parts in order. Every part carries a checksum of its
// own text; a part that arrives altered is refused before anything is drawn.
// Re-running is safe: a master that is already on the page is left alone.
//
// Provided by bundle.mjs above this line: PARTS (a list of [text, checksum],
// each text one master or the variables, as JSON) and REFS (spec id -> master
// name, "Set :: Variant" for a variant, so a part can find what earlier parts
// built).

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
for (const [text, sum] of PARTS) if (fnv(text) !== sum) throw new Error(`a part arrived altered: checksum ${fnv(text)}, expected ${sum} — run bundle.mjs again and pass its output unchanged`);
let PART;

const rgba = (hex) => {
  const h = hex.replace('#', '');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
};

// --- variables ---------------------------------------------------------------
async function variablesByName() {
  const map = new Map();
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
    for (const id of c.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      map.set(`${c.name}/${v.name}`, v);
    }
  }
  return map;
}

async function buildVariables(collections) {
  const have = await figma.variables.getLocalVariableCollectionsAsync();
  const made = [];
  for (const spec of collections) {
    let c = have.find((x) => x.name === spec.name);
    if (!c) { c = figma.variables.createVariableCollection(spec.name); made.push(spec.name); }
    if (c.modes[0].name !== spec.modes[0]) c.renameMode(c.modes[0].modeId, spec.modes[0]);
    for (const m of spec.modes.slice(1)) if (!c.modes.find((x) => x.name === m)) c.addMode(m);
  }
  const vars = await variablesByName();
  const pending = [];
  for (const spec of collections) {
    const c = (await figma.variables.getLocalVariableCollectionsAsync()).find((x) => x.name === spec.name);
    for (const v of spec.vars) {
      let node = vars.get(`${spec.name}/${v.name}`);
      if (!node) { node = figma.variables.createVariable(v.name, c, v.type); vars.set(`${spec.name}/${v.name}`, node); }
      for (const [mode, value] of Object.entries(v.values)) pending.push({ node, modeId: c.modes.find((m) => m.name === mode).modeId, value });
    }
  }
  for (const { node, modeId, value } of pending) {
    if (value && value.alias) node.setValueForMode(modeId, figma.variables.createVariableAlias(vars.get(value.alias)));
    else if (typeof value === 'string' && value.startsWith('#')) node.setValueForMode(modeId, rgba(value));
    else node.setValueForMode(modeId, value);
  }
  return { collections: collections.map((c) => c.name), created: made };
}

// --- nodes -------------------------------------------------------------------
let VARS;
const paint = (p) => {
  const c = rgba(p.c);
  let out = { type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: p.a !== undefined ? p.a : 1, visible: !p.hide };
  const v = p.v && VARS.get(p.v);
  if (v) out = figma.variables.setBoundVariableForPaint(out, 'color', v);
  return out;
};
const fontsLoaded = new Set();
async function font(f) {
  const key = `${f.family}/${f.style}`;
  if (!fontsLoaded.has(key)) { await figma.loadFontAsync({ family: f.family, style: f.style }); fontsLoaded.add(key); }
  return { family: f.family, style: f.style };
}

const built = new Map(); // spec id -> component built in this part
async function component(id) {
  if (built.has(id)) return built.get(id);
  const name = REFS[id];
  if (!name) throw new Error(`no master known for ${id}`);
  const [setName, variant] = name.split(' :: ');
  const top = figma.currentPage.findOne((n) => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === setName && n.parent.type === 'SECTION');
  if (!top) throw new Error(`master "${setName}" is not built yet — run the parts in order`);
  return variant ? top.children.find((c) => c.name === variant) : top;
}
const propKey = (owner, name) => Object.keys(owner.componentPropertyDefinitions).find((k) => k.replace(/#[^#]*$/, '') === name);

function common(node, s) {
  if (s.vis === false) node.visible = false;
  if (s.op !== undefined) node.opacity = s.op;
  if (s.fills && 'fills' in node) node.fills = s.fills.map(paint);
  else if ('fills' in node && s.t !== 'TEXT' && s.t !== 'INSTANCE') node.fills = [];
  if (s.strokes) {
    node.strokes = s.strokes.map(paint);
    if (s.swi) [node.strokeTopWeight, node.strokeRightWeight, node.strokeBottomWeight, node.strokeLeftWeight] = s.swi;
    else node.strokeWeight = s.sw;
    if (s.sa) node.strokeAlign = s.sa;
  }
  if (s.sc) node.strokeCap = s.sc;
  if (s.sj) node.strokeJoin = s.sj;
  if (Array.isArray(s.r)) [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius] = s.r;
  else if (s.r) node.cornerRadius = s.r;
  if (s.fx) node.effects = s.fx.map((e) => { const c = rgba(e.c); return { type: e.t, color: { r: c.r, g: c.g, b: c.b, a: e.a }, offset: { x: e.x, y: e.y }, radius: e.r, spread: e.s, visible: true, blendMode: 'NORMAL' }; });
  if ('clipsContent' in node && s.t !== 'COMPONENT_SET') node.clipsContent = !!s.clip;
  if (s.desc) node.description = s.desc;
}
function layout(node, s) {
  if (!s.lm) return;
  node.layoutMode = s.lm;
  if (s.wrap) { node.layoutWrap = 'WRAP'; node.counterAxisSpacing = s.cgap; }
  [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft] = s.pad;
  node.itemSpacing = s.gap;
  node.primaryAxisAlignItems = s.pa; node.counterAxisAlignItems = s.ca;
}
function size(node, s) {
  if (s.t === 'TEXT') {
    if (s.tar === 'NONE' || s.tar === 'HEIGHT' || s.tar === 'TRUNCATE') node.resize(s.w, s.h);
    node.textAutoResize = s.tar;
    return;
  }
  if (!s.lm || s.psm === 'FIXED' || s.csm === 'FIXED') node.resize(Math.max(s.w, 0.01), Math.max(s.h, 0.01));
  if (s.lm) { node.primaryAxisSizingMode = s.psm; node.counterAxisSizingMode = s.csm; }
}
function place(node, s, parent) {
  const auto = parent && 'layoutMode' in parent && parent.layoutMode !== 'NONE';
  if (auto && s.abs) node.layoutPositioning = 'ABSOLUTE';
  if (!auto || s.abs) { node.x = s.x || 0; node.y = s.y || 0; }
  if (auto) {
    if (s.lsh) node.layoutSizingHorizontal = s.lsh;
    if (s.lsv) node.layoutSizingVertical = s.lsv;
  }
  // A fixed size set after a text's auto-resize quietly turns the auto-resize off.
  if (s.t === 'TEXT' && s.tar) node.textAutoResize = s.tar;
}

async function make(s, parent, owner) {
  let node;
  switch (s.t) {
    case 'COMPONENT': node = figma.createComponent(); break;
    case 'FRAME': node = figma.createFrame(); break;
    case 'TEXT': node = figma.createText(); break;
    case 'ELLIPSE': node = figma.createEllipse(); break;
    case 'RECTANGLE': node = figma.createRectangle(); break;
    case 'VECTOR': node = figma.createVector(); break;
    case 'INSTANCE': node = (await component(s.ref)).createInstance(); break;
    default: throw new Error(`cannot build a ${s.t} (${s.n})`);
  }
  parent.appendChild(node);
  node.name = s.n;
  if (s.t === 'COMPONENT' || s.t === 'COMPONENT_SET') built.set(s.id, node);
  if (s.t === 'COMPONENT' && s.defs) owner = node;
  if (s.t === 'INSTANCE') {
    place(node, s, parent);
    const props = {};
    for (const [name, value] of Object.entries(s.props || {})) {
      const key = Object.keys(node.componentProperties).find((k) => k.replace(/#[^#]*$/, '') === name);
      if (!key) continue;
      props[key] = value && value.ref ? (await component(value.ref)).id : value;
    }
    if (Object.keys(props).length) node.setProperties(props);
    for (const [path, chars] of s.texts || []) {
      let t = node; for (const i of path) t = t.children[i];
      await font(t.fontName); t.characters = chars;
    }
    if (s.lsh === 'FIXED' || s.lsv === 'FIXED' || !(parent.layoutMode && parent.layoutMode !== 'NONE')) node.resize(s.w, s.h);
    return node;
  }
  if (s.t === 'TEXT') {
    node.fontName = await font(s.font);
    node.fontSize = s.fs;
    if (s.lh) node.lineHeight = s.lh;
    if (s.ls) node.letterSpacing = s.ls;
    if (s.tc) node.textCase = s.tc;
    if (s.td) node.textDecoration = s.td;
    if (s.tah) node.textAlignHorizontal = s.tah;
    node.characters = s.chars;
  }
  if (s.t === 'VECTOR') node.vectorPaths = s.vp;
  common(node, s);
  layout(node, s);
  for (const k of s.kids || []) await make(k, node, owner);
  size(node, s);
  place(node, s, parent);
  return node;
}

// Component properties go on after the tree exists: a reference needs both the
// property and the node it drives.
function wire(node, s, owner) {
  if (s.cpr && Object.keys(s.cpr).length) {
    const refs = {};
    for (const [field, name] of Object.entries(s.cpr)) { const k = propKey(owner, name); if (k) refs[field] = k; }
    node.componentPropertyReferences = refs;
  }
  if (s.kids && 'children' in node && s.t !== 'INSTANCE') s.kids.forEach((k, i) => wire(node.children[i], k, owner));
}
async function defs(owner, list) {
  for (const d of list || []) {
    const value = d.value && d.value.ref ? (await component(d.value.ref)).id : d.value;
    owner.addComponentProperty(d.name, d.type, value);
  }
}

async function master(s) {
  let page = figma.root.children.find((p) => p.name === PART.page);
  if (!page) { page = figma.createPage(); page.name = PART.page; }
  await figma.setCurrentPageAsync(page);
  VARS = await variablesByName();
  let section = page.children.find((n) => n.type === 'SECTION' && n.name === s.section);
  if (!section) {
    section = figma.createSection(); section.name = s.section; page.appendChild(section);
    const bottom = Math.max(0, ...page.children.filter((n) => n !== section).map((n) => n.y + n.height + 300));
    section.x = 0; section.y = bottom;
    const fill = VARS.get('Rulebook/state/parked');
    section.fills = fill ? [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.925, g: 0.925, b: 0.925 } }, 'color', fill)] : [];
  }
  if (section.children.find((n) => n.name === s.n)) return { master: s.n, skipped: 'already on the page' };

  let node;
  if (s.t === 'COMPONENT_SET') {
    const variants = [];
    for (const v of s.kids) { const c = await make(v, section, null); variants.push(c); }
    node = figma.combineAsVariants(variants, section);
    node.name = s.n;
    built.set(s.id, node);
    common(node, s); layout(node, s);
    await defs(node, s.defs);
    s.kids.forEach((v, i) => wire(node.children[i], v, node));
    size(node, s);
  } else {
    node = await make(s, section, null);
    await defs(node, s.defs);
    wire(node, s, node);
  }
  node.x = s.x; node.y = s.y;
  const pad = 80;
  const right = Math.max(...section.children.map((n) => n.x + n.width)) + pad;
  const bottom = Math.max(...section.children.map((n) => n.y + n.height)) + pad;
  if (right > section.width || bottom > section.height) section.resizeWithoutConstraints(Math.max(section.width, right), Math.max(section.height, bottom));
  return { master: s.n, node: node.id, w: Math.round(node.width), h: Math.round(node.height) };
}

const results = [];
for (const [text] of PARTS) {
  PART = JSON.parse(text);
  results.push(PART.collections ? await buildVariables(PART.collections) : await master(PART.master));
}
return results;
