# agents-rulebook

Working agreements for projects built with coding agents in the loop, plus the machinery that keeps a copy in one project comparable with the copy in another.

The text is the product: `templates/AGENTS.core.md` and the modules assemble into a project's `AGENTS.md`, which every agent reading `AGENTS.md` — Claude Code, Codex, Cursor — then follows. Every agreement carries the incident that produced it, deliberately: a rule whose reason is lost gets re-litigated the first time it is inconvenient.

The machinery exists because copies drift. Four copies of one rulebook were compared once and had drifted past the point of comparison — the same section under three different headings, two sections silently lost from the largest copy. Everything below — anchors, stamps, sync, the map — is there so that a copy can always answer three questions: where did this section come from, has it changed here, and has the canon moved since.

## Quick start

Requirements: `git` and Node 18 or newer. Nothing is installed with npm; every script runs on the standard library.

```bash
git clone git@github.com:xoyk/agents-rulebook.git ~/.claude/skills/agents-init
```

The repository is the skill directory, so that clone is the whole installation. Then, in a project, run `/agents-init` in Claude Code. It asks four questions — what the project is, and whether design, releases and a public page are in the loop — and leaves behind:

| File | What it is |
|---|---|
| `AGENTS.md` | The agreements, assembled from the core, the chosen modules and the tail. The file every agent reads. |
| `CLAUDE.md` | One line, `@AGENTS.md`, so Claude Code reads the same file as every other agent. |
| `BACKLOG.md` | The list of work, started from `templates/BACKLOG.md`. |
| `.claude/rulebook.json` | The stamp: which canon commit the file was built from, which modules, and a hash of every section by anchor. Project settings for the tools live here too. |
| `.claude/rulebook.html` | The same agreements as one self-contained page, badged by origin and searchable. |

It never overwrites an existing `AGENTS.md`. On a project that already has one, it reads it, says which parts of the template are missing, and asks. The full procedure is in `SKILL.md`.

Updating the canon on this machine is `git pull` in the skill directory — a skill is read fresh on every invocation, so there is nothing to build or restart. Updating a *project* from the canon is a separate, deliberate step: see [Keeping copies in step](#keeping-copies-in-step).

## What is in here

| Path | What it covers |
|---|---|
| `SKILL.md` | The installation procedure as a Claude Code skill: what to ask, what to assemble, what to stamp, what never to overwrite. |
| `templates/AGENTS.core.md` | Always installed. Reporting back, saying what actually happened, names, the backlog, working in parallel and what worktrees do not fix, commits, pushing, merging and releasing, things only the user does. |
| `templates/AGENTS.tail.md` | Always installed, always last. How to extend the file, section anchors, canon precedence. |
| `templates/BACKLOG.md` | The backlog a project starts with. |
| `modules/design-first/` | Code starts only after an approved frame: a `WIP` section per piece of work, archiving, placement, the Figma painting traps that ship invisible text, one owner for a shared design file — and `scripts/figma-audit.mjs`, which checks frames for all of it. |
| `modules/release/` | Release notes generated from per-audience commit trailers instead of remembered, the one tree a release is cut in, build numbers, and finishing a release. The store-specific sections are deleted where there is no store. |
| `modules/publishing/` | A published file cannot be withdrawn, only overwritten; anything shown in public is drawn from invented data at the source. |
| `scripts/stamp-rulebook.mjs` | Writes the stamp. `--basis install` for a fresh copy, `--basis adopted` for a rulebook that was not assembled here, `--check` to list sections that drifted from their stamp without writing anything. |
| `scripts/sync-rulebook.mjs` | Compares copies with the canon and says what to do with each section; `--apply` takes the mechanical half; `--html` draws every copy on one map. |
| `scripts/render-rulebook.mjs` | Renders `AGENTS.md` into `.claude/rulebook.html`. Deterministic, so `--check` is a byte compare. `--hook` is the mode the editor hook calls. |
| `scripts/lib/sections.mjs` | The one reading of `AGENTS.md`: where a section starts and ends, what it is called, what it hashes to. The stamp, the sync and the page must agree to the byte, so there are no copies of this code. |
| `scripts/lib/sync-page.mjs` | The drawing half of `sync-rulebook.mjs --html`. |

## A module is a folder

`modules/<name>/MODULE.md` is the text that gets installed into a project. `modules/<name>/scripts/` holds the tools that serve those rules, and they stay here.

Only text is copied into a project. A tool is invoked from this directory by path:

```bash
node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-audit.mjs 850:670
```

That split is the whole point. Rules are edited per project, so they need anchors, stamps and a sync with verdicts. Tools are not edited per project, so they need none of that — and copying one into five repositories creates five versions of a script nobody meant to fork. A fix to a tool reaches every project the moment it is committed here. Anything a tool needs to know about the project it runs in — a Figma file key, a token, a palette — is read from the project at run time, never baked into the tool.

A project may keep a module's rule but not its text — holding the mechanics somewhere private and leaving a short `local:` pointer in their place. Then that pointer has to name the module's tools itself, because a tool is discoverable only through the text that mentions it.

### Adding a module

1. Create `modules/<name>/MODULE.md`. Every `##` and `###` heading carries a `<!-- rule:<id> -->` anchor above it, and the id is not used anywhere else in the canon.
2. Put its tools, if any, in `modules/<name>/scripts/`, reading everything project-specific from the project at run time.
3. Add the module to the assembly order and to the questions in `SKILL.md`, and to the table above.
4. Commit it with the incident that made it necessary. A module travels whole because it brings its own stories with it.

## Anchors and the stamp

Above every heading in the template sits `<!-- rule:<id> -->`. It does not render, and it is the section's identity: a project may rename the heading to suit itself, but the comment stays. A section a project writes for itself gets `<!-- local:<id> -->` instead. Copies in different repositories are compared through these anchors; without them there is nothing to compare.

The stamp in `.claude/rulebook.json` is the other half. Anchors say *which* section is which; the stamp says *what it looked like when it arrived*. Without it, a section that differs from the template is ambiguous — somebody edited it here, or the template moved on — and those are opposite fates with an identical diff.

Neither the editor hook nor the commit hook touches the stamp. A section that differs from its stamp is exactly the signal the sync needs; re-stamping on every commit would erase it.

## Keeping copies in step

The canon does not know its copies and never pushes into them. The copies know their stamp, so the pulling side always acts.

The copies are listed in a registry that lives **outside this repository**, because this repository is public and the list names private working directories:

```json
{ "recipients": ["~/Projects/some-project", "~/Documents/another"] }
```

in `~/.config/agents-rulebook/recipients.json`. A path that is not on this machine is skipped silently, so one list serves every computer.

```bash
node ~/.claude/skills/agents-init/scripts/sync-rulebook.mjs --all
```

```bash
node ~/.claude/skills/agents-init/scripts/sync-rulebook.mjs --diff
```

```bash
node ~/.claude/skills/agents-init/scripts/sync-rulebook.mjs --apply
```

`--all` walks the registry, `--diff` reports on the current project with the text of every difference, `--apply` writes the mechanical part. `--offline` skips the check against the canon's remote.

Every run first says where this clone of the canon stands against its own remote. The verdicts are computed against `HEAD` of this clone, so a clone left behind would report every copy as in step with a canon nobody else uses — a false all clear. A behind clone is therefore reported, makes the exit code non-zero, and prints the `git pull` that fixes it.

| Verdict | What happened | What to do |
|---|---|---|
| `update` | The canon moved, the copy stood still. | Take it, having read the diff. |
| `conflict` | Both moved. | Read both texts and decide. |
| `ours` | The copy moved, the canon stood still. | Keep it. It reaches the canon only on a human's word, moved by hand in its own commit. |
| `new` | The canon grew a section after the stamp. | Take it, or decline by re-stamping. |
| `predates-canon` | The section was here before the canon had it. | Nothing — this is where it came from. |
| `override` | The project departs from the canon on purpose. | Nothing; the reason is printed on every run. |

`--apply` takes only `update` and `new`. It refuses to write a `conflict`, refuses to write over a declared override, refuses to carry text that still holds `{{...}}`, and refuses to run at all when `AGENTS.md` has uncommitted changes — so the result always reads as one `git diff` and comes off with one `git checkout`. Every refusal is printed, because a silent skip reads as "applied". After writing, it re-stamps the file.

### Declaring a deviation

A section a project departs from on purpose is written into its stamp by hand, and it survives re-stamping:

```json
"overrides": {
  "pushing": "nothing is pushed here until the user asks; the canon pushes the branch on the first commit"
}
```

The reason is the whole point: an override without one is indistinguishable from a section somebody edited and forgot. Dropping a canon section is an override too. When the canon moves underneath a declared override, the report says so — a deviation can outlive the thing it was deviating from.

### The map

```bash
node ~/.claude/skills/agents-init/scripts/sync-rulebook.mjs --html
```

draws the registry as one read-only page: the canon on its remote, this clone, every copy with its stamp, and the worktrees under each. Arrows carry the verdicts — `take` from the clone, `offer` back to it, `conflict`, `publish` from the clone to the remote — and each opens the sections behind it and the command that would act on it. The text report answers "what is wrong with this copy"; the map answers "where does each copy live, and which way does a change travel".

The page is written to `~/.config/agents-rulebook/sync.html`, never into a repository, because it names directories on this machine. `--out <path>` puts it elsewhere.

## Worktrees

Parallel agents work in one worktree each, and every worktree is a copy of the rulebook the registry cannot see. How it behaves depends on whether git tracks the file:

- **Tracked** — each worktree follows its own branch, and a stale rulebook there is a branch that has not been rebased. That is not drift, and the map does not report it.
- **Untracked** — typical when the repository is public and the rulebook is not. Then whatever put the file into the worktree decides its fate. A copy made when the worktree was created is stale the first time the project's rulebook changes, and a worktree created with a bare `git worktree add` gets nothing at all.

The map shows each untracked worktree's `AGENTS.md` as a **symlink** to its project's copy, a **stale duplicate**, or **missing**. Only the symlink stays in step by itself: an edit to the project's copy is what every worktree reads next. `CLAUDE.md` is a one-line pointer and can be a copy; `AGENTS.md` and `.claude/rulebook.json` should be links. Agents that do not understand `@` imports — Codex among them — read a linked `AGENTS.md` like any other file, which is why a link beats an import here.

A running agent reads its instructions when its session starts, so a changed rulebook reaches a live session only when the session restarts or is told to re-read it.

## The design-first audit

```bash
node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-audit.mjs <node-id> [<node-id>...]
```

It fetches the given nodes — a frame, a section or a whole page — through the Figma REST API and reports what the canvas does not show. It exits `0` when nothing blocks, `1` on a blocking finding, and `2` when it could not run.

| Rule | What it catches |
|---|---|
| `black bound paint` | A paint bound to a variable that still carries a black literal: the binding did not resolve, and the frame renders black. |
| `dark text off accent` | Dark text on a dark ground. |
| `text the colour of its ground` | A label exactly the colour of what it sits on. |
| `text too close to its ground` | A label under the contrast floor against its ground. The ground is searched among shapes painted below the label as well as its parents. |
| `stale base fill` | A base fill left under a fully overridden label. Advisory only: it renders nothing until the text grows. |
| `content outside its section` | A section that stopped covering its own content. |
| `section in the default fill` | A section still in the plain white fill Figma gives a new one. |
| `layer drifted out of its instance` | An absolutely placed layer hanging outside the instance it belongs to. |
| `text clipped by its frame` | A label cut off by the frame that clips it. A frame standing for a scrolled list is exempt when its name says so — `scrolls`. |

Every rule except `stale base fill` blocks. A rule added later blocks by default: a new fault that turns out harmless is a smaller surprise than one that silently stops gating.

It reads its settings from the project's `.claude/rulebook.json`, under `figma`:

| Key | Meaning |
|---|---|
| `file` | The Figma file key. |
| `configFile`, `tokenPath`, `filePath` | Read the token and the file key from a settings file outside the repository, by dotted path, so neither is ever committed. |
| `palette` | The design's own colours. A leftover in one of them is not reported as debris from an older palette. |
| `accentGrounds` | Grounds on which dark text is intended. |
| `darkTextLuminance` | Below this luminance text counts as dark. Default `0.4`, which suits light designs; a dark design needs a much lower value or it reports its own hint colour. |
| `minContrast` | The contrast floor. Default `1.6` — not an accessibility bar, a "cannot be read at all" bar. |

The file key comes from `--file`, then `FIGMA_FILE_KEY`, then `figma.file`, then `figma.filePath`, then `FIGMA_FILE_KEY` in the project's `.env`. The token comes from `FIGMA_TOKEN`, then `figma.tokenPath`, then `.env`, then `"env": { "FIGMA_TOKEN": ... }` in `~/.claude/settings.json`, which also puts it in front of every agent. A value found this way is never printed.

Tune a new project against a page you know is clean. An audit that fails on a healthy file stops being read, and a rule nobody reads catches nothing.

## Vendoring the templates into a project

A project that wants the templates in its own tree — so CI can check the assembled file against them, and a reader can see where a rule came from — adds them as a subtree rather than a submodule, because a subtree needs nothing from the people who clone the project:

```bash
git subtree add --prefix=.agents/rulebook https://github.com/xoyk/agents-rulebook.git main --squash
```

```bash
git subtree pull --prefix=.agents/rulebook https://github.com/xoyk/agents-rulebook.git main --squash
```

The vendored copy is read-only in the consuming project. Its own deviations belong in `.claude/rulebook.json` under `overrides`.

## Editing the canon

Edit in place and commit, and **say why in the commit message**. These files are rules; the reason is the part that has to survive.

A rule enters with the incident that produced it — what was tried, what broke, what it cost — written down when it happens, while the details are still there. An agreement that turns out to be wrong is deleted rather than softened: a rule nobody follows is worse than no rule, because it teaches everyone that the document is decoration.

A rule from one project's incident reaches the canon only when somebody moves it by hand, in its own commit. A rule derived from somebody else's incident is cargo cult.

Everything in this repository is written in English — the templates, the modules, the scripts, this file — whatever language the conversation that invokes it is held in. The rulebook is meant to be read by anyone on any team that installs it.

**Nothing private goes in here.** The registry, the map, tokens, file keys and the names of private working directories all live outside this repository, and the tools read them at run time. This repository is public.
