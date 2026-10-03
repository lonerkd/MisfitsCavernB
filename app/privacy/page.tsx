import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Mail } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: `Privacy Policy — ${LEGAL.product}`,
  description: `How ${LEGAL.product} collects, uses and protects your information.`,
};

// Written to match what the app actually does. When a feature starts
// collecting something new, or sends data to a new service, update this page
// and LEGAL.effective in the same change.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" other={{ href: '/terms', label: 'Terms of Service' }}>
      <p>
        {LEGAL.product} is a production suite for independent filmmakers, run by {LEGAL.operator}, an individual
        in {LEGAL.province}, {LEGAL.country} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what
        information we collect when you use {LEGAL.product}, why, who else handles it, and the choices you have.
        We follow Canada&rsquo;s <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account</strong> — your email address, username and password (stored only as a secure
          hash by our authentication provider). If you sign in with Discord, we receive your Discord username,
          avatar and ID.</li>
        <li><strong>Your profile</strong> — anything you add: a photo, bio, crafts, location, availability,
          portfolio and credits.</li>
        <li><strong>Your work</strong> — the projects, scripts, notes, breakdowns, schedules, call sheets,
          budgets, documents, photos, video, audio and messages you create or upload, and the details of the
          people you work with that you enter (for example cast and crew names on a call sheet).</li>
        <li><strong>Preferences</strong> — settings such as your theme, notification choices and where you left
          off, stored with your account so they follow you between devices.</li>
        <li><strong>Error reports</strong> — when something breaks in your browser, the app records the error
          message, technical details, the page (without anything after the &ldquo;?&rdquo; in its address), the
          app version, your browser type and, if you are signed in, your account. We keep these for 30 days.</li>
        <li><strong>Usage and speed</strong> — privacy-friendly analytics from our host (Vercel Web Analytics and
          Speed Insights) count page visits and measure how fast pages load. They use no cookies and do not
          identify you.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run {LEGAL.product}: sign you in, save and sync your work, and show it to the people you choose.</li>
        <li>To let you collaborate: the crew of a project see what the project holds, and notifications tell
          them when something changes.</li>
        <li>To keep the service secure and working: preventing abuse, fixing errors and improving speed.</li>
        <li>To contact you about your account or important changes to the service.</li>
      </ul>
      <p>We do not sell your information, show you advertising, or use your work to train AI models.</p>

      <h2>Who can see your work</h2>
      <p>
        Projects are private to you and the people you add to their crew. Anything you choose to share — a
        public portfolio, a shared script, a share link to a lookbook or press kit — can be seen by anyone with
        the link or on the public pages you publish it to. You can stop sharing at any time.
      </p>

      <h2>Services that handle your information</h2>
      <p>We rely on a small number of providers, who process information only to provide their service to us:</p>
      <ul>
        <li><strong>Supabase</strong> — our database, sign-in and file storage.</li>
        <li><strong>Vercel</strong> — hosts the app, and provides the analytics described above.</li>
        <li><strong>Discord</strong> — only if you sign in with Discord, or connect a project channel to a
          Discord webhook (messages you post there are then sent to that Discord channel).</li>
        <li><strong>Spotify</strong> — only if you connect your Spotify account for the soundtrack tools; we
          store the access it grants so we can search and play music for you, and you can disconnect it.</li>
        <li><strong>Have I Been Pwned</strong> — when you choose a password, only the first five characters of
          its fingerprint (a hash, never the password) are sent to check whether it has appeared in a data
          breach. You can turn this check off in Settings.</li>
        <li><strong>Reference search and embeds</strong> — searching for reference images sends your search
          words to Openverse. Links and videos you add from services such as YouTube, Vimeo, Pinterest, Google
          Maps or Google Drive load from those services when you view them, under their own privacy policies.</li>
      </ul>
      <p>
        These providers may store and process information outside Canada, including in the United States, where
        it may be subject to the laws of that country.
      </p>

      <h2>Cookies and storage on your device</h2>
      <p>
        We use only what the app needs to work: a sign-in cookie that keeps you signed in, and storage in your
        browser for device settings, work you capture while offline (sent as soon as you are back online), and
        cached files so the app opens quickly. We use no advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information for as long as your account exists. Error reports are deleted after 30 days.
        When you delete your account, we delete it and the projects only you work on, together with their files.
        What you contributed to other people&rsquo;s projects — for example script edits, shots, notes or
        channel messages — stays with those projects so their work stays whole, shown as &ldquo;Deleted
        account&rdquo; and no longer linked to you. Backups held by our providers are overwritten on their
        normal schedule.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>See and download</strong> your information: Settings › Data &amp; Privacy › Export my data.</li>
        <li><strong>Correct</strong> it: edit your profile and your work at any time.</li>
        <li><strong>Delete</strong> your account: Settings › Delete account.</li>
        <li><strong>Withdraw consent</strong> for optional features: disconnect Spotify or Discord, stop sharing,
          or turn off notifications.</li>
      </ul>
      <p>
        You can also ask us for access to, or correction of, the personal information we hold about you by
        writing to <Mail />. We will answer within 30 days. If you are not satisfied with our answer, you can
        contact the Office of the Privacy Commissioner of Canada.
      </p>

      <h2>Security</h2>
      <p>
        Your information is sent over encrypted connections, and every table in our database is protected by
        rules that let people see only what they are allowed to. No system is perfectly secure; if a breach
        creates a real risk of significant harm to you, we will tell you and the Privacy Commissioner as the law
        requires.
      </p>

      <h2>Children</h2>
      <p>{LEGAL.product} is not meant for children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we will update the date at the top, and tell you in the app before a
        significant change takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests about your privacy: {LEGAL.operator}, <Mail />. See also our{' '}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
