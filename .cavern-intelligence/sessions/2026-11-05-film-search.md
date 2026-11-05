# Session - 2026-11-05: film search for references

Find references (Studio > Library) now has a **Films** tab beside Images: pick Title, Director or Cinematographer, type a name, and get films with year, director, cinematographer and genres, from Wikidata (open data, CC0, no key, no cost). **Keep** adds the film to the library as a link (board "Film references") with its credits in the notes; **Find stills** switches to the Images tab with "<title> <year> film still". The search words go to Wikidata only; the privacy page says so. The pure parts (the SPARQL a search becomes, only well-formed ids reach it; folding rows into one result per film; the notes) are `lib/references/films.ts`; the route is `app/api/references/films/route.ts` (rate limited, timeouts, cached an hour, "unavailable" rather than an error when Wikidata is down).

**Why Wikidata and not TMDB:** TMDB has stills and a better index, but its free tier is for non-commercial use and The Cavern will be paid: a licence is an owner decision. Wikidata covers who made a film and who shot it, which is what Cineboard's Film Search leads with.

**Verified:** typecheck, lint, unit tests (`films.test.ts`), and the route's flow run against live Wikidata (a title, a cinematographer, a director). **Left (BACKLOG 4.5):** stills from the film, search by look or description, a film's palette.
