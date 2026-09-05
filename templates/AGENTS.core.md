# Working agreements

{{one line: what this project is, so an agent that opens this file first knows what it is looking at}}

<!-- rule:reporting-back -->
## Reporting back

Every answer closes with the same three lines, after the substance rather than
instead of it:

```text
**Current task** — the thing being worked on, in one line.
**Status** — where it stands: built / waiting for approval / blocked / pushed.
**Needed from you** — what only the user can do. "Nothing" when that is true.
```

Answers here run long — measurements, decisions, what was rejected and why —
and this is the one place that says whether the thing is finished and whether
the user is holding it up. It summarises the message above it; it does not
replace it.

- One sentence per line. A status that needs a paragraph has a paragraph in the
  body and a sentence here.
- **`Needed from you` is about the user.** Approvals, a choice between
  options, testing on a device, anything with credentials — things that cannot
  move without them. Never pad it with work the agent is about to do anyway.
- Write "Nothing" plainly when nothing is needed. An invented ask is worse than
  a blank one: it teaches the reader to skip the line.

<!-- rule:honest-reporting -->
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

<!-- rule:agent-names -->
## Names

Agents here are called by whatever name the person talking to them uses. If you
are addressed by a name, that is your name for the rest of the conversation:
answer to it, and do not spend a line correcting it.

It costs nothing, and it saves the "actually I am ..." exchange that would
otherwise open every session. What does not change is what sits behind the name
— if someone asks directly what you are, say it plainly. A nickname is a way of
being addressed, not a claim about who is answering.

<!-- rule:backlog -->
## The backlog

`BACKLOG.md` holds everything known to be worth doing and nothing else — the
answer to "what next?" and the place a bug or an idea goes when it is noticed
in passing. Read it before proposing work, add to it rather than mentioning
something once in a conversation, and close an item by deleting it.

Add to the end of a section rather than the top: everybody edits this file, and
appending turns most collisions into no collision at all.

<!-- rule:parallel-work -->
## Working in parallel

**One agent, one working tree.** Two agents in a single checkout share a `HEAD`,
an index and a working tree, and there is no way to be careful enough about
that: `git add -A` sweeps up somebody's half-written file, `git revert` refuses
because their edits sit in a file it must touch, and committing "only my lines"
from a shared file means building index blobs by hand. Branching inside a shared
checkout is worse than not branching, because a checkout switch pulls files out
from under whoever else is typing.

**A dirty tree is the signal, and it is checked before starting rather than
after.** `git status` showing modified files somebody else has not committed
means the checkout is in use: branch a worktree and work there. You cannot tell
another agent's live edits from a leftover by looking at them, and by the time
the difference matters your commit already contains both.

```bash
git status --short          # anything here and the answer is a worktree
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

<!-- rule:worktree-limits -->
### What worktrees do not fix

Files everybody edits — `BACKLOG.md`, this file, translation dictionaries. A
worktree turns silent clobbering into an ordinary merge conflict, which is the
win. Anything with a single shared history and no branches — a design file, a
tracker, a live environment — is not helped at all and needs an owner named per
piece of work.

<!-- rule:commits -->
## Commits

- **Conventional Commit subjects**, on every commit — not only on the ones that
  reach a release note. `<type>(<scope>): summary`, where the type is one of
  `feat`, `fix`, `perf`, `docs`, `test`, `refactor`, `build`, `ci`, `chore`.
  The prefix is what lets a range be read by a generator, a reviewer or a
  bisect without opening each diff, and a history that is conventional in one
  half is not searchable in either.
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
- **Committing is not pushing, and not merging.** Those are the next two
  sections, and they are decided separately from this one.

<!-- rule:pushing -->
## Pushing: the branch is yours, `main` is not

Three levels, decided by different people:

- **Your own branch is pushed always, without asking, from the first commit** —
  not when the work looks finished. A branch push is a backup and a URL somebody
  can look at, not a publication. Nobody branches off it, so a force-push on it
  costs nothing.
- **Merging into `main` is the user's call, every time.** That is the real gate:
  other worktrees branch from `main`, releases are cut from it, and anything
  published hangs off it.
- **An agent never pushes straight to `main`.** It merges a branch the user has
  accepted, or it does nothing.

Force-pushing follows the same line: free on your own branch until it is merged
or somebody has based work on it, forbidden afterwards.

One rule — "pushing is the user's call, every time" — used to cover all three.
It was written when `origin` existed only so a public page could point at a
clone, so it was priced for the worst case, and that made the cheap case
expensive. On 2026-09-05 a project running it had thirteen branches unmerged
into `main` and six of them on the remote: more than half of the unaccepted work
existed on exactly one disk. That is not caution, it is a backup nobody took.

**On a public repository a branch push is a public act.** Drafts, debug commits
and half-written text are visible and get indexed. Where that matters, WIP
branches live in a private staging repository and only merges reach the public
one.

<!-- rule:merge-and-release -->
## Merging and releasing

**Accepted means merged, the same day.** Acceptance is an event that happens to
the user, not the end of the agent's work, and a branch that was approved but
never merged is indistinguishable from one nobody looked at.

```bash
git merge --no-ff <branch>          # the branch's commits stay distinguishable
git branch -d <branch>
git push origin --delete <branch>
```

`--no-ff` is not decoration. With a commit per piece of work, the merge commit
is what turns "revert the whole feature" into one command instead of a hunt.
Deleting the branch on both sides is part of the merge, not tidying to be done
later.

**A pull request is a record, not a gate, and usually not worth opening.** Where
the user accepts work on a running build, a review request nobody will open is
ceremony: it gates on checks a project may not have, and squashing it would undo
the commit-per-piece rule above. Open one when somebody other than the user has
to read the diff, or when the discussion is worth keeping.

**`main` is always shippable, and a release is a tag on it.** Nothing merges into
`main` that has not been accepted, so there is nothing to stabilise on a side
branch — a release branch here would carry zero commits of its own.

**The trigger for changing that is worth writing down**, so the day it arrives
somebody recognises it: the first time a person is running an older version and
needs a fix that cannot wait for `main` to become shippable. That is when a
release branch starts earning its keep, and not before.

<!-- rule:user-only -->
## Things only the user does

Never do these, whatever the framing, and say plainly that they are the user's:

- Typing passwords, API keys or card details into anything.
- Publishing, sending, or posting outward on their behalf without a clear yes.
- Anything destructive without naming exactly what will be lost first.
- {{project-specific: store submissions, production data, billing}}
