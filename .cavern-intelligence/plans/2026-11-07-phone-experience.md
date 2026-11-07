# The phone experience (owner, 2026-11-07)

**The owner's words:** a full mobile upgrade for iOS (an iPhone 15 Pro, 393×852 pt portrait, 852×393 landscape, Dynamic Island, home indicator): "a lot of functionality and UI is clipped or broken, or the keyboard makes it impossible"; hold the phone sideways too, with horizontal-only views where they help. Then: "not clipped — the trash UI and no logic": the phone shows the desk layout squeezed, with no phone behaviour of its own.

## What the audit found (`scripts/mobile-audit.mjs`, 2026-11-07, Chromium imitating an iPhone 15 Pro; real Safari still needs a real device)
- No page scrolls sideways, but the editor's desk bar scrolled sideways in silence (Write/Board/Outline/Preview/Stats, Share, Export were off screen) and the right panel was a 272 px drawer.
- 13–100 controls per page smaller than a thumb (40 pt): `/projects/[id]` 97–102.
- With the keyboard up (landscape: 193 pt left) the editor was three desk columns squeezed into 100 pt of text; the floating island sat on top of the writing; on Studio, Profile and Settings the focused field stayed hidden under the keyboard in landscape.
- Nothing used `visualViewport`, so nothing knew where the keyboard was (iOS never shrinks the layout viewport for it).

## The rules (every phone screen)
1. **Chosen by capability, not only width:** `usePhoneLayout()` (`lib/os/usePhone.ts`): narrow, or touch and short (a phone held sideways). It also reports landscape, the keyboard's height and the visible area's offset.
2. **One slim bar, four doors:** back · the document (its list) · the view · tools · more. Nothing scrolls sideways; nothing is hidden.
3. **Panels become bottom sheets** (`components/phone/BottomSheet.tsx`): they keep clear of the home indicator and the keyboard, scroll inside, close on Escape, backdrop and a 44 pt button.
4. **The keyboard is a state:** while typing the page fits what is visible (`position: fixed; top: offset; height: visible`), the floating island steps aside (`html[data-typing]`), and writing aids ride on top of the keyboard (the editor's element strip).
5. **Landscape is a writing posture:** while typing sideways the bar, status line and floating tools go; the text gets the screen. Horizontal-only views (a stripboard, the Studio's schedule, a shot board) are allowed where a row needs width: offer them as "turn your phone" views, not squeezed ones.
6. **Targets 44 pt, text 16 pt in fields** (iOS zooms the page into a field smaller than 16 px), safe-area insets on every fixed edge.

## Order of work
1. **Editor (built 2026-11-07, PR "feat(phone)")**: the bar, the four sheets, the element strip over the keyboard, landscape typing, the island stepping aside. Left in the editor: the Board and Outline views on a phone, Find/Replace as a sheet, the table read controls, a hardware-keyboard check.
2. **The 44 pt pass (built 2026-11-07):** one coarse-pointer block in `globals.css` (buttons/tabs/selects 44 pt with `!important`, fields 16 px, links' tappable area), the Studio tab row fixed; small targets 97 → 0 on a project page. **Left in this step:** the shell as one phone layout (the pill over content, a tab bar that rides the keyboard) and the keyboard-hides-field cases the audit still flags in landscape (Studio, Profile, Settings, Jobs).
3. Studio: tabs as a sheet or segmented bar, production tools, the stripboard as a horizontal-only view, forms above the keyboard.
4. Lounge: list → conversation → composer that rides the keyboard; call controls.
5. Forms everywhere (Profile, Settings, Jobs, Crew, Auth): 16 px fields, the focused field stays visible, the submit rides the keyboard.
6. On set (a phone is the tool there) and Today/Community.
7. A browser spec per surface at the iPhone 15 Pro size in both orientations, and a CI audit that fails on sideways scroll and sub-44 pt targets.

**Verification limits:** Chromium cannot show iOS's toolbar collapse, safe-area insets or the real keyboard. The keyboard is imitated by faking `visualViewport`; every slice needs one pass on the owner's iPhone before it is called done.
