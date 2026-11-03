'use client';

// /community — one page for the people side of The Cavern: your day (with the
// Lounge's unread), what's new from Misfits Cavern, who is open to work, what the
// suite looks like and its numbers, and the house music.

import React from 'react';
import { Compass, Music, Newspaper, Users } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { YourDay } from '@/components/community/YourDay';
import { HubFeed } from '@/components/community/HubFeed';
import { CrewStrip } from '@/components/community/CrewStrip';
import { TheCavern } from '@/components/community/TheCavern';
import { HouseMusic } from '@/components/home/HouseMusic';

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 id={id} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)', fontWeight: 400 }}>{icon}{title}</h2>
      {children}
    </section>
  );
}

export default function CommunityPage() {
  return (
    <ProtectedPage require="signed-in">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
        <h1 className="sr-only">Community</h1>
        <YourDay />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 96px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Section id="community-hub" icon={<Newspaper size={14} aria-hidden />} title="What's new">
            <HubFeed />
          </Section>
          <Section id="community-crew" icon={<Users size={14} aria-hidden />} title="Crew open to work">
            <CrewStrip />
          </Section>
          <Section id="community-cavern" icon={<Compass size={14} aria-hidden />} title="The Cavern">
            <TheCavern />
          </Section>
          <Section id="community-music" icon={<Music size={14} aria-hidden />} title="Music from the Cavern">
            <HouseMusic />
          </Section>
        </div>
      </main>
    </ProtectedPage>
  );
}
