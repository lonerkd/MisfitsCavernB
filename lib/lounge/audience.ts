// Who a Lounge channel is for (channels.audience; enforced in the database by
// internal.can_view_channel). Community channels (no project) are for all
// members or admins; project channels for a part of the production.

export type CommunityAudience = 'users' | 'admins';
export type ProjectAudience = 'team' | 'owners' | 'above' | 'below' | 'guests' | 'public';
export type ChannelAudience = CommunityAudience | ProjectAudience;

export interface AudienceOption { id: ChannelAudience; label: string; hint: string }

export const COMMUNITY_AUDIENCES: AudienceOption[] = [
  { id: 'users', label: 'Everyone', hint: 'All members of The Cavern' },
  { id: 'admins', label: 'Admins', hint: 'Only the people running the Cavern' },
];

export const PROJECT_AUDIENCES: AudienceOption[] = [
  { id: 'team', label: 'Whole team', hint: 'Everyone on the project' },
  { id: 'owners', label: 'Owners', hint: 'The creator and leads' },
  { id: 'above', label: 'Above the line', hint: 'Direction, producing, writing, principal cast — and owners' },
  { id: 'below', label: 'Below the line', hint: 'Every other craft — and owners' },
  { id: 'guests', label: 'Guests', hint: 'People added as viewers — and owners' },
  { id: 'public', label: 'Public', hint: 'Anyone signed in can read it — for updates' },
];

export function audienceOptions(scope: 'project' | 'community'): AudienceOption[] {
  return scope === 'community' ? COMMUNITY_AUDIENCES : PROJECT_AUDIENCES;
}

export function audienceLabel(a: string): string {
  return [...COMMUNITY_AUDIENCES, ...PROJECT_AUDIENCES].find((o) => o.id === a)?.label ?? a;
}

/** A sensible posting rule for an audience: a public channel is for updates. */
export function defaultPostPolicy(a: ChannelAudience): 'viewers' | 'managers' {
  return a === 'public' ? 'managers' : 'viewers';
}

export interface GroupableChannel { id: string; project_id: string | null; type: string; audience: string; position: number | null; name: string }

/**
 * The sidebar: guides first, then the active project's channels, the
 * community, and other productions' public channels.
 */
export function groupChannels<T extends GroupableChannel>(channels: T[], activeProjectId: string | null) {
  const by = (a: T, b: T) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);
  return {
    guides: channels.filter((c) => !c.project_id && c.type === 'guide').sort(by),
    project: channels.filter((c) => !!activeProjectId && c.project_id === activeProjectId).sort(by),
    community: channels.filter((c) => !c.project_id && c.type !== 'guide').sort(by),
    open: channels.filter((c) => c.project_id && c.project_id !== activeProjectId && c.audience === 'public').sort(by),
  };
}
