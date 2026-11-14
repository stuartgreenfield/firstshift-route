# Route and Navigate marks (14 Nov 2026)

Stuart, 09:03: "the branding top left with Route and Navigate is not perfect could you design the icon as 2 vector svg files and load".

## Files

- `site/brand/route-mark.svg`, `site/brand/navigate-mark.svg`: the masters. Each holds two layouts:
  - **stack** (120 x 100): the sails over the name, used in the small square on phones;
  - **row** (sails beside the name), used on tablets and computers.
- `site/brand/*-mark.inc.html`: the same two drawings as the page carries them inline (inline so the colours follow
  the theme and Navigate works offline). Navigate's copy is swapped in by `tools/sync_route.py`.
- `tools/make_marks.py`: rebuilds all four from Space Grotesk 600 (SIL Open Font Licence; the heading face both apps
  already use) with fonttools and uharfbuzz, so the name is outlined and looks the same with or without web fonts.

## Drawing

- The three FirstShift sails redrawn as clean strokes on the corner points measured from `sails-light.svg` (the traced
  master). Two navy, one blue, as the master. The traced file stays the master for print; this redraw is for screens,
  where the traced outline went soft at 27 px.
- Name (from 13:17 on 14 Nov, Stuart chose option D): Inter 700 with the font's own kerning. Before that: Space Grotesk 600 with the font's own kerning (shaped by HarfBuzz) and -0.04 em tracking, the same face, weight and
  spacing as the landing page heading, ending in its blue full stop (Stuart 09:32 and 09:35: tighter letters, the landing
  page typeface and full stop, no underline).

## Colours (CSS variables on `.logobox`)

| | Light | Dark | Night |
|---|---|---|---|
| sails, navy (--mk-navy) | #042D5E | #FFFFFF | #C0281F |
| sails, blue (--mk-blue) | #3574BA | #6FA9E0 | #8A1E18 |
| name (--mk-ink) | #042D5E | #FFFFFF | #C0281F |
| full stop (--mk-dot) | #3574BA | #6FA9E0 | #8A1E18 |

The underline in the tool colour was dropped at Stuart's word (09:35): "it does not need an underline to be a good brand mark".

## 14 Nov 13:17: Inter bold

Stuart saw two renderings of the landing heading (Space Grotesk once the web font loaded, Android's Roboto before) and chose Inter bold (option D). The landing heading now uses Inter 700 stored inside the page (a 1.5 KB subset holding only the letters of Route and Navigate), so it never switches; the marks are redrawn from Inter 700.
