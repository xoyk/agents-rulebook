<!-- rule:release-notes -->
## Release notes come from commits

Every commit that changes what a tester can see carries a trailer per audience,
on top of the subject *Commits* already requires of every commit, so the notes
for a build are generated from the range rather than remembered afterwards.

```text
<type>(<scope>): short implementation summary

{{audience A}}: One tester-facing sentence in {{language A}}.
{{audience B}}: The same sentence in {{language B}}.
```

Rules:

- `feat`, `fix`, `perf` for a visible change. `docs`, `test`, `refactor`,
  `build`, `ci`, `chore` only for changes that need no tester-facing note.
- A trailer describes **the outcome or a concrete scenario to check**, never the
  implementation. One sentence.
- **Anti-BS check:** every note names the user-visible change *and* its expected
  result in a specific context. A tester must be able to tell what changed
  without reading the commit subject. "The demo link on the first onboarding
  screen is larger — check it matches the text beside it", not "check the demo
  link". Bare imperatives — "check the screen", "open the form", "test
  onboarding" — are rejected.
- For an internal change that deliberately needs no note, use exactly
  `{{audience A}}: skip` and `{{audience B}}: skip`. It stays in the source audit
  and out of the notes.
- Repeat a trailer on separate lines when one commit needs several scenarios.
- Merge commits carry no trailers; put them on the product commit instead.
- Run the strict check before archiving, and before the commit is pushed:

  ```bash
  {{strict notes check command}}
  ```

  It reads trailers off commits, so it cannot run before the commit exists —
  but it must run before the commit leaves this machine. Fixing a rejected
  trailer that is already published costs a force-push.

<!-- rule:release-pictures -->
## A visible change ships with its picture

**If a feature can be seen and the project can take its own screenshots, the
release note carries a picture of it — taken from invented data.** Not a picture
someone remembers to add: the note declares a recipe (where to go, what to
press), a script renders it against a demo build seeded with made-up people,
projects and numbers, and the release refuses a note that promised a picture and
has none. The rule on invented data under *Publishing* applies in full: a
release note is a public page.

A feature with nothing to photograph says so, in the note itself:

```text
{{no-picture field}}: <why — e.g. "a message printed in the terminal">
```

and the release refuses a note that carries **neither** a picture nor a reason.
The reason is kept in the file, off the page: a reader of the release has no use
for it, the next person asking "why no picture?" does.

Two things decide whether the rule holds in practice:

- **The recipe must be able to prepare the screen, not only walk to it.** A
  request waiting in a dialog, a switch the owner flips, a record in an empty
  list — if the capture tool only knows a URL and keystrokes, every feature that
  needs state is exactly the one that ships without a picture. Give the recipe a
  setup step that runs before the camera.
- **The recipe is kept, the picture is disposable.** Store recipes next to the
  pictures under the version. A recipe can be replayed on an older tag — which
  is how a missing picture is backfilled honestly, against the version that
  shipped the feature, and how a before/after pair is made.

```bash
{{screenshot command}}
```

13 September 2026, one project: 13 of its last 17 feature notes had gone out as
bare text, six of them for things plainly on the screen — a new object in the
main view, the cards of a permission dialog. Nothing asked for a picture: the
template came with one, deleting it was the short way, and the only guard
checked that a *declared* picture had been rendered. The capture tool could not
put a request in the dialog, so the one feature that most needed a picture had
no way to get one. Both were fixed in the same release, and the six were
backfilled against their own tags.

<!-- rule:release-tree -->
## One tree owns the release

A release is cut in the main checkout and nothing else happens there: it keeps
the generated native project, the dev server on its default port, the build
number bump, the archive and the finalize step. No worktree stands up a second
native project to test on a device — hand the branch over instead.

Two trees bumping the build number is two builds claiming one number, which the
store rejects. The generated native directory is also big enough that a second
copy is a real cost rather than a tidiness point.

<!-- rule:build-numbers -->
## Build numbers

The committed configuration and the generated native project are two different
files, and a local archive builds the generated one. **Before every archive,
set and verify the same build number in both**, and archive only after the
verification prints that number:

```bash
# The planned build number, in the committed config:
{{path to config, e.g. app.json → expo.ios.buildNumber}}

# The value the build will actually use:
{{command that reads it, e.g. plutil -extract CFBundleVersion raw ios/App/Info.plist}}
```

Do not assume changing the committed config updates an existing native
directory. Two trees bumping the number is two builds claiming one number,
which the store rejects.

<!-- rule:finishing-release -->
## Finishing a release

Tag the **exact archived commit**, never `HEAD` by assumption — the archive is
cut from a working tree, so the commit is the only thing that answers "which
code is build N?".

**Finalizing is not finished while the release is still a draft.** The last act
is to ask the user to review the notes and say whether to publish — in the same
message that reports the tag, not later. A draft created automatically and a
publishing step nobody was asked about is how builds sit unpublished for days,
leaving gaps in a list that is supposed to be a history.

When publishing an older build after a newer one is already out, keep the
"latest" marker off it, or the old release takes the badge from the current one.

**A tag needs its commit on the remote.** Finalizing puts the tag on the
archived commit and opens a release against it, so that commit is pushed before
it is tagged — a tag pointing at a commit the remote does not have is a broken
tag. Everything else about when to push is in the core: see *Pushing*.
