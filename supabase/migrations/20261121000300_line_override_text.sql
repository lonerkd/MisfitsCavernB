-- A line override is found by line number, so adding or removing lines above it moved the correction onto the wrong line. The override
-- now also remembers the line's own text; the reader re-anchors by that text (nearest identical line) when the number no longer fits.
-- Existing overrides have no text and stay by number, as before.
ALTER TABLE public.reading_line_overrides
  ADD COLUMN line_text text CHECK (line_text IS NULL OR char_length(line_text) <= 2000);
