// A role's working suite: which of the Studio's Production tools a craft lives in, in the order it reaches for them.
// Pure data, no Supabase import. Everything stays reachable (the tools are one shared graph); a toolkit is the lens that puts a
// person's own tools first and says honestly what their job still lacks. The gaps are from the role completeness map
// (`plans/2026-11-13-role-completeness-map.md`) and the 2026-11-15 audit (`plans/2026-11-15-role-suites-audit.md`): a gap is
// a canonical step with no tool, not a bug in one.

import type { ProductionView } from '@/lib/os/progress';

export interface Toolkit {
  /** The Production views this craft works in, most-used first. */
  views: ProductionView[];
  /** A role whose working surface is not in the Studio: the crew call page, or the client review. */
  home?: 'call' | 'review';
  /** What this role's canonical job needs that the suite does not have yet. */
  gaps: string[];
}

const T = (views: ProductionView[], gaps: string[] = [], home?: Toolkit['home']): Toolkit => ({ views, gaps, ...(home ? { home } : {}) });

/** Tools that hold a permission-gated kind of information: not offered to a role that could not open them. */
export const VIEW_NEEDS: Partial<Record<ProductionView, string>> = {
  money: 'budget.read',
  po: 'budget.read',
  claims: 'budget.read',
  paperwork: 'paperwork.read',
};

const WRITING = T(['story', 'revisions', 'world', 'continuity'], ['YouTube, article and game scripts are read as their own formats, but their PDF / text exports are still screenplay-shaped, and there is no publishing step to a channel or a CMS (R3, R5; BACKLOG 3.22)']);
const CAMERA = T(['shots', 'camera', 'gear', 'schedule'], ['No overhead / blocking diagram beside the shot list (R13)']);
const LIGHT = T(['gear', 'schedule', 'safety', 'shots', 'scout']);
const WARDROBE = T(['costume', 'makeup', 'continuity', 'breakdown']);
const POST = T(['editorial', 'mediaoffload', 'reports', 'revisions'], ['Review comments are not pinned to a picture version, and approval of a cut happens outside the suite (R18)']);

/** By craft name (public.crafts). A craft not listed falls back to its department, then to the generic suite. */
export const TOOLKITS: Record<string, Toolkit> = {
  // Direction
  'Director': T(['director', 'story', 'shots', 'breakdown', 'schedule', 'continuity', 'rehearsal', 'scout', 'revisions', 'crew'], ['Your day shows the next shoot day at a glance (its scenes, the shots planned, what needs the director); a live on-the-day view for the director is the On set tools themselves (R11)']),
  'First assistant director': T(['schedule', 'breakdown', 'dood', 'readiness', 'onset', 'wrap', 'reports', 'crew'], ['Scene identity across a script change is not proven end to end; outputs can disagree until the film graph cutover (R10)']),
  'Second assistant director': T(['schedule', 'onset', 'dood', 'crew', 'comms', 'wrap']),
  'Script supervisor': T(['scriptsup', 'continuity', 'revisions', 'onset', 'reports', 'shots'], ['Lined-script marks and the selected take are not in the suite; notes the editor needs are not tied to takes (R12)']),
  // Production
  'Producer': T(['money', 'schedule', 'readiness', 'paperwork', 'risk', 'crew', 'po', 'permit', 'breakdown', 'locations'], ['The live schedule and budget have not been proven against a real production (R8)']),
  'Line producer': T(['money', 'po', 'schedule', 'readiness', 'paperwork', 'risk', 'dood', 'breakdown', 'locations']),
  'Production manager': T(['schedule', 'readiness', 'money', 'po', 'paperwork', 'permit', 'transport', 'crew', 'breakdown', 'locations']),
  'Production coordinator': T(['schedule', 'paperwork', 'crew', 'comms', 'transport', 'catering', 'permit', 'locations'], ['Call-sheet acknowledgements are recorded and shown, but the coordinator flow has not been run on a real production (R9)']),
  'Production accountant': T(['money', 'po', 'paperwork', 'claims'], ['No invoices, cash-flow or Excel / Movie Magic Budgeting export (wishlist 4.6)']),
  'Production assistant': T(['onset', 'schedule', 'transport', 'catering', 'comms']),
  'Location manager': T(['locations', 'scout', 'permit', 'paperwork', 'weather', 'transport', 'safety'], ['A location packet (photos, contact, permit, parking) is not one shareable page, and an address is not hidden from roles that should not see it (R16)']),
  'Casting director': T(['crew', 'cast', 'rehearsal', 'extras', 'paperwork'], ['No intake for submissions the way Backstage / Casting Networks work: a casting call posts as a job (R15)']),
  // Writing
  'Writer': WRITING,
  'Story editor': WRITING,
  'Showrunner': T(['story', 'revisions', 'breakdown', 'schedule', 'money', 'crew'], WRITING.gaps),
  'Story producer': WRITING,
  // Camera
  'Director of photography': T(['shots', 'camera', 'gear', 'schedule', 'scout'], CAMERA.gaps),
  'Camera operator': CAMERA,
  'First assistant camera': CAMERA,
  'Second assistant camera': CAMERA,
  'Steadicam operator': CAMERA,
  'Drone operator': CAMERA,
  'DIT': T(['mediaoffload', 'camera', 'reports']),
  'Stills photographer': T(['stills', 'schedule']),
  // Lighting & grip
  'Gaffer': LIGHT, 'Key grip': LIGHT, 'Electrician': LIGHT, 'Grip': LIGHT,
  // Sound
  'Production sound mixer': T(['sound', 'gear', 'mediaoffload', 'schedule']),
  'Boom operator': T(['sound', 'gear', 'schedule']),
  'Sound designer': T(['sound', 'editorial', 'revisions'], ['No sound spotting or effects list tied to scenes (R17)']),
  'Re-recording mixer': T(['sound', 'editorial', 'revisions']),
  // Art
  'Production designer': T(['props', 'world', 'locations', 'breakdown', 'continuity', 'scout'], ['References cannot become tracked assets: no Pinterest import (R14)']),
  'Art director': T(['props', 'breakdown', 'locations', 'continuity', 'gear']),
  'Set decorator': T(['props', 'breakdown', 'locations', 'continuity']),
  'Prop master': T(['props', 'breakdown', 'continuity', 'gear']),
  // Wardrobe, hair & makeup
  'Costume designer': WARDROBE,
  'Wardrobe assistant': T(['costume', 'continuity']),
  'Makeup artist': T(['makeup', 'continuity', 'breakdown']),
  'Hair stylist': T(['makeup', 'continuity', 'breakdown']),
  'SFX makeup artist': T(['makeup', 'continuity', 'breakdown']),
  // Editorial & post
  'Editor': POST,
  'Assistant editor': POST,
  'Colorist': T(['editorial', 'reports'], POST.gaps),
  'VFX artist': T(['vfx', 'editorial', 'breakdown']),
  'Motion designer': T(['vfx', 'editorial']),
  'Post supervisor': T(['editorial', 'mediaoffload', 'schedule', 'claims', 'reports'], POST.gaps),
  // Music
  'Composer': T(['sound', 'editorial', 'revisions'], ['No cue sheet; Spotify playback is verified with fakes only (R17)']),
  'Music supervisor': T(['sound', 'editorial', 'revisions', 'paperwork'], ['No cue sheet or licensing tracker; Spotify playback is verified with fakes only (R17)']),
  // Performance: their surface is the call page, not the Studio
  'Actor': T(['rehearsal'], ['Calls, the call sheet and their own pages are on the call pages (My calls); there is no lines-learning or self-tape tool, and nothing after the shoot day (R19)'], 'call'),
  'Stunt performer': T(['rehearsal', 'safety'], ['Calls and pages only; no stunt-specific plan or safety sign-off (R19)'], 'call'),
  'Voice actor': T([], ['Calls and pages only; no recording-session view (R19)'], 'call'),
  // Outside the crew: a review link for their audience (lib/review/audiences.ts), not the Studio
  'Client': T([], ['Reads, comments and approves script versions through a link; approval of a picture cut, and a client page for several deliverables over time, do not exist yet (R20)'], 'review'),
  'Investor': T([], ['Reads and comments on script versions through a link; no deck, budget summary or cut view built for an investor (R20)'], 'review'),
  'Distributor or festival guest': T([], ['Reads and comments through a link; no screening link or deliverables checklist (R20)'], 'review'),
  'Press': T([], ['Reads through a link, no comments; the press kit exists on a public project but is not part of the link (R20)'], 'review'),
  // Other
  'Multi-hyphenate': T(['story', 'schedule', 'onset', 'crew']),
  'Other': T(['story', 'schedule', 'onset', 'crew']),
};

/** The department a craft belongs to when it has no entry of its own (crafts an admin adds later). */
export const DEPARTMENT_DEFAULTS: Record<string, Toolkit> = {
  'Direction': T(['schedule', 'breakdown', 'shots', 'onset', 'continuity']),
  'Production': T(['schedule', 'readiness', 'paperwork', 'crew', 'comms']),
  'Writing': WRITING,
  'Camera': CAMERA,
  'Lighting & grip': LIGHT,
  'Sound': T(['sound', 'gear', 'schedule']),
  'Art': T(['props', 'breakdown', 'locations', 'continuity']),
  'Wardrobe, hair & makeup': WARDROBE,
  'Editorial & post': POST,
  'Music': T(['sound', 'editorial']),
  'Performance': T([], [], 'call'),
  'Outside': T([], [], 'review'),
  'Other': T(['story', 'schedule', 'onset', 'crew']),
};

/** What a person with no craft, or one this list does not know, works in. */
export const GENERIC_TOOLKIT: Toolkit = T(['schedule', 'onset', 'crew']);

export function toolkitFor(craft: string | null | undefined, department?: string | null): Toolkit {
  if (craft && TOOLKITS[craft]) return TOOLKITS[craft];
  if (department && DEPARTMENT_DEFAULTS[department]) return DEPARTMENT_DEFAULTS[department];
  return GENERIC_TOOLKIT;
}

/** A toolkit's views a person may open: the ones that need a permission are left out when they do not hold it. */
export function openableViews(kit: Toolkit, held: ReadonlySet<string>): ProductionView[] {
  return kit.views.filter((v) => { const need = VIEW_NEEDS[v]; return !need || held.has(need); });
}
