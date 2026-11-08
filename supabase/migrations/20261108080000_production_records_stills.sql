-- A stills log (the unit photographer's frames, per scene) joins the role tools that keep one row per record.
-- Only the allowed kinds change; the policies, triggers and links are the table's own.
ALTER TABLE public.production_records DROP CONSTRAINT production_records_kind_check;
ALTER TABLE public.production_records ADD CONSTRAINT production_records_kind_check CHECK (kind IN (
  'safety','comms','gear','wraps','rehearsals','scouts','directorNotes','risks','cameraReports','soundReports','vfxShots',
  'costumes','permits','scriptNotes','purchaseOrders','mediaOffloads','makeup','stills'));
