# Launch

The whole path of this product, from an empty folder to the stores, the landing
page and the promotion after it. Installed from the `project-launch` procedure in
the rulebook kit; how to keep it is written there:

```text
~/.claude/skills/agents-init/skills/project-launch/SKILL.md
```

- `[x]` with a date — done, by its *done when*. `[ ]` — open, however far along.
- `~~struck~~ — reason, date` — does not apply here. Never delete a line.
- *you* — accounts, money, signatures, legal, anything outward, device runs.
  *agent* — drafted, built and checked by the agent. *both* — the agent
  drafts, you decide.
- ⏳ — a wait no work shortens. Start it the day the phase opens.
- Decisions go on the step's line, one per line, dated.

## 0. What it is

- [ ] **The problem, in one sentence a stranger understands** — done when it
  fits on the cover of the design file and in the repository's description. *both*
- [ ] **Who it is for, and what they use today instead** — done when three
  named alternatives and the one thing this does that they do not are written
  here. *both*
- [ ] **The name** ⏳ — done when it is free as an App Store / Google Play name,
  as a domain, and on the social handles the promotion will use, and a
  trademark search in the markets you sell in found nothing close. *both*
- [ ] **How it makes money** — free, paid, subscription, one-off unlock; and the
  first price. Done when written here; it changes the store setup in phase 6. *you*
- [ ] **What launch means** — the date or the condition, and the one number
  that will say whether it worked (paying users, weekly actives, signups). *you*

## 1. Accounts and paperwork ⏳

Long waits, so they open now, not when they block.

- [ ] **Seller identity** — individual or company. A company needs its
  registration and, for Apple, a D-U-N-S number, which takes days to weeks. *you*
- [ ] **Apple Developer Program** — enrolled, paid yearly; the Team ID put in
  `~/.config/agents-rulebook/apple.json` (the `apple` module). *you*
- [ ] **Google Play Console**, if Android is in scope — paid once; new personal
  accounts must run a closed test with testers for a fixed period before
  production. *you*
- [ ] **App Store Connect agreements, tax and banking** — signed and filled, or
  no paid app and no in-app purchase can go live. *you*
- [ ] **EU trader status (Digital Services Act)** — declared in App Store
  Connect if the app is offered in the EU; a trader's contact details are shown
  on the store page. *you*
- [ ] **Domain** — bought, on auto-renew, DNS somewhere you can reach. *you*
- [ ] **A support address** — an inbox on the domain that someone reads. *you*

## 2. Foundation

- [ ] **Repository** — created; private or public decided (a public one makes
  every branch push a publication). *both*
- [ ] **Working agreements** — `AGENTS.md` and `BACKLOG.md` from `agents-init`,
  with the modules that apply; stamped and wired. *agent*
- [ ] **Design file** — set up by `modules/design-first/skills/figma-new-file`:
  pages, variables, kit, cover; the bindings written to `.claude/rulebook.json`.
  The Figma token is yours and lives in your settings, never in a repository. *both*
- [ ] **Demo seed** — invented clients, people and numbers the app can start
  with on a flag. Store screenshots, the landing and every public picture are
  taken from it, never from real data (the `publishing` module). *agent*

## 3. Identity

- [ ] **Wordmark and mark** — drawn in a WIP section, approved. *both*
- [ ] **App icon** — approved, then exported for every place that shows one:
  the Icon Composer file for iOS and macOS (light, dark, tinted, clear), and
  for the web a favicon, an apple-touch-icon and a manifest with a maskable
  icon. *agent*
- [ ] **Colour and type** — the tokens in the design file, the same names in
  the code. *agent*
- [ ] **The pitch** — one line and one paragraph, written once and reused by
  the store, the landing and every post. *both*

## 4. The product

- [ ] **The first version's scope** — the screens it ships with, listed here;
  everything else goes to `BACKLOG.md` under *Someday*. *both*
- [ ] **Built design-first** — every screen approved as a frame before code,
  promoted after acceptance. *agent*
- [ ] **Platform plumbing (Apple)** — bundle id under a domain you own;
  capabilities (iCloud container, app group, push) declared in the project
  spec, never clicked into Xcode; the `apple` module throughout. *agent*
- [ ] **First run on your device** — registers the device and creates the
  profiles in your account. *you*
- [ ] **Sync schema in production** — a CloudKit schema deployed from
  development to production in the CloudKit Console before any build that
  testers or customers run. Nothing tells you if you forget: the store build
  simply does not sync. *you*
- [ ] **Accessibility pass** — Dynamic Type, VoiceOver labels, contrast in both
  themes. *agent*
- [ ] **Languages** — which ones at launch, decided; the store listing follows
  the same list. *both*
- [ ] **Crashes and analytics** — crash reports on; analytics only as much as
  the privacy answers in phase 6 can honestly say. *both*
- [ ] **Data the user can take away** — an export, and an import of it. *agent*

## 5. Beta

- [ ] **Internal TestFlight** — a build in your own hands and your team's. *agent*
- [ ] **External TestFlight** — the first external build passes Beta App
  Review ⏳; a public link or a list of testers. *both*
- [ ] **A feedback channel** — where testers write, and a line in
  `BACKLOG.md` for every report worth keeping. *both*
- [ ] **Release notes from commits** — the `release` module's trailers, so
  every beta build says what changed. *agent*
- [ ] **A week without a new crash** on the latest beta. *agent*

## 6. Store listing

App Store Connect first; Google Play mirrors it where Android is in scope.

- [ ] **The app record** — name (30 characters), bundle id, primary language,
  SKU. *you*
- [ ] **Subtitle and keywords** — 30 and 100 characters; the keywords not
  repeating words already in the name. *both*
- [ ] **Description and promotional text** — from the pitch; promotional text
  can change without a review. *both*
- [ ] **Screenshots** — in the sizes App Store Connect asks for at the time,
  rendered by recipes from the demo seed, captions in every launch language.
  *agent*
- [ ] **App preview video** — optional; 15–30 seconds, from the demo seed. *both*
- [ ] **Category, age rating, content questions.** *you*
- [ ] **App privacy details** — every kind of data collected, linked or not to
  the user, used for tracking or not; they must match what the app does. *both*
- [ ] **Privacy policy and support URLs** — live pages on the landing's
  domain (phase 7) before submission. *both*
- [ ] **Export compliance** — the encryption answer, set once in the project
  so it is not asked on every build. *agent*
- [ ] **Price and availability** — the price from phase 0, the countries, the
  pre-order if any. *you*
- [ ] **In-app purchases or subscriptions**, if any — products created, a
  paywall that shows price and terms the way review requires, restore
  purchases working. *both*
- [ ] **Review notes** — what a reviewer needs to see the app working: a demo
  account or the demo seed's switch. *both*
- [ ] **Submitted for review** ⏳ — with release set to *manual*, so approval
  does not choose the launch day. *you*

## 7. Landing page

- [ ] **Structure** — the pitch and one screenshot above the fold; three
  features with pictures; price; questions; the store badge; footer with
  privacy, terms, support and contact. *both*
- [ ] **Drawn and approved as a frame**, like any other screen. *both*
- [ ] **Built and hosted** on the domain, every picture from the demo seed
  (the `publishing` module: a published file is overwritten, never just
  deleted). *agent*
- [ ] **Waitlist before launch** — an email field that works, and the list
  stored somewhere you own. *both*
- [ ] **Privacy policy and terms** — written for what the app actually does;
  reviewed by you, by a lawyer where the money or the market calls for one. *you*
- [ ] **Sharing and search** — title, description, a social card image per
  language, a sitemap, the store's smart banner. *agent*
- [ ] **A press kit** — icon, screenshots, the pitch, a few lines about the
  maker, as one download. *agent*
- [ ] **Analytics on the landing** — visits, store clicks, waitlist signups. *both*

## 8. Launch plan

Written before the day, so the day is execution.

- [ ] **The date** — not a Friday, not a store holiday freeze. *you*
- [ ] **The channels** — where the announcement goes, in what order: the
  waitlist email, your own accounts, the communities where the people from
  phase 0 already are, Product Hunt or its local equivalent, a "Show" post
  where the audience builds things. Each with a drafted text. *both*
- [ ] **Featuring nomination** — submitted in App Store Connect weeks ahead,
  with the story of the app. *both*
- [ ] **People told in advance** — the friendly first users, anyone who wrote
  about the problem, journalists or newsletters in the niche, with the press
  kit. *you*
- [ ] **The day's watch** — crash reports, reviews, the support inbox, the
  numbers from phase 0, checked on a schedule written here. *both*

## 9. Launch day

- [ ] **Release in App Store Connect** — manual release, or a phased release
  if a bad build would hurt; Google Play's staged rollout the same way. *you*
- [ ] **The landing switches** from the waitlist to the store link. *agent*
- [ ] **The announcements go out** in the planned order; each one posted by
  you. *you*
- [ ] **Every review and message answered** the same day. *you*
- [ ] **The day written down here** — what went out, what came back, the
  numbers at the end of it. *both*

## 10. Promotion after launch

A plan for months, not a burst. Every channel gets a cadence and a number it
is judged by; a channel that moves nothing after a month is struck out with
its numbers.

- [ ] **Store search** — keywords, subtitle and screenshots revisited monthly
  against what people actually search for. *both*
- [ ] **Building in public** — a regular post about what shipped, from the
  release notes the commits already carry. *both*
- [ ] **Communities** — present where the users are, helping first; the app
  mentioned where it answers the question asked. *you*
- [ ] **Content that answers the problem** — articles or short videos about
  the problem itself, each pointing at the landing. *both*
- [ ] **Asking for reviews** — the system prompt at a moment of success, never
  on first launch, never more often than the store allows. *agent*
- [ ] **Referrals and partnerships** — tools the users already use, people
  who teach them. *both*
- [ ] **Paid acquisition, if ever** — a small budget, one channel, a stop rule
  written before the first dollar. *you*
- [ ] **A monthly review** — installs, activation, retention after a day, a
  week and a month, conversion to paid; what the numbers say goes into
  `BACKLOG.md`. *both*

## 11. Running it

- [ ] **Support** — the inbox answered within a stated time; recurring
  questions turned into answers on the landing. *you*
- [ ] **An update cadence** — a release on a rhythm users can see, with notes. *both*
- [ ] **Renewals in a calendar** — the developer accounts, the domain, the
  certificates, the hosting. *you*
- [ ] **The release-branch trigger** — the day someone is on an older version
  and needs a fix that cannot wait for `main` (the core rules, *Merging and
  releasing*). *agent*
