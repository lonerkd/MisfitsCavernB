# Session - 2026-11-22: Call sheet emergency details and share-as-text (parity gap 2)

Migration `20261122000700_call_sheet_safety.sql`: five text columns on `call_sheets` (`hospital_name`, `hospital_address`, `hospital_phone`, `police_phone`, `medic`) with a length check; RLS unchanged (the sheet's own policies cover them). `internal.call_sheet_snapshot` now writes only the filled-in emergency keys (so an old sheet with none issues the same snapshot as before and a re-issue still says "nothing has changed"); `internal.call_sheet_message` names "emergency details" in a revision.

App: the Day editor has an Emergency block; a new sheet copies the latest sheet's details (the sheet at the same address first), which is the "enter it once per location" default without a new project column. The details flow through the snapshot type and diff in `lib/studio/call-sheet.ts` (old snapshots read as empty, so they compare cleanly), the crew's `/call/[id]` page (phone numbers are `tel:` links) and the print (`call-sheet-print.ts`). `lib/studio/call-sms.ts` builds the text (under 320 characters, link never cut, percent-encoded `sms:?&body=`); each person's row on an issued sheet has "Text it" (their issued call plus the call page link) and "Copy". No server send, no provider.

**Not built, needs the owner and costs money:** an automatic nearest-hospital lookup (a places service) and sending call sheets by SMS from the server (an SMS provider). Both stay in parity gap 2.

**Migration still needs applying to production and then staging** (by the main session after merge), then the drift check.
