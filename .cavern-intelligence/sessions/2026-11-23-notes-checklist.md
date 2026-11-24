# Session - 2026-11-23: a checklist in a Notes project (BACKLOG 3.54)

A Notes project had notes, documents and files but no list to tick. Its Overview now has a **Checklist**: the project's own tasks (the same `project_tasks` rows the project page lists, so there is one list, not two), added with Enter, ticked, and deleted after a confirm; each change is saved before it shows and a failed save says so with a toast. `listTasks` joins `addTask` / `updateTask` / `deleteTask` in `lib/supabase/project-hub.ts`. No migration; the table's policies decide who may write.

**Verified:** typecheck, lint, `NotesChecklist` tests (shows and counts, adds, a failed add keeps the text and says so, ticking saves and a failed save does not tick, delete asks first) and `project-hub` tests. Not looked at in a browser.
