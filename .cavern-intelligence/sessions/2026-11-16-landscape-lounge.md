# Session - 2026-11-16: the Lounge held sideways (BACKLOG 3.41)

**Seen in the screenshot pass:** a phone held sideways has about 390 px of height. The Lounge spent 62 px on its top bar, about 100 px on a composer (a 14 px typing line that is empty most of the time, 16 px padding each side) and the island's reserve, leaving two lines for messages; and in a channel the person can read but not post in, the composer was a greyed text box with a clipped two-line placeholder and a Send button that could never work.

**Changed (no migration):** in phone landscape the Lounge's top bar is 44 px and the composer is one slim row (the typing line collapses when nobody is typing). A channel you cannot post in shows a one-line notice with a lock ("You can read #announcements, but only some people can post in it.") instead of the dead box, at every size.

**Checked and not changed:** the island's floating pill over the content in landscape is the same floating bar as in portrait (pages reserve room at the end through `--taskbar-height`), not a separate bug. The music pill and the project switcher in landscape (from the recording) were not reproduced: the screenshot pass had no music playing.

**Verified:** Lounge unit tests (5), typecheck, lint. Looked at in a browser at 852x393 before pushing (see the PR). Not seen on a real iPhone.
