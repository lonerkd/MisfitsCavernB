# Session - 2026-11-11: the BACKLOG, slimmed to a list

**Why:** the BACKLOG was 84.6 KB — most of it long "Step N built" narratives
inline in the §3/§4 items. After the entry-file fix (`CLAUDE.md` points at it
instead of importing it) it was no longer loaded at session start, but it was
still not scannable, and every tool that read it paid the bytes.

**Built:** each §3/§4 item's full history moved **verbatim** into a new
`.cavern-intelligence/backlog-detail.md` (81.6 KB, 47 items).
`BACKLOG.md` is now a scannable list: one entry per item — what it is, what is
left, the plan link — plus a *History* pointer. **84.6 KB → 21 KB (−75%).**

**Verified:** a script compared all 47 item bodies against `origin/main`'s
BACKLOG; every body appears verbatim in the detail file (0 missing).

**Left:** the list is the map, the plan files hold the design, the detail file
holds the history. Nothing is loaded unless it is asked for.
