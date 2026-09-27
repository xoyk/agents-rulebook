---
name: figma-new-file
description: >-
  How a project's Figma file is set up from nothing — the plan it goes in, the
  pages and their order, the state variables, the kit masters a WIP section
  instances, the cover, and the bindings written back into the project. Read it
  when a project with the design-first module has no Figma file yet, or when a
  file exists but has no WIP page, no kit or no cover. How a section is built
  once the file exists is figma-wip-section, next to this one.
---

# A fresh Figma file, set up once

The design-first rule assumes a file with a `WIP` page, a kit to duplicate
sections from and bindings in `.claude/rulebook.json`. A project that installs
the module has none of that, and nothing said how to get it: on 27 September
2026 Pult's file was assembled by hand, step by step, and each step below is
one that was either done then or found missing the day after.

This file is a tool of the design-first module, read from the skill directory
and never copied into a project:

```text
~/.claude/skills/agents-init/modules/design-first/skills/figma-new-file/SKILL.md
```

## 1. The plan is the user's word

Create the file in the team or organisation the user names. When the account
belongs to more than one plan, ask — never pick the one that looks right. Pult's
account had eight.

## 2. Pages, in this order

| Page | Holds |
|---|---|
| `Cover` | One frame, `Cover` — see step 5. First, so the file opens on it. |
| `WIP` | One section per open feature. Empty means everything drawn is in the code. |
| `Production` | The frames that describe every flow the product has. |
| `Legacy` | Replaced frames and rejected exploration. |
| `Kit` | The section masters and the shared app masters, until a library exists. |

## 3. Variables before anything is painted

One collection. The state fills go in first, because every section paints with
them: `state/drawing`, `state/review`, `state/approved`, `state/parked` for the
section grounds, and a stronger `state-dot/*` of each for the dot in the banner
and the `Brief`. Then the product's own tokens. Set `scopes` on every variable.

## 4. Check the font before building on it

**A font `listAvailableFontsAsync` returns can still be missing to the
renderer.** Build one throwaway component with a text property in the product's
font, instance it, and call `setProperties` on the instance. On 27 September
2026 SF Pro was listed, reported `hasMissingFont: true`, and failed exactly
there — after a kit script had already half-run and rolled back. When the font
fails, use a stand-in and write both into `figma.wip.font`, so the next reader
knows the frames are not in the shipping face.

Emoji do not render in the server's screenshots either, which is why the state
is a dot bound to a `state-dot/*` variable rather than 🟡 in a text layer. The
emoji stay in section *names*, where Figma's own UI draws them.

## 5. The cover

The cover is what the file browser shows for the file, so it is the first thing
a teammate sees of the project. It holds:

- the product's name, large;
- one line saying what the product is;
- what exists so far — the modules, the platforms — as short labels;
- one real screen of the product, cloned from a frame and scaled.

**Invented data only.** The cover is the most shared picture in the file, and
the rule on public data applies to it in full. Clone from a frame that already
obeys it, never from a screenshot of the running product.

**Size 1920×960**, the Community cover size; keep the name and the line away
from the edges, since the browser may crop the thumbnail.

**Setting it as the thumbnail is a manual step.** The Plugin API has
`setFileThumbnailNodeAsync`, and `use_figma` refuses it — measured on
28 September 2026: `"setFileThumbnailNodeAsync" is not a supported API`. So the
report that finishes the setup puts it under `Needed from you`: right-click the
`Cover` frame → *Set as thumbnail*. Without that line the cover exists and
nobody sees it.

Redraw the cover when what it names changes — a module promoted, a platform
added. A cover that lists last quarter's product is worse than the default grey.

## 6. The kit

Build the masters figma-wip-section instances — banner with a state pill,
`Brief` with its row master, row label, caption, note — on a `Kit — WIP section
masters` section, and the app shell every screen is drawn in on `Kit — shared
app masters`. Every master's `description` says it is unpublished. Then build
one section *template* from them, so the first feature section is a duplicate
and not another assembly by hand.

## 7. Write the bindings back

Into the project's `.claude/rulebook.json`, as figma-wip-section's *Bindings*
lists them: `figma.file`, `palette`, `accentGrounds`, and the `wip` block with
the master and kit node ids, the font and the state variables. Then run the
audit on the kit section: it is the first thing in the file it can check.

## Two traps met while doing this

- **`use_figma` skips hidden layers inside instances.** Its
  `skipInvisibleInstanceChildren` is on, so a layer hidden in a master is
  absent from an instance's `children` and `findAll` — a script that shows a
  third keycap finds two and quietly does nothing. Set it to `false` before
  touching hidden layers.
- **`resize()` resets both sizing modes to `FIXED`.** Set `AUTO` after it, never
  before, or a card stops growing with its text and the next node lands on it.
