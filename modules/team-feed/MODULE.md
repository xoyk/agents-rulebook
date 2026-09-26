<!-- rule:team-feed -->
## The team feed

{{team feed channel, e.g. #changes in the team's messenger}} is a feed of what changed,
and each entry in it is one event in one message. When a piece of work ends with
something a teammate would be surprised not to know next week — a change merged,
a release live, a design approved — the closing answer offers a ready message for
it, just above the three-line report. **It is posted only after the user says
yes to that message**, through whatever messenger the team uses — Slack,
Telegram, Mattermost, anything with a channel — by the session's tool for it, or
pasted by the user where the session has none. A yes to one message is not a yes to the next: posting
is sending on the user's behalf, which the core keeps as theirs.

- **One sentence, past tense, then a link.**
  `<emoji> <what changed, for whom> — <link to the merge, the frame or the issue>`.
  Only what has already happened: no "WIP", no plans, no "will".
- **One event per message, never a digest.** Each message grows its own thread,
  and the thread is where anyone who wants to discuss that one event does it;
  three events in one message leave nowhere to talk about the second.
- **Not every commit.** Refactors, test fixes, dependency bumps and CI noise stay
  out. The test is whether someone outside the task would want to know.

| | Event |
|---|---|
| 🚀 | A release is live |
| ✅ | A change people can see merged to the main branch |
| 🎨 | A design handed over, or approved |
| 🐛 | A bug fixed in production |
| 🔥 | An incident, or something broken others should know about |
| 🧰 | A change to process, tooling or these agreements |
| 📊 | A finding from data |
| 🤝 | A customer or business milestone |

For example: `✅ Search keeps its filters when you come back to the list. — <link>`.

One project opened such a channel on 2026-09-25, because its news was scattered
across three topic channels and the bots' channels, and nobody saw the whole
week in one place. It worked from the first day and was taken into the canon on
2026-09-26; the first time it turns out wrong, that story goes here.
