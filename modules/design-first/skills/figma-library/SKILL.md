---
name: figma-library
description: >-
  Builds the design-first masters — the WIP section's banner, Brief, row label,
  caption and note, the cover, the launch checklist — into a Figma file from
  this repository, for a person who has no library yet or a project that keeps
  its masters locally; and, for whoever maintains the canon, writes changed
  masters back into the repository. Read it before figma-new-file's step 0 when
  ~/.config/agents-rulebook/figma-library.json is absent, and whenever a shared
  master changes.
---

# The library, rebuilt from the repository

The masters every project instances live in a person's Figma library. A library
is the person's — its file, its team, its keys — and nobody else can open it.
What makes the masters everybody's is `../../figma/spec.json`: every master as
data, and the scripts beside it that turn the data back into the masters in any
file. One person's library is one build of it.

```text
modules/design-first/figma/
  spec.json       the masters and the variables they paint with
  bundle.mjs      prints the use_figma code that builds them
  build.js        the builder bundle.mjs wraps around the spec
  keys.js         reads the keys of a built, published library
  dump.js         writes a library's masters back into a spec
  fetch-text.mjs  brings the spec out of Figma (see dump.js)
  cleanup.js      removes what dump.js left behind
skills/project-launch/board.mjs   the launch checklist, built from LAUNCH.md
```

Everything here runs through the `use_figma` tool: the code a script prints is
the code passed to the tool, unchanged. The parts carry a checksum, and a part
that arrives altered is refused before anything is drawn.

## A library of your own

For a person setting the kit up, once per machine.

1. **A file in your team.** Create an empty design file, in the team whose
   projects will use it — a library reaches its own team only on Figma's
   Professional plan. Name it as you like.
2. **The masters.** Pass the output of

   ```bash
   node ~/.claude/skills/agents-init/modules/design-first/figma/bundle.mjs 0-10
   ```

   to `use_figma` for that file (`--list` shows the parts; the whole set fits in
   one call). It creates the variables, a `Components` page and the masters in
   their sections. Re-running is safe: a master already there is left alone.
3. **The launch board** — the output of `skills/project-launch/board.mjs`.
4. **Check it**: `figma-audit.mjs --file <key>` on the three sections.
5. **Publish** — a person's click, in the Assets panel. The Plugin API cannot
   publish, and nothing can be imported by key until it is.
6. **Write the keys down.** Run `keys.js` with `use_figma`, and write what it
   returns into `~/.config/agents-rulebook/figma-library.json` as
   `components`, with `library.file`, `library.team` and `published: true`.
   That file is this machine's; the keys never go into a repository.

From then on figma-new-file and figma-wip-section instance from the library
by key, as they describe.

## A project with no library

Nothing to set up first. Build the masters into the project's own file, on its
`Kit` page, and instance them from there:

```bash
node ~/.claude/skills/agents-init/modules/design-first/figma/bundle.mjs 0-10 --page Kit
node ~/.claude/skills/agents-init/skills/project-launch/board.mjs --page Kit
```

Without `figma-library.json`, this is the path figma-new-file takes, and the
report says the masters are local because there is no library on this machine.

## Changing a master — for whoever maintains the canon

A master is changed in the library, never in `spec.json` by hand, and the spec
is then written from the library:

1. Change the master in the library file; publish.
2. Run `dump.js` with `use_figma` in the library. It writes the spec into a
   text layer and returns that layer's id — the tool's answer is cut at about
   20 kB, and the spec is larger, so it is not returned.
3. `FIGMA_TOKEN=… node fetch-text.mjs <library-file-key> <layer-id> > spec.json`
   — the layer's text over the REST API, byte for byte.
4. Run `cleanup.js` with `use_figma` to remove the layer.
5. `node --test` — the library tests check the spec is whole and every part
   still bundles — and `node scripts/privacy-guard.mjs`. Commit `spec.json`
   with the reason the master changed.

The launch board is the exception: it is not in the spec. It is built from
`LAUNCH.md`, so a step changes there and `board.mjs` is run again. It updates
the board in place, matching steps by their text, because each project's ticks
are held against the step's node: a step that stays keeps its node and its
ticks; a step renamed is a new step.

## Why

On 2026-10-03 this repository was public, and its design-first procedures
assumed one library that only its owner could open: on anybody else's machine
the fallback was "build the masters in your Kit page" with nothing to build
them from. The masters were turned into data the same day, and a fresh file
rebuilt from that data was dumped again and compared with the original line by
line: two differences, both fixed — descriptions Figma escapes twice, and a
text's auto-resize that a fixed size quietly switches off.
