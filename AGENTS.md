# Working agreements — the rulebook kit

This repository is the canon other projects install their `AGENTS.md` from. It
is public, and it is also live: `~/.claude/skills/agents-init` on its owner's
machine is a clone of `main`, read fresh by every Claude Code session there.
Both facts shape everything below.

## Work in a worktree, never in the skill directory

A change typed into `~/.claude/skills/agents-init` reaches every running session
the moment it is saved — half-written procedures included. Branch a worktree
outside it, as the core rules say, and merge into `main` there only when the
work is accepted:

```bash
git -C ~/.claude/skills/agents-init worktree add ../../Projects/agents-rulebook-<topic> -b <topic>
```

## It works on a machine that is not its owner's

Most people who clone this have none of the owner's setup: no Figma library, no
Apple Team, no registry, no token. Everything here must install and run there.

- **Personal things live in `~/.config/agents-rulebook/`, never in the
  repository** — `recipients.json`, `apple.json`, `figma-library.json`,
  `private-words.txt`. A procedure may use one; where it names it, it says what
  happens without it, and the without-case works.
- **Nothing here may require a resource only one person can reach.** A Figma
  library, a Slack channel, a private repository: each is an option a person
  points the kit at, with a path that works from the repository alone. The
  Figma masters are built from `modules/design-first/figma/`, so anybody can
  have the library the owner has.
- **`scripts/test/clean-room.test.mjs` is the proof**: an empty home, every
  module, a fresh install. A change that breaks it does not merge.

## Nothing private goes out

```bash
git config core.hooksPath .githooks   # once per clone
```

The pre-push hook runs `scripts/privacy-guard.mjs` on the tree and the commit
messages being pushed: home directories, Figma links and keys, teams, tokens,
Apple Team IDs, people's addresses, and every word on the owner's stop-list in
`~/.config/agents-rulebook/private-words.txt` — clients and private projects,
which cannot be listed here without publishing them. Do not push around it with
`--no-verify`; take the thing out, or replace it with a placeholder in angle
brackets.

Stories in commits and docs name what happened, not who it happened to: "one
project", "a client's app". The projects that already appear by name in the
history appear because their owner made them public.

On 2026-10-02 `main` had to be rewritten and force-pushed to take private
working directories out of a story in the README. Published history is not
rewritten for anything else.

## Checks

```bash
node --test $(git ls-files '*.test.mjs')
node scripts/privacy-guard.mjs
```

## Pushing

A branch push here is a publication. Branches stay local; `main` is pushed
after a merge, on the owner's word.

## Language

English, everything — the repository is installed into projects in any
language, and read by anyone on their teams.
