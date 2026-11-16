# Session — 2026-11-16: the script's co-writing channel is private (BACKLOG 3.33)

`script_<id>` was a public Realtime broadcast channel: anyone with the anon key who knew a script id could listen to the Yjs updates and inject their own into every open editor. It is now private.

**What changed.**
- Migration `20261116000200_private_script_channel.sql`: two policies on `realtime.messages`, one SELECT and one INSERT, both for `authenticated`, both `internal.can_access_script(<uuid in realtime.topic()>)` for a topic that matches `script_<uuid>`; everything else evaluates to false. The scripts table lets every member update the script, so one helper decides both directions (a view-only member reads and writes, as they can edit the script today). No function added, so the definer allowlist, types and `schema.fingerprint` are unchanged (the fingerprint does not cover `realtime`).
- Every place that opens a `script_` channel now passes `config: { private: true }`: the live provider and its presence (`lib/scriptos/sync.ts`), the offline queue's merge broadcast (`broadcast.ts`) and the append broadcast (`beats.ts`). Those were the only three.
- `tests/integration/script-channel.test.ts`: drives the policies as the `authenticated` role with each persona's claims and the topic set (owner, crew, view-only member, outsider, a personal script, a missing script, non-script topics). `broadcast.test.ts` asserts the channel is private.

**Must be done by hand after merge.**
- Apply `20261116000200` to production, then staging, BEFORE the new client reaches users (a private channel with no policy refuses everyone, so the live editor would fall back to saving without live sync until applied). Then a two-browser check of co-writing on production.
- The project's Realtime settings may need "Allow public access" turned off in the Supabase dashboard (Realtime › Settings) for private channels to be the only kind. That is the owner's to do; nothing here touches it.

**Unverified.** No Docker in this session: the migration, the integration test and the live behaviour of two editors over a private channel were not run here; CI's `database` job runs the first two. The test inserts into `realtime.messages`, which needs a partition for today (Realtime creates them at start-up).
