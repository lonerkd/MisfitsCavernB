// Today (/today): the next days on set, my calls, what's mine to do, and who
// or what is unread in the Lounge — for the person signed in, across their
// projects. RLS limits every read to what they can see.
import { supabase } from './client';
import type { LoungeUnread } from './messages';

export interface TodaySheet { id: string; project_id: string; shoot_date: string | null; shoot_day: number; general_call: string | null; location_address: string | null; weather: string | null; issued_at: string | null }
export interface TodayTask { id: string; project_id: string; title: string; completed: boolean | null; due_date: string | null }

export interface TodayWork {
  sheets: TodaySheet[];
  /** My call time on each call sheet I'm called on. */
  myCalls: Record<string, string | null>;
  tasks: TodayTask[];
}

/** Upcoming call sheets on these projects (from `fromDay`), my calls, and my open tasks. Throws if any part fails. */
export async function getTodayWork(userId: string, projectIds: string[], fromDay: string): Promise<TodayWork> {
  const none = { data: [], error: null };
  const [sh, calls, tk] = await Promise.all([
    projectIds.length
      ? supabase.from('call_sheets').select('id, project_id, shoot_date, shoot_day, general_call, location_address, weather, issued_at').in('project_id', projectIds).gte('shoot_date', fromDay).order('shoot_date').limit(12)
      : Promise.resolve(none),
    supabase.from('call_sheet_calls').select('call_sheet_id, call_time').eq('crew_user_id', userId),
    projectIds.length
      ? supabase.from('project_tasks').select('id, project_id, title, completed, due_date').eq('assigned_to', userId).eq('completed', false).in('project_id', projectIds).limit(40)
      : Promise.resolve(none),
  ]);
  for (const r of [sh, calls, tk]) if (r.error) throw r.error;
  return {
    sheets: (sh.data ?? []) as TodaySheet[],
    myCalls: Object.fromEntries(((calls.data ?? []) as { call_sheet_id: string; call_time: string | null }[]).map((c) => [c.call_sheet_id, c.call_time])),
    tasks: (tk.data ?? []) as TodayTask[],
  };
}

/** Names for what's unread: each channel's name and project, each person's username. */
export async function nameUnread(un: LoungeUnread): Promise<{
  channels: { id: string; name: string; project_id: string | null }[];
  people: { id: string; username: string }[];
}> {
  const channelIds = Object.keys(un.channels), peopleIds = Object.keys(un.people);
  const none = { data: [], error: null };
  const [ch, ppl] = await Promise.all([
    channelIds.length ? supabase.from('channels').select('id, name, project_id').in('id', channelIds) : Promise.resolve(none),
    peopleIds.length ? supabase.from('profiles').select('id, username').in('id', peopleIds) : Promise.resolve(none),
  ]);
  if (ch.error) throw ch.error;
  if (ppl.error) throw ppl.error;
  return {
    channels: (ch.data ?? []) as { id: string; name: string; project_id: string | null }[],
    people: (ppl.data ?? []) as { id: string; username: string }[],
  };
}
