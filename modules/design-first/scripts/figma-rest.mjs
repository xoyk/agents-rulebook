/*
 * What every design-first script needs before it can ask Figma anything: the
 * project's `figma` settings, the file key, the token, and — for tests — the
 * saved answers that stand in for the network. It lived inside figma-audit.mjs
 * until a second script needed it; two copies of the token lookup would have
 * drifted the first time one of them learned a new place to look.
 *
 * Everything is read from the working directory, which is the project root:
 * the scripts live in the skill and carry no project's identity.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function flagValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

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

export const SAVED = flagValue('--from');

export function readSaved(name) {
  try {
    return JSON.parse(readFileSync(join(SAVED, name), 'utf8'));
  } catch {
    return null;
  }
}

export function readFileKey() {
  const flagged = flagValue('--file');
  if (flagged) return flagged;
  if (process.env.FIGMA_FILE_KEY) return process.env.FIGMA_FILE_KEY;
  if (FIGMA_CONFIG.file) return FIGMA_CONFIG.file;
  const external = fromExternal('filePath');
  if (external) return external;
  const match = readEnvFile().match(/^FIGMA_FILE_KEY=(.+)$/m);
  if (match) return match[1].trim();
  throw new Error(
    'No Figma file key. Pass --file <key>, set FIGMA_FILE_KEY, or add\n' +
    '  "figma": { "file": "<key>" }\nto .claude/rulebook.json.',
  );
}

/*
 * A project may keep its Figma credentials somewhere of its own — an app's
 * settings file, say, where a person can set the token through a screen instead
 * of editing a dotfile. Point at it with configFile plus a dot path, and the
 * token never has to be copied into the repository at all:
 *
 *   "figma": {
 *     "configFile": "~/.config/<app>/settings.json",
 *     "tokenPath": "figma.token",
 *     "filePath": "figma.files.<name>"
 *   }
 *
 * Nothing read this way is ever printed. A failure names the source it tried
 * and the path it looked under, never the value.
 */
function readExternalConfig() {
  const file = FIGMA_CONFIG.configFile;
  if (!file) return null;
  const path = file.replace(/^~(?=\/)/, homedir());
  try {
    return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return { path, data: null };
  }
}

const dig = (obj, dotted) =>
  dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function fromExternal(pathKey) {
  const dotted = FIGMA_CONFIG[pathKey];
  if (!dotted) return null;
  const ext = readExternalConfig();
  if (!ext) return null;
  if (!ext.data) {
    throw new Error(`${pathKey} points into ${ext.path}, which could not be read.`);
  }
  const value = dig(ext.data, dotted);
  if (typeof value !== 'string' || !value) {
    throw new Error(`${pathKey} found nothing at "${dotted}" in ${ext.path}.`);
  }
  return value;
}

export const FIGMA_CONFIG = (() => {
  try {
    return JSON.parse(readFileSync('.claude/rulebook.json', 'utf8')).figma ?? {};
  } catch {
    return {};
  }
})();

/*
 * One token usually covers every project a person works on, so the last resort
 * is a machine-wide one: the "env" block of Claude Code's own settings, which is
 * also what puts FIGMA_TOKEN into an agent's environment. The same entry then
 * serves both — the agent gets it as a variable, a person running the command by
 * hand gets it from here.
 *
 *   ~/.claude/settings.json     { "env": { "FIGMA_TOKEN": "figd_..." } }
 *
 * The user-level file only. A project's own .claude/settings.json is committed,
 * and a token belongs in neither a commit nor a review.
 */
function tokenFromClaudeSettings() {
  for (const name of ['settings.local.json', 'settings.json']) {
    try {
      const j = JSON.parse(readFileSync(join(homedir(), '.claude', name), 'utf8'));
      const v = j?.env?.FIGMA_TOKEN;
      if (typeof v === 'string' && v) return v;
    } catch {
      // absent or unreadable: try the next, then give up quietly
    }
  }
  return null;
}

export function readToken() {
  const fromEnv = process.env.FIGMA_TOKEN;
  if (fromEnv) return fromEnv;
  const external = fromExternal('tokenPath');
  if (external) return external;
  // The project's .env, read from the working directory. It used to be resolved
  // relative to this file, which was the project root only while the script was
  // vendored into the project; from the skill it would read the skill's own.
  const match = readEnvFile().match(/^FIGMA_TOKEN=(.+)$/m);
  if (match) return match[1].trim();
  const shared = tokenFromClaudeSettings();
  if (shared) return shared;
  throw new Error(
    'No Figma token. Any one of these, nearest first:\n' +
    '  FIGMA_TOKEN in the environment\n' +
    '  figma.tokenPath inside figma.configFile, in .claude/rulebook.json\n' +
    '  FIGMA_TOKEN in .env here\n' +
    '  "env": { "FIGMA_TOKEN": "..." } in ~/.claude/settings.json, which covers\n' +
    '  every project at once and is also how an agent gets it as a variable.',
  );
}

/* One GET against the REST API, with the error naming what was asked for. */
export async function figmaGet(path, what, key = readFileKey()) {
  const response = await fetch(`https://api.figma.com/v1/files/${key}${path}`, {
    headers: { 'X-Figma-Token': readToken() },
  });
  if (!response.ok) throw new Error(`Figma answered ${response.status} ${response.statusText} for ${what}`);
  return response.json();
}
