import { SCRIPT_FORMAT_REGISTRY, SCRIPT_FORMATS, type ScriptFormat } from '@/lib/formats/script-formats';

export interface EcosystemModules {
  scriptos: boolean;
  studio: boolean;
  lounge: boolean;
  portfolio: boolean;
  distribution: boolean;
}

export const DEFAULT_ECOSYSTEM_MODULES: EcosystemModules = {
  scriptos: true,
  studio: true,
  lounge: true,
  portfolio: true,
  distribution: true,
};

export interface ProjectSettings {

  defaultScriptFormat?: ScriptFormat;
  modules: EcosystemModules;
  /** Open every tool now instead of phase by phase (lib/os/progress). */
  unlockAllTools?: boolean;
  /** How many pages the crew shoots in a day, in eighths (stripboard, auto-schedule). */
  dayLengthEighths?: number;
  /** Per-shoot-day meal plans (catering). */
  catering?: Record<string, { headcount: number; mealTime: string; dietary: string; vendor: string; notes: string; status: 'planned' | 'ordered' | 'delivered' }>;
  /** Safety and risk items. */
  safety?: Array<{ id: string; hazard: string; location: string; severity: 'low' | 'medium' | 'high'; mitigation: string; owner: string; status: 'identified' | 'mitigated' | 'resolved' }>;
  /** Crew communication log. */
  comms?: Array<{ id: string; date: string; to: string; channel: 'call' | 'email' | 'text' | 'in-person'; subject: string; notes: string; status: 'sent' | 'replied' | 'pending' }>;
  /** Equipment / gear inventory. */
  gear?: Array<{ id: string; item: string; category: string; owner: string; status: 'needed' | 'packed' | 'on-set' | 'returned' }>;
  /** Daily wrap reports. */
  wraps?: Array<{ id: string; date: string; dayNumber: number; shotsGot: number; pages: string; incidents: string; notes: string }>;
  /** Rehearsal schedule. */
  rehearsals?: Array<{ id: string; date: string; time: string; location: string; participants: string; scenes: string; notes: string }>;
  /** Location scout notes. */
  scouts?: Array<{ id: string; locationName: string; date: string; scout: string; photos: string; notes: string; status: 'scouted' | 'approved' | 'rejected' }>;
  /** Script revision history (colored pages). */
  revisions?: Array<{ id: string; color: string; date: string; pages: string; notes: string; author: string }>;
  /** Director's notebook entries. */
  directorNotes?: Array<{ id: string; scene: string; title: string; notes: string; reference: string; createdAt: string }>;
  /** Production risk register. */
  risks?: Array<{ id: string; risk: string; category: string; probability: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high'; mitigation: string; owner: string; status: 'open' | 'mitigated' | 'closed' }>;
  /** Camera report entries. */
  cameraReports?: Array<{ id: string; scene: string; shot: string; lens: string; tStop: string; filter: string; camera: string; media: string; notes: string }>;
  /** Sound report entries. */
  soundReports?: Array<{ id: string; scene: string; take: string; mic: string; wildTrack: string; roomTone: string; notes: string }>;
  /** VFX shot tracking. */
  vfxShots?: Array<{ id: string; shot: string; scene: string; vendor: string; plateReq: string; status: 'identified' | 'shot' | 'delivered' | 'approved' }>;
  /** Costume / wardrobe tracking. */
  costumes?: Array<{ id: string; character: string; scene: string; change: string; status: 'fitting' | 'ready' | 'on-set' | 'cleaning' | 'returned' }>;
  /** Location permits & insurance. */
  permits?: Array<{ id: string; location: string; permitType: string; issuedBy: string; expiry: string; status: 'pending' | 'approved' | 'expired' }>;
  /** Script supervisor notes (per-take). */
  scriptNotes?: Array<{ id: string; scene: string; take: string; slate: string; lens: string; notes: string; circle: boolean }>;
  /** Purchase orders / petty cash. */
  purchaseOrders?: Array<{ id: string; poNumber: string; vendor: string; department: string; amount: string; status: 'draft' | 'approved' | 'paid' }>;
  /** Media offload log (DIT). */
  mediaOffloads?: Array<{ id: string; card: string; camera: string; size: string; checksum: string; destination: string; status: 'pending' | 'verified' | 'archived' }>;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  modules: DEFAULT_ECOSYSTEM_MODULES,
};

export function getProjectModules(settings?: ProjectSettings | null): EcosystemModules {
  return { ...DEFAULT_ECOSYSTEM_MODULES, ...(settings?.modules || {}) };
}

export const SCRIPT_FORMAT_LABELS = Object.fromEntries(
  SCRIPT_FORMATS.map((f) => [f, SCRIPT_FORMAT_REGISTRY[f].label]),
) as Record<ScriptFormat, string>;
