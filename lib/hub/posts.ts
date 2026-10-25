// The hub's data: posts (hub_posts) and what each person has read (hub_reads).
// RLS decides who sees what — members get published posts, admins get drafts
// too and are the only writers (supabase/migrations/20261025000000_hub_posts.sql).

import { supabase } from '@/lib/supabase/client';

export const HUB_KINDS = ['update', 'guide'] as const;
export type HubKind = (typeof HUB_KINDS)[number];
export const HUB_AUDIENCES = ['everyone', 'developers', 'filmmakers', 'buyers', 'investors'] as const;
export type HubAudience = (typeof HUB_AUDIENCES)[number];

export const KIND_LABEL: Record<HubKind, string> = { update: "What's new", guide: 'Learn' };
export const AUDIENCE_LABEL: Record<HubAudience, string> = {
  everyone: 'Everyone', developers: 'Developers', filmmakers: 'Filmmakers', buyers: 'Buyers', investors: 'Investors',
};

export interface HubPost {
  id: string;
  kind: HubKind;
  audience: HubAudience;
  title: string;
  body: string;
  cover_url: string | null;
  important: boolean;
  pinned: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HubPostInput {
  kind: HubKind;
  audience: HubAudience;
  title: string;
  body: string;
  cover_url: string | null;
  important: boolean;
  pinned: boolean;
}

const COLUMNS = 'id, kind, audience, title, body, cover_url, important, pinned, published_at, created_at, updated_at';

/** Pinned first, then newest published (drafts, for admins, after by last edit). */
export function sortPosts(posts: HubPost[]): HubPost[] {
  const at = (p: HubPost) => Date.parse(p.published_at ?? p.updated_at) || 0;
  return [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned) || at(b) - at(a));
}

/** A post is for this audience page when it is for everyone or for that audience. */
export function forAudience(posts: HubPost[], audience: HubAudience): HubPost[] {
  return audience === 'everyone' ? posts : posts.filter((p) => p.audience === audience || p.audience === 'everyone');
}

export function isPublished(p: Pick<HubPost, 'published_at'>, now = Date.now()): boolean {
  return p.published_at !== null && Date.parse(p.published_at) <= now;
}

/** Checks a post before it is saved. Returns the cleaned input, or why not. */
export function checkPost(input: HubPostInput): { ok: true; value: HubPostInput } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give it a title.' };
  if (title.length > 200) return { ok: false, error: 'Keep the title under 200 characters.' };
  if (input.body.length > 50000) return { ok: false, error: 'The body is too long (50,000 characters at most).' };
  const cover = input.cover_url?.trim() || null;
  if (cover && !/^https:\/\//.test(cover)) return { ok: false, error: 'The cover image must be an https:// link.' };
  if (!HUB_KINDS.includes(input.kind)) return { ok: false, error: 'Pick What’s new or Learn.' };
  if (!HUB_AUDIENCES.includes(input.audience)) return { ok: false, error: 'Pick an audience.' };
  return { ok: true, value: { ...input, title, cover_url: cover } };
}

export async function listPosts(): Promise<HubPost[]> {
  const { data, error } = await supabase.from('hub_posts').select(COLUMNS).order('published_at', { ascending: false, nullsFirst: true });
  if (error) throw new Error(error.message);
  return sortPosts((data ?? []) as HubPost[]);
}

export async function getPost(id: string): Promise<HubPost | null> {
  const { data, error } = await supabase.from('hub_posts').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as HubPost | null) ?? null;
}

/** Ids of the posts this person has opened. */
export async function listReadIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('hub_reads').select('post_id');
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.post_id));
}

/** Published posts this person has not opened yet. */
export function unreadCount(posts: HubPost[], read: Set<string>, now = Date.now()): number {
  return posts.filter((p) => isPublished(p, now) && !read.has(p.id)).length;
}

/** Marks a post read. Returns an error message, or null. */
export async function markRead(postId: string): Promise<string | null> {
  const { error } = await supabase.from('hub_reads').upsert({ post_id: postId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true });
  return error ? error.message : null;
}

/** Admin: create a draft. Returns its id, or an error message. */
export async function createPost(input: HubPostInput): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from('hub_posts').insert(input).select('id').single();
  return error ? { error: error.message } : { id: data.id };
}

/** Admin: save edits. Returns an error message, or null. */
export async function updatePost(id: string, input: Partial<HubPostInput>): Promise<string | null> {
  const { error } = await supabase.from('hub_posts').update(input).eq('id', id);
  return error ? error.message : null;
}

/** Admin: publish now, or take back to draft. Publishing an important post notifies everyone. */
export async function setPublished(id: string, published: boolean): Promise<string | null> {
  const { error } = await supabase.from('hub_posts').update({ published_at: published ? new Date().toISOString() : null }).eq('id', id);
  return error ? error.message : null;
}

export async function deletePost(id: string): Promise<string | null> {
  const { error } = await supabase.from('hub_posts').delete().eq('id', id);
  return error ? error.message : null;
}
