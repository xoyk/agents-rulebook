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

## 0. Instance from the shared library, when there is one

Masters every project needs — the WIP section's banner, `Brief`, row label,
caption and note, the state fills, the `Thumbnail` cover — are not rebuilt in
each file. They live once, in a library file published to the person's team,
and a project instances them by key (`figma.importComponentByKeyAsync`). Built
per file, they drifted within a day: on 1 October 2026 Pult's cover was rebuilt
twice in an afternoon to catch up with a canon its neighbours had already
followed, while Budgy and chesswall each carried their own copy of the same
masters.

The library is the person's, not the canon's, so its keys live outside this
public repository, next to the registry:

```json
// ~/.config/agents-rulebook/figma-library.json
{
  "library": { "name": "Rulebook Kit", "file": "<file key>", "team": "<team>", "published": true },
  "space": "many-projects",
  "components": { "banner": "<key>", "brief": "<key>", "rowLabel": "<key>",
                  "caption": "<key>", "note": "<key>", "thumbnail": "<key>",
                  "coverIconSlot": "<key>", "coverPictureSlot": "<key>" }
}
```

- **Read it first.** No file, or `published: false`, and the steps below fall
  back to building the masters in the file's own `Kit` page, as before — and the
  report says the library was not used, and why.
- **Publishing is a person's click**, in Figma's Assets panel: the Plugin API
  cannot publish, and an unpublished component cannot be imported by key. The
  report that changes a master puts *Publish the library* under `Needed from
  you`, and a file only sees the change once it accepts the library update.
- **A library reaches its own team only** on Figma's Professional plan. A
  project in another team builds its kit locally until the plan or the file
  moves.

## 1. The plan is the user's word

Create the file in the team or organisation the user names. When the account
belongs to more than one plan, ask — never pick the one that looks right. Pult's
account had eight.

## 2. Pages, in this order

| Page | Holds |
|---|---|
| `Cover` | One frame, `Cover`, holding the `Thumbnail` instance — see step 5. First, so the file opens on it. |
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
a teammate sees of the project. **It is an instance of a `Thumbnail` component
from the kit, never a drawing.** Covers drawn by hand in each file drift apart —
one grows a gradient, another a different pill, a third a size of its own — and
fixing them means visiting every file; a component is fixed once and every file
follows on the next library update.

The component is a 1280×720 card, and a thumbnail is read at a tenth of that
size, among its neighbours. So it carries two large things and one small one:

- a **name**, large — the one word that tells this file from the files beside
  it, as a text property;
- a **picture**, large — a piece of the product itself: one or two real frames
  from the file's production page, cloned into a `Picture` frame and allowed to
  run off the edge. Not an illustration of the product, the product;
- a **note**, small — one short line saying what the file holds, as a text
  property;
- the **app icon**, above the name — **always**, not only when there is
  nothing to photograph. On 1 October 2026 Pult's cover was built without it
  and the user asked for it back: the icon is how the product is recognised
  everywhere else, in the Dock and the menu bar.

From the library, the icon and the picture are **instance-swap properties**: the
project makes two components of its own, `Cover icon — <project>` (220×220, the
app icon itself) and `Cover picture — <project>` (900×760, the cloned frames),
and swaps them into the `Thumbnail` instance. The ground comes from the
library's `Cover` collection — a `Light` and a `Dark` mode, chosen on the
instance — and a light ground is the default: on 1 October 2026 a dark app icon
on a dark cover disappeared into it.

**What the name is depends on how the design space is arranged**, which is
asked at install and kept in `figma.space`:

| `figma.space` | The files beside this one are | The name is | The note is |
|---|---|---|---|
| `many-projects` | other products — one person's or one studio's apps, a file each | the project | what the file holds: `iOS · web · landing` |
| `one-project` | other files of the same product or product line | what this file is: `Library`, `Emails` | the product line, as a pill — one variant per line, the `Product` property, its text fixed by the variant rather than typed |

**The cover never says what every neighbour also says.** In a space of many
projects that word is "design": every file there is one. In a space of one
project it is the product's name. On 30 September 2026 Budgy's cover was built
to the earlier version of this step — a pill, a title in two lines, an emoji —
and read `Budgy 3.0` / `Product — design`, with the mark beside it. Its owner
keeps every app he builds in one Figma project, a file each, so the browser
would have shown a row of covers all saying "Product design" in type four times
the size of the only word that differed. That version had been written where
one product spans many files, and there it was right; nothing in it said so,
and nothing asked which case this was.

**The picture is a clone, so it goes stale.** It shows the product as it was the
day the cover was made. Replace the frames inside `Picture` when the product
changes its face; the component's `description` says so, because nobody
remembers a cover has a date.

**A file with nothing to photograph yet** — a new project, a library of tokens —
carries the product's mark in the picture's place, large, and gets its picture
when the first screen is approved. An emoji stands in only where there is no
mark either.

**A glyph drawn by a colour font ignores the fill it is given, silently.** The
fill reads back as the colour that was set, and the glyph renders in the colour
font's own palette, so nothing in the API says anything is wrong. On
29 September 2026 chesswall's mark — ♟, `U+265F` — came out near-black on a
near-black ground — it was the emoji of the cover as this step then described
it — and none of the usual symbol families (`Apple Symbols`,
`Arial Unicode MS`, `Noto Sans Symbols 2`) was installed to switch to: the
renderer substitutes one of its own, and the choice is not the plugin's to make.
So do not paint a mark like this. **Seat it on a tile whose fill you do
control** — chesswall's sits on a light board square, which is also the product's
own motif — and confirm it in a screenshot, because the property values cannot
tell you.

Colours come from the file's own variables, so the cover is in the product's
palette and not in a palette of its own. Where `figma.space` is `one-project`,
the collection has **one mode per product line** and each variant sets its own
mode, so a colour is changed in one place; which line a file belongs to follows
the project or folder it sits in, and the bindings name them. A tint is a solid
colour, never an overlay at some opacity.

**Wrap the instance in a plain frame.** Figma offers *Set as thumbnail* on a
top-level frame and not on an instance, so the cover page holds a frame named
after it, with the instance inside at 0,0 — measured on 29 September 2026.

**Setting it as the thumbnail is a manual step.** The Plugin API has
`setFileThumbnailNodeAsync`, and `use_figma` refuses it — measured on
28 September 2026: `"setFileThumbnailNodeAsync" is not a supported API`. So the
report that finishes the setup puts it under `Needed from you`: right-click the
frame → *Set as thumbnail*. Without that line the cover exists and nobody sees
it.

**Keep the frame the thumbnail points at.** The thumbnail is a reference to a
node: delete that frame and the file falls back to Figma's default preview. A
cover is changed inside its frame — the instance swapped or its properties
edited — never by deleting the frame and placing a new one.

## 6. The kit

**With the library, the file's `Kit` page holds only the product's own
masters** — the app shell, the controls the product invents — and the cover
components of step 5. Everything below about building the WIP masters applies
only without one.

Build the masters figma-wip-section instances — banner with a state pill,
`Brief` with its row master, row label, caption, note — on a `Kit — WIP section
masters` section, and the app shell every screen is drawn in on `Kit — shared
app masters`, and the `Thumbnail` cover component of step 5 beside them — the
one master a new file needs before anything else, since its own cover is an
instance of it. Every master's `description` says it is unpublished. Then build
one section *template* from them, so the first feature section is a duplicate
and not another assembly by hand.

## 7. Write the bindings back

Into the project's `.claude/rulebook.json`, as figma-wip-section's *Bindings*
lists them: `figma.file`, `figma.space` — `many-projects` or `one-project`, the
answer given at install, which step 5 reads — `palette`, `accentGrounds`, and
the `wip` block with
the master and kit node ids, the font and the state variables. Then run the
audit on the kit section: it is the first thing in the file it can check.

## Traps met while doing this

- **A section's children are positioned relative to the section, not to the
  page.** Setting a child's `x` to the section's own `x` plus a padding puts it
  that far outside — and a section does not clip, so the content renders on bare
  canvas beside its section and the section reads as empty. The audit calls this
  `content outside its section`; it is the same fault whether the cause was a
  resize or an arithmetic habit carried over from page-level nodes.
- **Grid auto-layout tracks default to `FLEX`, which collapses a hugging
  container to its gaps.** `FLEX` tracks divide space the container does not
  have when it hugs, so a two-track caption-and-frame grid measured 120 × 100 —
  exactly its column and row gap — while its children were 660 × 760 and hung
  outside it. The valid track types are `FLEX | FIXED | HUG` (not `AUTO`), so
  set both axes explicitly before hugging:

  ```js
  frames.gridColumnSizes = [{ type: 'HUG' }, { type: 'HUG' }]
  frames.gridRowSizes    = [{ type: 'HUG' }, { type: 'HUG' }]
  frames.layoutSizingHorizontal = 'HUG'
  frames.layoutSizingVertical   = 'HUG'
  ```

- **`gridRowAnchorIndex` and `gridColumnAnchorIndex` are read-only on an
  INSTANCE**, so a grid whose cells are instances cannot be addressed by
  coordinates at all. Append the children in row-major order instead — both
  captions, then both frames — and let auto-placement fill the tracks. Both were
  measured on 29 September 2026 building chesswall's section template, where the
  cells are caption instances above frames.
- **`use_figma` skips hidden layers inside instances.** Its
  `skipInvisibleInstanceChildren` is on, so a layer hidden in a master is
  absent from an instance's `children` and `findAll` — a script that shows a
  third keycap finds two and quietly does nothing. Set it to `false` before
  touching hidden layers.
- **`resize()` resets both sizing modes to `FIXED`.** Set `AUTO` after it, never
  before, or a card stops growing with its text and the next node lands on it.
