# GitHub Copilot — Misfits Cavern

Read `AGENTS.md` at the repo root first. It contains all project rules, stack info, conventions, and the change workflow.

Key points for Copilot:
- Never suggest `alert()`/`confirm()` — use `useToast()` and `useConfirm()` from `components/Toast.tsx` and `components/Confirm.tsx`
- New tables need RLS policies from birth, modeled on existing `internal` schema helpers
- TypeScript strict mode is enabled — always provide proper types
- Use Tailwind utility classes with cavern design tokens (see `tailwind.config.js` and `app/globals.css`)
- After generating code, suggest the user runs `npx tsc --noEmit && npm run build` to verify

For deep context (DB schema, design tokens, architecture), reference `.cavern-intelligence/`.
