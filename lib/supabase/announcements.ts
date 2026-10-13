// A project announcement: a message in the project's "announcements" channel
// (managers post, the whole team reads) and a notification to each confirmed
// crew member. The channel is made on first use.

import { supabase } from './client';
import { createChannel, listChannels, type Channel } from './channels';
import { sendChannelMessage } from './messages';
import { notify } from './notifications';

export const ANNOUNCEMENT_MAX = 2000;

/** The notification a crew member gets: the project, and the start of the text. */
export function announcementNotice(projectTitle: string, text: string): { type: string; title: string; body: string } {
  const clean = text.trim().replace(/\s+/g, ' ');
  return { type: 'announcement', title: `Announcement · ${projectTitle}`, body: clean.length > 200 ? `${clean.slice(0, 197)}…` : clean };
}

async function announcementsChannel(projectId: string): Promise<Channel> {
  const existing = (await listChannels(projectId)).find((c) => c.project_id === projectId && c.name === 'announcements');
  if (existing) return existing;
  const { channel, error } = await createChannel({
    project_id: projectId,
    name: 'announcements',
    type: 'text',
    audience: 'team',
    post_policy: 'managers',
    topic: 'Call times, changes, news — from the people running it.',
  });
  if (!channel) throw new Error(error || 'Could not make the announcements channel');
  return channel;
}

/** Post to the team. Returns how many crew were notified. Throws with a message a person can read. */
export async function postAnnouncement(args: { projectId: string; projectTitle: string; userId: string; text: string }): Promise<{ notified: number }> {
  const text = args.text.trim();
  if (!text) throw new Error('Write the announcement first.');
  if (text.length > ANNOUNCEMENT_MAX) throw new Error(`Keep it under ${ANNOUNCEMENT_MAX} characters.`);

  const channel = await announcementsChannel(args.projectId);
  await sendChannelMessage(args.userId, text, channel.id);

  const { data, error } = await supabase.from('project_crew').select('user_id').eq('project_id', args.projectId).eq('status', 'confirmed');
  if (error) throw new Error('Posted, but could not look up the crew to notify.');
  const notice = announcementNotice(args.projectTitle, text);
  const people = [...new Set((data ?? []).map((r) => r.user_id).filter((id) => id !== args.userId))];
  await Promise.all(people.map((id) => notify(id, { ...notice, link: '/lounge' }, args.userId)));
  return { notified: people.length };
}
