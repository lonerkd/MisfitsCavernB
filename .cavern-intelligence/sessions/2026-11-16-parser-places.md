# Session - 2026-11-16: the parser's unread `places` (BACKLOG 3.38(5))

**Found:** `ScriptParser` stored `options.context.places` and never read it, while `contextKey` put the places into the parse cache key, so renaming or adding a location invalidated every cached reading for nothing.

**Changed:** the dead parser field and its assignment are gone; `contextKey` leaves places out (a test says so). `ParseContext.places` and the context builders stay, documented as not read yet: 3.22(b) plans to use known places as heading evidence. Readings are unchanged (the reader never looked at them); `lib/scriptos` suite 556 pass, typecheck clean.
