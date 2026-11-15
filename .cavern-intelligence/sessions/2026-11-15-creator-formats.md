# Session - 2026-11-15: YouTube, article and game script formats (BACKLOG 3.51 item 2)

**The gap:** the audience matrix and the role map (R3 YouTube creator, R5 blog / prose writer) had no native format; the registry had seven. The owner asked for YouTube first, then to improve formats for every type discussed, from YouTube to advertising to video games.

**Built** (migration `20261115000300`): three script formats with reading rules of their own in the parser: **video-script** (HOOK / CHAPTER / OUTRO sections are scenes, `[B-ROLL]` and `[GRAPHIC]` lines are shots, `(delivery notes)`, `HOST: line` speakers, plain prose is spoken dialogue), **prose** (articles, blogs, newsletters: `#` and CAPS headings are sections, paragraphs are text, a whole-line quote is set apart; Fountain's marker characters are ordinary text there), **game-script** (ACT / LEVEL / QUEST / NODE parts, choices as the player's lines and `PLAYER` in the cast, `[IF]` / `[SET]` logic, `-> node` jumps, `[cues]`); three project types that open scripts in them (YouTube, Blog / Newsletter, Video Game); the two CHECK lists in the database now match the registry. Advertising already had `copy`.

**Fixed on the way:** a `CHAPTER 1: …` heading was counted as a speaker by the pre-scan; headings with a colon are sections first.

**Tests:** unit (`reading-format.test.ts`: each format reads its own sections, cues, speakers and cast, and reads as nothing when treated as a screenplay), registry tests; persona-style `tests/integration/creator-formats.test.ts` (5: each type opens its format, a script can be stored in it, an unknown format is still refused). No new function or policy.

**Not done:** exports (PDF, text, Fountain, FDX) are still screenplay-shaped for every non-screenplay format (BACKLOG 3.22); a guide workflow for the new project types; nothing publishes to a channel or a CMS. **Applied after merge (#565):** `20261115000300` to production, then staging; both hold the same two constraints and the three new rows, matching the snapshot (checked on those two constraints and the rows, not a full 14-kind run).
Budget: `/call/[id]` 361 → 362 kB (0.3 kB over after the three new format entries; the page parses scripts, so the rules ride along).
