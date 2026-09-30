<!-- rule:design-first -->
## Design comes first

Development starts only after the relevant frame is approved. The order is
always **approved frame → implementation**; an exception is allowed only when
the user explicitly says the rule may be bypassed for this piece of work.

This module assumes Figma. The workflow generalises; the API traps at the end
do not.

A project with no Figma file yet sets one up first — pages, state variables,
kit, cover — as the module's second tool says:

```text
~/.claude/skills/agents-init/modules/design-first/skills/figma-new-file/SKILL.md
```

<!-- rule:wip-section -->
### A new piece of work gets its own section on `WIP`

The production frames — the ones that describe every flow the product actually
has — are not the drafting surface, and they do not share a page with drafts.
A `WIP` page holds one section per open feature. **An empty `WIP` page means
everything drawn has reached the code.**

What follows is what a section must *say*. What it must *look like* — the
template it is duplicated from, the masters it instances, the layout grid, the
fill that shows its state, the links — is a tool of this module, read from the
skill directory rather than copied here:

```text
~/.claude/skills/agents-init/modules/design-first/skills/figma-wip-section/SKILL.md
```

Read it before opening or reshaping a section. It takes this project's file,
template, masters and colours from the `figma.wip` block of
`.claude/rulebook.json`, and a section is not built by hand from primitives
while a template exists.

1. **Name the screens it touches** before drawing anything. That list is what
   gets promoted at step 4.
2. **Create a section** named `<state> WIP — <feature>` and draw the new
   versions inside it, copied from the production frames. The state is a
   coloured circle so it reads from the canvas and from the layers list:
   🟡 drawing, 🔵 waiting for approval, 🟢 approved — ready to code, and green
   from then on, through implementation and acceptance on a build. The state
   says whose move it is, so it only moves forward: once the approval has been
   given the section never goes back to 🔵. A correction or a repair inside an
   approved section is not a new request for approval and leaves the state
   alone.

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
     in words and how far the work has got: what is drawn, and once the
     section is green, what is built and whether it has been accepted. A
     section that compares options names the one the agent recommends here,
     before it turns 🔵: that is what an approval with no framed choice takes.

   It is what makes a section left open for three weeks readable by someone who
   was not there, and the fixed row names are the point: prose lets a skipped
   question pass unnoticed, while an empty **why** is visible from across the
   canvas. Add the rows this project cannot brief a screen without — a game
   with a drawn scene wants `references` and `light`, a project with a design
   linter wants `audit`, holding the findings it declares deliberate. Adding a
   row is fine; dropping one is not.

   **A project with a tracker adds a `ticket` row**, straight after **entry
   points**. It is optional in the canon — a project without a tracker has
   nothing to put there, and leaving it out drops nothing — and once a project
   has added it, it is as mandatory as the rest. It names the tracker's issue
   for the feature the design is a phase of: that one issue, never a second,
   design-only one beside it, because two issues for one piece of work drift
   apart and only one of them gets read. **The section's state and the issue's
   status then move together, in the same step:** the flip to 🔵 moves the
   issue to its review status, the flip to 🟢 moves it to development, and
   neither moves back. The tracker is what the rest of the team reads, and an
   issue left behind tells them the wrong thing — one project had a feature
   sitting in its briefing status with four rows of frames already handed over
   for review.
3. **Check the section's own coordinates against the frames inside it.** A
   section can be created in one place while its frames sit far away and still
   be their parent; the section then reads as empty and its neighbours look
   free when they are not. After placing frames, assert that the section's
   `absoluteBoundingBox` contains every child's, and grow it if not.
4. **Promote only after the feature is accepted on a real build.** A green
   section is approved, not accepted: green says the next move is the code's,
   and acceptance is the user's word on the running build. Then move the
   section's own components to the design library, as the next section sets
   out; move the current production frames to `Legacy`, put the new ones in
   their place, and delete the now-empty `WIP` section. Exploration —
   rejected options, comparison boards — goes to `Legacy` too: that is where
   the answer to "why is it like this?" belongs.

<!-- rule:approval-signal -->
### Approval is a flag, a choice is a framed comment

The user answers a section on the canvas, not in the chat, and in two gestures
only:

- **Ready for dev on the section is the approval.** It is the one flag Figma
  gives every section, so there is nothing to remember and nothing to type.
  There is no second flag. **Acceptance on a build — the word step 4 above
  waits for before promoting — is the user's word in the chat**, said after
  running the build, because a build is where it is judged and the canvas is
  not.
- **A comment framed around a frame is a choice** among the options a section
  compares, and a comment framed around anything else is a remark about that
  thing. The text can be anything; the frame is what says which option.

The user sets the flag; the agent does everything that follows from it — the
flip to 🟢, the `decided` line with the date and the comment quoted, fading the
rows that lost. So the page stays a status board with one colour of work on
it: blue waits for the user, green does not, and the two gestures are all it
takes to move one to the other.

**Neither is visible to the plugin API**, which has no comments and refuses
`devStatus`. Both are read over REST, by the module's inbox:

```bash
node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-inbox.mjs [section-id...]
```

It prints, per section on the `WIP` page, the state the name claims, the flag
Figma holds, what follows from the two, and every open comment with the frames
it covers by their letters. **Run it at the start of any session that touches
design, and before changing a section**: a comment's frame is stored against a
node as it is now, so a section rebuilt after the comment moves the frame with
it.

- **An approval with more than one live row and no framed choice is not a
  choice.** Take the recommendation the `Brief` states — a section with options
  always states one — or ask. Never pick the likeliest-looking one.
- **A frame over two rows, or two comments framing different rows, is a
  question**, and the inbox prints it as one.
- **A comment is answered in the section**, in `decided`, not by replying in
  Figma: a reply posts under the user's own name, and that is theirs to do.

On 2026-09-28 in 4FH the first approval arrived this way — Ready for dev on the
icon section, and a comment framed around option A. The agent read the text
alone and reported that no option was named; then read the frame from its top
left, when Figma stores it from the corner its pin sits on, landed on B2, and
reported the choice as B. The user had to send a screenshot to get A. The
inbox's first test is that frame.

This section used to name a second flag, *Completed*, as the acceptance. It got
into the canon by accident: none of the plans these projects live on offers it.
On 2026-09-28 the rule asked one user for a status their plan could not set, and
the first answer was to have each such project declare an override. By
2026-09-30 the projects were opting out of the same sentence one by one, and a
rule every copy has to opt out of is not a rule, so the sentence went instead.

<!-- rule:component-promotion -->
### A section's components are promoted with it

While a feature is being drawn, the components it invents live as local
masters inside its `WIP` section. That is right: they are not agreed yet, and an
unapproved component has no business in anyone's asset panel. It stops being
right at promotion. Frames that reach production still pointing at masters in a
`WIP` section depend on a draft that is about to be deleted.

So the masters go first, in this order:

1. Publish the section's new components to the shared design library.
2. Re-point the section's instances at the published versions.
3. Move the frames into production, as in step 4 above.
4. Delete the local masters nothing instantiates any more. Keep only those a
   `Legacy` or rejected section still needs in order to render.

**Copy the masters into the library, never cut them.** Cutting looks like the
same move and is not: every instance still pointing at a cut master is left
pointing at a component that no longer exists, and Figma gives no warning — the
frames look exactly as they did until somebody fixes the component and the fix
reaches none of them. A copy leaves the old instances whole until step 2 has
moved them, and step 4 deletes what is left once nothing depends on it.

<!-- rule:archiving -->
### Archiving

Whenever a production frame is replaced — at promotion, or by a direct edit the
user asked for:

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

One project learned this from both sides on 2026-08-25, in a single day: nine
tab-switch wrappers shared one padding bug, whose nine archived copies would have
taught nobody anything, and four sign-up frames were archived before it turned
out they were not changing at all, so the copies had to be deleted again as
debris.

**A repair still takes the `✅` off.** Step 3 is about approval, not history,
and the two answer different questions. `Legacy` asks whether anything was
decided differently — after a repair, no, so no copy. The `✅` says the user
approved this frame as it stands — after a repair it no longer stands as it was,
however small the change, so the mark waits until they have seen it. It is a
mark on one frame, not the state of a `WIP` section, which a repair leaves
alone.

<!-- rule:placement -->
### Placement

Never place a frame by scanning `parent.children`. Build occupancy from
`absoluteBoundingBox` over page-level nodes **plus** the children of every
section, place against that, and re-scan afterwards to assert no overlaps.
`absoluteBoundingBox` can read stale for a node moved earlier in the same
script — place one frame per pass, or track the boxes yourself.

**`section.resizeWithoutConstraints()` moves the section's children**, whatever
its name promises: it re-anchors them as the section changes size. So resize the
section first, place its children afterwards, then re-scan for overlaps. In one
project a section was grown three times while its `Brief` got longer, and four
frames ended up stacked on one spot — with every write reporting success.

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
built" in the words, back when green still meant "in code" — is what ignoring
that costs.
