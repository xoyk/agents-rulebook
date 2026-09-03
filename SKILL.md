---
name: agents-init
description: Installs working agreements into a project — AGENTS.md, BACKLOG.md and a CLAUDE.md pointer, assembled from the templates in this skill. A core plus optional modules: a design-first cycle and store releases. Use it when someone starts a new project and asks for working agreements, conventions, an AGENTS.md, a "starter" or a "rules template", invokes /agents-init, or when an existing repository has no such rules and they ask for them. Do not use it to edit an AGENTS.md that is already installed — that is ordinary file editing.
---

# Working agreements for a project

Installs three files: `AGENTS.md` (the agreements), `BACKLOG.md` (the list of
work), and `CLAUDE.md` (a single line, `@AGENTS.md`, so that Claude Code picks
up the same file every other agent reads).

The templates sit next to this file: `templates/AGENTS.core.md` and
`templates/modules/*.md`.

## Procedure

### 1. Look at what is already there

```bash
ls AGENTS.md CLAUDE.md BACKLOG.md 2>/dev/null
```

**Never overwrite an existing `AGENTS.md`.** If there is one, read it, show the
user which parts of the template it is missing, and ask whether to add the
missing sections. Agreements are written in blood; somebody else's file may
carry rules the template has never heard of.

### 2. Ask three things, and no more

Briefly, as one question through the choice tool:

1. **What the project is** — one line, which goes into the heading and the
   examples.
2. **Whether design is in the loop** — whether the `design-first` module is
   needed. It covers code starting only after an approved mockup, and how an
   agent avoids breaking the design file.
3. **Whether there are store releases** — whether the `mobile-release` module
   is needed. It covers conventional commits with bilingual trailers, checking
   the build number, a release being cut in one tree, and why a commit goes to
   `origin` immediately rather than after it has been verified on a build.

Ask nothing else. Everything else is a fill-in-the-blank in the text, and those
are cheaper to correct later than to guess now.

### 3. Assemble the file

Assembly order: `templates/AGENTS.core.md` → the chosen modules in the order
listed above → `templates/AGENTS.tail.md`.

The tail always comes last: it is the section about how to extend the file, and
in the middle of a finished document it reads like an insertion.

**Fill in every `{{...}}`.** That is the only substitution markup; angle
brackets such as `<type>(<scope>)` or `<state> WIP — <feature>` are part of a
format being shown, so leave them alone.

An unfilled `{{...}}` may not be left behind: either give it a value or delete
the paragraph outright. A rule that stops halfway is a rule nobody follows.
After assembling, check that no `{{` remains in the file.

### 4. Create `BACKLOG.md` and `CLAUDE.md`

`BACKLOG.md` — from `templates/BACKLOG.md`, if the file does not exist yet.
`CLAUDE.md` — exactly one line, `@AGENTS.md`, if the file does not exist yet.

### 5. Say what comes next

Agreements with no first entry are dead. In the report, name **one** nearest
moment when the file will have to be extended: the first incident, the first
decision, the first thing that goes wrong. And repeat the template's own main
rule, from *How to extend this file*: a rule without the story that produced it
survives until the first argument about it.

## Language

Everything this skill installs is written in English, and so is every file in
this repository — the templates, the README, and this skill. The rulebook is
meant to be installed into any project and read by anyone on the team, so the
language of the conversation that invokes it does not change the language of
what it writes. That includes the three-line report block: its labels are
`Current task`, `Status` and `Needed from you`, in English, whatever language
the answer around them is written in.

## What this skill does not do

- **It does not commit.** A human reads the agreements and decides when they
  are right.
- **It does not install hooks, linters or CI.** Those are separate tools with
  their own cost.
- **It does not carry agreements between projects automatically.** A rule
  derived from somebody else's incident is cargo cult; a module travels whole,
  because it brings its own stories with it.
