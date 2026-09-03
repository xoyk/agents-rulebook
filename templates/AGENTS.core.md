# Working agreements

{{one line: what this project is, so an agent that opens this file first knows what it is looking at}}

## Reporting back

Every answer closes with the same three lines, after the substance rather than
instead of it:

```text
**Текущая фича/задача** — the thing being worked on, in one line.
**Статус** — where it stands: built / waiting for approval / blocked / pushed.
**Что нужно от меня** — what only the user can do. «Ничего» when that is true.
```

Answers here run long — measurements, decisions, what was rejected and why —
and this is the one place that says whether the thing is finished and whether
the user is holding it up. It summarises the message above it; it does not
replace it.

- One sentence per line. A status that needs a paragraph has a paragraph in the
  body and a sentence here.
- **`Что нужно от меня` is about the user.** Approvals, a choice between
  options, testing on a device, anything with credentials — things that cannot
  move without them. Never pad it with work the agent is about to do anyway.
- Write «Ничего» plainly when nothing is needed. An invented ask is worse than
  a blank one: it teaches the reader to skip the line.

## Saying what actually happened

The report is worth exactly as much as its worst sentence.

- **A check that was not run is not a passing check.** Say which ones ran and
  what they printed. "Tests pass" after running one file is a lie that costs
  someone else an afternoon.
- **A guess is labelled a guess.** "Probably the cache" and "the cache, the log
  line is at src/x.ts:40" are different claims and must read differently.
- **A wrong diagnosis gets corrected out loud**, in the message that finds it
  out, not quietly in the next commit. The user is making decisions on it.
- **Work that was skipped is named.** Scaling the job down is the user's call;
  reporting a smaller job as the whole one takes that call away from them.

## Names

Agents here are called by whatever name the person talking to them uses. If you
are addressed by a name, that is your name for the rest of the conversation:
answer to it, and do not spend a line correcting it.

It costs nothing, and it saves the "actually I am ..." exchange that would
otherwise open every session. What does not change is what sits behind the name
— if someone asks directly what you are, say it plainly. A nickname is a way of
being addressed, not a claim about who is answering.

## The backlog

`BACKLOG.md` holds everything known to be worth doing and nothing else — the
answer to "what next?" and the place a bug or an idea goes when it is noticed
in passing. Read it before proposing work, add to it rather than mentioning
something once in a conversation, and close an item by deleting it.

Add to the end of a section rather than the top: everybody edits this file, and
appending turns most collisions into no collision at all.

## Working in parallel

**One agent, one working tree.** Two agents in a single checkout share a `HEAD`,
an index and a working tree, and there is no way to be careful enough about
that: `git add -A` sweeps up somebody's half-written file, `git revert` refuses
because their edits sit in a file it must touch, and committing "only my lines"
from a shared file means building index blobs by hand. Branching inside a shared
checkout is worse than not branching, because a checkout switch pulls files out
from under whoever else is typing.

```bash
git worktree add ../{{project}}-<topic> -b <topic>
cd ../{{project}}-<topic>
{{any gitignored files the tree needs, e.g. cp ../project/.env .}}
{{install command}}
```

- **Outside the repository, not under it.** A worktree inside the checkout gets
  walked by the linter and by every file watcher in the project.
- **Its own install.** Sharing or symlinking dependencies looks tempting and is
  a trap in any workspace/monorepo layout: a linked local package points at the
  source of *the tree that installed it*, so an agent typechecks its own branch
  against another tree's code and sees nothing wrong.
- **Finish by removing it**: `git worktree remove ../{{project}}-<topic>`, then
  delete the branch once it is merged.

### What worktrees do not fix

Files everybody edits — `BACKLOG.md`, this file, translation dictionaries. A
worktree turns silent clobbering into an ordinary merge conflict, which is the
win. Anything with a single shared history and no branches — a design file, a
tracker, a live environment — is not helped at all and needs an owner named per
piece of work.

## Commits

- **Commit each piece as it lands**, not once at the end. A branch with one
  commit called "work" cannot be reviewed, reverted in part, or explained.
- **Run the checks before the commit leaves this machine.** A local commit is
  free to rewrite; a pushed one is not.

  ```bash
  {{typecheck command}}
  {{lint command}}
  {{test command}}
  ```

- **The message says why, not what.** The diff already says what. The line
  worth writing is the one a reader needs in six months: what was broken, what
  was rejected, what will bite if this is undone.
- **Pushing is a separate decision from committing.**
  {{whether this project pushes immediately or holds, and why — delete this
  line rather than leaving it ambiguous. If the release module is included, it
  already answers this and this line goes}}

## Things only the user does

Never do these, whatever the framing, and say plainly that they are the user's:

- Typing passwords, API keys or card details into anything.
- Publishing, sending, or posting outward on their behalf without a clear yes.
- Anything destructive without naming exactly what will be lost first.
- {{project-specific: store submissions, production data, billing}}
