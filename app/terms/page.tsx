import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Mail } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: `Terms of Service — ${LEGAL.product}`,
  description: `The terms for using ${LEGAL.product}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" other={{ href: '/privacy', label: 'Privacy Policy' }}>
      <p>
        These terms are an agreement between you and {LEGAL.operator}, an individual in {LEGAL.province},{' '}
        {LEGAL.country} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), who runs {LEGAL.product}. By creating an account or
        using {LEGAL.product}, you agree to them and to our <Link href="/privacy">Privacy Policy</Link>. If you do
        not agree, please do not use the service.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 years old, and old enough in your province or country to agree to these terms
          yourself — otherwise a parent or guardian must agree for you.</li>
        <li>Give accurate information, keep your password to yourself, and tell us at <Mail /> if you think someone
          else has used your account. You are responsible for what happens under your account.</li>
        <li>You can delete your account at any time from Settings.</li>
      </ul>

      <h2>Your work stays yours</h2>
      <p>
        You own the scripts, footage, images, audio, notes and everything else you put into {LEGAL.product}. To run
        the service we need your permission to store, copy, process and display that work — to you, to the people
        on your projects, and to anyone you share it with. You give us that permission, worldwide and without
        charge, for as long as the work is in {LEGAL.product}, and only for running and improving the service. We
        claim no other rights in it.
      </p>
      <p>
        You confirm that you have the rights to what you upload, including permission from the people who appear
        in it or whose details you enter (for example cast and crew on a call sheet).
      </p>

      <h2>Working with others</h2>
      <ul>
        <li>The owner of a project decides who is on its crew and what they can do. Crew can see and, where the
          owner allows, change the project&rsquo;s work.</li>
        <li>What you add to someone else&rsquo;s project becomes part of that project. If you leave it or delete
          your account, your contributions stay with the project, shown as &ldquo;Deleted account&rdquo;.</li>
        <li>Before deleting your account you must hand over, or delete, any project that other people work on.</li>
        <li>Agreements between you and the people you work with — pay, credits, rights in the film — are between
          you and them. {LEGAL.product} helps you organise that work but is not a party to it.</li>
      </ul>

      <h2>What you must not do</h2>
      <ul>
        <li>Upload anything illegal, or anything that infringes someone else&rsquo;s copyright, privacy or other
          rights.</li>
        <li>Harass, threaten or impersonate anyone, or post hateful or sexually exploitative content.</li>
        <li>Post jobs that are misleading, or collect other people&rsquo;s information for purposes they did not
          agree to.</li>
        <li>Try to get into accounts or projects that are not yours, interfere with the service, overload it, or
          scrape it.</li>
        <li>Use {LEGAL.product} to send spam or malware.</li>
      </ul>
      <p>
        If you break these rules we may remove the content concerned and suspend or close your account. Where we
        can, we will tell you why first.
      </p>

      <h2>Copyright complaints</h2>
      <p>
        If you believe something in {LEGAL.product} infringes your copyright, write to <Mail /> with the link to
        it and why. We follow Canada&rsquo;s notice-and-notice rules and will act on valid notices.
      </p>

      <h2>Other services</h2>
      <p>
        {LEGAL.product} can connect to services such as Discord, Spotify, YouTube and Google Maps. Your use of
        them is governed by their own terms, and we are not responsible for them.
      </p>

      <h2>The service</h2>
      <p>
        {LEGAL.product} is provided free of charge while it is being developed. We work to keep it available and
        your work safe, but we provide it <strong>&ldquo;as is&rdquo;</strong>, without warranties of any kind, to
        the extent the law allows. Features may change, and we may stop offering the service; if we do, we will
        give you reasonable notice and a way to export your work. Keep your own copies of anything important.
      </p>

      <h2>Limits on our liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses — such as lost
        profits, lost opportunities or lost data — arising from your use of {LEGAL.product}, and our total
        liability to you for any claim is limited to one hundred Canadian dollars (CAD $100). Nothing in these
        terms limits rights you have as a consumer that the law does not allow us to limit.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. We will change the date at the top and, for significant changes, tell you in
        the app before they take effect. If you keep using {LEGAL.product} after that, you accept the new terms.
      </p>

      <h2>Law and disputes</h2>
      <p>
        These terms are governed by the laws of {LEGAL.province} and the federal laws of {LEGAL.country} that apply
        there. If a dispute arises, please contact us first — most things can be sorted out that way. Otherwise,
        the courts of {LEGAL.province} will decide it.
      </p>

      <h2>Contact</h2>
      <p>{LEGAL.operator} · <Mail /></p>
    </LegalPage>
  );
}
