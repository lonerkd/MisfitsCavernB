-- The shot designer: a shot can carry its storyboard frame — an image from
-- the project's library (a sketch, a reference still, a photo from the
-- scout). Composite key: the frame must be in the same project as the shot;
-- deleting the image clears the frame, never the shot.
ALTER TABLE public.shots ADD COLUMN frame_media_id uuid;
ALTER TABLE public.shots ADD CONSTRAINT shots_frame_fkey
  FOREIGN KEY (frame_media_id, project_id) REFERENCES public.media(id, project_id)
  ON DELETE SET NULL (frame_media_id);
CREATE INDEX shots_frame_media_idx ON public.shots USING btree (frame_media_id);

-- Camera fields were unbounded free text.
ALTER TABLE public.shots ADD CONSTRAINT shots_camera_len CHECK (
  char_length(coalesce(shot_size, '')) <= 12
  AND char_length(coalesce(angle, '')) <= 40
  AND char_length(coalesce(movement, '')) <= 40
  AND char_length(coalesce(lens, '')) <= 40
);
