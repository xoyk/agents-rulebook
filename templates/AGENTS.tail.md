<!-- rule:extending -->
## How to extend this file

**A rule without the incident that produced it lasts until the first argument
about it.** This file is worth reading because almost every paragraph in it can
answer "why?" with a date and a consequence, not with taste. Keep it that way:

- Write the rule, then the story in one or two sentences: what was tried, what
  broke, what it cost. The story is what stops the rule being re-litigated, and
  what lets a future reader see when it no longer applies.
- **Add the rule when the incident happens**, not later. The details that make
  it convincing evaporate within a day.
- **Delete a rule when its reason is gone.** A file that only grows stops being
  read, and an unread agreement is worse than none — it looks like coverage.
- Prefer one rule with a real story to five without. Platitudes about clean code
  are already in the model; this file is for what is true *here*.

<!-- rule:section-anchors -->
### Section anchors

Every section here carries an HTML comment above its heading —
`<!-- rule:reporting-back -->`. It does not render, and it is the section's
identity: **rename the heading to suit this project, but keep the comment.**

- **A section this project invents gets its own anchor**, with a `local:`
  prefix — `<!-- local:staging-box -->`. That is the mark saying "this rule was
  written here", which is what makes it findable later.
- **Never reuse a `rule:` id for something else**, and never delete one while
  the section survives under a new name. A missing anchor is indistinguishable
  from a deleted rule.

Four copies of this file were compared on 2026-08-29 and had drifted past the
point of comparison: the design section was called `Design-first workflow`,
`Design comes first` and `Figma design workflow` in three of them, and the
largest copy had silently lost both this section and the one about honest
reporting. Nothing lined up, so nothing could be collected back into the
template every copy came from. The anchors are what let the same rule be
recognised across projects that each renamed it.

<!-- rule:canon-precedence -->
### Canon wins, unless the deviation is declared

Sections anchored `rule:` came from the shared template and are the same rule in
every project carrying it. Sections anchored `local:` were written here. Where
the two contradict, **follow the `rule:` one** — it is the version that has
already been argued about in more than one project, and a local paragraph that
quietly says the opposite is usually older thinking nobody revisited.

A project that genuinely needs to depart from a canon rule declares it instead of
editing the text and hoping:

```json
// .claude/rulebook.json
"overrides": {
  "pushing": "nothing is pushed here until the user asks; the canon pushes on commit"
}
```

- **The reason is the whole point.** An override without one is indistinguishable
  from a section somebody edited and forgot, which is the state this mechanism
  exists to get out of.
- **A declared override is never written over** by `sync-rulebook.mjs --apply`,
  and it is printed on every run so it stays in sight. When the canon moves
  underneath one, the report says so: a deviation can outlive the thing it was
  deviating from.
- **Dropping a canon section is an override too.** A module that arrived whole
  and lost two sections should say which and why, or the next reader cannot tell
  a decision from an accident.
