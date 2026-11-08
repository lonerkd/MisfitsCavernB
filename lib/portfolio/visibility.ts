// Who may see a portfolio piece. The database decides (RLS and get_shared_portfolio); this is what the screens say and the one place
// the three states and their words live. A new piece is private until its owner publishes it.
export type PortfolioVisibility = 'public' | 'unlisted' | 'private';

export const VISIBILITIES: PortfolioVisibility[] = ['private', 'unlisted', 'public'];

export const VISIBILITY_LABEL: Record<PortfolioVisibility, string> = { private: 'Private', unlisted: 'Link only', public: 'Public' };

export const VISIBILITY_NOTE: Record<PortfolioVisibility, string> = {
  private: 'Only you can see it.',
  unlisted: 'Anyone with its link can see it. It is not listed anywhere.',
  public: 'Listed on your public portfolio and your crew page, and findable.',
};

export const isVisibility = (v: unknown): v is PortfolioVisibility => v === 'public' || v === 'unlisted' || v === 'private';

/** Anything the person has not made private has a link that works. */
export const hasLiveLink = (v: PortfolioVisibility | null | undefined): boolean => v === 'public' || v === 'unlisted';

/** A row's visibility as a state, never trusting what came back: anything unknown is treated as private. */
export const visibilityOf = (v: unknown): PortfolioVisibility => (isVisibility(v) ? v : 'private');
