// The top of a person's portfolio is the person: their name, what they do, where they are, their bio, and whether they are open to
// work. It used to be a hardcoded "The Cavern Collection" on every portfolio. Pure, so the page and the tests read the same rules.

export interface OwnerProfile {
  username: string | null;
  role: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** The profile's availability: 'OPEN' means open to work. */
  status: string | null;
}

export interface PortfolioHeader {
  name: string;
  /** "Director · Lisbon": what they do and where, whichever they have said. */
  line: string;
  bio: string;
  avatarUrl: string | null;
  openToWork: boolean;
  /** Nothing about the person yet beyond a username: the page offers to complete the profile. */
  sparse: boolean;
}

const clean = (v: string | null | undefined) => (v ?? '').trim();

export function headerOf(profile: OwnerProfile | null): PortfolioHeader {
  const name = clean(profile?.username) || 'Your portfolio';
  const role = clean(profile?.role), location = clean(profile?.location), bio = clean(profile?.bio);
  return {
    name,
    line: [role, location].filter(Boolean).join(' · '),
    bio,
    avatarUrl: clean(profile?.avatar_url) || null,
    openToWork: (profile?.status ?? '').toUpperCase() === 'OPEN',
    sparse: !bio && !role,
  };
}

/** A cover is an https link to something the browser can show: refused otherwise, so nothing mixed-content or scripted is stored. */
export function isCoverUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && u.hostname.includes('.') && url.trim().length <= 2000;
  } catch {
    return false;
  }
}
