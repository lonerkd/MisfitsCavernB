# Session — 2026-11-02: a full voice room no longer asks for the microphone

`useVoiceRoom` asked for the microphone before it connected to the room's channel, so the ninth person into a full room first saw a permission prompt (and the browser's recording indicator) for a call they were about to be turned away from. The order is now: connect to the channel, check there is a seat, **then** ask for the microphone, then publish presence. A ninth person is refused without being asked for anything. Someone who denies the microphone still joins listen-only, as before.

**Verified:** the voice hook tests (the ninth person is never asked for the microphone, checked by mutation: with the old order that test fails; a person with a seat is asked exactly once); typecheck, lint, the unit suite; real browsers: `voice-two-people.spec.ts` and `island-call.spec.ts` still pass (2 of 2) with the new order. **Not verified:** a real nine-person room in browsers (BACKLOG 3.24 d, the ninth-joiner e2e, is still open).

**One consequence worth knowing:** the seat check happens before the permission prompt, and a person may take a while to answer it, so two people can both pass the check and both be asked; the existing same-instant race check after publishing presence still decides who keeps the seat.
