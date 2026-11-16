# Session - 2026-11-15: Tag to a scene from Find (BACKLOG 3.42)

**Built:** each track result in Sound › Find has a scene picker and a Tag button for owners and writers (`components/audio/TagToScene.tsx`). Tag saves the track to the project and tags it to that scene as a temp score in one step (`placeTrackInScene` in `lib/supabase/audio.ts`): a track the project already has is retagged instead of copied (its role and tags kept), one tagged to another scene moves and the toast says so, one already there changes nothing. Opened from the Scenes timeline's "Find music for this scene" (which already passed the scene's id, unused until now), the picker starts on that scene, so it is one tap. The scene list loads only for people who can tag; RLS and the existing trigger still decide.

**Tests:** `TagToScene.test.tsx` (5: preselected scene, disabled with no scene, moved / already, a failed save toasts, nothing with no scenes); `audio-place.test.ts` (4: new, retag keeping role and tags, move, already). Typecheck, lint, the unit suite and the build run before the PR.

**Not verified:** in a real browser against Spotify (search needs a connected Spotify account; CI cannot drive it).
