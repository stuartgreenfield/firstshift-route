# Screen rules: Route and Navigate

Written 16 November 2026, step 1 of the Screen space and UI review (https://claude.ai/artifact/N58T4gxBaVdoSe5yHvVuWw).
Every new window or button follows these rules, and `tests/screen-rules.js` checks them at five screen sizes before anything goes to the test copy.

## One place for each kind of thing

| Kind | Where it goes | Notes |
|---|---|---|
| Top bar | Top edge of the chart | Race, start time and the tool buttons. On a phone held sideways, Night and Astro leave it (Night is in Settings, Screen; Astro is in Layers). |
| Instrument strip (Navigate) | Under the top bar | Hidden on a phone held sideways while the big GPS window is open, which shows SOG and COG. |
| Chart | Everything else | Nothing is placed on it except the items below. |
| Round buttons | One group at the right edge of the chart, bottom up | On a phone held sideways (under 500 high) they line up along the foot of the chart, right to left, a second row if needed. A button the user has dragged keeps its place. |
| Man overboard | Bottom left, over everything | Nothing may cover it, and it may not cover a button: windows on a phone keep clear of its column. |
| Pop-ups (Layers and the like) | Under the top bar and instrument strip, right side | Never over the second row of top-bar buttons. |
| GPS window | Foot of the chart; the small pill at the right | Fits between the top bar (or strip) and the foot of the chart, scrolling if it must. On a phone held sideways the small pill sits under the top bar. |
| Bottom sheet or side panel | Below or beside the chart | One at a time. |

## While a window is open

- A round button that the window would cover steps out of the way until it closes, on every screen.
- On a phone every round button steps aside while a window or bar is open (decided 16 Nov 07:48); man overboard stays.

## What the test fails on

1. Anything placed over the page that runs off the screen.
2. Any window or button group that covers another (man overboard may sit over a window, never under one).
3. Two buttons on top of each other where both can be seen.

It also reports, for each screen and state, the chart's share of the screen and the number of buttons smaller than 44 points (Apple's minimum touch size; Google's is 48).

Screens: phone upright 390 × 664, phone sideways 750 × 342, tablet upright 800 × 1280, tablet sideways 1280 × 800, PC 1920 × 1080.
States: routed with nothing open, Layers open, GPS window open, GPS window minimised.

Run: `node tests/screen-rules.js http://localhost:8779` (Route) and `http://localhost:8778` (Navigate).
