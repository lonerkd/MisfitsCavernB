# Session — 2026-10-27: call-sheet scene cast reads the film graph

The crew `/call/[id]` view now gets the day's scene cast from
`scene_characters` and `characters`. Its scene query no longer selects the
legacy cast/location text columns; names remain sorted and upper case as
before. The query stays scoped to the call sheet's project.

Added a focused Studio API test that includes stale `cast_list` values and
verifies only the linked names are returned, plus a persona integration test
for the real PostgREST join. The local Supabase stack could not start because
the image registry rate-limited the pulls, so that integration test remains
unrun. The next cutover in BACKLOG 3.18 is storing call-sheet cast calls by
`character_id`; `call_sheet_calls` still stores `character_name`.
