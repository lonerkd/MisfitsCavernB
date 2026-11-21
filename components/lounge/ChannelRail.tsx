'use client';

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Hash, Lock, Settings as SettingsIcon, Volume2, Globe, Shield, Crown, ArrowUp, ArrowDown, UserCheck, ChevronDown, ChevronRight, BookOpen, Megaphone, Search, Plus } from 'lucide-react';
import { audienceLabel, groupChannels } from '@/lib/lounge/audience';
import { RAIL_AREAS, sumUnread, unreadLabel, type RailArea } from '@/lib/lounge/rail';
import Link from 'next/link';
import { type Channel } from '@/lib/supabase/channels';
import { findPeopleByName } from '@/lib/supabase/profiles';
import Avatar from '@/components/ui/Avatar';
import { useDeviceValue, writeDeviceValue } from '@/lib/hooks/useDeviceValue';
import { useHubUnread } from '@/components/hub/useHubUnread';
import { useVoiceCall } from '@/lib/webrtc/VoiceCall';
import type { Lounge } from '@/components/lounge/useLounge';

const MONO = 'max(9px, var(--mc-min-font, 0px))';
const AUD_ICON: Record<string, typeof Hash> = { public: Globe, admins: Shield, owners: Crown, above: ArrowUp, below: ArrowDown, guests: UserCheck };

/** The count on a row or a section: a pill in the Lounge's colour. Its words are on the row's own label. */
function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span aria-hidden className="mc-lounge-count" style={{ marginLeft: 'auto', flexShrink: 0, minWidth: 16, padding: '0 5px', borderRadius: 9999, background: 'var(--lounge-color)', color: 'var(--on-accent)', fontSize: MONO, fontWeight: 700, lineHeight: '15px', textAlign: 'center' }}>{unreadLabel(n)}</span>;
}

/** A labelled, collapsible area of the rail. Open or shut is remembered on this device; a shut area still shows what is unread in it. */
function Section({ area, unread, action, children }: { area: RailArea; unread: number; action?: ReactNode; children: ReactNode }) {
  const meta = RAIL_AREAS.find((a) => a.id === area)!;
  const bodyId = useId();
  const shut = useDeviceValue(`mc.lounge.rail.${area}`) === 'shut';
  const Chevron = shut ? ChevronRight : ChevronDown;
  return (
    <section className="mc-lounge-section" data-area={area} aria-label={meta.label} style={{ marginBottom: 14 }}>
      <div className="mc-lounge-sechead" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" aria-expanded={!shut} aria-controls={bodyId} title={meta.purpose}
          aria-label={unread > 0 ? `${meta.label}, ${unread} unread` : meta.label}
          onClick={() => writeDeviceValue(`mc.lounge.rail.${area}`, shut ? null : 'shut')}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', fontFamily: 'var(--mono)', fontSize: MONO, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', textAlign: 'left' }}>
          <Chevron size={12} aria-hidden style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</span>
          <Count n={unread} />
        </button>
        {action}
      </div>
      <div id={bodyId} hidden={shut} style={{ display: shut ? 'none' : 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>{children}</div>
    </section>
  );
}

const noteStyle: CSSProperties = { fontSize: 'max(10.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', fontFamily: 'var(--mono)', lineHeight: 1.6, padding: '2px 8px' };

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="mc-lounge-add" aria-label={label} title={label} onClick={onClick}
      style={{ background: 'none', border: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', padding: 0, minWidth: 32, minHeight: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Plus size={14} aria-hidden />
    </button>
  );
}

/** A voice room's row shows who is in it while you are: the call is peer to peer, so the room is only visible from inside. */
function InRoom({ channel }: { channel: Channel }) {
  const call = useVoiceCall();
  if (call.channel?.id !== channel.id) return null;
  const n = call.peers.length + 1;
  return <span className="mc-lounge-inroom" style={{ marginLeft: 'auto', flexShrink: 0, fontSize: MONO, color: 'var(--ok)' }} aria-label={`You are in this room with ${call.peers.length} other${call.peers.length === 1 ? '' : 's'}`}>● {n} in</span>;
}

function ChannelRow({ ch, active, n, onOpen }: { ch: Channel; active: boolean; n: number; onOpen: (c: Channel) => void }) {
  const Icon = ch.type === 'voice' ? Volume2 : ch.is_private ? Lock : AUD_ICON[ch.audience] ?? Hash;
  const who = ch.audience === 'users' || ch.audience === 'team' ? undefined : audienceLabel(ch.audience);
  const announce = ch.type !== 'voice' && ch.post_policy === 'managers';
  const state = [ch.type === 'voice' ? 'voice room' : null, ch.is_private ? 'invite only' : null, announce ? 'announcements, only managers post' : null].filter(Boolean).join(', ');
  return (
    <button type="button" className="mc-lounge-row" data-active={active || undefined} data-unread={n > 0 || undefined}
      title={[who, ch.is_private ? 'Invite-only' : null, announce ? 'Announcements: only managers post' : null, ch.topic].filter(Boolean).join(' · ') || undefined}
      aria-current={active ? 'true' : undefined}
      aria-label={`${ch.name}${state ? `, ${state}` : ''}${n > 0 ? `, ${unreadLabel(n)} unread` : ''}`}
      onClick={() => onOpen(ch)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: active ? 'var(--accent-dim)' : 'transparent', border: 'none', color: active || n > 0 ? 'var(--fg-strong)' : 'var(--fg-dim)', fontWeight: n > 0 ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
      <Icon size={12} aria-hidden color={active ? 'var(--accent)' : n > 0 ? 'var(--ok)' : 'var(--fg-dim)'} style={{ flexShrink: 0 }} />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{ch.name}</span>
      {announce && <Megaphone size={11} aria-hidden color="var(--warn)" style={{ flexShrink: 0 }} />}
      {ch.type === 'voice' && <InRoom channel={ch} />}
      <Count n={n} />
    </button>
  );
}

/** Find someone by name and open a conversation with them: how a first direct message starts. */
function PeopleFinder({ l }: { l: Lounge }) {
  const { openDM, currentUser, toast } = l;
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<{ q: string; people: { id: string; username: string }[] } | null>(null);
  const text = q.trim();
  const live = text.replace(/[^\p{L}\p{N}]+/gu, '').length >= 2;
  useEffect(() => {
    if (!live) return;
    let alive = true;
    const t = setTimeout(() => {
      findPeopleByName(text)
        .then((people) => { if (alive) setAnswer({ q: text, people }); })
        .catch(() => { if (alive) { setAnswer({ q: text, people: [] }); toast('Could not search for people.', 'error'); } });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [live, text, toast]);
  const people = live && answer?.q === text ? answer.people.filter((p) => p.id !== currentUser?.id) : null;
  return (
    <div style={{ padding: '0 2px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', minHeight: 36, borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--ink-rgb), 0.08)', background: 'rgba(var(--ink-rgb), 0.03)' }}>
        <Search size={12} aria-hidden color="var(--fg-dim)" style={{ flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find someone to message" placeholder="Find someone to message"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 0' }} />
      </label>
      {live && (
        <div role="group" aria-label="People found" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          {people === null && <div style={noteStyle}>Searching…</div>}
          {people?.length === 0 && <div style={noteStyle}>No one called “{text}”.</div>}
          {people?.map((p) => (
            <button key={p.id} type="button" className="mc-lounge-row" aria-label={`Message ${p.username}`}
              onClick={() => { openDM({ id: p.id, name: p.username }); setQ(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
              <Avatar name={p.username} size={20} radius={5} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChannelRail({ l }: { l: Lounge }) {
  const { activeProject, channels, activeChannel, setShowNewChannel, isAdmin, dmTarget, currentUser, myProfile, openChannel, openDM, ownsActive, suggested, addPreset, unreadOf, unreadFrom, dmPeople, onlineIds } = l;
  const hubUnread = useHubUnread();
  const groups = groupChannels(channels, activeProject?.id ?? null);
  // Voice rooms sit under the text channels, so the production's rooms read as a group of their own.
  const project = [...groups.project.filter((c) => c.type !== 'voice'), ...groups.project.filter((c) => c.type === 'voice')];
  const open = (c: Channel) => <ChannelRow key={c.id} ch={c} active={activeChannel?.id === c.id && !dmTarget} n={unreadOf(c.id)} onOpen={openChannel} />;
  const productionsUnread = sumUnread([...groups.project, ...groups.open].map((c) => c.id), unreadOf);
  const communityUnread = sumUnread(groups.community.map((c) => c.id), unreadOf);
  const peopleUnread = l.unreadPeopleTotal;

  return (
    <div className="mc-lounge-channels" style={{ width: 220, background: 'var(--bg-2)', borderRight: '1px solid rgba(var(--ink-rgb), 0.04)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Pinned above the areas: the hub is where What's new and Learn live, and it is one tap from anywhere in the rail. */}
      <Link href="/hub" className="mc-lounge-row mc-lounge-hublink"
        style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 12px 0', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'var(--fg-strong)', textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0 }}>
        <BookOpen size={13} aria-hidden color="var(--accent)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Learn / What’s new</span>
        <Count n={hubUnread} />
        {hubUnread > 0 && <span className="sr-only">, {unreadLabel(hubUnread)} unread</span>}
      </Link>

      <div className="mc-lounge-rail-scroll" style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        <Section area="productions" unread={productionsUnread} action={activeProject && ownsActive ? <AddButton label="New channel" onClick={() => setShowNewChannel('project')} /> : undefined}>
          {!activeProject ? (
            <div style={{ ...noteStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span>Productions are your projects. Each has its own channels and a voice room for the people on it. Start or join one and its channels appear here.</span>
              <Link href="/projects" className="mc-lounge-row" style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-strong)', textDecoration: 'none', width: 'fit-content' }}>Go to Projects</Link>
            </div>
          ) : (
            <>
              <div style={{ ...noteStyle, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={activeProject.title}>{activeProject.title}</div>
              {project.length === 0 && <div style={noteStyle}>No channels yet.{ownsActive ? ' Add one with +.' : ' Whoever runs the production opens them.'}</div>}
              {project.map(open)}
              {suggested.length > 0 && (
                <div style={{ marginTop: 8 }} aria-label="Suggested channels" role="group">
                  <div style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', padding: '0 8px', marginBottom: 6 }}>Suggested for this phase</div>
                  {suggested.map((p) => (
                    <button key={p.key} type="button" className="mc-lounge-row" onClick={() => void addPreset(p)} title={`${p.why} ${p.topic}`.trim()}
                      aria-label={`${p.type === 'voice' ? 'Voice room ' : ''}#${p.name} ${audienceLabel(p.audience)}, add this channel`}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 4, background: 'transparent', border: '1px dashed rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'left', marginBottom: 4 }}>
                      <span aria-hidden style={{ color: 'var(--accent)' }}>+</span>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.type === 'voice' ? '🔊 ' : '#'}{p.name}</span>{' '}
                      <span style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{audienceLabel(p.audience)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {groups.open.length > 0 && (
            <>
              <div style={{ ...noteStyle, color: 'var(--fg-subtle)', marginTop: 8 }}>Other productions</div>
              {groups.open.map(open)}
            </>
          )}
        </Section>

        <Section area="community" unread={communityUnread} action={isAdmin ? <AddButton label="New community channel" onClick={() => setShowNewChannel('community')} /> : undefined}>
          {groups.community.length === 0 && <div style={noteStyle}>No community channels yet.{isAdmin ? ' Add one with +.' : ''}</div>}
          {groups.community.map(open)}
        </Section>

        <Section area="people" unread={peopleUnread}>
          <PeopleFinder l={l} />
          {dmPeople.length === 0 && <div style={noteStyle}>No direct messages yet. Find someone above to start one, or pick a crew member.</div>}
          {dmPeople.map((p) => {
            const n = unreadFrom(p.id);
            const active = dmTarget?.id === p.id;
            return (
              <button key={p.id} type="button" className="mc-lounge-row" data-active={active || undefined} data-unread={n > 0 || undefined} aria-current={active ? 'true' : undefined}
                aria-label={`${p.name}${onlineIds.has(p.id) ? ', online' : ''}${n > 0 ? `, ${unreadLabel(n)} unread` : ''}`}
                onClick={() => openDM(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: active ? 'var(--accent-dim)' : 'transparent', border: 'none', color: active || n > 0 ? 'var(--fg-strong)' : 'var(--fg-dim)', fontWeight: n > 0 ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
                <span style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
                  <Avatar name={p.name} size={20} radius={5} />
                  {onlineIds.has(p.id) && <span aria-hidden style={{ position: 'absolute', right: -2, bottom: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)', border: '1.5px solid var(--bg-2)' }} />}
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{p.name}</span>
                <Count n={n} />
              </button>
            );
          })}
        </Section>
      </div>

      <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid rgba(var(--ink-rgb), 0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar src={myProfile?.avatar_url} name={myProfile?.username || currentUser?.email} size={28} radius={6} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myProfile?.username || 'You'}</div>
            <div style={{ fontSize: MONO, color: myProfile?.status === 'BUSY' ? 'var(--warn)' : 'var(--ok)' }}>● {myProfile?.status === 'BUSY' ? 'Busy' : 'Available'}</div>
          </div>
          <Link href="/settings" title="Settings" aria-label="Settings" className="mc-lounge-iconlink"><SettingsIcon size={14} color="var(--fg-dim)" aria-hidden /></Link>
        </div>
      </div>
    </div>
  );
}
