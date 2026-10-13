---
# What this project is, for anyone presenting it elsewhere. Copied from here, never
# rewritten from the outside; the rules are in AGENTS.md, "The project card".
name:
kind:          # app, game, site, tool, library, writing, music, ...
platforms: []  # web, ios, android, macos, windows, linux, cli, ...
status:        # active (being built) | live (public, maintained) | done | paused | archived
since:         # YYYY or YYYY-MM
stack: []      # up to five, as a reader would recognise them
accent:        # the project's own colour, as its code defines it; empty if it has none
icon:          # a path in this repository; empty if there is none
links: []      # only addresses that answer:  - { kind: live | repo | store, url: , label: }
reviewed:      # YYYY-MM-DD, the day every sentence below was checked against the code
---

# <name> — the card

One bullet per language the card is shown in, the original first.

## Tagline

Nine words at most.

- **en** —

## Description

Two or three sentences, 420 characters at most: what it does as it is used, not
as it is built, and how far it has got.

- **en** —

## Hook

The single most interesting concrete detail, in one sentence.

- **en** —

## Caveat

Only when there is nothing public to open: one honest line about where it is.

- **en** —

## Counted, not written

```bash
git rev-list --count --no-merges main         # commits
git log -1 --format=%ad --date=short main     # last changed
```

## Look

Where the project's own look is defined — the colour, the radius, the type, a
motif — by file, so a frame or a thumbnail can be taken from it instead of made up.

## Pictures

What can be shown and how to make it from invented data: the launch flag, the
seed, the screen. "None yet" and why, when there is none.

## Never say

Wording that would expose a client, a contract, a person or a number from real
work, and what to say instead.
