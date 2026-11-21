# Session - 2026-11-21: the Sound timeline's minimap and keyboard map, and a phone spec (BACKLOG 3.42): held, not merged

Two delegated Haiku agents built (1) a minimap strip and arrow-key navigation on the Sound page's scene timeline (`claude/sound-timeline-nav`, unit and component tests green, full suite 3263 tests) and (2) a phone spec for the Sound page (`claude/sound-phone-spec`). Both are merged on the branch `claude/sound-batch`, **not into main**.

**Why held:** I built it and looked at the page (a screenshot on a 393x852 phone, three scenes, a made-up Spotify token in localStorage so the page renders). The page renders, the room tabs are thumb-sized (the 44 px assertion passes), but the **minimap shows as a plain outlined bar**: with three short scenes everything fits on screen, so it is not a fair test and it does not look right; and the spec's tap on a scene block waited on an element that never became stable (an animation or overlap), so the test fails. A change a person can see is looked at before it merges (RULES 2); this one is not ready.

**Found on the way (a product question for the owner):** the whole Sound page, including the project's scene timeline, tags and library, shows only "Connect Spotify" until a Spotify token is stored, though the timeline does not depend on Spotify. Splitting it (timeline, tags and library open to everyone, play and search needing Spotify) is a product change.

**To resume:** seed a long script (30+ scenes) in the phone spec, look at the minimap with it, fix the tap (probably the hatched no-music marks or the overlapping short blocks), then merge `claude/sound-batch`.
