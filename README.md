# agents-rulebook

Working agreements for projects that are built with coding agents in the loop.
The text is the product: `templates/AGENTS.core.md` plus the optional modules
assemble into a project's `AGENTS.md`, which every agent that reads
`AGENTS.md` — Claude Code, Codex, Cursor — then follows.

Every agreement here carries the incident that produced it. That is deliberate:
a rule whose reason is lost gets re-litigated the first time it is
inconvenient.

## What is in here

| File | What it covers |
|---|---|
| `SKILL.md` | The installation procedure, written as a Claude Code skill: what to ask, what to assemble, what not to overwrite. |
| `templates/AGENTS.core.md` | Reporting back, saying what actually happened, names, the backlog, working in parallel, commits, things only the user does. |
| `templates/AGENTS.tail.md` | How to extend the file — always assembled last. |
| `templates/modules/design-first.md` | Design before code: a `WIP` section per piece of work, archiving, placement, and the three Figma painting traps that ship invisible text. |
| `templates/modules/mobile-release.md` | Release notes from commit trailers, one tree owning the release, build numbers, finishing a release, pushing. |
| `templates/BACKLOG.md` | The backlog file a project starts with. |

## Using it as a skill

The repository is the skill directory, so installation is a clone:

```bash
git clone git@github.com:xoyk/agents-rulebook.git ~/.claude/skills/agents-init
```

Then `/agents-init` in a project assembles `AGENTS.md`, `BACKLOG.md` and a
`CLAUDE.md` pointer. Updating is `git pull` — a skill is read fresh on every
invocation, so there is nothing to build or restart.

## Vendoring it into a project

A project that wants the templates present in its own tree — so that CI can
check the assembled file against them, and so that a reader can see where a
rule came from — adds them as a subtree rather than a submodule, because a
subtree needs nothing from the people who clone the project:

```bash
git subtree add --prefix=.agents/rulebook \
  https://github.com/xoyk/agents-rulebook.git main --squash
```

Later updates:

```bash
git subtree pull --prefix=.agents/rulebook \
  https://github.com/xoyk/agents-rulebook.git main --squash
```

The vendored copy is read-only in the consuming project. A project's own
deviations from the templates belong in that project's `.agents/rulebook.yml`,
where they are recorded on purpose so the next sync does not silently undo
them.

## Editing

Edit in place and commit, and **say why in the commit message**. These files
are rules; the reason is the part that has to survive.

An agreement that turns out to be wrong is deleted rather than softened. A
rule nobody follows is worse than no rule, because it teaches everyone that the
document is decoration.
