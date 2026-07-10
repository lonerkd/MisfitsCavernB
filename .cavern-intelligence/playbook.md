# Change Playbook — Misfits Cavern

This is the step-by-step workflow for any AI agent making changes to the codebase.

## The 7-Step Change Cycle

### 1. Explore
- Read `.cavern-intelligence/sync-manifest.json` — understand the file map and module structure
- Read relevant source files for the task at hand
- If unsure about conventions, read `.cavern-intelligence/CLAW.md` and related architecture docs

### 2. Check State
- Read `.cavern-intelligence/STATE.md` — understand what iteration is active, known issues, recent changes
- If STATE.md doesn't exist for a new task, initialize it

### 3. Plan
- Identify exact files to modify
- For DB changes: understand RLS implications, review `internal` schema helpers in `database-and-security.md`
- For UI changes: reference `design-tokens.md` for colors, typography, component classes
- For ScriptOS changes: reference `scriptos-engine.md` for parser/sync patterns
- Check if changes affect multiple modules — ensure cross-module consistency

### 4. Implement
Write code following these conventions:
- TypeScript strict mode — no `any`, no implied `any`
- Tailwind utility classes + CSS custom properties for styling
- All UI feedback via `useToast()` / `<Toast />` — never native dialogs
- All confirmations via `useConfirm()` from `components/Confirm.tsx`
- New components match existing patterns (see `components/` for reference)
- RLS on every new table from birth, modeled on existing policies
- Account preferences in DB (`profiles.notification_prefs`); localStorage for device-level only
- No destructive operations on live data

### 5. Verify
Always run these after any change:
```bash
npx tsc --noEmit        # TypeScript strict check — must pass clean
npm run build           # Next.js production build — must succeed
npm run lint            # ESLint — resolve warnings
```

For RLS/DB changes, additionally verify with persona-simulated SQL:
```sql
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<uuid>"}',true);
-- run the query the app would run
rollback;
```
Test three directions: owner (pass), crew member scoped (pass), outsider (block).

### 6. Sync
```bash
npm run sync-intel
```
This updates `.cavern-intelligence/sync-manifest.json` with current file listing.
Then update `.cavern-intelligence/STATE.md` with:
- What was changed
- Verification results
- Any known issues or follow-up tasks
- Update the iteration counter

### 7. Commit
- Create a branch: `git checkout -b <feature-or-fix>-<short-description>`
- Commit with clear message describing what was done and why
- Push and create PR
- Do not merge until CI (Vercel) is green

## Change-Type Specific Guidance

### UI Changes
- Always reference `design-tokens.md` before writing styles
- Use existing CSS classes (`.btn-primary`, `.card`, `.glass`, etc.) before writing custom styles
- Match the film-grain, film-chrome, and glass morphism aesthetic
- Maintain responsive breakpoints defined in `globals.css`
- New components: look at existing components for patterns before writing

### Database Changes
- Reference `database-and-security.md` for full schema and RLS architecture
- Every new table needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Use `internal` schema helpers to prevent RLS recursion
- Wrap `auth.uid()` in scalar subqueries for InitPlan performance
- Mirror every live migration into `supabase-schema.sql`
- Test with all three personas

### ScriptOS Changes
- Reference `scriptos-engine.md` for parser architecture
- The Fountain parser lives in `lib/scriptos/parser.ts`
- Real-time sync uses Supabase Realtime in `lib/scriptos/sync.ts`
- Offline support via IndexedDB in `lib/scriptos/storage.ts`

### Lounge/Audio Changes
- Reference `lounge-and-audio.md` for channel architecture
- WebRTC voice mesh in `lib/webrtc/voice.ts`
- Channel permissions use `internal.can_view_channel`, `internal.can_post_channel`, `internal.can_manage_channel`
- Messages support threads (`parent_message_id`) and reactions (JSONB)

## Error Handling

### Build Errors
- TypeScript errors: fix types, never use `// @ts-ignore` or `any`
- Next.js build errors: check for undefined exports, incorrect imports
- ESLint errors: fix or configure rules in `.eslintrc`

### RLS Policy Issues
- Recursion errors: move lookup logic to `internal` schema SECURITY DEFINER functions
- Performance: ensure scalar subquery pattern (`(SELECT auth.uid())`)
- Leaks: persona-test the negative case (Riley sees nothing)

### Unknown Patterns
- If unsure about a convention, read existing code in the same module
- Check `components/ui/` for base component conventions
- Ask the user before making architectural decisions
