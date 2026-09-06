<!-- rule:design-first -->
## Design comes first

Development starts only after the relevant frame is approved. The order is
always **approved frame → implementation**; an exception is allowed only when
the user explicitly says the rule may be bypassed for this piece of work.

This module assumes Figma. The workflow generalises; the API traps at the end
do not.

<!-- rule:wip-section -->
### A new piece of work gets its own section on `WIP`

The production frames — the ones that describe every flow the product actually
has — are not the drafting surface, and they do not share a page with drafts.
A `WIP` page holds one section per open feature. **An empty `WIP` page means
everything drawn has reached the code.**

1. **Name the screens it touches** before drawing anything. That list is what
   gets promoted at step 4.
2. **Create a section** named `<state> WIP — <feature>` and draw the new
   versions inside it, copied from the production frames. The state is a
   coloured circle so it reads from the canvas and from the layers list:
   🟡 drawing, 🔵 waiting for approval, 🟢 in code, waiting for acceptance.

   The first thing in the section is a **`Brief` card**, and it is a table
   rather than a paragraph: a narrow left column of labels, dimmed so the
   answers are what reads, and these rows always in this order and always all
   present.

   - **what** — the feature in two or three sentences, as it will be
     experienced rather than as it will be built.
   - **why** — the question a person has that the product does not answer
     today. This is the row the format exists for: a `Brief` whose *why*
     restates its *what* has not been thought about yet.
   - **replaces** — the production frames this will be promoted over, or
     `Nothing — new screen` in as many words. Never left blank.
   - **entry points** — the files the implementation will touch, named as a
     proposal, so the size of the change is visible before anything is drawn.
   - **decided** — every decision taken with the user, one line each, appended
     as they happen.
   - **owner** — one name. The line of work that opened the section owns it,
     and other sections are left alone unless asked.
   - **state** — the same coloured circle as the section name, then the state
     in words and what is drawn so far.

   It is what makes a section left open for three weeks readable by someone who
   was not there, and the fixed row names are the point: prose lets a skipped
   question pass unnoticed, while an empty **why** is visible from across the
   canvas. Add the rows this project cannot brief a screen without — a game
   with a drawn scene wants `references` and `light`, a project with a design
   linter wants `audit`, holding the findings it declares deliberate. Adding a
   row is fine; dropping one is not.
3. **Check the section's own coordinates against the frames inside it.** A
   section can be created in one place while its frames sit far away and still
   be their parent; the section then reads as empty and its neighbours look
   free when they are not. After placing frames, assert that the section's
   `absoluteBoundingBox` contains every child's, and grow it if not.
4. **Promote only after the feature is accepted on a real build.** Move the
   current production frames to `Legacy`, put the new ones in their place, and
   delete the now-empty `WIP` section. Exploration — rejected options,
   comparison boards — goes to `Legacy` too: that is where the answer to "why
   is it like this?" belongs.

<!-- rule:archiving -->
### Archiving

Whenever a production frame is replaced:

1. Copy the current frame into `Legacy`, placed last in its row.
2. Rename the copy with a trailing `legacy-v1`, then `-v2`, and so on.
3. Continue work on **the original**. Remove a trailing `✅` from its name: it
   is no longer the approved version.

**Archive the copy, never the original.** Archiving the original gives the live
frame a new node id, which silently moves every design reference in the source
onto a frame that now sits in `Legacy`.

**A repair is not a replacement, and gets no copy.** `Legacy` answers "why is it
like this?", so it earns a copy only when the answer changes — different layout,
different content, a decision someone could argue with. Bringing a frame into
line with what was already decided is not that: a token applied where it was
missed, a padding never set, an invisible leftover removed. Nothing was decided
differently, so there is nothing to explain, and the copy is one more frame
between the reader and the ones that do explain something.

<!-- rule:placement -->
### Placement

Never place a frame by scanning `parent.children`. Build occupancy from
`absoluteBoundingBox` over page-level nodes **plus** the children of every
section, place against that, and re-scan afterwards to assert no overlaps.
`absoluteBoundingBox` can read stale for a node moved earlier in the same
script — place one frame per pass, or track the boxes yourself.

Keep the active frame's node id in the implementation source, so the code stays
traceable to the currently approved design.

<!-- rule:painting -->
### Painting: three traps that ship invisible text

None of these announces itself. The script returns success and the canvas looks
plausible until someone reads a label closely.

- **`node.fills` is `figma.mixed` on any text whose runs differ.** A sweep
  guarded by `Array.isArray(node.fills)` skips those nodes silently and reports
  the frame clean. Paint runs with `setRangeFills`, or read them first with
  `getStyledTextSegments(['fills'])`.
- **A paint bound to a colour variable still carries a literal underneath.**
  `setBoundVariableForPaint` overwrites the colour you built the paint from when
  it can resolve the variable, and leaves your placeholder when it cannot —
  silently, with the binding attached either way. So **never build a paint from
  a placeholder colour**; build it from the variable's own value, and there is
  no wrong literal to leak whichever way resolution goes.
- **A text node's own fill is not what it renders.** Characters carry per-run
  overrides, and when every character is overridden the base fill draws nothing.
  Reading it as a colour reports labels as broken that are on screen and
  correct. Resolve each character against `characterStyleOverrides` before
  judging anything. The leftover base is still worth clearing — it reappears the
  moment the label grows by one character — but it is a separate, non-blocking
  finding.

Text needs its own colour map, separate from shapes: white means the primary
text token, never a surface token. Dark text is correct only where the nearest
painted ancestor is an accent; anywhere else it is a bug.

**None of this is checked by eye, and there is a script for it.** It lives with
this module rather than in any one project, so a fault found once is found
everywhere:

```bash
node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-audit.mjs 850:670
```

Everything it needs to know about this project is in `.claude/rulebook.json`,
so the script itself belongs to nobody:

```json
"figma": {
  "file": "<file key>",
  "accentGrounds": ["#d8f36a"],
  "palette": ["#1a2b22"]
}
```

`accentGrounds` are the grounds on which dark text is legitimate — an accent, or
a brand tile carrying a letter chosen to stay legible on it. Light grounds need
no listing: they are recognised by luminance, because the next light surface
will not be on anybody's list. `palette` is every colour this design system
defines, used only to tell a leftover from this design apart from debris an
older one left behind. The token comes from `FIGMA_TOKEN` and from nowhere a
repository can reach.

Neither list is required. Without one the matching rule still runs and reports
more, and the run says which list was missing — a check that quietly ran on half
its inputs is worse than one that did not run at all.

**The token never has to live in the repository.** Where a project already keeps
it somewhere a person can set through a screen — an app's own settings file —
point at that instead, and the file key can come from the same place:

```json
"figma": {
  "configFile": "~/.config/<app>/settings.json",
  "tokenPath": "figma.token",
  "filePath": "figma.files.<name>"
}
```

**One token usually covers every project**, so the last resort is a machine-wide
one — the `env` block of Claude Code's own settings, which is also what puts
`FIGMA_TOKEN` into an agent's environment. One entry then serves both: the agent
gets it as a variable, and a person running the command by hand gets it from the
same place.

```json
// ~/.claude/settings.json
"env": { "FIGMA_TOKEN": "figd_..." }
```

The user-level file only. A project's own `.claude/settings.json` is committed,
and a token belongs in neither a commit nor a review.

Order of resolution, nearest first: `FIGMA_TOKEN` in the environment, then
`figma.tokenPath` inside `figma.configFile`, then `.env` in the working
directory, then that `env` block. Nothing read this way is printed: a failure
names the file and the key it looked under, never the value, and lists every
place it tried.

It exits 1 on a fault that gates a promotion, and prints a stale base fill
without failing, because nobody can see one. Run it before promoting a `WIP`
section.

Written 2026-08-23, the checker sat in exactly one repository, hard-coded to
that repository's Figma file, while these three traps were installed as text in
four. Everyone had the rule; one had the thing that enforces it.

<!-- rule:design-file-shared -->
### Frames are one file with one history

No branches, no merges. A `WIP` section belongs to the line of work that opened
it: put an `Owner:` line in its `Brief` and leave other sections alone unless
asked. A section renamed under its own brief — 🟢 on the canvas, "nothing is
built" in the words — is what ignoring that costs.
