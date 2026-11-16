# 2026-11-16 — Chunk large Yjs updates (BACKLOG 3.33)

**Problem.** Realtime refuses payloads over about 250 KB. `broadcast.ts` skipped any merged state over 200,000 base64 characters, and the live provider (`sync.ts`) sent whole-state `yjs_sync` messages that a long script could push over the limit.

**Change.**
- `lib/scriptos/chunks.ts` (pure): `toWirePayloads` returns the plain `{ update }` for anything up to 150,000 characters, else numbered `{ chunk: { id, i, n, part } }` parts. `ChunkReassembler` collects parts by id in any order, returns the whole update only when complete, drops a partial set after 30 s, caps parts per payload (64) and pending sets (16), and rejects malformed chunks.
- `sync.ts` sends `yjs_update` and `yjs_sync` through it and receives through one reassembler per channel; `broadcast.ts` does the same and the `too-large` result and `MAX_BROADCAST_UPDATE_CHARS` are gone.
- Same channel (`script_<id>`), same event names, no new topic, so the Realtime topic rules are untouched.
- Small messages keep today's exact shape; an older open tab reads them and ignores chunk messages (it finds no `update`), so mixed versions degrade to merging at the next save, as before.

**Tests.** `lib/scriptos/chunks.test.ts` (round trip, out-of-order and interleaved sets, a missing part timing out, small payloads unchanged, malformed input) and `broadcast.test.ts` (a large state goes as chunks that reassemble).

**Not done.** Compression (not needed until chunk counts prove high); a two-browser spec with a very large script.
