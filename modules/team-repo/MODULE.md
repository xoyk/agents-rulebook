<!-- rule:team-language -->
## Anything the team reads is in {{team language, e.g. English}}

**Everything team-wide is written in {{team language}}.** Commits, pull request
titles and bodies, tickets, code comments, `BACKLOG.md`, this file, design
briefs and published pages. This is not a style preference: a team that does
not share a second language cannot review a body written in one, and a reviewer
who has to translate a description first has stopped reviewing the diff.

**An artefact keeps that language even when the conversation does not.** It
outlives the chat that produced it and reaches people who were never in it.
Reply to the user in the language they are writing in; the artefact does not
follow the chat. Only an explicit request for another language overrides this.

On 2026-09-19 one team's pull request was opened with a body in the language
of the chat, and a teammate who does not read it was requested as the reviewer,
purely because the session had been in that language and nothing in the
repository said otherwise. A sibling repository of the same team had carried
this rule for weeks; that copy simply never got it.

<!-- rule:branch-names -->
## Branch names

```text
<type>/<KEY>-<slug>
```

- **`<type>`** is one of the Conventional Commit types *Commits* already
  requires of every subject: `feat`, `fix`, `perf`, `docs`, `test`,
  `refactor`, `build`, `ci`, `chore`. The prefix of the branches that deploy —
  {{deploy branches, e.g. `release/`}} — belongs to them and nothing else.
- **`<KEY>`** is the ticket actually in scope, as *The ticket key* below
  defines it. Never invent one; with no ticket, `{{KEY}}-0`.
- **`<slug>`** is kebab-case and short enough to read in a branch list.

**Who made the branch does not go in its name.** That is on the pull request,
next to the avatar. A prefix named after a tool has to be rewritten every time
the tooling changes, and a rule that names one tool leaves every other agent
either non-compliant or silently exempt.

**Where a harness owns the prefix, keep it and fix the last segment.** Some
tools open their own namespace — `cursor/…`, `agent/…` — and an orchestrator
may need `<tool>/<session>/…` to tie a pull request to the session that opened
it. Renaming breaks the tool, so the rule binds the final path segment:
`agent/{{KEY}}-123-booking-history` is a correct name. Where nothing depends on
the prefix, use `<type>/`.

On 2026-11-07 one team compared the branch rule across its repositories and
found four copies in three formats: one demanded `cursor/`, one renamed every
branch to `agent/`, three gave an example key that belonged to another
repository, and the last thirty merged branches in one of them came from
`cursor/` and `agent/` in roughly equal numbers. Every copy had started as the
same paragraph.

<!-- rule:ticket-keys -->
## The ticket key is wherever a tool looks for it

**Every branch, pull request title and commit subject carries the key of the
ticket it finishes.**

```text
feat/{{KEY}}-123-keep-search-filters                       branch
{{KEY}}-123: Keep the search filters on the way back       pull request title
feat(search): {{KEY}}-123 keep the filters on the way back commit subject
```

- **All three, not the one that seems to matter.** Different tools read
  different places: tracker automation that moves a ticket when its pull
  request opens or merges reads the title and the branch; a release job reads
  the merged pull requests; a notes generator or a squash merge reads the
  subjects. Nobody keeps that map in their head, and a key missing from the
  place one tool reads leaves that ticket where it was.
- **`{{KEY}}-0` means "no ticket", on purpose.** A chore, a docs fix or a
  dependency bump carries it, so a check can demand a key on every pull
  request without blocking work that has none. Never invent a real-looking key
  to get past one.
- **The key is the task or bug the change finishes, not its parent.** A change
  that finishes several carries every key.
- {{the check that enforces it, e.g. a workflow that fails a pull request whose title has no key}}

On 2026-11-07 one team found three readers of keys across its repositories —
tracker automation on the title and branch, a release job on merged titles and
branches, a notes sync on commit subjects — and in one repository an older copy
of the release job that took keys from any commit message at all, so a ticket
mentioned in passing could be marked released. Writing the key everywhere is
the only rule that survives whichever of them a repository happens to run.

<!-- rule:pr-body -->
## A pull request body says what changed and where to look

The reviewer is somebody other than whoever wrote the diff, so the body is the
only place that says what to go and check. Name the visible change **and** where
it shows up. "The sign-out row in the sidebar is now red, icon included — check
it on the mobile overlay too" is a description; "check the sidebar" is not. A
bare imperative gives a reviewer nothing the file list did not already give
them.

- **A change to copy lists the keys it touched**, as `namespace.key` — key
  paths only, never the text. A body is not a review surface for wording:
  pasting the strings moves the argument about words out of the translation
  tool, where the translators are, into a diff they will never open.
- **The body is written for the reader who was not in the session.** No
  "as discussed", no "the fix from before", no plan that only made sense in the
  chat. If it needs the conversation to be understood, it is not finished.

The same rule is enforced mechanically where a release-notes generator reads a
trailer off each commit and rejects notes like "test onboarding"; the release
module carries that check. A repository with no generator still has reviewers,
so it is a writing rule there — which means it holds only if it is written
down.

<!-- rule:independent-review -->
## Every pull request an agent opens gets an independent review

**After an agent opens a non-trivial pull request, its last step is a review by
a fresh reviewer** — not the session that wrote it, not a fork of it, not a
subagent briefed with its reasoning. A fresh session given only the pull
request's address works out what the change does from the diff, the ticket and
the code around it, the way a teammate would. {{the review procedure and how it is started, e.g. the `pr-review` skill, started by a hook after `gh pr create`}}

- **Non-trivial means at least one file that is not documentation.** Code,
  specs and scripts count, and so do configuration, CI workflows, agent
  settings and hooks: they decide what a merge deploys and what an agent may do
  next. When in doubt, review.
- **A Medium or High finding means the pull request is not ready to merge.**
  The author fixes every one as commits on its branch, runs the checks, pushes
  the fixes in one push and asks for one more round. After the second round it
  stops and hands the pull request to the user; there is no third automatic
  round. Low findings go into the report, not into automatic fixes.
- **The pull request is not reported as finished until the review has reported
  back.** Its verdict and its link go into the author's closing report, above
  the three-line status.
- **Posting the review on the pull request is posting on the user's behalf.**
  It needs their yes, which a project may give once, as a standing yes written
  here with its date and its scope. Without one, the reviewer hands over the
  text and the command.
- **It does not replace the human reviewer.** It checks what a reader of the
  diff cannot see from the file list — the other side of a contract, the other
  apps that read what this one writes — and its write-up is what that reviewer
  opens first.

On 2026-10-22, in one team's backend repository, an author session reported
two thousand tests passing, which was true, and said nothing about a trigger
that counted some guests twice. A fresh session reviewing the change later
found that the fix had also stopped those guests counting toward a milestone in
the sales tool — a risk the earlier reviews had named and nobody had checked
against what shipped. An author reviewing its own work re-reads its own
reasoning; a fresh session reads the code.
