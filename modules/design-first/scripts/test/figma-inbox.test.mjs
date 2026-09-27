import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'figma-inbox.mjs');

const box = (x, y, width, height) => ({ absoluteBoundingBox: { x, y, width, height } });
const frame = (id, name, x, y, w = 600, h = 600, children = []) => ({ id, type: 'FRAME', name, children, ...box(x, y, w, h) });
const text = (id, characters, x, y) => ({ id, type: 'TEXT', name: characters, characters, ...box(x, y, 400, 48) });

/*
 * Two rows of two frames, laid out the way a WIP section lays them out: the
 * content node at 120,120 inside the section, row A above row B.
 *
 *   A1 at 120,200   A2 at 840,200
 *   B1 at 120,1000  B2 at 840,1000
 */
function section({ name = '🔵 WIP — Icon', devStatus, rejectC = false } = {}) {
  const rows = [
    frame('2:1', 'A1 · Full size', 120, 200),
    frame('2:2', 'A2 · Small sizes', 840, 200),
    frame('2:3', 'B1 · Full size', 120, 1000),
    frame('2:4', 'B2 · Small sizes', 840, 1000),
    frame('2:5', 'C1 · Full size', 120, 1800),
    text('2:6', rejectC ? '🧪 C · Rejected — the numeral' : 'C · The numeral', 120, 1740),
  ];
  const content = frame('1:2', 'Section content', 120, 120, 1400, 2400, rows);
  return { id: '1:1', type: 'SECTION', name, children: [content], ...box(0, 0, 1640, 2640), ...(devStatus ? { devStatus: { type: devStatus } } : {}) };
}

const comment = (id, message, client_meta, extra = {}) => ({
  id, message, client_meta, created_at: '2026-09-28T10:00:00Z', resolved_at: null, parent_id: '', user: { handle: 'Reviewer' }, ...extra,
});

/* A frame drawn around A1, stored the way Figma stores it: pin at bottom right, offset from the content node. */
const aroundA1 = { node_id: '1:2', node_offset: { x: 720 - 120 + 10, y: 800 - 120 + 10 }, region_width: 620, region_height: 620, comment_pin_corner: 'bottom-right' };

function run(sec, comments, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-inbox-'));
  const saved = join(dir, 'saved');
  mkdirSync(saved);
  const page = { id: '0:1', type: 'CANVAS', name: 'WIP', children: [{ id: sec.id, type: 'SECTION', name: sec.name }] };
  writeFileSync(join(saved, 'file.json'), JSON.stringify({ document: { type: 'DOCUMENT', children: [page] } }));
  writeFileSync(join(saved, 'nodes.json'), JSON.stringify({ nodes: { [sec.id]: { document: sec } } }));
  writeFileSync(join(saved, 'comments.json'), JSON.stringify({ comments }));
  const result = spawnSync(process.execPath, [SCRIPT, '--from', saved, ...args], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, FIGMA_TOKEN: '' },
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

test('a frame pinned at its bottom right is read up and left from the pin', () => {
  const { code, out } = run(section({ devStatus: 'READY_FOR_DEV' }), [comment('c1', 'take this one', aroundA1)]);
  assert.equal(code, 0, out);
  assert.match(out, /frames A1\n/);
  assert.match(out, /choice: row A of A, B, C/);
  assert.doesNotMatch(out, /B2/);
});

test('a frame pinned at its top left is read down and right', () => {
  const meta = { node_id: '1:2', node_offset: { x: 710, y: 70 }, region_width: 620, region_height: 620, comment_pin_corner: 'top-left' };
  const { out } = run(section(), [comment('c1', 'this', meta)]);
  assert.match(out, /frames A2\n/);
});

test('a frame across two rows picks nothing and says so', () => {
  const meta = { node_id: '1:2', node_offset: { x: 620, y: 1500 }, region_width: 620, region_height: 1420, comment_pin_corner: 'bottom-right' };
  const { out } = run(section({ devStatus: 'READY_FOR_DEV' }), [comment('c1', 'these?', meta)]);
  assert.match(out, /frames A1, B1 — more than one row/);
  assert.match(out, /choice not framed/);
});

test('two comments choosing different rows make the choice unclear', () => {
  const aroundB1 = { ...aroundA1, node_offset: { x: 610, y: 1490 } };
  const { out } = run(section({ devStatus: 'READY_FOR_DEV' }), [comment('c1', 'A', aroundA1), comment('c2', 'no, B', aroundB1)]);
  assert.match(out, /choice unclear: comments frame rows A and B/);
});

test('an approval without a framed choice falls back to the Brief, and a rejected row is not a candidate', () => {
  const { out } = run(section({ devStatus: 'READY_FOR_DEV', rejectC: true }), []);
  assert.match(out, /approved in Figma — flip the section to 🟢/);
  assert.match(out, /choice not framed: 2 live rows \(A, B\)/);
});

test('the flag and the name together say whose move it is', () => {
  assert.match(run(section(), []).out, /flag: none\n  → waiting for approval/);
  assert.match(run(section({ name: '🟢 WIP — Icon', devStatus: 'COMPLETED' }), []).out, /accepted on a build — promote/);
  assert.match(run(section({ name: '🟢 WIP — Icon' }), []).out, /🟢 without the flag/);
  assert.match(run(section({ name: '🧩 Kit', devStatus: 'READY_FOR_DEV' }), []).out, /Ready for dev on a section named 🧩 — ask/);
});

test('resolved comments are left out, replies follow their comment', () => {
  const { out } = run(section(), [
    comment('c1', 'old', aroundA1, { resolved_at: '2026-09-28T11:00:00Z' }),
    comment('c2', 'current', aroundA1),
    comment('c3', 'agreed', null, { parent_id: 'c2', created_at: '2026-09-28T12:00:00Z' }),
  ]);
  assert.doesNotMatch(out, /«old»/);
  assert.match(out, /«current»\n      ↳ Reviewer · 2026-09-28 12:00: «agreed»/);
});

test('a bare pin picks the lettered frame under it', () => {
  const meta = { node_id: '1:2', node_offset: { x: 1000, y: 1200 } };
  assert.match(run(section(), [comment('c1', 'here', meta)]).out, /frames B2\n/);
});

test('a frame around something unlettered names what it covers', () => {
  const meta = { node_id: '1:2', node_offset: { x: 420, y: 1680 }, region_width: 420, region_height: 60, comment_pin_corner: 'bottom-right' };
  const sec = section();
  sec.children[0].children.push(frame('2:9', 'Note', 110, 1740, 440, 70));
  assert.match(run(sec, [comment('c1', 'this note', meta)]).out, /covers no lettered frame — it covers Note/);
});
