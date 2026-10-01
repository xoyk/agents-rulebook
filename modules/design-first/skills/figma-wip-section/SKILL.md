---
name: figma-wip-section
description: >-
  How a feature section on a Figma WIP page is built and kept — named, tinted,
  laid out, which masters it instances, how its frames are lettered and how its
  references link out. Read it before opening a new WIP section, adding frames
  to one, changing its state, or answering why a section looks unlike its
  neighbours. What the Brief must say is the design-first rule in the project's
  AGENTS.md; this governs what the section looks like. Everything project-specific
  comes from the `figma.wip` block of the project's `.claude/rulebook.json`.
---

# A WIP section, built from the template

The design-first rule says a new piece of work gets its own section on the
`WIP` page and that the section opens with a `Brief`. It says what the section
must *say*. It does not say what the section must *look like*, and left to that,
one project ended up with eighteen sections that each invented their own layout
on the default white background Figma gives a new section. None of them was
wrong on its own; together the page could not be read as a board. This is the
missing half: a feature should be recognisable as a feature from across the
canvas, and readable without opening the layers list.

This file is a tool of the design-first module. Like the audit script beside it,
it is read from the skill directory and never copied into a project, so a fix
here reaches every project at once:

```text
~/.claude/skills/agents-init/modules/design-first/skills/figma-wip-section/SKILL.md
```

## Bindings: what a project supplies

**The masters come from the shared library first.** When
`~/.config/agents-rulebook/figma-library.json` exists and says the library is
published, the banner, `Brief`, row label, caption and note are imported by the
keys it lists — see figma-new-file, step 0 — and `wip.masters` below is only the
fallback for a project the library cannot reach. A section is still assembled
by the procedure here: Figma does not publish sections, so the template cannot
be a library component.

The procedure below is the same everywhere. What differs — which file, which
template, which library, which colours — is read from the project, in the
`figma.wip` block of `.claude/rulebook.json`, next to the keys the audit already
reads. **Read the bindings before the first write of a session.** Every
reference below to "the template", "the kit" or "the library" resolves through
them.

```json
"figma": {
  "file": "<file key>",
  "wip": {
    "file": "<file key, when WIP lives in a file of its own>",
    "page": "WIP",
    "template": "<node id of the section template>",
    "masters": {
      "banner": "<node id>",
      "brief": "<node id>",
      "rowLabel": "<node id>",
      "caption": "<node id>",
      "note": "<node id>"
    },
    "sharedKit": "<node id of the section holding masters several features share>",
    "library": "<name of the design library the frames bind to>",
    "font": "<the UI font family the product ships>",
    "stateFills": {
      "drawing": "<colour variable>",
      "review": "<colour variable>",
      "approved": "<colour variable>",
      "parked": "<colour variable>"
    },
    "ticketLink": "https://<tracker>/browse/{key}",
    "codeLink": "https://<host>/<owner>/{repo}/blob/{branch}/{path}#L{line}",
    "ticketStatuses": {
      "brief": "<status>",
      "design": "<status>",
      "review": "<status>",
      "development": "<status>"
    }
  }
}
```

| Key | Meaning |
|---|---|
| `wip.file` | The file the `WIP` page lives in. Defaults to `figma.file`. Many projects draft in one file and keep production frames in another. |
| `wip.page` | The page that holds the sections. Defaults to `WIP`. |
| `wip.template` | The section template to duplicate. Without it, build from the masters and say in the report that there was no template. |
| `wip.masters` | The kit's masters: banner, `Brief`, row label, frame caption, note. |
| `wip.sharedKit` | Where masters used by more than one section live — app shells, navigation, anything no single feature owns. |
| `wip.library` | The design library the frames bind to. When one `WIP` page serves several products, a map from product to library: a section binds to the library of the product it designs, never to whichever one its neighbour used. |
| `wip.font` | The UI font, used throughout the section. |
| `wip.stateFills` | The colour variable for each state. `parked` covers rejected, deferred and kit sections. |
| `wip.ticketLink` | How a ticket key becomes a URL. `{key}` is replaced. Absent when the project has no tracker. |
| `wip.codeLink` | How a code reference becomes a URL. `{repo}`, `{branch}`, `{path}` and `{line}` are replaced. Read the default branch from the host, not from habit: it is not the same name in every repository. |
| `wip.ticketStatuses` | The tracker's status for each milestone of a section, as in the table under *The ticket moves with the section*. Absent when there is no tracker. |

A binding that is missing is reported, not guessed. The file holds node ids,
names and URL shapes; it never holds a token. Tracker credentials come from the
session's own connection to the tracker, and the Figma token from wherever the
audit already finds it.

## Start by duplicating the template

Do not build a section from primitives. Duplicate the template, move the copy to
free canvas below the last section — placed as the module's *Placement* rule
says, against occupancy, never by scanning `children` — rename it, and replace
its placeholder slots with copies of the production frames. Everything below
describes what the template already encodes, so that a section that has drifted
can be recognised and repaired.

The masters it instances:

| Master | What it is for |
|---|---|
| Banner | The feature's name at a size that reads at 10% zoom, with its state, ticket, owner and date. |
| `Brief` | The row table the design-first rule specifies. |
| Row label | Heads each row of frames: one step of the flow, or one option being compared. |
| Frame caption | Sits above every frame: its letter, its name, one line of context. |
| Note | An open question, a constraint, or an audit finding declared deliberate, pinned next to the frames it is about. |

**Instance the masters; never paste a detached copy.** A fix to a master should
reach every section that uses it, and a detached copy is where it stops.

## The ticket moves with the section

For a project with a tracker and a `ticket` row. The tracker is what the rest of
the team reads, so the issue a section names always says where the section is.
An issue left behind tells them the wrong thing: one project had a feature
sitting in its briefing status with four rows of frames already handed over for
review. Each milestone moves the issue in the same step, and the same message:

| When | The issue moves to |
|---|---|
| The section exists, with its banner and a filled-in `Brief` | `ticketStatuses.brief` |
| The first frame is drawn — a new screen, or a copy of today's | `ticketStatuses.design` |
| The section turns 🔵: everything is drawn and handed over, not yet approved | `ticketStatuses.review` |
| The section turns 🟢: approved, and the next move is the code's | `ticketStatuses.development` |
| Code in review, merged, released | the code's own statuses; the section stays 🟢 |

Both only move forward. A section reopened for a later pass does not pull its
issue back, just as it does not go back to 🔵.

The issue is the feature's own. The design is a phase of it, so it never gets a
second, design-only issue beside it: two issues for one piece of work drift
apart, and only one of them gets checked. Work no product owns — the brand, a
library, the production files themselves — is the exception, and follows the
tracker's own workflow for it.

## Frames are assembled from components too

The masters above are the section's chrome. The same rule governs what is inside
the frames: every element a frame draws is an instance, never loose primitives.
Use a published component from the library wherever one fits. When the design
needs something the library does not have yet, build it as a **local master**
and instance that.

Local masters live in a `Local masters — <feature>` card in the section's left
column, under the `Brief` and any notes. They are not published — an unapproved
element must not appear in anyone's asset panel — and each carries a description
naming its feature and saying it is unpublished. At promotion they are copied to
the library, as the module's *A section's components are promoted with it* rule
sets out, and because the frames already carry instances, promotion is a move
rather than a rebuild.

**A master that more than one section instances does not belong to a feature.**
Move it to the shared kit (`wip.sharedKit`) and put in its description that
other sections depend on it. Left in whichever section needed it first, it makes
every other section a hostage: that feature gets archived, or bends the master
to its own frames, and drawings elsewhere change with nobody touching them. A
shared master is still unpublished, and still reaches the library only once a
design using it is accepted. The app shell every frame is drawn inside is the
standing example.

Text that differs between instances is a **text component property** on the
master, not a hand-edited layer — that is what keeps the tablet and the phone
copy of a row in step. Three hand-built copies of one row are three objects: a
correction has to be made three times, and they drift apart. One master, six
instances.

What a frame draws inside its shell is laid out, not placed. An empty state, the
rows under it and the button under those are one auto-layout column, sized to
the shell's content area and starting at one fixed top inset — never siblings at
hand-set coordinates. Placed siblings look right until the copy changes: a title
that gains a line grows the block around its centre, the illustration climbs
into whatever sits above it, and a button keeps the position of a width it no
longer has. Keep the inset the same across a row, so flipping between states of
one screen moves only what the state changes.

## The layout is auto-layout, not coordinates

The section holds exactly one child, `Section content`, and everything else nests
inside it. Nothing in a section is positioned by hand, which is what stops a
banner whose title wrapped onto a second line from landing on the first row's
labels: a growing node pushes its siblings instead of covering them.

```text
SECTION  (fill = state)
└─ Section content        vertical, gap 120, at 120,120 inside the section
   ├─ Banner              instance, width fill
   └─ Body                horizontal, gap 180, aligned to the top
      ├─ Left column      vertical, gap 60, width 760
      │  ├─ Brief
      │  ├─ Note…
      │  └─ Local masters…
      └─ Rows             vertical, gap 120
         └─ Row           vertical, gap 40
            ├─ Row label
            └─ Frames     grid: 2 rows (hug) × one column per frame
               ├─ row 0: frame captions   one per column, width fill, top-aligned
               └─ row 1: the frames       one per column, top-left aligned
```

**Each row of frames is a two-track grid**, not a line of caption-over-frame
stacks. In a stack, a caption that wraps onto a second line pushes its own frame
below its neighbours, and a phone-width column is narrow enough that one will.
In the grid, the caption track is as tall as the tallest caption, so every frame
in the row starts on one line and every caption on another, whatever any caption
says.

The spacing scale is the whole layout specification. There are no coordinates
to get wrong:

| Between | Gap |
|---|---|
| Section edge and content | 120 — the section's own padding, kept by hand, because a section cannot be auto-layout |
| Banner and body | 120 |
| Left column and the rows | 180 |
| One row and the next | 120 |
| Row label and its frames | 40 |
| Caption track and frame track | 24, the grid's row gap |
| One frame column and the next | 120, the grid's column gap |
| Cards in the left column | 60 |

Two sizing rules a hand-built section gets wrong:

- **Captions and notes hug their height.** Fixed at a small height with the text
  overflowing, they report a height that is not their height, and every gap below
  them becomes a lie.
- **A grid column is the frame's width, and never narrower than 660.** The
  caption fills its column. A phone frame is about 375 wide, and a caption that
  narrow wraps one line of context into five, so the phone column is held at 660
  and the frame sits left-aligned in it.

A section is a SECTION node and cannot itself be auto-layout. After building,
resize it to `Section content` plus twice the padding — resize first, then
place, as the *Placement* rule warns — and assert that its `absoluteBoundingBox`
contains every child's.

## Frames are lettered, and the phone carries `m`

Frames are lettered by row — `A1`, `A2`, `B1` — and the letters are what the
`Brief` and every review comment refer to.

A screen that ships on more than one form factor gets **one letter, and the
phone frame carries an `m` suffix**: `A2` is the larger frame, `A2m` the same
state on the phone. They are one step of the flow, so they share an index; a
reviewer saying "A2" means the pair, and "A2m" when the phone is the point.
Numbering them `A2` and `A3` would claim two steps, which is the misreading this
exists to prevent. Twins sit side by side in one row, the larger first.

## Colour is the state

The section's own fill carries its state, so the page reads as a status board at
any zoom. Every fill is a variable from `wip.stateFills`, and the paint is built
from the variable's own value and then bound — never from a placeholder colour,
for the reason the module's *Painting* rule gives.

| Section name starts with | Meaning | Fill |
|---|---|---|
| 🟡 | drawing | `stateFills.drawing` |
| 🔵 | waiting for approval | `stateFills.review` |
| 🟢 | approved: ready to code, and on through acceptance | `stateFills.approved` |
| 🧪 rejected, ⏸️ deferred, 🧩 kit | not in flight | `stateFills.parked` |

The state lives in three places, and they change together: the circle in the
section's name, the section's fill, and the banner's state pill. A section named
🔵 on a yellow ground is the failure this prevents. The flip to 🔵 happens in the
same message that hands the work over for review, and the state only moves
forward — a correction, repair or re-pointing inside an approved section is not a
new request for approval and leaves it green.

A section left in Figma's default white fill is what the audit reports as
`section in the default fill`.

## A rejected option stays, and reads as rejected

Options are drawn side by side and most of them lose. A losing row is not
deleted: it is the answer to "why is it like this?", and it moves to `Legacy`
with the rest of the section at promotion. Until then it stays in the section,
and it has to read as decided from across the canvas — without anyone opening
it. Four things do that, and each covers a gap the others leave:

1. **One opacity on the whole row, 0.45** — on the row's container, never on its
   frames one by one. Fading only the frames leaves the caption and the row label
   at full strength, and the row still reads as live.
2. **The row label names what lost**: `🧪 D · Rejected — track with a number
   chip`, not `D · Rejected`. The 🧪 is the same mark the section name uses for a
   rejected section, carried down to one row, and it is the part a script can
   read: opacity is how the row looks, not what it is.
3. **Chosen rows first, rejected rows after them**, in the order they lost. The
   fade says what is inactive; the order says where to look first.
4. **The reason lives in the `Brief`**, in **decided**, with its date, and the
   row's captions keep their argument. A faded row without a recorded reason is
   one nobody can argue with later.

Masters that only rejected rows still instance leave the section's
`Local masters` card for a card of their own, faded the same, whose description
says they go with those rows. They cannot be deleted while the rows need them
to render — a deleted master leaves its instances pointing at nothing, silently
— and left among the live masters they read as candidates for the library.

0.45 is chosen for the light state fills a section carries: captions stay
readable on them. On a dark board it is too faint, and the number should be
judged there again rather than copied.

Worked out on 2026-09-27 in 4FH, where one section held seven rows of options,
four of them rejected, and the chosen two had to be findable at a glance.

## Type

The product's UI font (`wip.font`) throughout. Sizes are large because the
canvas is read zoomed out. Colours are the library's text roles, bound, never raw
hex.

| Element | Weight | Size | Colour role |
|---|---|---|---|
| Banner title | SemiBold | 108 | text on the banner |
| Banner eyebrow | SemiBold | 24 | accent and secondary text |
| Banner chips | SemiBold / Medium | 22 | secondary label, value on the banner |
| Row label | SemiBold | 40 | primary text |
| Frame caption title | SemiBold | 30 | primary text |
| Frame caption note | Regular | 26 | secondary text |
| `Brief` rows | as the master defines | 15 | as the master defines |

Cards sit on the library's primary surface over the tinted section. Nothing on
the canvas is a raw colour with no variable behind it.

## References are links

A reviewer reads a section by jumping out of it: to the ticket, to the code a
frame was drawn from, to the neighbouring section a decision depends on. A
reference typed as plain text turns each of those into a search. So **every
reference in the section is a link** — in `Brief` rows, notes, frame captions,
row labels, and Dev Mode annotations:

| Reference | Target |
|---|---|
| A ticket key | the issue, through `wip.ticketLink` |
| A file, class or line of code | the file on its repository's default branch, with the line when one is named, through `wip.codeLink` |
| Another section, frame or component in the same file | a node link to it |
| A frame or component in another Figma file | its URL with the node id |
| A deployed page or build | its URL |

Link the exact characters of the reference — the key, the file name, the
section's name — not the sentence around it, and underline the range: Figma
does not style a hyperlink set through the API, so an unstyled link is invisible
on the canvas. A reference that will not resolve to a target is usually a wrong
reference; check it rather than leaving it as text.

**Dev Mode annotations are references too, and the easiest to leave wrong.**
They are not text layers: they live in a node's `annotations` field, written in
Markdown, so a link there is a Markdown link. And **cloning a frame clones its
annotations**: a frame copied from another section arrives saying what was true
of the original — its ticket, its scope, sometimes "do not build this". Every
frame cloned into a section has its annotations rewritten for the new frame, or
removed, in the same step as the clone.

One trap in how Dev Mode renders them: it turns anything that looks like a web
address into a link of its own, and many file extensions are also top-level
domains — `.md`, `.app`, and more. A link whose visible text is a file name with
such an extension opens that name as a website, not the repository. In an
annotation, name the file in words and keep the file name only in the target.

## Writing to the file

A section is built in small writes — banner, then `Brief`, then one row at a
time — with a screenshot after each. A single large script that places twenty
nodes is how sections end up with content outside their own bounds.

A link is two calls on the text node, after its fonts are loaded:
`setRangeHyperlink(start, end, { type: 'URL', value: url })` — or
`{ type: 'NODE', value: nodeId }` for a node in the same file — and
`setRangeTextDecoration(start, end, 'UNDERLINE')`. Text inside an instance of a
master takes the link as an override, so the master stays untouched. Read it
back with `getStyledTextSegments(['hyperlink'])`.

Annotations are replaced whole: `node.annotations = [{ labelMarkdown, categoryId }]`,
keeping the previous `categoryId` so the note stays in its category. Find every
annotated node in a section with `section.findAll(n => n.annotations?.length)` —
which is also the check to run after cloning frames in.

The painting traps in the module apply to every write here: `node.fills` is
`figma.mixed` on text whose runs differ, and a bound paint keeps whatever literal
it was built from when the variable does not resolve.

## Before handing the section over

1. The name is `<state> WIP — <feature>`, with the ticket key in brackets after
   it where there is a tracker. Fill, banner pill and name agree on the state,
   and the issue's status matches the section's milestone.
2. The section has exactly one child, `Section content`, and nothing inside it
   is positioned by hand.
3. The banner is as wide as the rows below it, and its title is the feature as a
   person would say it, not the ticket's summary.
4. Every frame has a caption and every row a label; the letters run in order,
   and every phone frame carries the `m` of its twin.
5. Nothing inside a frame is a loose primitive: every element is an instance of
   a library component, a shared-kit master, or one of this section's own local
   masters — and no master this section owns is instanced by another section.
6. Every `Brief` row is filled. An empty **why** is the one the format exists to
   expose.
7. Every row of frames is the two-track grid, and its frames start on one line.
8. No placeholder slot from the template is left. A rejected row is faded as a
   whole, labelled with 🧪 and what lost, and sits after the chosen rows.
9. Every reference is a clickable, underlined link — annotations included — and
   no frame carries an annotation cloned from the frame it was copied from.
10. The audit reports nothing blocking, or the `Brief` says why a finding is
    deliberate:

    ```bash
    node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-audit.mjs <section-id>
    ```

    It catches the painting faults, content outside the section, and a section
    left in the default fill. It does not check that an issue's status matches
    its section, that the frames of a row share a top line, or that sections on
    the page do not overlap one another — so items 1 and 7, and a glance along
    the page for a section hidden under another, are done by eye.
