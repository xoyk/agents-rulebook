# agents-rulebook

Working agreements for projects built with coding agents in the loop, plus the machinery that keeps a copy in one project comparable with the copy in another.

The text is the product: `templates/AGENTS.core.md` and the modules assemble into a project's `AGENTS.md`, which every agent reading `AGENTS.md` — Claude Code, Codex, Cursor — then follows. Every agreement carries the incident that produced it, deliberately: a rule whose reason is lost gets re-litigated the first time it is inconvenient.

## What is in here

| Path | What it covers |
|---|---|
| `SKILL.md` | The installation procedure as a Claude Code skill: what to ask, what to assemble, what to stamp, what not to overwrite. |
| `templates/AGENTS.core.md` | Reporting back, saying what actually happened, names, the backlog, working in parallel, commits, pushing, merging and releasing, things only the user does. |
| `templates/AGENTS.tail.md` | How to extend the file, section anchors, and canon precedence — always assembled last. |
| `templates/BACKLOG.md` | The backlog file a project starts with. |
| `modules/design-first/` | Design before code: a `WIP` section per piece of work, archiving, placement, the three Figma painting traps that ship invisible text — and `scripts/figma-audit.mjs`, which checks for them. |
| `modules/release/` | Release notes from commit trailers, one tree owning the release, build numbers, finishing a release. |
| `modules/publishing/` | A published file cannot be withdrawn, only overwritten; anything shown in public is drawn from invented data. |
| `scripts/` | `stamp-rulebook.mjs`, `sync-rulebook.mjs`, `render-rulebook.mjs`, and the one shared reading of the file in `lib/sections.mjs`. |

## A module is a folder

`modules/<name>/MODULE.md` is the text that gets installed into a project. `modules/<name>/scripts/` holds the tools that serve those rules, and they stay here.

Only text is copied into a project. A tool is invoked from this directory by path:

```bash
node ~/.claude/skills/agents-init/modules/design-first/scripts/figma-audit.mjs 850:670
```

That split is the whole point. Rules are edited per project, so they need anchors, stamps and a sync with verdicts. Tools are not edited per project, so they need none of that — and copying one into five repositories creates five versions of a script nobody meant to fork. Anything a tool needs to know about the project it is run in — a Figma file key, a token — is read from the project at run time, never baked into the tool.

## Using it as a skill

The repository is the skill directory, so installation is a clone:

```bash
git clone git@github.com:xoyk/agents-rulebook.git ~/.claude/skills/agents-init
```

Then `/agents-init` in a project assembles `AGENTS.md`, `BACKLOG.md` and a `CLAUDE.md` pointer, stamps the result, and renders the page. Updating is `git pull` — a skill is read fresh on every invocation, so there is nothing to build or restart.

The registry of projects carrying a copy lives outside this repository, in `~/.config/agents-rulebook/recipients.json`, because this repository is public and that list names private working directories.

## Vendoring the templates into a project

A project that wants the templates in its own tree — so CI can check the assembled file against them, and a reader can see where a rule came from — adds them as a subtree rather than a submodule, because a subtree needs nothing from the people who clone the project:

```bash
git subtree add --prefix=.agents/rulebook \
  https://github.com/xoyk/agents-rulebook.git main --squash
```

Later updates:

```bash
git subtree pull --prefix=.agents/rulebook \
  https://github.com/xoyk/agents-rulebook.git main --squash
```

The vendored copy is read-only in the consuming project. A project's own deviations belong in its `.claude/rulebook.json` under `overrides`, where they are recorded on purpose so the next sync does not silently undo them.

## Editing

Edit in place and commit, and **say why in the commit message**. These files are rules; the reason is the part that has to survive.

An agreement that turns out to be wrong is deleted rather than softened. A rule nobody follows is worse than no rule, because it teaches everyone that the document is decoration.
