-- An editorial handoff log and an insurance claims log join the role tools that keep one row per record. Only the allowed kinds change.
ALTER TABLE public.production_records DROP CONSTRAINT production_records_kind_check;
ALTER TABLE public.production_records ADD CONSTRAINT production_records_kind_check CHECK (kind IN (
  'safety','comms','gear','wraps','rehearsals','scouts','directorNotes','risks','cameraReports','soundReports','vfxShots',
  'costumes','permits','scriptNotes','purchaseOrders','mediaOffloads','makeup','stills','extras','editorial','claims'));
