# Studio production tools + editor cleanup

## What it does
- 36 production views under `components/studio/production/` (call sheets, shot list, production report, weather, transport, catering, safety, props, etc.)
- Renamed theme "Ink & Rust" → "Misfit", made default
- Removed editor left sidebar; moved script management into Outline tab
- Atomic settings merge via `patch_project_settings` RPC (no lost updates)
- Removed "Dark Mode (Preview)" gimmick from editor View Options
- Removed pill badge above 3D logo on home page
- Hardened deep-brain memory: created_by/forced_by derived from auth.uid()

## What was verified
- TypeScript clean (`tsc --noEmit -p tsconfig.check.json`)
- Lint: 0 errors
- Vitest: 2334 passed, 2 skipped
- PR #447 mergeable after integrating origin/main

## What is left
- Database types regeneration for patch_project_settings (manual entry added)
- Same-field race in VfxView (atomic merge handles cross-field only)
