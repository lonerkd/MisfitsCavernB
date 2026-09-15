# Overview and Goals — The Misfits Cavern

## 1. Product Vision
**Misfits Cavern** is an all-in-one interconnected production suite designed specifically for independent filmmakers and micro-budget productions. It consolidates multiple disparate tools into a single, cohesive workflow:
> *Arc Studio (Screenplay) + Pinterest (Concept Board) + Notion (Projects & Tasks) + Final Draft (Print formats) + Discord (Lounge Chat) + Spotify (Soundtracks)*

Instead of bouncing between multiple platforms and copying data back and forth, Misfits Cavern brings these features together into a single, synchronized database. For example:
- Developing a character in **ScriptOS** (Character Bible) instantly populates the **Studio** casting look-board.
- Tagging production items in the screenplay (Props, Wardrobe, SFX) automatically parses into **Studio Breakdown** elements.
- Selecting a role on the casting board can directly post a role onto the **Jobs Board**, and accepting an applicant automatically provisions them into the **Project Crew**.

---

## 2. Core Architectural Mandates

### A. The "No Mocks" Mandate
Every interface control or module shown to the user must be backed by real, fully functional, and persistent database interactions via Supabase. Cosmetic elements or fake "under construction" stubs are strictly forbidden. If a control exists, it must carry out the real database operation.

### B. One Cohesive System (Global Services)
- **Shared Feedback:** All UI-level notifications must leverage the global, customized toast system: `useToast()` / `<Toast />`. Native alerts or other libraries are prohibited.
- **Shared Confirmation:** All user actions requiring verification must use the shared `useConfirm()` modal provider (`components/Confirm.tsx`). Native `window.confirm()` or native alerts must never be used.
- **Unified Caching & Preferences:** 
  - **Account-level preferences** (e.g., email notification toggles) live in Postgres (`profiles.notification_prefs`).
  - **Device-level preferences** (e.g., custom cursor settings, collapsing dock state) live in `localStorage` or `IndexedDB`.

---

## 3. Testing Personas (End-to-End Logic)
To ensure the security, integrity, and operational flow of the application, all development and automated testing must evaluate three key testing personas:

1. **Sam (The Project Creator/Owner):**
   - Creates the project, writes the screenplay, schedules the shoot, posts jobs, and manages Lounge channels.
   - Must have absolute CRUD permissions across all project scopes.
   - Actively tests the happy path for project orchestration.

2. **Jordan (Co-Writer, Crew Member):**
   - Collaborates on the script in realtime, posts messages in text channels, participates in WebRTC voice channels, and updates assigned task trackers.
   - Restricted from destructive administrative actions (e.g., deleting projects, removing other creators, altering billing details).
   - Must be unable to view or access private channels/sections unless explicitly invited.

3. **Riley (The Outsider):**
   - A logged-out user or logged-in user who is not a member of the project or crew.
   - Must see absolutely **nothing** project-scoped: no files, no chats, no timelines, no budgets, and no script text.
   - **Exception:** Can access explicit tokenized links that have public-sharing enabled (e.g., `/s/<share_token>` for scripts and `/p/<share_token>` for public portfolio showcases).
   - Any leak of private project data to Riley is classified as a Critical P0 security vulnerability.
