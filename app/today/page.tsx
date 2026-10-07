'use client';

// Today: the suite on the go. Not the desktop squeezed — what someone needs
// between places: the next days on set with their own call and the address a
// tap from maps, what's theirs to do (tick it off here), what's unread in the
// Lounge, what changed (updates), and a one-tap way into each project's
// script, Studio and schedule. Everything comes from what the suite already
// holds, so it's the same work the desk sees.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Circle, Clapperboard, Clock, FileText, LayoutGrid, MapPin, MessageSquare, CalendarDays, CheckSquare, CloudSun, Search } from 'lucide-react';
import { getTodayWork, nameUnread, type TodaySheet, type TodayTask } from '@/lib/supabase/today';
import { updateTask } from '@/lib/supabase/project-hub';
import { useCurrentUser, useOSGate, useProject, mapStatusToPhase, PHASES } from '@/lib/os';
import { useToast } from '@/components/Toast';
import { fetchNotifications, markRead, type Notification } from '@/lib/supabase/notifications';
import { getLoungeUnread, type LoungeUnread } from '@/lib/supabase/messages';
import { clock, dayLabel, daysUntil, dueLabel, greeting, localDay, mapsHref, nextShootDays, openTasks, urgency } from '@/lib/today/core';
import { readable } from '@/lib/color';
import { ContinueOffer } from '@/components/mobile/Continue';
import t from './today.module.css';

type Sheet = TodaySheet;
type Task = TodayTask;
interface Unread { key: string; label: string; href: string; count: number }

export default function TodayPage() {
  const { isLoading, user } = useOSGate();
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

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  // Gathers the day, then shows it in one go.
  const load = useCallback(() => {
    if (!user) return Promise.resolve();
    return (async () => {
      const [work, un, notes] = await Promise.all([
        getTodayWork(user.id, projectIds, today),
        getLoungeUnread().catch((): LoungeUnread => ({ channels: {}, people: {} })),
        fetchNotifications(user.id, 8).catch(() => [] as Notification[]),
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
      return { work, notes, rows };
    })().then(({ work, notes, rows }) => {
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
  }, [user, projectIds, today, projectById, toast]);

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

  const openUpdate = async (n: Notification) => {
    if (!n.read) { setUpdates((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))); void markRead(n.id); }
    if (n.link) router.push(n.link);
  };

  if (isLoading || !user) return <main className={t.page} aria-busy="true"><div className={t.skeleton} /><div className={t.skeleton} /></main>;

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
          <h1 className={t.hello}>{greeting(now.getHours())}{name ? `, ${name}` : ''}</h1>
        </div>
        <button type="button" className={t.search} onClick={() => window.dispatchEvent(new Event('mc-open-command-palette'))} aria-label="Search everything">
          <Search size={18} aria-hidden />
        </button>
      </header>

      <ContinueOffer inline className={t.wide} />

      <section className={`${t.card} ${t.wide}`} aria-labelledby="today-set">
        <div className={t.cardHead}><h2 id="today-set" className={t.cardTitle}><Clapperboard size={14} aria-hidden /> On set</h2></div>
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
                  <button type="button" className={t.btn} onClick={() => void goTo(d.project_id, schedule)}>Call sheet</button>
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
                  <button type="button" className={t.check} onClick={() => void complete(task)} aria-label={`Mark done: ${task.title}`}><Circle size={20} aria-hidden /></button>
                  <Link href={`/projects/${task.project_id}`} className={t.taskText}>
                    <span className={t.taskTitle}>{task.title}</span>
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
