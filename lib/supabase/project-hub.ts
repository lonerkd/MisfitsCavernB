// The project page (/projects/[id]): its overview counts and the production
// manager's tasks, budget, milestones, crew, festivals and settings.
// Crew work tasks, budget and milestones with the owner; the crew list,
// festivals and settings live on the project row, which only its owner can
// change (RLS decides; these functions just ask).
import { supabase } from './client';
import type { Json, Tables } from './database.types';
import type { ProjectSettings } from '@/lib/types/settings';

export interface TaskRow { id: string; title: string; completed: boolean; assigned_to: string | null; due_date: string | null }
export interface BudgetRow { id: string; category: string; amount: number; actual_cost?: number | null }
export interface TimelineRow { id: string; title: string; start_date: string | null; end_date: string | null }
export interface CrewRow { id: string; user_id: string; role: string; craft: string | null; profiles?: { username: string } | null }
export interface PortfolioRow { id: string; title: string; share_token: string }
export interface FestivalRow { id: string; name: string; deadline?: string; status: 'planned' | 'submitted' | 'accepted' | 'rejected'; notes?: string }
export interface MilestoneRow { id: string; title: string; end_date: string | null; status: string | null }

type Result = { error: { message: string } | null };
function check(...results: Result[]) {
  for (const r of results) if (r.error) throw r.error;
}

/** The project row; null when it doesn't exist or this person can't see it. */
export async function getProjectRow(projectId: string): Promise<Tables<'projects'> | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface ProjectOverview {
  scripts: number;
  /** Total length of the scene index, in eighths of a page. */
  eighths: number;
  scenes: number;
  crew: { id: string; name: string; role: string }[];
  tasks: number;
  tasksDone: number;
  budget: number;
  milestones: MilestoneRow[];
  concepts: number;
  portfolio: { id: string; title: string }[];
  festivals: { status?: string }[];
  campaigns: number;
}

/** The counts and lists the project page's overview shows, in one round. */
export async function getProjectOverview(projectId: string): Promise<ProjectOverview> {
  const [sc, cr, tk, bd, tl, scn, cn, pf, pr, cp] = await Promise.all([
    supabase.from('scripts').select('id').eq('project_id', projectId),
    supabase.from('project_crew').select('id, user_id, role, craft, profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId),
    supabase.from('project_tasks').select('completed').eq('project_id', projectId),
    supabase.from('budget_items').select('amount').eq('project_id', projectId),
    supabase.from('timeline_items').select('id, title, end_date, status').eq('project_id', projectId),
    supabase.from('scenes').select('est_duration').eq('project_id', projectId).is('removed_at', null),
    supabase.from('media').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('portfolio_projects').select('id, title').eq('source_project_id', projectId),
    supabase.from('projects').select('festival_submissions').eq('id', projectId).maybeSingle(),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
  ]);
  check(sc, cr, tk, bd, tl, scn, cn, pf, pr, cp);
  const tasks = tk.data ?? [];
  const scenes = scn.data ?? [];
  const festivals = pr.data?.festival_submissions;
  return {
    scripts: sc.data?.length ?? 0,
    // Each scene's length is "n/8".
    eighths: scenes.reduce((n, row) => n + (Number(String(row.est_duration || '').match(/(\d+)\s*\/\s*8/)?.[1]) || 0), 0),
    scenes: scenes.length,
    crew: (cr.data ?? []).map((c) => ({ id: c.user_id, name: c.profiles?.username || 'Crew', role: c.craft || (c.role === 'lead' ? 'Lead' : 'Crew') })),
    tasks: tasks.length,
    tasksDone: tasks.filter((t) => t.completed).length,
    budget: (bd.data ?? []).reduce((n, x) => n + Number(x.amount || 0), 0),
    milestones: tl.data ?? [],
    concepts: cn.count ?? 0,
    portfolio: pf.data ?? [],
    festivals: (Array.isArray(festivals) ? festivals : []) as { status?: string }[],
    campaigns: cp.count ?? 0,
  };
}

export interface ProductionData {
  tasks: TaskRow[];
  budget: BudgetRow[];
  timeline: TimelineRow[];
  crew: CrewRow[];
  portfolio: PortfolioRow[];
  settings: ProjectSettings | null;
  festivals: FestivalRow[];
  /** The owner, who can be given tasks too; null when their profile is gone. */
  owner: { id: string; username: string } | null;
}

/** Everything the production manager shows, in one round. */
export async function getProductionData(projectId: string): Promise<ProductionData> {
  const [t, b, tl, c, pf, proj] = await Promise.all([
    supabase.from('project_tasks').select('id,title,completed,assigned_to,due_date').eq('project_id', projectId).order('created_at'),
    supabase.from('budget_items').select('id,category,amount,actual_cost').eq('project_id', projectId).order('created_at'),
    supabase.from('timeline_items').select('id,title,start_date,end_date').eq('project_id', projectId).order('start_date', { nullsFirst: true }),
    supabase.from('project_crew').select('id,user_id,role,craft,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId),
    supabase.from('portfolio_projects').select('id,title,share_token').eq('source_project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('projects').select('settings,festival_submissions,creator_id').eq('id', projectId).maybeSingle(),
  ]);
  check(t, b, tl, c, pf, proj);
  let owner: ProductionData['owner'] = null;
  if (proj.data?.creator_id) {
    const { data, error } = await supabase.from('profiles').select('id,username').eq('id', proj.data.creator_id).maybeSingle();
    if (error) throw error;
    owner = data ? { id: data.id, username: data.username } : null;
  }
  return {
    tasks: (t.data ?? []) as TaskRow[],
    budget: (b.data ?? []) as BudgetRow[],
    timeline: (tl.data ?? []) as TimelineRow[],
    crew: (c.data ?? []) as unknown as CrewRow[],
    portfolio: (pf.data ?? []) as PortfolioRow[],
    settings: (proj.data?.settings as unknown as ProjectSettings | null) ?? null,
    festivals: (proj.data?.festival_submissions as unknown as FestivalRow[] | null) ?? [],
    owner,
  };
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function addTask(projectId: string, title: string): Promise<TaskRow> {
  const { data, error } = await supabase.from('project_tasks')
    .insert({ project_id: projectId, title }).select('id,title,completed,assigned_to,due_date').single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(id: string, patch: Partial<Pick<TaskRow, 'completed' | 'assigned_to' | 'due_date'>>): Promise<void> {
  const { error } = await supabase.from('project_tasks').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('project_tasks').delete().eq('id', id);
  if (error) throw error;
}

// ── Budget ───────────────────────────────────────────────────────────────────

export async function addBudgetItem(projectId: string, userId: string | null, category: string, amount: number): Promise<BudgetRow> {
  const { data, error } = await supabase.from('budget_items')
    .insert({ project_id: projectId, category, amount, created_by: userId }).select('id,category,amount').single();
  if (error) throw error;
  return data as BudgetRow;
}

export async function setBudgetActual(id: string, actual: number | null): Promise<void> {
  const { error } = await supabase.from('budget_items').update({ actual_cost: actual }).eq('id', id);
  if (error) throw error;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from('budget_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Milestones ───────────────────────────────────────────────────────────────

export async function addMilestone(projectId: string, userId: string | null, title: string, start: string, end: string): Promise<TimelineRow> {
  const { data, error } = await supabase.from('timeline_items')
    .insert({ project_id: projectId, title, start_date: start || null, end_date: end || null, created_by: userId })
    .select('id,title,start_date,end_date').single();
  if (error) throw error;
  return data as TimelineRow;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('timeline_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Crew ─────────────────────────────────────────────────────────────────────

/** Adds someone to the crew by username; 'no-user' when there's no such person. */
export async function addCrewByUsername(projectId: string, username: string, craft: string | null): Promise<'added' | 'no-user'> {
  const { data: prof, error: pErr } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle();
  if (pErr) throw pErr;
  if (!prof) return 'no-user';
  const { error } = await supabase.from('project_crew').insert({ project_id: projectId, user_id: prof.id, craft });
  if (error) throw error;
  return 'added';
}

export async function removeCrewRow(id: string): Promise<void> {
  const { error } = await supabase.from('project_crew').delete().eq('id', id);
  if (error) throw error;
}

// ── The project row's own lists ──────────────────────────────────────────────

export async function saveProjectSettings(projectId: string, settings: ProjectSettings): Promise<void> {
  const { error } = await supabase.from('projects').update({ settings: settings as unknown as Json }).eq('id', projectId);
  if (error) throw error;
}

/** Festivals live in one jsonb column: this writes the whole list. */
export async function saveFestivals(projectId: string, festivals: FestivalRow[]): Promise<void> {
  const { error } = await supabase.from('projects').update({ festival_submissions: festivals as unknown as Json }).eq('id', projectId);
  if (error) throw error;
}

export type FeedKind = 'scene' | 'budget' | 'milestone' | 'crew' | 'reference' | 'note';
export interface FeedItem { kind: FeedKind; label: string; t: string }

/** The latest things added to a project (scenes, budget, milestones, crew, references, script notes), newest first. */
export async function getProductionFeed(projectId: string, limit = 8): Promise<FeedItem[]> {
  const [sc, bd, tl, cr, ca, sn] = await Promise.all([
    supabase.from('scenes').select('title,created_at').eq('project_id', projectId).is('removed_at', null).order('created_at', { ascending: false }).limit(4),
    supabase.from('budget_items').select('category,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
    supabase.from('timeline_items').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
    supabase.from('project_crew').select('role,craft,created_at,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
    supabase.from('media').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
    supabase.from('script_annotations').select('type,text,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
  ]);
  check(sc, bd, tl, cr, ca, sn);
  const items: FeedItem[] = [
    ...(sc.data ?? []).map((x) => ({ kind: 'scene' as const, label: `Scene — ${x.title}`, t: x.created_at ?? '' })),
    ...(bd.data ?? []).map((x) => ({ kind: 'budget' as const, label: `Budget — ${x.category}`, t: x.created_at ?? '' })),
    ...(tl.data ?? []).map((x) => ({ kind: 'milestone' as const, label: `Milestone — ${x.title}`, t: x.created_at ?? '' })),
    ...(cr.data ?? []).map((x) => ({ kind: 'crew' as const, label: `Crew — ${x.profiles?.username || 'member'}`, t: x.created_at ?? '' })),
    ...(ca.data ?? []).map((x) => ({ kind: 'reference' as const, label: `Reference — ${x.title || 'untitled'}`, t: x.created_at ?? '' })),
    ...(sn.data ?? []).map((x) => ({ kind: 'note' as const, label: `Script ${x.type} — "${x.text}"`, t: x.created_at ?? '' })),
  ];
  return items.sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()).slice(0, limit);
}
