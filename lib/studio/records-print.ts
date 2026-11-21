// Printing the role tools (camera reports, costumes, permits, purchase orders ...): every one of them is a list of records, so one
// registry says which columns each prints and one builder lays them out on the print kit. Pure: the button reads the rows, this
// decides the page. A record's scene is its linked scene numbers when they resolve, else its typed label (`sceneChip`).
import type { PrintColumn, PrintDoc } from '@/lib/print/kit';
import type { RecordKind } from '@/lib/supabase/productionRecords';
import { cueSheetRows, type Cue } from './cues';

export interface RecordPrintSpec {
  /** The Production view that holds this tool (its tab id). */
  view: string;
  title: string;
  /** Fields to print, in order. `scene` and `character` are resolved from links when they can be. */
  columns: PrintColumn[];
  landscape?: boolean;
}

const C = (key: string, label: string, width?: string): PrintColumn => ({ key, label, width });

export const RECORD_PRINT: Record<RecordKind, RecordPrintSpec> = {
  safety: { view: 'safety', title: 'Safety', columns: [C('hazard', 'Hazard'), C('location', 'Location'), C('severity', 'Severity', '10%'), C('mitigation', 'Mitigation'), C('owner', 'Owner', '12%'), C('status', 'Status', '11%')], landscape: true },
  comms: { view: 'comms', title: 'Communications log', columns: [C('date', 'Date', '11%'), C('to', 'To', '16%'), C('channel', 'Channel', '10%'), C('subject', 'Subject'), C('notes', 'Notes'), C('status', 'Status', '10%')], landscape: true },
  gear: { view: 'gear', title: 'Gear list', columns: [C('item', 'Item'), C('category', 'Category', '20%'), C('owner', 'Owner', '20%'), C('status', 'Status', '14%')] },
  wraps: { view: 'wrap', title: 'Wrap reports', columns: [C('date', 'Date', '12%'), C('dayNumber', 'Day', '7%'), C('shotsGot', 'Shots', '8%'), C('pages', 'Pages', '8%'), C('incidents', 'Incidents'), C('notes', 'Notes')], landscape: true },
  rehearsals: { view: 'rehearsal', title: 'Rehearsal schedule', columns: [C('date', 'Date', '11%'), C('time', 'Time', '9%'), C('location', 'Location', '18%'), C('participants', 'Who'), C('scene', 'Scenes', '12%'), C('notes', 'Notes')], landscape: true },
  scouts: { view: 'scout', title: 'Location scouts', columns: [C('locationName', 'Location'), C('date', 'Date', '12%'), C('scout', 'Scout', '16%'), C('notes', 'Notes'), C('status', 'Status', '12%')] },
  directorNotes: { view: 'director', title: 'Director’s notebook', columns: [C('scene', 'Scene', '10%'), C('title', 'Title', '22%'), C('notes', 'Notes'), C('reference', 'Reference', '18%')] },
  risks: { view: 'risk', title: 'Risk register', columns: [C('risk', 'Risk'), C('category', 'Category', '12%'), C('probability', 'Likelihood', '10%'), C('impact', 'Impact', '9%'), C('mitigation', 'Mitigation'), C('owner', 'Owner', '11%'), C('status', 'Status', '10%')], landscape: true },
  cameraReports: { view: 'camera', title: 'Camera reports', columns: [C('scene', 'Scene', '9%'), C('shot', 'Shot', '8%'), C('lens', 'Lens', '10%'), C('tStop', 'T-stop', '8%'), C('filter', 'Filter', '10%'), C('camera', 'Camera', '10%'), C('media', 'Media', '10%'), C('notes', 'Notes')], landscape: true },
  soundReports: { view: 'sound', title: 'Sound reports', columns: [C('scene', 'Scene', '9%'), C('take', 'Take', '8%'), C('mic', 'Mic', '16%'), C('wildTrack', 'Wild track', '12%'), C('roomTone', 'Room tone', '12%'), C('notes', 'Notes')] },
  vfxShots: { view: 'vfx', title: 'VFX shots', columns: [C('shot', 'Shot', '10%'), C('scene', 'Scene', '10%'), C('vendor', 'Vendor', '22%'), C('plateReq', 'Plate requirements'), C('status', 'Status', '13%')] },
  costumes: { view: 'costume', title: 'Costumes', columns: [C('character', 'Character', '18%'), C('scene', 'Scene', '10%'), C('change', 'Costume / change'), C('status', 'Status', '13%')] },
  permits: { view: 'permit', title: 'Permits and insurance', columns: [C('location', 'Location'), C('permitType', 'Type', '18%'), C('issuedBy', 'Issued by', '20%'), C('expiry', 'Expires', '13%'), C('status', 'Status', '12%')] },
  scriptNotes: { view: 'scriptsup', title: 'Script supervisor notes', columns: [C('scene', 'Scene', '8%'), C('take', 'Take', '7%'), C('slate', 'Slate', '8%'), C('lens', 'Lens', '8%'), C('lines', 'Lines', '9%'), C('photo', 'Photo', '12%'), C('notes', 'Notes'), C('circle', 'Circled', '8%')] },
  purchaseOrders: { view: 'po', title: 'Purchase orders', columns: [C('poNumber', 'PO', '12%'), C('vendor', 'Vendor'), C('department', 'Department', '20%'), C('amount', 'Amount', '13%'), C('status', 'Status', '12%')] },
  mediaOffloads: { view: 'mediaoffload', title: 'Media offload log', columns: [C('card', 'Card', '10%'), C('camera', 'Camera', '12%'), C('size', 'GB', '8%'), C('checksum', 'Checksum'), C('destination', 'Destination', '16%'), C('status', 'Status', '11%')], landscape: true },
  makeup: { view: 'makeup', title: 'Makeup and hair', columns: [C('character', 'Character', '16%'), C('scene', 'Scene', '9%'), C('look', 'Look'), C('artist', 'Artist', '16%'), C('notes', 'Notes')] },
  stills: { view: 'stills', title: 'Stills log', columns: [C('scene', 'Scene', '9%'), C('subject', 'Subject'), C('frames', 'Frames', '14%'), C('photographer', 'Photographer', '16%'), C('status', 'Status', '12%'), C('notes', 'Notes')] },
  extras: { view: 'extras', title: 'Extras', columns: [C('scene', 'Scene', '9%'), C('role', 'Role'), C('count', 'How many', '10%'), C('wardrobe', 'Wardrobe', '20%'), C('status', 'Status', '12%'), C('notes', 'Notes')] },
  editorial: { view: 'editorial', title: 'Editorial handoff', columns: [C('item', 'Item'), C('scene', 'Scene', '9%'), C('version', 'Version', '9%'), C('recipient', 'To', '16%'), C('due', 'Due', '12%'), C('status', 'Status', '11%')] },
  cues: { view: 'cues', title: 'Music cue sheet', landscape: true, columns: [C('cue', 'Cue', '7%'), C('title', 'Title'), C('kind', 'Kind', '9%'), C('use', 'Use', '13%'), C('composer', 'Composer', '13%'), C('publisher', 'Publisher', '13%'), C('pro', 'PRO', '6%'), C('master', 'Master', '10%'), C('tcIn', 'In', '6%'), C('tcOut', 'Out', '6%'), C('duration', 'Time', '6%')] },
  spotting: { view: 'spotting', title: 'Sound spotting list', columns: [C('scene', 'Scene', '9%'), C('tc', 'Time', '9%'), C('kind', 'Type', '14%'), C('note', 'What is needed'), C('source', 'Source', '16%'), C('status', 'Status', '11%')] },
  claims: { view: 'claims', title: 'Insurance claims', columns: [C('incident', 'Incident'), C('date', 'Date', '12%'), C('policy', 'Policy', '16%'), C('amount', 'Amount', '12%'), C('status', 'Status', '12%'), C('notes', 'Notes')] },
};

/** The record kind a Production view holds, or null for a view that is not a record list. */
export function recordKindOfView(view: string): RecordKind | null {
  return (Object.keys(RECORD_PRINT) as RecordKind[]).find((k) => RECORD_PRINT[k].view === view) ?? null;
}

export type PrintableRecord = { id: string } & Record<string, unknown>;

const plain = (v: unknown): string | number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : '';
  if (typeof v === 'number') return v;
  return String(v);
};

export interface RecordsPrintInput {
  kind: RecordKind;
  project: string;
  accent?: string | null;
  logo?: string | null;
  rows: PrintableRecord[];
  /** Resolves a record's scene and character from its links; falls back to the record's own text. */
  sceneOf?: (r: PrintableRecord) => string;
  characterOf?: (r: PrintableRecord) => string;
  /** Resolves a record's continuity photo (`media_id`) to the photo's title; null when unknown. Nothing is fetched: the caller passes the lookup. */
  mediaTitle?: (id: string) => string | null;
  generated: string;
}

export function recordsDoc(i: RecordsPrintInput): PrintDoc {
  const spec = RECORD_PRINT[i.kind];
  // The cue sheet is read by a performing-rights society in cue-number order, with each cue's running time: it is built, not copied.
  const rows = i.kind === 'cues' ? cueSheetRows(i.rows as unknown as Cue[]) : i.rows.map((r) => {
    const out: Record<string, string | number | null> = {};
    for (const c of spec.columns) out[c.key] = plain(r[c.key]);
    if (i.sceneOf && spec.columns.some((c) => c.key === 'scene')) out.scene = i.sceneOf(r) || out.scene;
    if (i.characterOf && spec.columns.some((c) => c.key === 'character')) out.character = i.characterOf(r) || out.character;
    // A take's lined run, as the script supervisor writes it: "3–5", "7", with "off camera" when the dialogue is heard, not seen.
    if (spec.columns.some((c) => c.key === 'lines')) {
      const a = Number(r.from_line);
      const b = r.to_line == null ? a : Number(r.to_line);
      out.lines = Number.isFinite(a) && a >= 1 ? `${a === b || !Number.isFinite(b) ? a : `${Math.min(a, b)}–${Math.max(a, b)}`}${r.off_camera ? ' off camera' : ''}` : null;
    }
    // A take's continuity photo, by its title. A take with no photo, or one the library no longer has, prints nothing.
    if (i.mediaTitle && spec.columns.some((c) => c.key === 'photo')) {
      const id = r.media_id == null ? '' : String(r.media_id);
      out.photo = (id && i.mediaTitle(id)) || null;
    }
    return out;
  });
  return {
    title: spec.title,
    kind: i.project,
    accent: i.accent, logo: i.logo,
    meta: [['Entries', rows.length]],
    blocks: [{ type: 'table', columns: spec.columns, rows, empty: 'Nothing has been logged yet.' }],
    footer: i.project,
    generated: i.generated,
    orientation: spec.landscape ? 'landscape' : 'portrait',
  };
}
