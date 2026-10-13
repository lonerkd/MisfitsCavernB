# 9 · Admin

`/admin/*` — running the platform. Gated twice: `proxy.ts` checks a real
session and `profiles.is_admin` on the server (non-admins go to `/`), and
every admin read goes through a function or policy that checks
`internal.caller_is_admin()`.

## Screens

| | Desktop | Phone |
|---|---|---|
| `/admin` | <img src="screens/admin--desktop.webp" width="420"> | <img src="screens/admin--phone.webp" width="140"> |
| `/admin/users` | <img src="screens/admin-users--desktop.webp" width="420"> | <img src="screens/admin-users--phone.webp" width="140"> |
| `/admin/analytics` | <img src="screens/admin-analytics--desktop.webp" width="420"> | <img src="screens/admin-analytics--phone.webp" width="140"> |
| `/admin/crafts` | the list of film crafts people pick from (profiles, jobs, crew): add one (name, department, colour, above/below the line), remove one (confirmed). Everyone reads it; only an admin writes (RLS) | `crafts` |
| `/admin/reports` | what people flagged (messages, jobs, profiles), newest first, open / resolved / dismissed, who reported and why, a link to the job or profile; close each as resolved or dismissed. Anyone signed in can file a report (the flag on a message, a job, a profile); only an admin reads them all | `reports` |
| `/admin/errors` | <img src="screens/admin-errors--desktop.webp" width="420"> | <img src="screens/admin-errors--phone.webp" width="140"> |
| `/admin/audit-logs` | <img src="screens/admin-audit-logs--desktop.webp" width="420"> | <img src="screens/admin-audit-logs--phone.webp" width="140"> |

## Pages

| Page | What | Data |
|---|---|---|
| `/admin` | totals (users, projects, scripts, jobs) and links to the rest | `get_platform_stats` |
| `/admin/users` | every account: username, email, joined, admin; grant or remove admin (never your own; never the last admin) | `admin_list_users`, `set_user_admin` |
| `/admin/analytics` | users, projects, completed, scripts, jobs, average project duration, completion rate, sign-ups over a period | `admin_platform_analytics(since)` |
| `/admin/errors` | what broke for people, grouped by message and page, newest first, with counts; clear a group once it's fixed (confirm) | `client_errors` (30 days) |
| `/admin/audit-logs` | actions by person and time, search, filter by action; logins (1 h), actions (24 h), projects created (24 h) | `audit_logs` |

## Rules

- Admin rights change only through `set_user_admin()` (`profiles_guard`
  refuses anything else).
- Admins run community Lounge channels and edit the catalogues — crafts,
  project formats, brief questions, channel presets — which are admin-write
  tables.

## Known gaps

- Crafts have an admin screen (`/admin/crafts`); the other catalogues —
  project formats, brief questions, channel presets — are still changed by
  migration (3.14).
- Moderation is a queue only: reports are filed and settled, but acting on
  one (hide, remove, suspend) is by hand (3.14).
- No usage view (storage, egress, Realtime) — the Supabase dashboard is the
  only place (and its grace-period banner is open: STATE).
