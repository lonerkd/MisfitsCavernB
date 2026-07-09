# The Studio — Pre-Production and Scheduling

## 1. Infinite Pannable Canvas
The Studio features a Pinterest-style visual workspace called the **Concept Board**. This relies on an interactive coordinate plane for planning.

- **Pannable Canvas (`components/canvas/PannableCanvas.tsx`):** A custom component allowing users to zoom, pan, and click-drag various "pins" or mood board assets.
- **Coordinate Mapping:** Objects are positioned on an infinite 2D plane. Position coordinates (`position_x`, `position_y`) and sizes (`width`, `height`) are persisted in the `studio_assets` table. This allows other co-designers to see cards positioned exactly in real-time.
- **Scene Linking:** Assets can be bound to specific screenplay scenes or characters via junction tables (`scene_references` and `character_references`). This allows mood images to be referenced directly inside ScriptOS side-panels.

---

## 2. 1st-AD Auto-Scheduling Heuristic
To automate shoot day planning, Misfits Cavern features a custom scheduling algorithm (`lib/scriptos/schedule.ts`) that functions as a virtual **1st Assistant Director**.

### The Auto-Scheduling Algorithm
The algorithm groups and sorts parsed script scenes into optimized shoot days based on three primary pre-production goals:
1. **Location Clustering:** All scenes set in the same location (e.g., "INT. CAFE") are grouped together to minimize expensive crew moves and equipment setups.
2. **Time of Day Grouping:** Scenes are separated and clustered by their lighting demands (`DAY` vs. `NIGHT`). Night shoots are clustered at the end of schedule blocks to avoid fatiguing the crew with rapid sleep-schedule shifting ("turnarounds").
3. **Daily Capacity Limits:** The user defines a maximum "Page Count Capacity" per shoot day (e.g., 5 pages per day). The algorithm packs scenes sequentially into shoot days until this page limit is met, wrapping excess scenes into the next shoot day automatically.

---

## 3. Campaigns, Jobs, and Crew Integration
The Studio acts as the connecting link between screenplay data, budgeting, and recruiting:

- **Script Breakdown to Budgeting:** Tagged screenplay elements (props, vehicles, wardrobe) populate `scenes.elements`. This data is fed into the budget generator (`lib/supabase/breakdown.ts`), mapping screenplay requirements to real financial lines (`budget_items`).
- **Recruitment Loop:** 
  1. A crew spot is identified (e.g., "Director of Photography") on the project organizational chart.
  2. The position can be published directly to the public **Jobs Board** (`jobs` table), automatically referencing a budget line item.
  3. When an applicant applies (`job_applications`), their resume and cover letter populate the candidate review dashboard.
  4. Accepting an applicant automatically inserts a record into `project_crew`, assigning them an active profile, and spawning a welcome notification.
- **Public Portfolios:** Filmmakers showcase their credits via public portfolios (`portfolio_projects`). These portfolios can pull direct production history from actual, completed Misfits Cavern projects, ensuring credentials are verified and authentic.
