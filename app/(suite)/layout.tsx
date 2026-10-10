import { OSProvider } from '@/lib/os';
import { PresenceProvider } from '@/lib/os/PresenceContext';
import { PillProvider } from '@/lib/os/PillContext';
import { SpotifyProvider } from '@/lib/os/SpotifyContext';
import ClientShell from '@/components/shell/ClientShell';

// Everything signed in (and the landing, auth and showcase pages that know
// who's looking): the session, presence, the island and the phone tab bar.
export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <OSProvider>
      <PresenceProvider>
        <PillProvider>
          <SpotifyProvider>
            <ClientShell />
            <main id="main-content" className="main-content-container" tabIndex={-1}>{children}</main>
          </SpotifyProvider>
        </PillProvider>
      </PresenceProvider>
    </OSProvider>
  );
}
