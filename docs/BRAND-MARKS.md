# Route and Navigate marks (14 Nov 2026)

Stuart, 09:03: "the branding top left with Route and Navigate is not perfect could you design the icon as 2 vector svg files and load".

## Files

- `site/brand/route-mark.svg`, `site/brand/navigate-mark.svg`: the masters. Each holds two layouts:
  - **stack** (120 x 100): the sails over the name, used in the small square on phones;
  - **row** (sails beside the name), used on tablets and computers.
- `site/brand/*-mark.inc.html`: the same two drawings as the page carries them inline (inline so the colours follow
  the theme and Navigate works offline). Navigate's copy is swapped in by `tools/sync_route.py`.
- `tools/make_marks.py`: rebuilds all four from Space Grotesk 700 (SIL Open Font Licence; the heading face both apps
  already use), so the name is outlined and looks the same with or without web fonts.

## Drawing

- The three FirstShift sails redrawn as clean strokes on the corner points measured from `sails-light.svg` (the traced
  master). Two navy, one blue, as the master. The traced file stays the master for print; this redraw is for screens,
  where the traced outline went soft at 27 px.
- Name: Space Grotesk 700, 8 units of tracking.
- A bar under the name in the tool's colour.

## Colours (CSS variables on `.logobox`)

| | Light | Dark | Night |
|---|---|---|---|
| sails, navy (--mk-navy) | #042D5E | #FFFFFF | #C0281F |
| sails, blue (--mk-blue) | #3574BA | #6FA9E0 | #8A1E18 |
| name (--mk-ink) | #042D5E | #FFFFFF | #C0281F |
| Route bar (--mk-tool) | #B0127A | #FF4FB4 | #6A0F0B |
| Navigate bar (--mk-tool) | #0E7C86 | #3CCFD9 | #6A0F0B |

Route's magenta is its existing tool colour. **Navigate's teal is proposed, waiting for Stuart's approval.**
