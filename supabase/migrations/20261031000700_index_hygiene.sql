-- Cover every public foreign key with a full, leading-column B-tree index.
CREATE INDEX call_sheets_shoot_day_fkey_idx ON public.call_sheets USING btree (shoot_day_id, project_id);
CREATE INDEX character_castings_character_fkey_idx ON public.character_castings USING btree (character_id, project_id);
CREATE INDEX hidden_messages_hidden_by_fkey_idx ON public.hidden_messages USING btree (hidden_by);
CREATE INDEX reading_corrections_created_by_fkey_idx ON public.reading_corrections USING btree (created_by);
CREATE INDEX reports_resolved_by_fkey_idx ON public.reports USING btree (resolved_by);
CREATE INDEX scene_characters_character_fkey_idx ON public.scene_characters USING btree (character_id, project_id);
CREATE INDEX scene_characters_scene_fkey_idx ON public.scene_characters USING btree (scene_id, project_id);
CREATE INDEX scene_states_character_fkey_idx ON public.scene_states USING btree (character_id, project_id);
CREATE INDEX scene_states_scene_fkey_idx ON public.scene_states USING btree (scene_id, project_id);
CREATE INDEX scenes_location_fkey_idx ON public.scenes USING btree (location_id, project_id);
CREATE INDEX scenes_shoot_day_fkey_idx ON public.scenes USING btree (shoot_day_id, project_id);

-- Cover additional public foreign keys the advisor did not report.
CREATE INDEX hub_posts_project_id_fkey_idx ON public.hub_posts USING btree (project_id);
CREATE INDEX lounge_reads_user_id_fkey_idx ON public.lounge_reads USING btree (user_id);
CREATE INDEX portfolio_projects_user_id_fkey_idx ON public.portfolio_projects USING btree (user_id);
CREATE INDEX scenes_script_id_fkey_idx ON public.scenes USING btree (script_id);
CREATE INDEX transcript_lines_project_id_fkey_idx ON public.transcript_lines USING btree (project_id);

-- Retire narrower non-unique indexes now covered by complete FK indexes.
DROP INDEX public.character_castings_character_idx;
DROP INDEX public.scene_characters_character_idx;
DROP INDEX public.scene_states_character_idx;
DROP INDEX public.scenes_location_idx;
DROP INDEX public.scenes_shoot_day_idx;
DROP INDEX public.breakdown_elements_category_idx;
DROP INDEX public.idx_call_sheet_calls_sheet;
DROP INDEX public.character_media_media_idx;
DROP INDEX public.expenses_budget_item_idx;
DROP INDEX public.expenses_vendor_idx;
DROP INDEX public.post_cuts_media_idx;
DROP INDEX public.post_notes_scene_idx;
DROP INDEX public.project_documents_location_idx;
DROP INDEX public.scene_elements_element_idx;
DROP INDEX public.scene_media_media_idx;
DROP INDEX public.set_log_day_idx;
DROP INDEX public.set_log_media_idx;
DROP INDEX public.set_log_scene_idx;
DROP INDEX public.set_log_shot_idx;
DROP INDEX public.shots_frame_media_idx;
DROP INDEX public.idx_shots_scene;
DROP INDEX public.links_to_idx;