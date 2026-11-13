# Role completeness map for the Reveal Gate (owner, 2026-11-12)

Companion to [2026-11-13-reveal-gate.md](2026-11-13-reveal-gate.md). Statuses are assessments from the repo brief, not a fresh screen-by-screen audit; anything not evidenced is **Unverified**. A status moves only with named evidence (a merged change, a production test, a recorded practitioner run).

**Thesis.** The Cavern is not revealed until every declared creative role can enter, finish its canonical job inside the suite at the standard of its specialist competitors, hand work to the next role without broken context, and stay connected to people and project afterwards. No early public launch of a partial suite; private testing is how completeness is proven. A role that does not pass is removed from the launch claim, never left half-present.

**A role is complete when:** (1) its canonical job can be finished, not just started; (2) its output is usable by the next person without rebuilding; (3) it can bring in its real starting files and people; (4) it can receive, discuss, approve, revise and hand off in the project graph; (5) it works in real conditions (phone on set, weak signal, large files, print, time pressure); (6) no canonical step forces an exit to another product. Not proof: a menu item, a founder-run demo, a screenshot, feature parity, "I like the concept", or a walkthrough with the founder explaining.

**Replacement boundary.** The Cavern replaces the creative operating layer (originate, write, plan, break down, schedule, coordinate, review, approve, communicate, publish the record, carry people and assets between projects). It does not claim cameras, a full NLE, a DAW, Photoshop-class retouching or Resolve-class finishing; for those roles it owns the brief, assets, versions, notes, approvals and handoffs around the engine.

**Status words:** Built, Partial, Missing, Unverified, Gate blocked.

## Foundation gates (every role)

| Gate | Must be true | Baseline |
|---|---|---|
| F0 trust, safety, accounts | stranger sign-up, verify, reset on production through custom SMTP; leaked-password protection on; QA accounts removed; Sam/Jordan/Riley permissions (a Riley leak is P0); secret incidents closed; reporting and hiding on every shared surface incl. portfolio; error stacks redacted; privacy, terms, deletion and export match the product; rate limits and spend ceilings; restore rehearsed | **Blocked** |
| F1 reliability, sync, performance | nightly e2e green long enough to trust; no silent loss in collaboration, offline merge, undo, restore; responsive at launch scale; production and staging match | **Blocked** |
| F2 entry and comprehension | a new user finds their lane in the first session; one obvious next action; role-specific surfaces; accessibility does not block a canonical job | Partial |
| F3 import, export, interop | each role imports and exports the formats it really exchanges; round trips keep names, numbering, notes, revision state; a person can take all their data | Partial |
| F4 phone, offline, print | tested phone flows; a real iPhone pass; offline capture syncs safely; printed output inspected; a printed QR scanned from paper | Partial / Unverified |
| F5 business and operations | entitlements and plan limits; support, abuse and status paths; analytics on canonical-job completion; domain, entity and payment route decided | Partial / Missing |

**Shared project brain** (BACKLOG 3.18): a script change updates or flags every dependent breakdown, schedule, shot, board and call sheet; comments resolve against the exact artifact and version; identity and credits persist across projects while roles follow the project; AI suggestions are labelled and reversible. Partial: film-graph steps 1-3 built, the editor cutover and text-column readers remain.

## Roles

Each role: canonical job, benchmark, status, pass evidence, automatic fail.

| # | Role | Benchmarks | Status | Automatic fail |
|---|---|---|---|---|
| R1 | Screenwriter | Final Draft, WriterDuet, Arc Studio, Highland | Partial | rebuilds the script elsewhere; export loses revision or scene meaning; co-writing corrupts work; cannot tell which draft production uses |
| R2 | Writer-director | Final Draft + Pinterest/Milanote + Drive + StudioBinder + Frame.io | Partial | keeps a shadow system because intent does not carry into execution |
| R3 | YouTube creator | Docs/Notion + Frame.io + Drive + Milanote + YouTube Studio | **Missing native format** (registry has 7) | structure lives in Docs; editor cannot tell what to build |
| R4 | Commercial copy team | Docs/Slides + Frame.io + email approvals | Built core (3.32), partial delivery | approval happens by email; cannot prove the approved version |
| R5 | Blog / prose writer | Docs, Notion, WordPress, Substack, Scrivener | **Missing** | prose forced through script grammar; weaker than Docs; export rebuilt by hand |
| R6 | Podcast creator | Descript/Riverside records + Docs + Drive | Partial | format is a screenplay variant; release metadata retyped |
| R7 | Documentary creator | Notion/Drive + StudioBinder + transcription + Frame.io | Partial | research and rights live in a spreadsheet |
| R8 | Producer | StudioBinder, Yamdu, Celtx, Movie Magic | Partial | trusts a spreadsheet over Cavern for live schedule or budget |
| R9 | Coordinator / PM | StudioBinder, Yamdu, Drive + email | Partial / Unverified | distribution or acknowledgement handled in messages |
| R10 | First AD / scheduler | Movie Magic Scheduling, StudioBinder, Yamdu | Partial | breakdown fixed in a spreadsheet; scene identity breaks on a move; outputs disagree |
| R11 | Director | StudioBinder, Shot Designer, Milanote, Frame.io | Partial / Unverified | asks for PDFs or a deck because the live view is too dense or stale |
| R12 | Script supervisor | ScriptE-style, paper lined scripts | **Unverified** | notes on paper or another app; editor cannot find selected takes |
| R13 | DP / camera | shot-list and storyboard tools, Milanote | Partial / Unverified | real shot and gear list kept elsewhere; stale packet |
| R14 | Design / art / researcher | Pinterest, Milanote, Airtable | Partial (no Pinterest import) | Cavern is only a link paste; references cannot become tracked assets |
| R15 | Casting | Backstage, Casting Networks, Airtable | **Unverified** (decide: launch role or integration) | submissions by email or Drive |
| R16 | Locations | Maps, Drive photos, StudioBinder | Unverified / Partial | location packet lives elsewhere; address visible to the wrong people |
| R17 | Sound / music | Spotify, SoundCloud, Frame.io, cue spreadsheets | Partial (Spotify verified with fakes only) | Spotify is decoration; approved audio indistinguishable from exploratory |
| R18 | Editor / post lead | Frame.io, Premiere/Resolve as engines | Partial | comments detach from versions; approval in email |
| R19 | Crew member | email, Drive, call-sheet PDFs | Partial | relies on texts or PDFs; too much or too little noise |
| R20 | Client / approver | Frame.io, Vimeo, Drive, email | Partial | replies by email; a guest reaches material outside the review |

## Persistent home (H1-H5), prompt-to-production (P1-P4), handoffs (X1-X7)

- **H1 identity, credits, portfolio** (Partial: portfolio built; real-paper QR scan left). **H2 relationships and crew graph** (Partial / Unverified). **H3 communication that carries production meaning** (Partial; moderation not on every surface). **H4 music, boards, inspiration that becomes project assets** (Partial; no Pinterest import; Spotify caveats). **H5 reasons to return between projects** (Unverified). Pass: a private cohort wraps a project and a pre-agreed share returns within 30 days for Cavern-specific value. Fail: conversation moves back to Discord, Spotify and boards stay decoration, nobody maintains the portfolio.
- **P1-P4:** start from an idea, prompt, file, board or song; assets that are generated stay editable, linked and used downstream; AI is an on-ramp, never a compulsory intermediary, and never overwrites the human record silently; progress means the project becomes more real, not points. Partial / target.
- **X1 writer to producer/AD, X2 director to departments, X3 production to crew, X4 shoot to editor, X5 team to client, X6 project to portfolio and next project, X7 creator lane to production lane.** Each needs one live test on the same project across both roles; separate demos on different mock data do not count.

## Launch roster (to freeze)

Tier 1 film promise: screenwriter, writer-director, producer, coordinator, first AD, director, crew, client. Tier 2 departments: script supervisor, DP, design / art, casting, locations, sound / music, editor. Tier 3 expansion: YouTube, copy, blog, podcast, documentary. **Owner decision:** whether Tier 3 is in the first public claim (the owner's stated position makes YouTube the heart and blog and ad writers the growth, so it cannot be silently optional), and whether casting and locations are launch roles or integrations. A role is added only with its canonical job, benchmark, tester profile and pass evidence.

## Private evidence protocol

At least 3 independent practitioners per Tier 1 role, 2 per Tier 2, 3 per Tier 3 lane (different formats); real or realistic full-scope material; at least one expert and one first-time user per role; no live coaching beyond recorded failures; a disruptive mid-job change; an external recipient; a second session after time away. Record completion, time against their current stack, forced exits, errors, assistance, receiver's verdict, and whether they start a second job unprompted. **Pass:** 80% unassisted completion; no P0 security, data-loss or wrong-recipient failure; no step that needs an outside product; receiving role accepts the output; two testers can explain the state in session two; every blocker fixed and retested or the claim removed. A step every tester exits at fails the role whatever the average. **Downgrade** a role to companion when practitioners consistently keep a specialist for the core job; that is not a failure, but claiming replacement against the evidence is.

## Verdict at baseline: not passed, not scoreable as a percentage

Blockers: e2e not proven (see below); stranger and account trust items; the film graph unfinished; no YouTube or blog format; script supervision, casting and locations unverified; the persistent home unproven; phone, offline and print evidence incomplete; moderation, legal, entitlements and operations incomplete; no role has run the practitioner protocol.

**Checked 2026-11-13 against the repository:** the scheduled e2e workflow has failed on every scheduled run from 2026-11-02 to 2026-11-13 (12 nights, more than the nine the map recorded). That is the first F1 item.

## Order of work

1. Freeze the roster. 2. Close F0 and F1 (diagnose the e2e, auth and SMTP, security, QA accounts, redaction, moderation scope). 3. Finish the film graph (3.18) far enough for X1-X6. 4. Run Tier 1 jobs privately and find forced exits before building breadth. 5. Build the missing lanes: a YouTube format, then a prose format; deepen podcast and documentary only against canonical tests. 6. Tier 2 surfaces by forced exits found. 7. Prove the home with a 30-day cohort. 8. Phone, offline, print on real devices and paper. 9. Business, legal, operations. 10. A full rehearsal with fresh users and no founder.
