'use client';

// Your day (it was the Today page; now the first section of Community): the suite on the go. Not the desktop squeezed — what someone needs
// between places: the next days on set with their own call and the address a
// tap from maps, what's theirs to do (tick it off here), what's unread in the
// Lounge, what changed (updates), and a one-tap way into each project's
// script, Studio and schedule. Everything comes from what the suite already
// holds, so it's the same work the desk sees.

import { plain } from '@/lib/film/mentions';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Circle, UserPlus, BadgeCheck, Clapperboard, Clock, FileText, LayoutGrid, MapPin, MessageSquare, CalendarDays, CheckSquare, CloudSun, Search } from 'lucide-react';
import { RoleSentence } from '@/components/roles/RoleSentence';
import { getMyRoles, loadCapabilityCatalog, describeRole } from '@/lib/roles/capabilities';
import { openableViews, toolkitFor } from '@/lib/roles/toolkit';
import { loadCrafts } from '@/lib/crafts/crafts';
import { PRODUCTION_VIEW_LABELS } from '@/lib/os/progress';
import { getMyInvitations, respondToInvitation, type CrewInvitation } from '@/lib/supabase/crew-management';
import { getTodayWork, getOwnerData, getDirectorDay, nameUnread, type TodaySheet, type TodayTask } from '@/lib/supabase/today';
import { ownerRows, type OwnerData } from '@/lib/today/owner';
import { dayGlance, isDirectionCraft, type DayGlance } from '@/lib/today/director';
import { updateTask } from '@/lib/supabase/project-hub';
import { useCurrentUser, useOSGate, useProject, mapStatusToPhase, PHASES, osAdoptSession } from '@/lib/os';
import { useToast } from '@/components/ui/Toast';
import { fetchNotifications, markRead, type Notification } from '@/lib/supabase/notifications';
import { getLoungeUnread, type LoungeUnread } from '@/lib/supabase/messages';
import { clock, dayLabel, daysUntil, dueLabel, greeting, localDay, mapsHref, nextShootDays, openTasks, urgency } from '@/lib/today/core';
import { readable } from '@/lib/util/color';
import { ContinueOffer } from '@/components/mobile/Continue';
import { InstallHint } from '@/components/mobile/InstallHint';
import t from './yourDay.module.css';

type Sheet = TodaySheet;
type Task = TodayTask;
interface Unread { key: string; label: string; href: string; count: number }

/** What needs the owner on one of their projects: unanswered crew, overdue tasks, the next shoot day. */
function OwnerFlags({ row, today }: { row: import('@/lib/today/owner').OwnerRow; today: string }) {
  const flags: { text: string; warn: boolean }[] = [];
  if (row.pendingCrew) flags.push({ text: `${row.pendingCrew} ${row.pendingCrew === 1 ? 'invite' : 'invites'} unanswered`, warn: true });
  if (row.overdueTasks) flags.push({ text: `${row.overdueTasks} ${row.overdueTasks === 1 ? 'task' : 'tasks'} overdue`, warn: true });
  if (row.next) flags.push({ text: `Day ${row.next.day} · ${dayLabel(row.next.date, today)}${row.next.issued ? '' : ' · call sheet not issued'}`, warn: !row.next.issued && row.needsYou });
  if (!flags.length) return null;
  return (
    <ul aria-label={`${row.title}: what needs you`} style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {flags.map((f) => (
        <li key={f.text} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 9999, border: `1px solid ${f.warn ? 'var(--warn)' : 'rgba(var(--ink-rgb), 0.18)'}`, color: f.warn ? 'var(--warn)' : 'var(--fg-muted)' }}>{f.text}</li>
      ))}
    </ul>
  );
}

export function YourDay() {
  const { isLoading, user } = useOSGate();
  const userId = user?.id ?? null;
  const { user: profile } = useCurrentUser();
  const { projects, setActiveProject } = useProject();
  const router = useRouter();
  const { toast } = useToast();
  const today = localDay();
  const [loaded, setLoaded] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [myCalls, setMyCalls] = useState<Record<string, string | null>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unread, setUnread] = useState<Unread[]>([]);
  const [updates, setUpdates] = useState<Notification[]>([]);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [invites, setInvites] = useState<CrewInvitation[]>([]);
  const [roles, setRoles] = useState<Array<{ project_id: string; craft: string | null; tier: string; text: string; tools: Array<{ label: string; view: string }> }>>([]);
  const [glances, setGlances] = useState<Array<{ project_id: string; glance: DayGlance }>>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const profileCraft = (profile as { role?: string | null } | null)?.role ?? null;

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const ownerById = useMemo(() => new Map(ownerRows(projects.filter((p) => p.creator_id === user?.id).map((p) => ({ id: p.id, title: p.title, phase: p.status })), ownerData ?? { pendingCrew: [], openTasks: [], sheets: [] }, today).map((r) => [r.id, r])), [projects, user?.id, ownerData, today]);

  // Gathers the day, then shows it in one go.
  const load = useCallback(() => {
    if (!userId) return Promise.resolve();
    return (async () => {
      const ownedIds = projects.filter((p) => p.creator_id === userId).map((p) => p.id);
      const [work, un, notes, owner, invs, myRoles] = await Promise.all([
        getTodayWork(userId, projectIds, today),
        getLoungeUnread().catch((): LoungeUnread => ({ channels: {}, people: {} })),
        fetchNotifications(userId, 8).catch(() => [] as Notification[]),
        // A nicety for the owner: if it does not load, the cards simply show no flags.
        getOwnerData(ownedIds, today).catch((): OwnerData | null => null),
        // An open invitation is the one thing here someone is waiting on: if it does not load, say nothing rather than guess.
        getMyInvitations().catch((): CrewInvitation[] => []),
        // Your role on the projects you are crew on (not the ones you run): a nicety, so a failure shows none.
        (async () => {
          const crewOn = projects.filter((p) => p.creator_id !== userId).map((p) => p.id);
          const [mine, catalog, crafts] = await Promise.all([getMyRoles(userId, crewOn), loadCapabilityCatalog(), loadCrafts()]);
          const dept = new Map(crafts.map((c) => [c.name, c.department]));
          return mine.map((r) => {
            const held = new Set(r.held);
            // Their craft's own working suite (only the tools they may open), not a fixed list: a gaffer and an accountant differ.
            const tools = openableViews(toolkitFor(r.craft, r.craft ? dept.get(r.craft) : null), held).slice(0, 6).map((v) => ({ label: PRODUCTION_VIEW_LABELS[v], view: v }));
            return { project_id: r.project_id, craft: r.craft, tier: r.tier, text: describeRole({ craft: r.craft, tier: r.tier, held, defs: catalog.defs }).text, tools };
          });
        })().catch(() => []),
      ]);

      // Name what's unread: channels by name (and project), people by username.
      // (Unread is a nicety: if the names don't load, it's left out.)
      const named = await nameUnread(un).catch(() => ({ channels: [], people: [] }));
      const rows: Unread[] = [
        ...named.channels.map((c) => ({
          key: c.id, count: un.channels[c.id], href: `/lounge?channel=${c.id}`,
          label: `#${c.name}${c.project_id && projectById.get(c.project_id) ? ` · ${projectById.get(c.project_id)!.title}` : ''}`,
        })),
        ...named.people.map((p) => ({ key: p.id, count: un.people[p.id], href: `/lounge?dm=${p.id}`, label: `@${p.username}` })),
      ].sort((a, b) => b.count - a.count);
      // The director's day at a glance: the productions this person directs (a Direction craft on the crew, or their own profile's
      // craft on a production they run). A nicety: a project that does not load shows no card.
      const directing = Array.from(new Set([
        ...myRoles.filter((r) => isDirectionCraft(r.craft)).map((r) => r.project_id),
        ...(isDirectionCraft(profileCraft) ? ownedIds : []),
      ]));
      const glances = (await Promise.all(directing.map(async (id) => {
        const input = await getDirectorDay(id, today).catch(() => null);
        return input ? { project_id: id, glance: dayGlance(input) } : null;
      }))).filter((g): g is { project_id: string; glance: DayGlance } => !!g).sort((a, b) => (a.glance.date ?? '9') < (b.glance.date ?? '9') ? -1 : 1);
      return { work, notes, rows, owner, invs, myRoles, glances };
    })().then(({ work, notes, rows, owner, invs, myRoles, glances }) => {
      setGlances(glances);
      setOwnerData(owner);
      setInvites(invs);
      setRoles(myRoles);
      setSheets(work.sheets);
      setMyCalls(work.myCalls);
      setTasks(work.tasks);
      setUpdates(notes);
      setUnread(rows);
      setLoaded(true);
    }, (e) => {
      console.error('Failed to load Today:', e);
      toast('Could not load your days and tasks. Reload to try again.', 'error');
      setLoaded(true);
    });
  }, [userId, projects, projectIds, today, projectById, toast, profileCraft]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const again = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', again);
    return () => document.removeEventListener('visibilitychange', again);
  }, [load]);

  const goTo = async (projectId: string, href: string) => {
    const p = projectById.get(projectId);
    if (p) await setActiveProject(p);
    router.push(href);
  };

  const complete = async (task: Task) => {
    setTasks((list) => list.filter((x) => x.id !== task.id));
    try { await updateTask(task.id, { completed: true }); }
    catch { setTasks((list) => [...list, task]); toast('Could not tick that off', 'error'); return; }
    toast('Done', 'success');
  };

  const answer = async (inv: CrewInvitation, accept: boolean) => {
    setAnswering(inv.project_id);
    try {
      await respondToInvitation(inv.project_id, accept);
    } catch (e) {
      console.error('Could not answer the invitation:', e);
      toast('Could not send your answer. Try again.', 'error');
      setAnswering(null);
      return;
    }
    setInvites((l) => l.filter((x) => x.project_id !== inv.project_id));
    setAnswering(null);
    toast(accept ? `You joined “${inv.title}”` : 'Invitation declined', 'success');
    // The project is now theirs to open: load the list again so it appears.
    if (accept && user) osAdoptSession({ id: user.id, email: (profile as { email?: string | null } | null)?.email ?? null });
  };

  const openUpdate = async (n: Notification) => {
    if (!n.read) { setUpdates((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))); void markRead(n.id); }
    if (n.link) router.push(n.link);
  };

  if (isLoading || !user) return <div className={t.page} aria-busy="true"><div className={t.skeleton} /><div className={t.skeleton} /></div>;

  // Crew see the days that have been issued to them; the owner sees drafts too (marked).
  const days = nextShootDays(sheets.filter((d) => d.issued_at || projectById.get(d.project_id)?.creator_id === user.id), today, 3);
  const todo = openTasks(tasks, today).slice(0, 8);
  const now = new Date();
  const name = (profile as { username?: string } | null)?.username;

  return (
    <div className={t.page}>
      <header className={t.head}>
        <div>
          <p className={t.date}>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 className={t.hello}>{greeting(now.getHours())}{name ? `, ${name}` : ''}</h2>
        </div>
        <button type="button" className={t.search} onClick={() => window.dispatchEvent(new Event('mc-open-command-palette'))} aria-label="Search everything">
          <Search size={18} aria-hidden />
        </button>
      </header>

      <ContinueOffer inline className={t.wide} />
      <InstallHint className={t.wide} />

      {invites.length > 0 && (
        <section className={`${t.card} ${t.wide}`} aria-labelledby="today-invites">
          <div className={t.cardHead}><h2 id="today-invites" className={t.cardTitle}><UserPlus size={14} aria-hidden /> Invitations</h2></div>
          {invites.map((inv) => (
            <article key={inv.project_id} className={t.day} aria-label={`Invitation to ${inv.title}`}>
              <div className={t.dayBody}>
                <h3 className={t.dayTitle}>{inv.title}</h3>
                <div className={t.facts}>
                  <span className={t.fact}>
                    {inv.invited_by_name ? `${inv.invited_by_name} invited you` : 'You were invited'}
                    {inv.craft ? ` as ${inv.craft}` : ''}
                    {` · ${inv.role === 'viewer' ? 'view only' : inv.role === 'lead' ? 'lead access' : 'crew access'}`}
                  </span>
                </div>
                <RoleSentence craft={inv.craft} tier={inv.role} label={`What you would be able to do on ${inv.title}`} />
                <div className={t.actions}>
                  <button type="button" className={`${t.btn} ${t.primary}`} disabled={answering === inv.project_id} onClick={() => void answer(inv, true)}>Accept</button>
                  <button type="button" className={t.btn} disabled={answering === inv.project_id} onClick={() => void answer(inv, false)}>Decline</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {roles.length > 0 && (
        <section className={`${t.card} ${t.wide}`} aria-labelledby="today-roles">
          <div className={t.cardHead}><h2 id="today-roles" className={t.cardTitle}><BadgeCheck size={14} aria-hidden /> Your role</h2></div>
          {roles.map((r) => (
            <article key={r.project_id} className={t.day} aria-label={`Your role on ${projectById.get(r.project_id)?.title ?? 'a project'}`}>
              <div className={t.dayBody}>
                <h3 className={t.dayTitle}>{projectById.get(r.project_id)?.title ?? 'A project'}</h3>
                <p className={t.empty} style={{ margin: '4px 0 0' }}>{r.text}</p>
                {r.tools.length > 0 && (
                  <div className={t.actions}>
                    {r.tools.map((tool) => (
                      <button key={tool.view} type="button" className={t.btn} onClick={() => void goTo(r.project_id, `/studio?tab=production&view=${tool.view}`)}>{tool.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {glances.length > 0 && (
        <section className={`${t.card} ${t.wide}`} aria-labelledby="today-director">
          <div className={t.cardHead}><h2 id="today-director" className={t.cardTitle}><Clapperboard size={14} aria-hidden /> The day at a glance</h2></div>
          {glances.map(({ project_id, glance: g }) => (
            <article key={project_id} className={t.day} aria-label={`${projectById.get(project_id)?.title ?? 'Project'}, day ${g.day} at a glance`}>
              <div className={t.dayBody}>
                <h3 className={t.dayTitle}>{projectById.get(project_id)?.title ?? 'A project'} · Day {g.day}{g.date ? ` · ${dayLabel(g.date, today)}` : ''}</h3>
                <div className={t.facts}>
                  <span className={t.fact}>{g.scenes.length} scene{g.scenes.length === 1 ? '' : 's'}</span>
                  <span className={t.fact}>{g.shots} shot{g.shots === 1 ? '' : 's'} planned</span>
                  {g.sheet?.general_call && <span className={t.fact}><Clock size={13} aria-hidden /> Crew call {clock(g.sheet.general_call)}</span>}
                  {g.sheet?.weather && <span className={t.fact}><CloudSun size={13} aria-hidden /> {g.sheet.weather}</span>}
                </div>
                {g.attention.length > 0
                  ? <ul aria-label="Needs you before the day">{g.attention.map((a) => <li key={a} className={t.draft}>{a}</li>)}</ul>
                  : <p className={t.empty}>Nothing needs you before this day.</p>}
                <ol aria-label="Scenes on this day">
                  {g.scenes.map((sc) => (
                    <li key={sc.id}>
                      <strong>{sc.scene_number}. {sc.title}</strong>
                      <span className={t.fact}> {[sc.location, sc.cast.join(', '), `${sc.shots} shot${sc.shots === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</span>
                      {sc.flags.length > 0 && <span className={t.draft}> {sc.flags.join(' · ')}</span>}
                    </li>
                  ))}
                </ol>
                <div className={t.actions}>
                  <button type="button" className={t.btn} onClick={() => void goTo(project_id, '/studio?tab=production&view=shots')}>Shot list</button>
                  <button type="button" className={t.btn} onClick={() => void goTo(project_id, '/studio?tab=production&view=schedule')}>Schedule</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className={`${t.card} ${t.wide}`} aria-labelledby="today-set">
        <div className={t.cardHead}><h2 id="today-set" className={t.cardTitle}><Clapperboard size={14} aria-hidden /> On set</h2><Link className={t.btn} href="/call">All my calls</Link></div>
        {!loaded ? <div className={t.skeleton} /> : days.length === 0 ? (
          <p className={t.empty}>No shoot days coming up. When a call sheet has a date, it shows here — with your call and the way there.</p>
        ) : days.map((d) => {
          const p = projectById.get(d.project_id);
          const mine = myCalls[d.id];
          const isToday = daysUntil(d.shoot_date!, today) === 0;
          const schedule = '/studio?tab=production&view=schedule';
          return (
            <article key={d.id} className={`${t.day} ${isToday ? t.dayNow : ''}`} aria-label={`${p?.title ?? 'Project'}, day ${d.shoot_day}, ${dayLabel(d.shoot_date!, today)}`}>
              <div className={t.when}>
                <span className={t.whenLabel}>{dayLabel(d.shoot_date!, today)}</span>
                <span className={t.whenTime}>{clock(mine) ?? clock(d.general_call) ?? '—'}</span>
                <span className={t.whenLabel}>{mine ? 'your call' : 'call'}</span>
              </div>
              <div className={t.dayBody}>
                <h3 className={t.dayTitle}>{p?.title ?? 'A project'} · Day {d.shoot_day}</h3>
                <div className={t.facts}>
                  {d.general_call && <span className={t.fact}><Clock size={13} aria-hidden /> Crew call {clock(d.general_call)}</span>}
                  {mine && <span className={`${t.fact} ${t.mine}`}>You: {clock(mine)}</span>}
                  {d.weather && <span className={t.fact}><CloudSun size={13} aria-hidden /> {d.weather}</span>}
                  {!d.issued_at && <span className={t.draft}>Not issued yet</span>}
                </div>
                <div className={t.actions}>
                  {d.location_address && (
                    <a className={t.btn} href={mapsHref(d.location_address)} target="_blank" rel="noopener noreferrer"><MapPin size={15} aria-hidden /> {d.location_address.length > 26 ? 'Directions' : d.location_address}</a>
                  )}
                  {isToday && <button type="button" className={`${t.btn} ${t.primary}`} onClick={() => void goTo(d.project_id, '/studio?tab=production&view=onset')}>Open On Set</button>}
                  {p?.creator_id === user.id
                    ? <button type="button" className={t.btn} onClick={() => void goTo(d.project_id, schedule)}>Call sheet</button>
                    : <Link className={t.btn} href={`/call/${d.id}`}>{mine ? 'My call' : 'Call sheet'}</Link>}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className={t.card} aria-labelledby="today-tasks">
        <div className={t.cardHead}><h2 id="today-tasks" className={t.cardTitle}><CheckSquare size={14} aria-hidden /> Yours to do</h2></div>
        {!loaded ? <div className={t.skeleton} /> : todo.length === 0 ? (
          <p className={t.empty}>Nothing assigned to you. Tasks given to you on a project page land here.</p>
        ) : (
          <ul className={t.tasks}>
            {todo.map((task) => {
              const u = urgency(task.due_date, today);
              const p = projectById.get(task.project_id);
              return (
                <li key={task.id} className={t.task}>
                  <button type="button" className={t.check} onClick={() => void complete(task)} aria-label={`Mark done: ${plain(task.title)}`}><Circle size={20} aria-hidden /></button>
                  <Link href={`/projects/${task.project_id}`} className={t.taskText}>
                    <span className={t.taskTitle}>{plain(task.title)}</span>
                    <span className={`${t.taskMeta} ${u === 'overdue' ? t.overdue : u === 'today' ? t.dueToday : ''}`}>
                      {[p?.title, dueLabel(task.due_date, today)].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${t.card} ${t.tall}`} aria-labelledby="today-lounge">
        <div className={t.cardHead}>
          <h2 id="today-lounge" className={t.cardTitle}><MessageSquare size={14} aria-hidden /> Lounge</h2>
          <Link href="/lounge" className={t.more}>Open</Link>
        </div>
        {!loaded ? <div className={t.skeleton} /> : unread.length === 0 ? (
          <p className={t.empty}>You’re caught up.</p>
        ) : (
          <ul className={t.rows}>
            {unread.slice(0, 6).map((u) => (
              <li key={u.key}><Link href={u.href} className={`${t.rowLink} ${t.unreadRow}`}>{u.label}<span className={t.count} aria-label={`${u.count} unread`}>{u.count}</span></Link></li>
            ))}
          </ul>
        )}
      </section>

      <section id="updates" className={t.card} aria-labelledby="today-updates">
        <div className={t.cardHead}><h2 id="today-updates" className={t.cardTitle}><Bell size={14} aria-hidden /> Updates</h2></div>
        {!loaded ? <div className={t.skeleton} /> : updates.length === 0 ? (
          <p className={t.empty}>No updates yet — call sheets, applications, replies and mentions arrive here.</p>
        ) : (
          <ul className={t.rows}>
            {updates.map((n) => (
              <li key={n.id}>
                <button type="button" className={t.rowLink} onClick={() => void openUpdate(n)}>
                  <span className={`${t.pip} ${n.read ? t.pipRead : ''}`} aria-label={n.read ? 'Read' : 'New'} />
                  <span className={t.note}><span className={t.noteTitle}>{n.title}</span>{n.body && <span className={t.noteBody}>{n.body}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${t.card} ${t.wide}`} aria-labelledby="today-projects">
        <div className={t.cardHead}>
          <h2 id="today-projects" className={t.cardTitle}><CalendarDays size={14} aria-hidden /> Your projects</h2>
          <Link href="/projects" className={t.more}>All</Link>
        </div>
        {projects.length === 0 ? (
          <p className={t.empty}>No projects yet. <Link href="/projects">Start one</Link> — it can begin as a single idea.</p>
        ) : (
          <div className={t.projects}>
            {projects.slice(0, 6).map((p) => {
              const phase = PHASES.find((x) => x.id === mapStatusToPhase(p.status));
              return (
                <div key={p.id} className={t.project}>
                  <Link href={`/projects/${p.id}`} className={t.projectHead}>
                    <span className={t.dot} style={{ background: p.accent_color || 'var(--accent)' }} aria-hidden />
                    <span style={{ minWidth: 0 }}>
                      <span className={t.projectTitle} style={{ display: 'block', color: readable(p.accent_color || '#e8431a') }}>{p.title}</span>
                      <span className={t.phase}>{phase?.label ?? p.status}</span>
                    </span>
                  </Link>
                  {ownerById.get(p.id) && <OwnerFlags row={ownerById.get(p.id)!} today={today} />}
                  <div className={t.jump}>
                    <button type="button" className={t.jumpBtn} onClick={() => void goTo(p.id, '/editor')}><FileText size={17} aria-hidden /> Script</button>
                    <button type="button" className={t.jumpBtn} onClick={() => void goTo(p.id, '/studio')}><LayoutGrid size={17} aria-hidden /> Studio</button>
                    <button type="button" className={t.jumpBtn} onClick={() => void goTo(p.id, '/studio?tab=production&view=schedule')}><CalendarDays size={17} aria-hidden /> Schedule</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
