// Pages anyone can open without signing in — share links, press kits, the
// legal pages. They need no session, island or tab bar, so none is loaded.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="main-content-container" tabIndex={-1}>{children}</main>;
}
