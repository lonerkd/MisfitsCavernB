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
| `/admin/reports` | what people flagged (messages, jobs, profiles), newest first, open / resolved / dismissed, who reported and why, a link to the job or profile; close each as resolved or dismissed; a reported job can be closed from the queue (`admin_close_job`), and a reported message read and hidden or brought back (`admin_reported_message`, `admin_hide_message`) — both recorded in the audit log. An admin reads only messages that were reported. Anyone signed in can file a report (the flag on a message, a job, a profile); only an admin reads them all | `reports` |
| `/admin/channel-presets` | the channels the Lounge suggests to a production by phase: add one (name, type, who sees it, who posts, phase, topic, why), remove one (confirmed); channels already made from it stay. Everyone reads; only an admin writes (RLS) | `channel_presets` |
| `/admin/formats` | the kinds of project people can start: add one (name, one line, icon, the script format it opens, which phases it skips), remove one (confirmed); projects already made keep their format. Phase labels and skipped milestones stay as migrations for now. Everyone reads; only an admin writes (RLS) | `project_formats` |
| `/admin/brief-questions` | the questions every project's brief asks: add one (words, hint, phase, choices or a number range), remove one (confirmed, and the confirm says how many projects' answers go with it). What a choice implies stays a migration. Everyone reads; only an admin writes (RLS) | `brief_questions`, `project_brief` |
| `/admin/errors` | <img src="screens/admin-errors--desktop.webp" width="420"> | <img src="screens/admin-errors--phone.webp" width="140"> |
| `/admin/audit-logs` | <img src="screens/admin-audit-logs--desktop.webp" width="420"> | <img src="screens/admin-audit-logs--phone.webp" width="140"> |

## Pages

| Page | What | Data |
|---|---|---|
| `/admin` | totals (users, projects, scripts, jobs) and links to the rest | `get_platform_stats` |
| `/admin/users` | every account: username, email, joined, admin, suspended; grant or remove admin (never your own; never the last admin); **suspend** or lift a suspension on anyone who is not an admin (no sign-in, sessions ended, nothing deleted; a suspended person sees "This account has been suspended") | `admin_list_users`, `set_user_admin` |
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

- Every catalogue has an admin screen (`/admin/crafts`, `/admin/channel-presets`,
  `/admin/formats`, `/admin/brief-questions`). Brief questions can't be edited
  in place, and what an option implies is still a migration (3.14).
- Moderation is a queue only: reports are filed and settled, but acting on
  one (hide, remove, suspend) is by hand (3.14).
- No usage view (storage, egress, Realtime) — the Supabase dashboard is the
  only place (and its grace-period banner is open: STATE).
