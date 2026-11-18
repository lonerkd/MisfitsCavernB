'use client';

// What the home page shows once you are signed in, under the same 3D mark everyone sees: your day first (calls, tasks, the
// Lounge's unread, updates, a way back into each project), then what is new from Misfits Cavern, who is open to work and the
// house music. This was the Community page; the two pages said the same things in two layouts, so there is one now.

import React from 'react';
import { Music, Newspaper, Users } from 'lucide-react';
import { YourDay } from '@/components/community/YourDay';
import { HubFeed } from '@/components/community/HubFeed';
import { CrewStrip } from '@/components/community/CrewStrip';
import { WhenNear } from '@/components/community/WhenNear';
import { HouseMusic } from '@/components/home/HouseMusic';

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 id={id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)', fontWeight: 400 }}>{icon}{title}</h2>
      {children}
    </section>
  );
}

export function SignedInHome() {
  return (
    <div>
      <YourDay />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 96px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Section id="home-hub" icon={<Newspaper size={14} aria-hidden />} title="What's new">
          <HubFeed />
        </Section>
        <Section id="home-crew" icon={<Users size={14} aria-hidden />} title="Crew open to work">
          <WhenNear><CrewStrip /></WhenNear>
        </Section>
        <Section id="home-music" icon={<Music size={14} aria-hidden />} title="Music from the Cavern">
          <WhenNear><HouseMusic /></WhenNear>
        </Section>
      </div>
    </div>
  );
}
