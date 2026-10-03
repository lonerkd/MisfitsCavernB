-- What the Supabase advisors flagged on production (2026-09-30), fixed.
--
-- 1. sfx_assets was readable by anyone, signed in or not — and every sound
--    belongs to a project. Now: your own, or a project you can open.
-- 2. Policies that called auth.uid() per row now call it once per query
--    ((select auth.uid()), the InitPlan form the rest of the schema uses).
-- 3. Tables with a FOR ALL write policy beside a SELECT policy ran both on
--    every read. The writes are split into INSERT / UPDATE / DELETE so reads
--    are decided by the read policy alone. Same rules, same people.
-- 4. Every foreign key gets a covering index (47 had none): joins, and the
--    ON DELETE actions behind account deletion, no longer scan whole tables.

-- ─── 1. Sound effects stay inside their project ─────────────────────────────────
DROP POLICY "SFX assets viewable by everyone" ON public.sfx_assets;
DROP POLICY "SFX assets owner only update" ON public.sfx_assets;
DROP POLICY "SFX assets owner only delete" ON public.sfx_assets;
CREATE POLICY "sfx_assets read" ON public.sfx_assets FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR internal.can_access_project(project_id));
CREATE POLICY "sfx_assets update own" ON public.sfx_assets FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "sfx_assets delete own" ON public.sfx_assets FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ─── 2. auth.uid() once per query ────────────────────────────────────────────────
DROP POLICY "Users can view own spotify connection" ON public.spotify_connections;
DROP POLICY "Users can insert own spotify connection" ON public.spotify_connections;
DROP POLICY "Users can update own spotify connection" ON public.spotify_connections;
DROP POLICY "Users can delete own spotify connection" ON public.spotify_connections;
CREATE POLICY "spotify_connections read own" ON public.spotify_connections FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "spotify_connections insert own" ON public.spotify_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "spotify_connections update own" ON public.spotify_connections FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "spotify_connections delete own" ON public.spotify_connections FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "script_annotations insert" ON public.script_annotations;
CREATE POLICY "script_annotations insert" ON public.script_annotations FOR INSERT TO authenticated
  WITH CHECK ((internal.is_project_creator(project_id) OR internal.is_project_member(project_id))
              AND (created_by = (select auth.uid())));

DROP POLICY "discord webhook set by channel managers" ON public.discord_integrations;
CREATE POLICY "discord webhook set by channel managers" ON public.discord_integrations FOR INSERT TO authenticated
  WITH CHECK (can_manage_channel(channel_id) AND (created_by = (select auth.uid())));

-- ─── 3. Writes split from reads ──────────────────────────────────────────────────
-- Portfolio (public to read; the owner writes).
DROP POLICY "Portfolio owner only write" ON public.portfolio_projects;
CREATE POLICY "portfolio_projects insert own" ON public.portfolio_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "portfolio_projects update own" ON public.portfolio_projects FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "portfolio_projects delete own" ON public.portfolio_projects FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY "Portfolio blocks owner write" ON public.portfolio_blocks;
CREATE POLICY "portfolio_blocks insert own" ON public.portfolio_blocks FOR INSERT TO authenticated
  WITH CHECK (portfolio_project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));
CREATE POLICY "portfolio_blocks update own" ON public.portfolio_blocks FOR UPDATE TO authenticated
  USING (portfolio_project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));
CREATE POLICY "portfolio_blocks delete own" ON public.portfolio_blocks FOR DELETE TO authenticated
  USING (portfolio_project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));

-- Two identical owner policies; one set replaces both.
DROP POLICY "Portfolio media owner write" ON public.portfolio_media;
DROP POLICY "Portfolio owner can manage media" ON public.portfolio_media;
CREATE POLICY "portfolio_media insert own" ON public.portfolio_media FOR INSERT TO authenticated
  WITH CHECK (project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));
CREATE POLICY "portfolio_media update own" ON public.portfolio_media FOR UPDATE TO authenticated
  USING (project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));
CREATE POLICY "portfolio_media delete own" ON public.portfolio_media FOR DELETE TO authenticated
  USING (project_id IN (select id from public.portfolio_projects where user_id = (select auth.uid())));

-- Reference lists everyone reads; admins edit.
DROP POLICY "brief_questions admin" ON public.brief_questions;
CREATE POLICY "brief_questions admin insert" ON public.brief_questions FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "brief_questions admin update" ON public.brief_questions FOR UPDATE TO authenticated USING (internal.caller_is_admin());
CREATE POLICY "brief_questions admin delete" ON public.brief_questions FOR DELETE TO authenticated USING (internal.caller_is_admin());

DROP POLICY "channel_presets admin" ON public.channel_presets;
CREATE POLICY "channel_presets admin insert" ON public.channel_presets FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "channel_presets admin update" ON public.channel_presets FOR UPDATE TO authenticated USING (internal.caller_is_admin());
CREATE POLICY "channel_presets admin delete" ON public.channel_presets FOR DELETE TO authenticated USING (internal.caller_is_admin());

DROP POLICY "crafts admin write" ON public.crafts;
CREATE POLICY "crafts admin insert" ON public.crafts FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "crafts admin update" ON public.crafts FOR UPDATE TO authenticated USING (internal.caller_is_admin());
CREATE POLICY "crafts admin delete" ON public.crafts FOR DELETE TO authenticated USING (internal.caller_is_admin());

DROP POLICY "project formats admin write" ON public.project_formats;
CREATE POLICY "project formats admin insert" ON public.project_formats FOR INSERT TO authenticated WITH CHECK (internal.caller_is_admin());
CREATE POLICY "project formats admin update" ON public.project_formats FOR UPDATE TO authenticated USING (internal.caller_is_admin());
CREATE POLICY "project formats admin delete" ON public.project_formats FOR DELETE TO authenticated USING (internal.caller_is_admin());

-- Project-scoped writes.
DROP POLICY "Castings writable by project creator or crew" ON public.character_castings;
CREATE POLICY "castings insert" ON public.character_castings FOR INSERT TO authenticated
  WITH CHECK (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "castings update" ON public.character_castings FOR UPDATE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));
CREATE POLICY "castings delete" ON public.character_castings FOR DELETE TO authenticated
  USING (internal.is_project_creator(project_id) OR internal.is_project_member(project_id));

DROP POLICY "metadata writable by script members" ON public.script_metadata;
CREATE POLICY "metadata insert by script members" ON public.script_metadata FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_script(script_id));
CREATE POLICY "metadata update by script members" ON public.script_metadata FOR UPDATE TO authenticated
  USING (internal.can_access_script(script_id));
CREATE POLICY "metadata delete by script members" ON public.script_metadata FOR DELETE TO authenticated
  USING (internal.can_access_script(script_id));

DROP POLICY "project_documents keep" ON public.project_documents;
CREATE POLICY "project_documents insert" ON public.project_documents FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "project_documents update" ON public.project_documents FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY "project_documents delete" ON public.project_documents FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));

DROP POLICY "channel_members manage" ON public.channel_members;
CREATE POLICY "channel_members insert" ON public.channel_members FOR INSERT TO authenticated
  WITH CHECK (can_manage_channel(channel_id));
CREATE POLICY "channel_members update" ON public.channel_members FOR UPDATE TO authenticated
  USING (can_manage_channel(channel_id));
CREATE POLICY "channel_members delete" ON public.channel_members FOR DELETE TO authenticated
  USING (can_manage_channel(channel_id));

-- Applicants and job owners, one read policy.
DROP POLICY "Job owners can view applications" ON public.job_applications;
DROP POLICY "Users can view their own applications" ON public.job_applications;
CREATE POLICY "job_applications read" ON public.job_applications FOR SELECT TO authenticated
  USING ((applicant_id = (select auth.uid()))
         OR (job_id IN (select id from public.jobs where created_by = (select auth.uid()))));

-- ─── 4. Covering indexes for foreign keys ────────────────────────────────────────
CREATE INDEX breakdown_elements_category_fkey_idx ON public.breakdown_elements USING btree (category_id, project_id);
CREATE INDEX call_sheet_acks_sheet_fkey_idx ON public.call_sheet_acks USING btree (call_sheet_id, project_id);
CREATE INDEX call_sheet_acks_user_id_fkey_idx ON public.call_sheet_acks USING btree (user_id);
CREATE INDEX call_sheet_calls_sheet_fkey_idx ON public.call_sheet_calls USING btree (call_sheet_id, project_id);
CREATE INDEX call_sheets_issued_by_fkey_idx ON public.call_sheets USING btree (issued_by);
CREATE INDEX character_castings_created_by_fkey_idx ON public.character_castings USING btree (created_by);
CREATE INDEX character_media_created_by_fkey_idx ON public.character_media USING btree (created_by);
CREATE INDEX character_media_media_fkey_idx ON public.character_media USING btree (media_id, project_id);
CREATE INDEX discord_integrations_created_by_fkey_idx ON public.discord_integrations USING btree (created_by);
CREATE INDEX expenses_budget_item_fkey_idx ON public.expenses USING btree (budget_item_id, project_id);
CREATE INDEX expenses_created_by_fkey_idx ON public.expenses USING btree (created_by);
CREATE INDEX expenses_receipt_fkey_idx ON public.expenses USING btree (receipt_media_id);
CREATE INDEX expenses_vendor_fkey_idx ON public.expenses USING btree (vendor_id, project_id);
CREATE INDEX lounge_reads_channel_id_fkey_idx ON public.lounge_reads USING btree (channel_id);
CREATE INDEX lounge_reads_partner_id_fkey_idx ON public.lounge_reads USING btree (partner_id);
CREATE INDEX messages_pinned_by_fkey_idx ON public.messages USING btree (pinned_by);
CREATE INDEX notifications_created_by_fkey_idx ON public.notifications USING btree (created_by);
CREATE INDEX post_cuts_media_fkey_idx ON public.post_cuts USING btree (media_id, project_id);
CREATE INDEX post_notes_cut_fkey_idx ON public.post_notes USING btree (cut_id, project_id);
CREATE INDEX post_notes_scene_fkey_idx ON public.post_notes USING btree (scene_id, project_id);
CREATE INDEX project_audio_references_added_by_fkey_idx ON public.project_audio_references USING btree (added_by);
CREATE INDEX project_audio_references_project_id_fkey_idx ON public.project_audio_references USING btree (project_id);
CREATE INDEX project_audio_references_script_id_fkey_idx ON public.project_audio_references USING btree (script_id);
CREATE INDEX project_brief_answered_by_fkey_idx ON public.project_brief USING btree (answered_by);
CREATE INDEX project_documents_created_by_fkey_idx ON public.project_documents USING btree (created_by);
CREATE INDEX project_documents_location_fkey_idx ON public.project_documents USING btree (location_id, project_id);
CREATE INDEX project_documents_vendor_fkey_idx ON public.project_documents USING btree (vendor_id, project_id);
CREATE INDEX project_locations_created_by_fkey_idx ON public.project_locations USING btree (created_by);
CREATE INDEX scene_elements_element_fkey_idx ON public.scene_elements USING btree (element_id, project_id);
CREATE INDEX scene_elements_scene_fkey_idx ON public.scene_elements USING btree (scene_id, project_id);
CREATE INDEX scene_media_created_by_fkey_idx ON public.scene_media USING btree (created_by);
CREATE INDEX scene_media_media_fkey_idx ON public.scene_media USING btree (media_id, project_id);
CREATE INDEX scene_media_scene_fkey_idx ON public.scene_media USING btree (scene_id, project_id);
CREATE INDEX script_annotations_created_by_fkey_idx ON public.script_annotations USING btree (created_by);
CREATE INDEX script_annotations_project_id_fkey_idx ON public.script_annotations USING btree (project_id);
CREATE INDEX set_log_day_fkey_idx ON public.set_log USING btree (call_sheet_id, project_id);
CREATE INDEX set_log_media_fkey_idx ON public.set_log USING btree (media_id, project_id);
CREATE INDEX set_log_scene_fkey_idx ON public.set_log USING btree (scene_id, project_id);
CREATE INDEX set_log_shot_fkey_idx ON public.set_log USING btree (shot_id, project_id);
CREATE INDEX sfx_assets_project_id_fkey_idx ON public.sfx_assets USING btree (project_id);
CREATE INDEX sfx_assets_user_id_fkey_idx ON public.sfx_assets USING btree (user_id);
CREATE INDEX shots_created_by_fkey_idx ON public.shots USING btree (created_by);
CREATE INDEX shots_frame_fkey_idx ON public.shots USING btree (frame_media_id, project_id);
CREATE INDEX shots_scene_fkey_idx ON public.shots USING btree (scene_id, project_id);
CREATE INDEX timesheets_decided_by_fkey_idx ON public.timesheets USING btree (decided_by);
CREATE INDEX transcript_lines_media_fkey_idx ON public.transcript_lines USING btree (media_id, project_id);
CREATE INDEX vendors_created_by_fkey_idx ON public.vendors USING btree (created_by);
