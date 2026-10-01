---
name: agents-init
description: Installs working agreements into a project — AGENTS.md and BACKLOG.md, assembled from the templates and modules in this skill, then stamped so the copy can be compared with the canon later. A core plus optional modules: a design-first cycle, releases, publishing a public page, and a team feed. Use it when someone starts a new project and asks for working agreements, conventions, an AGENTS.md, a "starter" or a "rules template", invokes /agents-init, or when an existing repository has no such rules and they ask for them. Do not use it to edit an AGENTS.md that is already installed — that is ordinary file editing.
---

# Working agreements for a project

Installs two files: `AGENTS.md` (the agreements) and `BACKLOG.md` (the list of
work). Claude Code reads `AGENTS.md` by itself, like every other agent, so
there is no `CLAUDE.md` pointer: the canon installed a one-line `@AGENTS.md`
until 26 September 2026, when Claude Code 2.1.282 was measured loading
`AGENTS.md` with no `CLAUDE.md` at all. A `CLAUDE.md` a project already has
is left alone.

The text lives next to this file: `templates/AGENTS.core.md`,
`templates/AGENTS.tail.md`, and one folder per module under `modules/`.

**A module is a folder, not a file.** `modules/design-first/MODULE.md` is the
text that gets installed into a project; `modules/design-first/scripts/` holds
the tools that serve those rules and `modules/design-first/skills/` the
procedures an agent reads to carry them out, and both stay here. Only text is
copied into a project. A script is invoked, and a procedure read, from this
directory by path, so five projects share one copy and a fix reaches all of
them without any sync at all.

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
ls AGENTS.md BACKLOG.md 2>/dev/null
git rev-parse --show-toplevel 2>/dev/null || echo "not a git repository"
```

On a project that already carries a rulebook, `node <skill>/scripts/install.mjs
--check` lists what is not wired up yet — the page, the hooks, the registry.

**Never overwrite an existing `AGENTS.md`.** If there is one, read it, show the
user which parts of the template it is missing, and ask whether to add the
missing sections. Agreements are written in blood; somebody else's file may
carry rules the template has never heard of.

If the file exists but has no anchors, offer to add them: match its sections to
the template by meaning rather than by heading, and mark everything else
`<!-- local:<id> -->`. It is a one-off job, and until it is done the copy cannot
be compared with the canon or with any other project.

### 2. Ask six things, and two more only where they apply

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
5. **Whether the team keeps a feed of changes** — whether the `team-feed`
   module is needed. It covers an agent drafting a one-line message for the
   team's channel when a notable change lands, and posting it only on the
   user's yes. It needs the channel's name, which fills its one `{{...}}`.
6. **Whether there is an Apple app** — iPhone, iPad or Mac, native or Expo —
   whether the `apple` module is needed. It covers the generated Xcode project
   nobody clicks settings into, the signing Team kept in a local file and found
   on the machine rather than asked for again, simulator commands that name
   their OS, and the first device run being the user's. It is about having an
   Apple app at all, not about the App Store: a device build needs the Team
   from the first day, releases or none.

7. **Only when design is in the loop: how the design space is arranged.** Two
   answers. *Many projects in one space* — a person or a studio keeping every
   app they build side by side, a file each. *One project, many files* — a
   product or a product line spread over a library, the screens, the emails.
   The answer goes into `.claude/rulebook.json` as `figma.space`,
   `many-projects` or `one-project`, and it decides what a file's cover says in
   large type: the project's name in the first case, what the file is in the
   second. Offer the first as the default for a solo developer.

   It is asked because it cannot be seen from inside one project. On
   30 September 2026 Budgy's cover came out reading "Product — design" in a
   Figma project where every neighbouring file was another app's design: the
   cover step had been written for the second arrangement and assumed it.

8. **Only when step 1 found no repository: whether to start one.** Local only —
   `git init` on `main`, no remote, nothing committed. Offer "yes" first and
   mark it recommended: every rule in the core assumes a repository, and so
   does the pre-commit hook that keeps the page current. The answer yes is
   `install.mjs --git-init` at step 4; the answer no is a plain run, which
   skips the git hooks and says so.

   Never run `git init` without asking, however obviously right it looks. On
   26 September 2026 4FH was installed as a plain directory and the agent
   initialised it on its own initiative; the repository was wanted, the
   unasked question was not. A remote is not part of this question at all:
   where the work becomes visible is decided later, by the user.

Ask nothing else. Everything else is a fill-in-the-blank in the text, and those
are cheaper to correct later than to guess now.

### 3. Assemble the file

Assembly order: `templates/AGENTS.core.md` → the chosen modules in the order
listed above (`design-first`, `release`, `publishing`, `team-feed`, `apple`) →
`templates/AGENTS.tail.md`.

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

### 4. Wire it up with one command

```bash
node <skill>/scripts/install.mjs              # add --git-init if the answer to the git question was yes
```

Everything after assembly is the same every time, so it is a script rather than
prose for a model to carry out. It does whatever is missing and leaves alone
whatever is in place, so running it twice is safe:

- **The repository**, with `--git-init` only, where there is none: `git init`
  on `main`, no remote, no commit. It comes first, so the git hook below lands
  in the same run.
- **The stamp**, `.claude/rulebook.json`, through `stamp-rulebook.mjs` — only
  when there is none. For a rulebook that was not assembled here, pass
  `--basis adopted`.
- **`BACKLOG.md`** from `templates/BACKLOG.md` — only when it does not exist.
- **The page**, `.claude/rulebook.html`, through `render-rulebook.mjs`.
- **The Claude Code hook** that redraws the page when `AGENTS.md` is edited,
  merged into the project's `.claude/settings.json`.
- **The git pre-commit hook** that redraws and stages the page — only where the
  rulebook is in git.
- **The worktree hooks** in the user's `~/.claude/settings.json` — only where
  the rulebook is out of git.
- **The registry entry** in `~/.config/agents-rulebook/recipients.json`.

It refuses to write anything while `AGENTS.md` still holds a `{{...}}` or a
heading without an anchor: the stamp would record the blank as canon, and the
page would publish it. Fix the file and run it again.

Every line of its output starts with `ok`, `done`, `skip` or `hand`. **A `hand`
line goes into the report, in `Needed from you`:** it is a step the script would
not decide — a settings file that is not valid JSON, a pre-commit hook that
belongs to somebody else. A `skip`
line says why a step does not apply, and belongs in the report too: "no git hook
here, because the rulebook is out of git" is a decision the reader should see.

`--check` says the same without writing anything, and `--check --all` says it
for every project in the registry. Run it on a project that was installed
before this script existed: the steps nobody carried out show up as `todo`.

The rest of this step is why the script does what it does. Read it before
changing the script, not before running it.

#### The stamp

Anchors say *which* section this is; the stamp says *what it looked like when it
arrived*. Without it, a section that differs from the template is ambiguous —
either somebody edited it here, or the template moved on. Those are opposite
fates, and the diff looks identical. The stamp script infers the modules from
the anchors present rather than asking again: the file is the truth about
itself, and a stamp that argues with it is worse than none.

An existing stamp is never rewritten here. A section that differs from its
stamp is exactly the `ours` signal the sync reads, and re-stamping on install
would erase it. `stamp-rulebook.mjs --check` says which sections have drifted.

#### The registry

It lives **outside this repository**, because this repository is public and the
registry names private working directories. It is also in no other repository
and nothing syncs it: each computer has its own list, or none. A path that is
not on this machine is skipped silently — which also means a path that is gone
stays listed until somebody says otherwise, with `install.mjs --forget <path>`.
`--check --all` names a project with no commit in three weeks as a `note`, so
a retired one gets noticed.

A worktree registers its project's main checkout, which is where the copy
lives, and an entry that is a worktree of the project is replaced by the
project: the day the worktree is removed, it would drop the project out of every
report without a word.

#### The hooks

**Rulebook in git or out of it is the project's own call**, and the files go
together either way: `AGENTS.md`, the stamp and the page. The
README says why a subset lies. The script reads the answer from `git
check-ignore AGENTS.md` and installs the hooks that fit:

- **In git** — the git pre-commit hook, the common denominator for any editor
  and any agent. It goes where the project already keeps its hooks. An
  existing `core.hooksPath` is followed, never re-pointed: on 15 September 2026
  valey-site had `core.hooksPath = tools/hooks`, holding the pre-push gate that
  keeps an unreleased commit off `main`, and `git config core.hooksPath
  .githooks` as this step used to say would have switched the gate off. A
  pre-commit that is already there is not edited: whether the block can go at
  its end depends on what runs before it. `install.mjs --pre-commit` prints the
  block to add by hand. The hook carries two guards paid for on 4 September
  2026, the day one project took its rulebook out of git; the script's comment
  tells that story.
- **Out of git** — no git hook, since `AGENTS.md` is never staged and the hook
  would have nothing to fire on. Instead, two hooks in the user's
  `~/.claude/settings.json` (not the project's: they must reach worktrees whose
  own settings are an old copy too) run `scripts/refresh-worktree.mjs`. One fans
  an edit of the project's `AGENTS.md` out to every worktree; the other
  refreshes a worktree when a session starts in it, and tells the session to
  re-read the file if it had to replace it.

  **Never link a worktree's `AGENTS.md` to the project's copy instead.** Claude
  Code does not load an instruction file that resolves outside its project; on
  12 September 2026 seventeen worktrees were linked, and the next session in
  one of them started with no rulebook at all. The README has the measurements.

The Claude Code hook in the project's settings is installed in both cases. In
its `--hook` mode `render-rulebook.mjs` reads the event from stdin and redraws
only when `AGENTS.md` was edited; on other files it stays quiet and never
returns an error. Every hook the script writes is guarded by `[ -f ]`, so a
clone without the skill gets a no-op, not an error on every edit. A settings
file is saved to `~/.config/agents-rulebook/settings-backups/` before a hook is
merged into it.

None of these hooks touches the stamp, for the same reason the install does
not re-stamp.

### 5. Say what comes next

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
node <skill>/scripts/sync-rulebook.mjs --offline    # skip the check against origin
node <skill>/scripts/sync-rulebook.mjs --html       # the registry as a page
```

**Every run first says where this checkout stands against its own remote.** The
verdicts below are computed against `HEAD` of this clone, so a clone left behind
does not fail — it reports every recipient as being in step with a canon nobody
else is using. That is a false all clear, and it is worse than an error, because
nothing about it looks wrong. A behind checkout is therefore reported, makes the
exit code non-zero, and prints the `git -C … pull` that fixes it; local edits to
the canon and unpushed commits are named too. When the check cannot run — offline,
no remote — the line says the question could not be asked rather than staying
silent, because silence would read as "up to date".

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

### The map

`--html` walks the registry and draws it as one page: the canon on its remote,
this clone, every recipient with its stamp, and the worktrees under each. Arrows
between them carry the verdicts — `take` from the clone, `offer` back to it,
`conflict`, `publish` from the clone to the remote — and each arrow opens the
list of sections behind it and the command that would act on it. The text
report answers "what is wrong with this copy"; the page answers "where does
each copy live and which way does a change travel", which the text never showed
without walking it by hand.

Worktrees get a column of their own because they are the copies the registry
cannot see. A worktree's `AGENTS.md` is a fresh copy of its project's, a stale
one, a link, or missing, and the page says which — unless git tracks the file,
in which case each tree follows its own branch and that is not drift. A link is
drawn as broken, not as current: Claude Code will not load it. The refresh
arrow carries the command that fixes all of them, `refresh-worktree.mjs --all`.

The page is written to `~/.config/agents-rulebook/sync.html`, next to the
registry and never into a repository: it names the directories on this machine,
and those are nobody else's business. It is read-only — no script, the details
open by fragment — so opening it acts on nothing. `--out <path>` puts it
elsewhere.

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
  cost. The hooks in step 4 are the exception, and they only redraw a page or
  refresh a copy.
- **It does not carry agreements between projects automatically.** A rule
  derived from somebody else's incident is cargo cult; a module travels whole,
  because it brings its own stories with it.
