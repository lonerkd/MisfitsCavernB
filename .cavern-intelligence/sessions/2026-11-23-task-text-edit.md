# Session - 2026-11-23: edit a task's text, mentions follow (BACKLOG 3.18, mentions)

A hub task could be added with `@` mentions but its text could never be changed. Each task row in the project hub now has **Edit**: the same `@` field, filled with the task's text; **Save task text** writes `project_tasks.title` (an empty text is refused with a message) and re-syncs the mentions (`syncMentions` adds new links and removes dropped ones). The task's entity label follows through the existing `entity_sync` trigger. No migration.

**Verified:** typecheck, lint, `project-hub` unit tests (the title update, and a failed one throws). `e2e/task-edit.spec.ts` (edit, save, reload) runs in the nightly `e2e-local`.
