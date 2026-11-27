'use client';

import { DISCORD_INVITE } from '@/lib/community/discord';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';

/** The signed-out page's closing call: BEGIN YOUR FILM, and the doors in. */
export function ClosingCta() {
  return (
    <section style={{ padding: '100px 24px 160px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 60%, rgba(232, 67, 26,0.07) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <AnimatedSection>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 1,
              height: 64,
              background: 'linear-gradient(180deg, transparent, rgba(232, 67, 26,0.5))',
            }} />
          </div>

          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(3rem, 14vw, 9rem)',
            lineHeight: 0.88,
            letterSpacing: -1,
            marginBottom: 44,
          }}>
            BEGIN YOUR<br />
            <span style={{ color: 'var(--accent)', textShadow: '0 0 80px rgba(232, 67, 26,0.2)' }}>FILM</span>
          </div>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
          <Button href="/auth" variant="solid" size="lg">
            Start Writing
          </Button>
          {DISCORD_INVITE && (
            <Button href={DISCORD_INVITE} variant="ghost" size="lg" external>
              Join the Discord
            </Button>
          )}
          <Button href="https://instagram.com/lonerkid" variant="ghost" size="lg" external>
            Contact Crew
          </Button>
        </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
