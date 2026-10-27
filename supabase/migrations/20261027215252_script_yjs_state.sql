ALTER TABLE public.scripts
  ADD COLUMN yjs_state text;

COMMENT ON COLUMN public.scripts.yjs_state IS
  'Yjs synchronization state for co-writing; scripts.content remains the serialized source of truth.';