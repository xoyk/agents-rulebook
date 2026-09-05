---
name: agents-init
description: Installs working agreements into a project — AGENTS.md, BACKLOG.md and a CLAUDE.md pointer, assembled from the templates and modules in this skill, then stamped so the copy can be compared with the canon later. A core plus optional modules: a design-first cycle, releases, and publishing a public page. Use it when someone starts a new project and asks for working agreements, conventions, an AGENTS.md, a "starter" or a "rules template", invokes /agents-init, or when an existing repository has no such rules and they ask for them. Do not use it to edit an AGENTS.md that is already installed — that is ordinary file editing.
---

# Working agreements for a project

Installs three files: `AGENTS.md` (the agreements), `BACKLOG.md` (the list of
work), and `CLAUDE.md` (a single line, `@AGENTS.md`, so that Claude Code picks
up the same file every other agent reads).

The text lives next to this file: `templates/AGENTS.core.md`,
`templates/AGENTS.tail.md`, and one folder per module under `modules/`.

**A module is a folder, not a file.** `modules/design-first/MODULE.md` is the
text that gets installed into a project; `modules/design-first/scripts/` holds
the tools that serve those rules and they stay here. Only text is copied into a
project. A script is invoked from this directory by path, so five projects share
one copy and a fix reaches all of them without any sync at all.

**A project that keeps a module's rule but not its text has to name the module's
tools itself.** Declining the text is legitimate — a project may hold the
mechanics somewhere else and leave a short `local:` pointer in their place. But
a tool is discoverable only through the text that mentions it, so the pointer
inherits that job. On 2026-09-05 a project did exactly this with design-first:
the rule was there, the mechanics were in a private half, and nothing anywhere
named the audit script. Agents working in it could not have known the tool
existed, and nobody had configured one either.

## Procedure

### 1. Look at what is already there

```bash
ls AGENTS.md CLAUDE.md BACKLOG.md 2>/dev/null
```

**Never overwrite an existing `AGENTS.md`.** If there is one, read it, show the
user which parts of the template it is missing, and ask whether to add the
missing sections. Agreements are written in blood; somebody else's file may
carry rules the template has never heard of.

If the file exists but has no anchors, offer to add them: match its sections to
the template by meaning rather than by heading, and mark everything else
`<!-- local:<id> -->`. It is a one-off job, and until it is done the copy cannot
be compared with the canon or with any other project.

### 2. Ask four things, and no more

Briefly, as one question through the choice tool:

1. **What the project is** — one line, which goes into the heading and the
   examples.
2. **Whether design is in the loop** — whether the `design-first` module is
   needed. It covers code starting only after an approved mockup, how an agent
   avoids breaking the design file, and the audit script that checks the frames.
3. **Whether there are releases** — whether the `release` module is needed. It
   covers notes assembled from commit trailers rather than remembered at the
   end, and a draft release not being published without a human. The sections
   about build numbers and the tree a release is cut in apply only where there
   is a store; without one they are deleted.
4. **Whether there is a public page** — whether the `publishing` module is
   needed. It covers a published file being impossible to withdraw and only
   possible to overwrite, and everything shown in public being drawn on invented
   data from the start. Any project with a site, a landing page or a demo wants
   it, not only the ones with a CDN.

Ask nothing else. Everything else is a fill-in-the-blank in the text, and those
are cheaper to correct later than to guess now.

### 3. Assemble the file

Assembly order: `templates/AGENTS.core.md` → the chosen modules in the order
listed above (`design-first`, `release`, `publishing`) → `templates/AGENTS.tail.md`.

The tail always comes last: it is the section about how to extend the file, and
in the middle of a finished document it reads like an insertion.

**Do not touch the section anchors.** Above every heading in the template sits
`<!-- rule:<id> -->`. It is the section's identity: the heading may be renamed
to suit the project, the comment may not. Copies of the rulebook in different
repositories are compared through them, and without them there is nothing to
compare.

**Fill in every `{{...}}`.** That is the only substitution markup; angle
brackets such as `<type>(<scope>)` or `<state> WIP — <feature>` are part of a
format being shown, so leave them alone.

An unfilled `{{...}}` may not be left behind: either give it a value or delete
the paragraph outright. A rule that stops halfway is a rule nobody follows.
After assembling, check two things: that no `{{` remains, and that every `##`
and `###` heading carries an anchor above it.

### 4. Stamp the file

```bash
node <skill>/scripts/stamp-rulebook.mjs --basis install
```

Writes `.claude/rulebook.json`: the template commit, the chosen modules, and a
hash of every section by anchor. Anchors say *which* section this is; the stamp
says *what it looked like when it arrived*. Without it, a section that differs
from the template is ambiguous — either somebody edited it here, or the template
moved on. Those are opposite fates, and the diff looks identical.

For an existing rulebook that was not assembled from here, the base is its own
state today:

```bash
node <skill>/scripts/stamp-rulebook.mjs --basis adopted
```

`--check` writes nothing and says which sections have drifted from the stamp.

The script infers the modules from the anchors present rather than asking again:
the file is the truth about itself, and a stamp that argues with it is worse
than none.

### 5. Add the project to the registry

The registry is **outside this repository**, because this repository is public
and the registry names private working directories:

```bash
~/.config/agents-rulebook/recipients.json
```

```json
{ "recipients": ["~/Projects/some-project", "~/Documents/another"] }
```

Paths are machine-local: one that is not on this machine is skipped silently, so
a single list serves every computer.

### 6. Create `BACKLOG.md` and `CLAUDE.md`

`BACKLOG.md` — from `templates/BACKLOG.md`, if the file does not exist yet.
`CLAUDE.md` — exactly one line, `@AGENTS.md`, if the file does not exist yet.

### 7. Render the page and install the hooks

```bash
node <skill>/scripts/render-rulebook.mjs
```

Writes `.claude/rulebook.html` — one self-contained page with no CDN and no web
font: sections grouped by module, each badged (canon / edited here / local /
override with its reason), dated incidents highlighted, and a search box. The
page is deterministic, so `--check` is a byte compare. It is committed alongside
`AGENTS.md`: the page is what gets opened and sent as a link, the file is what
gets edited.

Two hooks keep the page from falling behind the file, and both are installed here:

- **Claude Code** — in the project's `.claude/settings.json`, `PostToolUse` on
  `Edit|Write`. In `--hook` mode the script reads the event from stdin and
  re-renders only when `AGENTS.md` was edited; on other files it stays quiet and
  never returns an error. If the skill is not on the machine, the hook is `true`.

  ```json
  {"hooks":{"PostToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command",
   "command":"R=\"$HOME/.claude/skills/agents-init/scripts/render-rulebook.mjs\"; if [ -f \"$R\" ]; then node \"$R\" --hook; else true; fi",
   "timeout":20}]}]}}
  ```

- **git pre-commit** — `.githooks/pre-commit`: if the commit touches
  `AGENTS.md`, re-render and add the page. This is the common denominator for
  any editor and any agent, not only Claude. Git does not version hooks, so once
  per clone: `git config core.hooksPath .githooks`.

Neither hook touches the stamp. A section that differs from the stamp is the
`ours` signal for sync; updating the stamp on every commit would erase it.

### 8. Say what comes next

Agreements with no first entry are dead. In the report, name **one** nearest
moment when the file will have to be extended: the first incident, the first
decision, the first thing that goes wrong. And repeat the template's own main
rule, from *How to extend this file*: a rule without the story that produced it
survives until the first argument about it.

## Reading the file happens in one place

`scripts/lib/sections.mjs` is the only reading of `AGENTS.md`: where a section
starts and ends, what it is called, what it hashes to. The stamp, the sync and
the page must agree to the byte, so no copies of that code.

## Syncing: the canon travels to the recipients

```bash
node <skill>/scripts/sync-rulebook.mjs --all        # walk the registry
node <skill>/scripts/sync-rulebook.mjs --diff       # this repository, with diffs
node <skill>/scripts/sync-rulebook.mjs --apply      # take 'update' and 'new'
```

There is no broadcast and there will not be one. The canon does not know its
copies; the copies know their stamp, so the pulling side is always the one that
acts. The script compares canon with canon (two template commits) and a copy
with itself (its file against its stamp). It never compares template text with
project text — those have filled-in `{{...}}` and the diff would be noise.

| verdict | what happened | what to do |
|---|---|---|
| `update` | the canon moved, the copy stood still | take it, having read the diff |
| `conflict` | both moved | read both texts, decide |
| `ours` | the copy moved, the canon stood still | keep it; into the canon only on a human's word |
| `new` | the canon grew a section after the stamp | take it or decline |
| `predates-canon` | the section was here before the canon had it | nothing; this is where it came from |

**By default the script writes nothing into `AGENTS.md`.** A rule reaches
somebody else's file after a human has seen the diff — that is the entire reason
the pulling side exists. `--apply` takes only the mechanical half: `update` and
`new`. It refuses to write a `conflict`, refuses to write over a declared
override, refuses to carry text that still holds `{{...}}`, and refuses to run
at all when `AGENTS.md` is dirty — so the result always reads as one `git diff`
and comes off with one `git checkout`. Every refusal is printed: a silent skip
reads as "applied", and that is how a project starts believing it carries a rule
it does not have.

After writing, the script re-stamps the file: the stamp is derived from the
text, and a write that leaves the old stamp leaves a lie.

### A deliberate deviation is declared

A section this project departs from on purpose is written into the stamp by
hand, and it survives re-stamping:

```json
"overrides": {
  "pushing": "nothing is pushed here until the user asks; the canon pushes the branch on the first commit"
}
```

Then `sync` prints it as `override` with its reason instead of `ours`, `--apply`
leaves it alone, and if the canon moves underneath it the report says so.
Dropping a section is an override too: a module that arrived whole and lost two
sections should say which and why, or the next reader cannot tell a decision
from an accident. The rule about precedence lives in the template's tail —
`<!-- rule:canon-precedence -->`.

**The way back is only ever taken on an explicit word.** `ours` is not a reason
to act, and the exit code stays zero on it. A rule derived from somebody else's
incident is cargo cult; to get a section into the template, somebody moves it by
hand, in its own commit, in this repository.

**A refusal is recorded by stamping.** A section the canon had at the time of
the stamp and the copy does not is a decision, and nobody should be reminded of
it. So declining a `new` is done by re-stamping: `stamp-rulebook.mjs` writes
today's canon commit and the section leaves the report for good.

## Language

Everything this skill installs is written in English, and so is every file in
this repository — the templates, the modules, the scripts and this skill. The
rulebook is meant to be installed into any project and read by anyone on the
team, so the language of the conversation that invokes it does not change the
language of what it writes. That includes the three-line report block: its
labels are `Current task`, `Status` and `Needed from you`, in English, whatever
language the answer around them is written in.

## What this skill does not do

- **It does not commit**, and it does not edit `AGENTS.md` during a sync. A
  human reads the agreements and decides when they are right.
- **It does not install linters or CI.** Those are separate tools with their own
  cost. The two hooks in step 7 are the exception, and they only redraw a page.
- **It does not carry agreements between projects automatically.** A rule
  derived from somebody else's incident is cargo cult; a module travels whole,
  because it brings its own stories with it.
