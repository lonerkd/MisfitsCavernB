'use client';

import { motion, type MotionValue } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Mark3D } from '@/components/brand/Mark3D';
import { Viewfinder } from '@/components/landing/Viewfinder';

/**
 * The front page's cinematic hero: the mark, the tagline and the one call
 * to action — Enter for a guest, your project for a signed-in person.
 * Signed out it fills the screen; signed in it sizes to its content so
 * Your day starts right under the mark at any screen height.
 */
export function Hero({
  loggedIn, activeProjectTitle, heroOpacity, heroY,
}: {
  loggedIn: boolean | null;
  activeProjectTitle: string | null;
  heroOpacity: MotionValue<number>;
  heroY: MotionValue<number>;
}) {
  return (
    <section style={{
      // Signed out: the cinematic full-screen hero (100svh, as the front page always was).
      // Signed in: no viewport fraction — the hero sizes to its content with the standard
      // section padding, so Your day starts right under the mark at any screen height.
      // (The 46svh first cut was a guess; the design system has no compact-hero fraction.)
      minHeight: loggedIn ? undefined : '100svh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: loggedIn ? '48px 24px 40px' : '0 24px',
    }}>
      <div style={{
        position: 'absolute',
        width: '70vw',
        height: '70vw',
        maxWidth: 800,
        maxHeight: 800,
        borderRadius: '50%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(232, 67, 26,0.10) 0%, transparent 65%)',
        animation: 'orb-breathe 10s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%', right: '5%',
        width: '40vw', height: '40vw',
        maxWidth: 'var(--w-form)', maxHeight: 500,
        borderRadius: '50%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
        animation: 'orb-breathe 14s ease-in-out 3s infinite',
      }} />

      <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 2, textAlign: 'center', width: '100%' }}>

      <h1 className="sr-only">The Cavern — the production suite for independent filmmakers</h1>
        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(16px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', display: 'inline-block', padding: 8 }}
        >
          <Mark3D />
          <Viewfinder size={22} color="rgba(232, 67, 26,0.45)" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginTop: 18,
            fontFamily: 'var(--mono)',
            fontSize: 'max(8.5px, var(--mc-min-font, 0px))',
            letterSpacing: 'var(--caps-track)',
            textTransform: 'var(--caps)',
            color: 'var(--fg-dim)',
          }}
          aria-hidden
        >
          by Misfits Cavern
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55 }}
          style={{
            // --fg-dim is the 4.5:1 floor; a faded opacity fell below it.
            color: 'var(--fg-dim)',
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            fontStyle: 'italic',
            fontWeight: 300,
            letterSpacing: 'var(--caps-track)',
            marginTop: 28,
          }}
        >
          Script to Screen — one integrated studio.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.9 }}
        >
         <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 40 }}>
          {loggedIn === null ? null : loggedIn ? (
            <Button href={activeProjectTitle ? '/studio' : '/projects'} variant="solid" size="lg">
              {activeProjectTitle ? `Open ${activeProjectTitle}` : 'Your projects'}
            </Button>
          ) : (
            <>
              <Button href="/auth" variant="solid" size="lg">Enter The Cavern</Button>
              <Button href="/portfolio" variant="ghost" size="lg">View Work</Button>
            </>
          )}
        </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ delay: 2 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)' }}
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <div style={{ width: 1, height: 36, background: 'linear-gradient(180deg, transparent, rgba(var(--fg-rgb), 0.4))' }} />
        </motion.div>
      </motion.div>
    </section>
  );
}
