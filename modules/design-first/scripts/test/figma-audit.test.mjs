/*
 * Runs figma-audit.mjs against invented canvases saved the way the REST API
 * would have answered, through --from. Nothing here touches the network or a
 * token. Every name, id and colour is made up.
 *
 *   node --test modules/design-first/scripts/test/figma-audit.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'figma-audit.mjs');

const rgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
  a: 1,
});
const solid = (hex, extra = {}) => ({ type: 'SOLID', color: rgb(hex), ...extra });
const bound = (hex) => solid(hex, { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:1' } } });
const box = (x, y, width, height) => ({ absoluteBoundingBox: { x, y, width, height } });

let serial = 0;
const id = () => `9:${(serial += 1)}`;

/* Light, token-bound text on a dark frame: nothing any rule should mind. */
const text = (characters, x, y, fill = bound('#f0f0f0')) => ({
  id: id(), type: 'TEXT', name: characters, characters, fills: [fill],
  style: { fontSize: 12 }, ...box(x, y, 200, 16),
});
const frame = (name, x, y, width, height, children = [], extra = {}) => ({
  id: id(), type: 'FRAME', name, fills: [bound('#101010')], children, ...box(x, y, width, height), ...extra,
});
const section = (name, x, y, width, height, children = [], sectionId = id()) => ({
  id: sectionId, type: 'SECTION', name, fills: [bound('#fafafa')], children, ...box(x, y, width, height),
});

function run(root, { page, rulebook } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-audit-'));
  const saved = join(dir, 'saved');
  mkdirSync(saved);
  writeFileSync(join(saved, 'nodes.json'), JSON.stringify({ nodes: { [root.id]: { document: root } } }));
  if (page) {
    writeFileSync(join(saved, 'file.json'), JSON.stringify({ document: { type: 'DOCUMENT', children: [page] } }));
  }
  if (rulebook) {
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'rulebook.json'), JSON.stringify({ figma: rulebook }));
  }
  const result = spawnSync(process.execPath, [SCRIPT, '--from', saved, root.id], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, FIGMA_TOKEN: '' },
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

test('--from audits a saved response without a token or a file key', () => {
  const root = frame('Screen / home', 0, 0, 400, 800, [text('Hello, runner', 16, 16)]);
  const { code, out } = run(root);
  assert.equal(code, 0, out);
  assert.match(out, /Clean: 1 frame\(s\) audited/);
});
