---
name: project-launch
description: >-
  The whole path of a product, from an empty folder to the stores, a landing
  page and the promotion after it — in order, each step marked as the user's or
  the agent's, each pointing at the procedure that already covers it. Read it
  when someone starts a product and asks for the plan, asks "what is left before
  launch?" or "what next?" on a project that keeps a LAUNCH.md, or wants a
  launch checklist. It installs LAUNCH.md into the project and keeps it current;
  the work itself still goes through the project's own rules and backlog.
---

# The launch path, written down once

`LAUNCH.md` beside this file is the plan: every step a product goes through,
from deciding what it is to the months of promotion after it is out. A project
gets its own copy at the root, next to `BACKLOG.md`, and the copy is where the
project's position on the path lives — what is done, what is struck out and
why, what is waiting on whom.

This file says how the copy is made and kept. The plan says what to do; the
procedures it points at say how — `agents-init` for the rules, `figma-new-file`
for the design file, the `apple` module for signing and devices. Nothing in the
plan retells them, so a fix to one of them is never contradicted here.

## Installing the copy

```bash
ls LAUNCH.md 2>/dev/null || cp ~/.claude/skills/agents-init/skills/project-launch/LAUNCH.md LAUNCH.md
```

**Never overwrite an existing `LAUNCH.md`** — it is the project's record of
what was decided, and the template knows none of it.

Then walk it once with the user, top to bottom, before anything else:

1. **Tick what is already true**, with the date it became true. Check the
   repository rather than asking where it can answer: an `AGENTS.md` with a
   stamp, the `figma` block in `.claude/rulebook.json`, an icon in the tree, a
   `Signing.local.xcconfig`, a bundle id in the project spec. Ask only about
   what lives in the user's accounts.
2. **Strike out what does not apply**, with the reason on the same line —
   `~~Mac App Store listing~~ — iPhone only, decided 2026-10-02`. A deleted
   line cannot be told from a forgotten one; a struck line can.
3. **Start the long waits now.** Steps marked ⏳ take days or weeks that no
   amount of work shortens — a developer account, a company, a name check, a
   store review. Name them in the report the day the copy is installed.

Commit the copy like any other file. It is a plan, not a secret, but on a
public repository read it once for anything that should not be public — a
client's name, a price not yet announced — before the commit leaves the
machine.

## Keeping it

- **Read it when the question is "what next?"** — together with `BACKLOG.md`.
  The plan says which phase the product is in; the backlog holds the work of
  that phase. A step that starts becomes backlog items; the step is ticked when
  its *done when* is true, not when its items are closed.
- **A step is ticked only on its own *done when*,** and with a date. "Started"
  is not a state the file has: a step that is half done is open.
- **Whose a step is, is marked on it**, and the marks are not decoration:
  - *you* — accounts, money, signatures, anything legal, anything published or
    sent outward, the first run on a device. The agent prepares, reminds and
    checks; it never does these, as the core rules say.
  - *agent* — drafted, built and checked by the agent, accepted by the user as
    any other work is.
  - *both* — the agent drafts, the user decides: a name, a price, a pitch.
- **Decisions go on the step's line**, one line each with the date, the way a
  WIP section's `decided` row works. The plan is where "why is it priced like
  this?" is answered a year later.
- **The order is by dependency, not by taste.** A step may move earlier; it may
  not move after something that needs it. Store screenshots need the demo seed;
  the landing needs the store link; the promotion needs the landing.

## The board in Figma

The same plan, drawn: `Launch checklist` in the person's shared Figma library
(figma-new-file, step 0), twelve phase cards of `Launch step` instances, each
with a `State` — `Open`, `Done`, `Struck` — an `Owner`, and `Long wait`. Its key
is `components.launchChecklist` in `~/.config/agents-rulebook/figma-library.json`,
next to the WIP masters, because the library is the person's and this
repository is public.

- **Without that library there is no board, and nothing is missing.** The
  key is read from the machine-local file; where the file, the key or the
  library's publication is absent, skip this section and say so in the
  report. `LAUNCH.md` is the whole plan on its own. A clone of this repository
  on someone else's machine has no access to anybody's library, and must not
  be sent looking for one.
- **Insert one instance per project** with `figma.importComponentByKeyAsync`,
  on a page of its own after the cover, and set each step's `State` from the
  project's `LAUNCH.md`. Set it through the nested instance's own properties —
  a detached copy stops receiving the library's corrections.
- **`LAUNCH.md` is the record; the board is its picture.** Tick the file
  first, then the board, in the same step. A board ahead of its file has
  nothing behind it.
- **A step added to the template is added to the board's master in the same
  change**, and the library published (a person's click). Instances pick it up
  when their files accept the update; their states on the old steps stay.

## When the template changes

The template is the canon; a project's copy is not synced with it the way
`AGENTS.md` is, because a copy is mostly ticks and decisions that no template
has. When the template gains a step, a project that is still before that phase
adds the line by hand; one past it ignores it. `sync-rulebook.mjs` does not
read `LAUNCH.md`.

## Why this exists

On 2026-10-02 the owner of one project — a native app and a web app, a few
weeks in, with the design file, the icon, signing and the first device run all
done — noticed they were reconstructing the whole path from memory every time
they started something: which accounts come first, what the store needs before
review, when the landing has to exist. Every piece had a procedure here; the
order between the pieces lived nowhere. This is that order, with the parts
nobody had written down yet — the store listing, the legal pages, the landing,
launch day, and the promotion that has to keep going after it.
