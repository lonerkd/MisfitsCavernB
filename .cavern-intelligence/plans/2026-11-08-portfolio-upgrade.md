# The portfolio — an audit and an upgrade (sketch, 2026-11-08)

Owner: "the next major upgrade needed is the portfolio." Nothing here is built. This is what the portfolio is today, what is wrong with it, and what it should become, with the decisions that are the owner's.

## What it is today

- **`/portfolio`** (the owner's own view): a cinematic page of the person's pieces, a "Showcase" tab and a "Distribution" tab (their festival submissions, from Campaigns). **`/portfolio/manage`**: a list of pieces with a bare form per piece (media type, title, URL) and a copy-the-share-link button. **`/p/<token>`**: one piece, public. **`/crew/<id>`**: shows that person's pieces. Projects finished in the suite join from their Delivery phase (`addCreditToPortfolio`, linked by `source_project_id`).
- **Data:** `portfolio_projects` (title, category, role, year, description, accent colour, share token, source project) with `portfolio_media` (type, title, URL, thumbnail) and `portfolio_blocks` (a pitch-board of typed blocks, used by the pitch deck).

## What is wrong (found by reading the code and the screens, 2026-11-08)

1. **A hardcoded identity.** Every person's portfolio is headed "The Cavern Collection" with the same sentence ("A curated selection of cinematic projects, from conceptual ideation to final delivery…") (`app/(suite)/portfolio/page.tsx`, the page title, the island's title and the hero). It is not their name, their bio or their reel. A lying UI by the house rules.
2. **No pictures.** A piece has no cover image; the cards are gradients with a play button, and a piece with no YouTube link has no thumbnail at all. A portfolio with no images is not one.
3. **Links only.** Media is a URL typed into a box. No upload (images, a poster, a PDF of a script or a one-sheet), no Vimeo or Drive handling in the validator (only YouTube and "image URL ending in .jpg"), no preview before saving.
4. **No person-level page.** Only a single piece has a public URL. There is no "my portfolio" link to put in an email or a bio, no handle, no share image (Open Graph) for a link preview.
5. **No privacy model.** `portfolio_projects`, `portfolio_media` and `portfolio_blocks` are readable by **everyone, signed in or not, by direct query** (`"Portfolio publicly readable"`: `using true`). So the share token on each piece protects nothing: anyone can list every piece and its token through the API. There is no private or unlisted piece, and no way to hide an unfinished one.
6. **No curation.** No order (the first two pieces lead the page by accident of creation date), no featuring, no pinned showreel, no sections.
7. **Not the person.** The page is the work only: no name, photo, craft, bio, availability, location, or "hire me": the profile, crew card and availability already exist elsewhere in the suite and the portfolio ignores them.
8. **The suite's strength is unused.** A piece made in the suite knows its real crew, its logline, its stills, its festival laurels and its poster, and none of that flows in; the credit is a one-time copy of a title and a role, never confirmed by the project's team, so it is exactly as trustworthy as one typed by hand.
9. **Decoration.** The marquee strip of repeated "SHORT FILM / WRITER / DIRECTOR" is filler, not information.

## What it should become

**A filmmaker's own site, built from the suite.** Not a gallery of links: a page a producer, a festival programmer or an investor opens from an email and understands in ten seconds, that stays true because it is fed by the work.

1. **The person at the top (from the real profile).** Name, photo, crafts, one-line bio, location, availability ("open to work", from Availability), and a **Hire / message** action that lands in the Jobs board or a DM. Their **showreel** pinned first (one video).
2. **Pieces with covers.** A cover image per piece (upload, or chosen from the project's stills, poster or mood board), a logline, role chips, year, format, runtime, and the media: embeds (YouTube, Vimeo, Drive), uploads (images, PDF), links.
3. **Verified credits.** A piece made in the suite shows its credits **as confirmed by the project's own crew** ("confirmed by the producer"), through the credits system the suite already has: the one thing a hand-built site cannot offer. A credit added by hand is shown as self-reported.
4. **Visibility, honestly.** Each piece is **public, unlisted (link only) or private**, and the person's page is public, unlisted or off. The database enforces it (RLS through a visibility column), not the share token: today's world-readable tables are fixed in the same change.
5. **A page you can share.** `/portfolio/<handle>` (or `/@handle`), a share image for link previews, a copy-link button, and a **PDF one-sheet** (credits and reel link) for the producers who want a file.
6. **Curation.** Drag to order, pin featured work, name and reorder sections (Reel, Work, Credits, Festivals, Press, About, Contact), hide what you do not want.
7. **Festivals and press from the suite.** Laurels and selections come from the project's Distribution plan and the press kit, with the project's own wording.
8. **A calm, themeable look.** One restrained layout with a few presets (the suite's themes, an accent), and the cavern's light as the quiet signature, never a hardcoded "Cavern Collection".
9. **Who looked (optional, private).** Views per piece and where from, shown only to the owner, no visitor tracking beyond a count.

## What this does not do

- It is not a general website builder: no custom HTML, no custom domains in the first version (a handle on the suite's own domain).
- It does not host video: pieces play from YouTube, Vimeo or Drive embeds. (Hosting costs real money: see the questions.)
- It does not make anything public that the person did not make public.

## Build order (each ships on its own)

1. **Make it honest (S/M).** Replace "The Cavern Collection" with the person's real name, photo, bio and crafts from their profile; remove the filler marquee; cover images (upload to storage, with the island's upload progress) and a picture on every card; Vimeo and Drive recognised; a media preview before saving. No migration beyond a cover column.
2. **Privacy that is real (M).** A `visibility` column (public / unlisted / private) on pieces and a page setting, RLS rewritten through it, the world-readable policies replaced, a persona test (owner sees all; an outsider sees only public ones; an unlisted piece only through its token, by function not by table; a signed-out visitor likewise). The highest-risk step: it changes who can read what.
3. **A page you can share (M).** The handle and `/portfolio/<handle>`, the share image, the copy link, the unlisted token path, and the signed-out view as a first-class page.
4. **Curation (M).** Order, pin, sections, the pinned reel; the manage screen rebuilt around a live preview instead of a form per piece.
5. **Verified credits and festivals from the suite (M/L).** The project's crew confirms a credit; laurels from Distribution; stills and poster from the project; a piece can stay linked and update, or be frozen.
6. **PDF one-sheet, views (S/M).**

Each step: a test with the code, the doc that owns the change, a session note, and a browser look at both a desktop and a phone (the phone audit covers the pages).

## Decisions (owner, 2026-11-08)

1. **Audience: it depends on the project and its needs.** So the page is not one fixed layout: what leads (the reel, the credits, the films, the festivals) is the person's choice per portfolio, with sensible defaults (step 4).
2. **Private until published: yes.**
3. **Video comes from the library, not a second upload.** The Studio library already takes uploads (audio and video included) and links; a portfolio piece shows a library item the person chooses to publish (the library's `media.shared` already says which are public), so there is one place media lives. Embeds (YouTube, Vimeo, Drive) stay for work that lives elsewhere. No separate video upload for the portfolio.
4. **Verified credits: yes, confirmed credits so that every person who deserves recognition has it, whatever their role.** The project's crew confirm credits; a person left off can ask to be added and the project's owner decides; a credit is shown as confirmed or as self-reported.
5. **Both individual and project portfolios (and more where needed).** A person has a portfolio; a **project** has its own public page too (its credits, stills, festivals, press kit: one page for the film, many people on it); a company or collective could be a third kind later. One piece of work can appear on several. This widens step 3 (a project page as well as a handle page) and step 5.
6. **Findable: yes** (directory and search engines), with a per-portfolio opt-out.

**Built 2026-11-08 (step 1, the honest page):** the header is the person (name, role, location, bio from the profile) instead of a hardcoded "The Cavern Collection"; the filler marquee is gone; a piece can carry a cover image (`cover_url`, an https image link, with a preview) and cards show it; the empty state says what to do. **Step 2 built the same day (privacy that is real). Step 3 built 2026-11-08:** the cover on a piece's own page and its link preview, and a person's page at `/u/<username>` (the handle is the username; off until the owner publishes it; Link only is reachable but not indexed). **Credits on a person's page built the same day** (public films they are credited on, from confirmed crew, castings and the creator; each links to the film's page). **The project page already existed** (`/shared/<token>`: lookbook, press-kit credits and laurels, `link` unlisted / `public` indexable), so step 3's project page needs no new page. **The directory built the same day** (`/portfolios`, public pages only, searchable; Link only is the opt-out, as decision 6 asked). The directory and a person's page are **linked from inside the suite** (command palette, the owner's portfolio, the crew page, the public page). **Left:** a share image, curation, festivals on the person's page, the PDF one-sheet, a sitemap and a craft filter.

## Questions for the owner (answered above)

1. **Who is the portfolio for first?** Hirers (a producer choosing a crew member), festivals, investors, or the person's own pride? It changes what leads the page (the reel, the credits, or the films).
2. **Public by default, or private by default?** Today everything is world-readable. Recommendation: **private until the person publishes**, with a clear "publish" step, because a half-finished portfolio that is already public is worse than none.
3. **Video: embeds only, or uploads too?** Hosting video is a real recurring cost and a moderation burden; embeds cost nothing. Recommendation: embeds now, uploads only for images and PDFs; revisit when there are paying users.
4. **Verified credits: wanted?** It needs the project's crew to confirm each credit (a small prompt to them) and makes the suite's portfolio uniquely trustworthy; it is also the larger step. Recommendation: yes, but after the page is honest, private-by-default and shareable.
5. **A handle** (`/portfolio/yourname`) on the suite's domain: wanted, and may a person change it?
6. **Should the portfolio show in the crew directory and be findable by search engines?** (A person who wants to be hired probably says yes; a person who does not should be able to say no.)
