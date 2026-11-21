# Session - 2026-11-21: the voice cap, tested with nine people (BACKLOG 3.24 d)

3.24's last buildable piece: `e2e/voice-full-room.spec.ts`. Nine accounts in one project, a fake microphone each, real WebRTC between the browser contexts over the local stack's Realtime. The eight join one at a time and each sees "In voice"; the ninth presses Join and is told "This voice room is full (8 people)" and is not in the room; when the first leaves, the ninth joins. Passed twice (about 30 s).

**What is left on 3.24 is (a), the owner's call:** past eight people needs a hosted SFU (LiveKit Cloud or similar): an account, API keys, a monthly cost, and a rewrite of `lib/webrtc/mesh.ts` around it. Until that is chosen the cap of eight is a deliberate limit with a test.

**Verified:** `e2e/voice-full-room.spec.ts` twice on a production build on the local stack. **Not verified:** real devices and real networks (the contexts share one machine).
