<!-- rule:project-card -->
## The project card

`CARD.md` at the root says what this project is to someone who has never seen it:
a line, a paragraph, the one detail worth remembering, where it runs, how far it
has got, where to open it. A portfolio, a catalogue, a store draft, a talk or a
reply to "what are you working on?" copies from it instead of describing the
project again from the outside. It starts from the module's template:

```text
~/.claude/skills/agents-init/modules/project-card/CARD.md
```

- **True on the main branch, today.** Change it in the same commit as whatever
  makes a sentence untrue, and set `reviewed`. Something on a branch is not on
  the card until it is merged.
- **Nothing that goes stale by itself.** Commit counts and the last-changed date
  are counted when the card is read; the template says how.
- **Nothing invented.** The accent is the colour the code defines, or none;
  links are only addresses that answer; pictures come from invented data, never
  from a real user's.
- **What it must never say goes on the card too**, under *Never say*: the
  wording that would expose a client, a contract or a person. Whoever copies
  from the card reads it there, not in a conversation they were not part of.
- **Order, rank and whether to show it at all belong to whoever shows it.**
  The card describes; it does not place itself.

On 2026-10-13 one project's entry on its owner's portfolio had been written from
the outside two weeks earlier, and in those two weeks had missed a native app,
a pricing rule and the repository itself. An earlier wording on the same entry
had described the owner's real contract, and the portfolio had to be corrected
separately. Kept next to the code, the card is updated by the commit that
changes it, and the warning travels with the text.
