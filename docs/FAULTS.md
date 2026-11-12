# FirstShift Route: fault-finding list

Faults Stuart or testing has found, with what was checked and the fix. Newest first.

| # | Reported | What | Where | Status |
|---|---|---|---|---|
| F05 | 11 Nov 16:20, forecast job | North Sea page: no way out from the start | North Sea area | Fixed: the start sat inside Harwich harbour (51.947, 1.29); moved to open water off Harwich (51.93, 1.40), marked approximate |
| F04 | 11 Nov 16:20, forecast job | Fastnet: UKV and ICON-EU routes found no way through | Router | Fixed: outside a regional model's area (UKV stops short of the Fastnet Rock) the wind came back as calm; the other models now carry on there |
| F03 | 11 Nov 13:03, Stuart | Cannot see all the model routes on the chart | Fastnet chart | Fixed in the next publish: not a routing error. The five routes run within about 0.7 nm of each other for half the race (up to 8.6 nm apart off the Rock), so the thick chosen route drawn on top hid the rest. The chosen route is now a wide band underneath with every route drawn on top. After: fault-f03-after.png |
| F02 | 11 Nov 12:59, Stuart | Pinch to zoom does not work on iPhone | Chart, iPhone Safari | Fix in the next publish: Safari's own pinch gesture now zooms the chart instead of the page. Emulated pinch tested; needs checking on a real iPhone |
| F01 | 11 Nov 12:54, Stuart | Replay slider glitches and the boat jumps at about 84h 48 since start (Sun 15 Nov 01:47), Fastnet demo, Sunrise 95%, on the return leg near 4°W. Screenshot: fault-f01-slider-jump.png | Fastnet, Decision replay | Fixed in the next publish: the replay stalled for about 0.2 s every few hours of race time (the browser tidying memory while redrawing), and at 3 h a second each stall skipped the boat about 40 minutes ahead. The replay now never advances more than one frame's worth at a time. Still to do: cut the redraw work so the stalls go too. Profiled 11 Nov 14:50: the stalls are the canvas drawing itself (stroke, fill and text for every wind barb and tide arrow, each drawn separately), not memory. Fixed 14:58: all barbs now drawn as one path per frame; slider redraw p95 from 165 ms to 5 ms |

## F06 Scheduled forecast builds skipped (11 Nov)
GitHub ran only the 07:47 back-up schedule today; 13:17 and 13:47 did not start. Manual dispatch at 19:00. Fix options: an outside timer (Cloudflare cron or a scheduled task) that calls the workflow dispatch. Open.
Update 20:25: the 19:17 schedule did run, but at 20:14 (57 minutes late). GitHub delays and sometimes drops scheduled runs at busy times.

## F07 Fastnet pre-routes stop after 2 of 6 start times (11 Nov)
Channel and North Sea pages got all 6; Fastnet only 2 in the 19:30 publish. GitHub's log download fails through our connection, so the cause is not confirmed. Changed: Fastnet routed first, 25 minutes allowed per start, step 75 minutes, and each page now writes pre/log.json on the live site. Check after the next run.

## F08 Scheduled publish overwrote the newer app (11 Nov)
The 19:00 build started from main before v0.5.1 was committed and published the older app at 19:30. Re-overlaid at 20:22; later builds take v0.5.1 from main. Rule: do not overlay app changes while a build is running without re-checking after it publishes.

## F09 Out-and-back marks rounded short (11 Nov) - fixed
Eddystone (Myth) rounding line lay along the course, 10 nm long: routes turned 10 nm short. Same geometry stopped the Fastnet routes at Fastnet Rock. Now a turn-back mark has its line square across the course.

## F10 Race opened on a page without its forecasts (11 Nov) - fixed
The remembered race (Myth) opened on the Cervantes page, whose forecasts start east of Swanage. A race now always opens on its own page.

## F11 Area pages only 66 h / 54 h of forecast (11 Nov) - fixed
Now 135 h, like the Fastnet.

## F12 Forecast build published an older app (F08 again) - fixed
The job now takes the newest app from main just before each publish.

## F13 Marks rounded at the far end of the gate line (11 Nov) - fixed
A mark is a short line from the buoy on the side the boat must not pass. Any crossing counted, either way round, anywhere along the line. Routes "rounded" Fastnet Rock about 24 nm south of the Rock by going round the line's far end, and Eddystone could be taken on the wrong side. Now the line is a wall the wrong way round, and a rounding only counts within 6 nm of the mark. Fastnet routes are 3 to 6 h longer: the honest answer.

## F14 Sails inventory drop-down looked dead (11 Nov) - fixed
Choosing an inventory only showed a Replace button, which then asked for a second tap. Now the choice applies at once, with Undo.

## F15 Port and starboard shown the wrong way round (found 12 Nov) - fixed
The router's true wind angle is heading minus wind direction, so a negative angle has the wind on the starboard side. The readings strip (141P), the chart tip and Ask Route's next tack labelled it the other way. Laylines were right. Fixed in all three; routes were never affected.

## F16 Layer switches stopped working (12 Nov, about 00:00 to 00:25) - fixed
Adding the isochrones switch broke the if/else in the Layers panel, so ticking wind, tide and the other layers threw an error. Live for about 25 minutes.

## F17 Clock showed Thu 1 Jan 00:00 (12 Nov) - fixed
Saved settings (a saved race or the boat code) put back a start time that had passed. It was no longer in the start list, so the list went blank and Route read the start as 0: 1 January 1970, a Thursday. Saved choices that no longer exist are now skipped, and routing never starts from a blank list.

## F18 Race boat TCC box vanished as soon as it opened (12 Nov) - fixed
The AIS target table was rebuilt on every frame of the chart (every slider move and every replay frame), so a tapped Race boat button was replaced before the TCC box could be used. The table now redraws at most every two seconds, never while a TCC is being typed, and an open box survives a redraw.

## F19 iPhone: top bar pushed off the screen after the set-up (12 Nov) - fixed
Stuart's iPhone screenshot at 01:31: the top bar was gone and a gap sat below the time slider. Focusing a field in the set-up scrolled the page's own body (overflow hidden still scrolls by focus), shifting the whole app up. Route now puts the page back when a field loses focus, when the keyboard closes and whenever the body scrolls with no field in use.

## F20 No routes in the Channel, Fastnet and Cervantes after the 04:23 build (12 Nov) - fixed
The 04:23 forecast build was the first to carry the Ifremer MARS 500 m tidal streams. Where MARS covers, the router lays MARS over the chosen tide model, but the code fetched the fallback model by calling itself, so it looped until the browser gave up ("Maximum call stack size exceeded"). Every route failed in the three areas MARS reaches; North Sea, Irish Sea and Biscay were unaffected. The same fault stopped the build making pre-routes. The fallback is now the plain tide model. All six areas tested routing locally, then the build was re-run to restore the pre-routes.

## F21 Channel Race failed on Stuart's phone with no message (12 Nov 06:08) - fixed
Routing worked locally on all five Channel races, so the likely cause is the phone's kept copy of the pre-routes from before the 04:23 build, whose pre-routes were lost to F20. When an instant pre-route could not be used, Route stopped without routing fresh and without saying anything. It now falls back to a fresh route. Any routing or forecast failure also shows a red banner with Try again, and a route still running after two minutes with nothing to show says so.

## F22 New course: old routes stayed on the chart and refining carried on (12 Nov 06:28) - fixed
Stuart: starting a new course must close the old route, keep it as old routes, show the whole area and go through the set-up. New course now keeps the routes on the chart under Races, Old routes (six at most, Open puts them back exactly as they were), stops any routing still running so nothing old comes back, shows the whole forecast area to draw on, and after saving goes through every set-up step from step 1.

## F23 Set-up step 1 would not go on with TCC 2, and the reason was easy to miss (12 Nov 07:04) - fixed
Stuart's screenshot: the TCC accepted only 0.8 to 1.8, and the refusal was a small grey line by Next. The range is now 0.700 to 2.200 (the biggest maxis), a refusal shows in red beside Next, the box to fix is outlined in red and brought into view, and the step progress bar no longer overlaps the text when the step scrolls.

## F24 A drawn course routed along the edge of the forecast data (12 Nov 07:34) - fixed, new area building
Stuart's screenshot: routes zig-zagged along 49 00N. At 06:55 I had let drawn courses use the Fastnet page's forecasts, but that page's data stops at 49 00N, and the router treats the edge as a wall. The Fastnet page is withdrawn from drawn courses; a proper Celtic Sea and Western Approaches area (48 18N to 52 18N, 10 48W to 2 00W, from Ushant and north Brittany to the south coast of Ireland, out past Fastnet Rock) is added to the forecast build; and Route now warns, in the run note and a red banner, whenever routes run along the edge of a forecast area.

## F25 Start day list stopped after 36 hours (12 Nov 07:38) - fixed
Stuart: the day list should show all dates and say when a day is outside the forecasts. Start choices were capped at 36 hours ahead, a limit from when forecasts ran two days; they now run to six hours before the longest forecast ends (about 9.5 days). After the forecast days the list carries 90 more days under "Later: no forecast yet". A later start shows an amber notice, is kept (even after closing Route), and routes itself once the forecasts reach it.

## F26 Course row on the set-up card did nothing (12 Nov 10:13) - fixed
The tap opened the race menu, then reached the page, whose "tap elsewhere closes the menu" rule shut it at once. The row now stops the tap there. Tested on a computer and an iPhone screen: the menu opens, RORC races lists 9 races, and choosing the Morgan Cup returns to the card with Course ticked.

## F27 Forecast build ran out of time with seven areas (12 Nov 07:41 to 10:41) - fixed
The build fetched the areas one after another. With ECMWF's servers slow (13 to 25 minutes per area for the ECMWF fields, against about 5 overnight) six areas filled the three-hour limit and nothing was published; the live forecasts stayed at the 07:05 build. The workflow now runs one job per area side by side (each with a two-hour limit), then one publish job that starts from what is live, so an area whose fetch fails keeps its last forecasts instead of disappearing, merges the status, pre-routes and publishes.

## F28 Fastnet routes pinned to the edge of the forecast data; untidy warning box (12 Nov 10:58)
The Fastnet page only held forecasts in a corridor about 35 nm wide round the rhumb line, in a box ending at 10 37W, one degree west of the Rock; with today's wind the best routes wanted more room. The Fastnet and Cervantes pages are now whole sea areas, and every area is wider: Fastnet 48 00N to 52 48N, 12 30W to 0 18W; Cervantes 48 54N to 51 12N, 2 48W to 1 12E; English Channel to 6 30W and 2 30E; Celtic Sea to 12 00W; Southern North Sea to 55 00N and 6 30E; Irish Sea to 56 00N and 8 00W; Biscay to 10 30W. The edge warning moves from the red error banner into the checks list, and the banner now wraps its text with the buttons beneath.

The parallel build (run 43202938532, 12 Nov 10:43) finished: every area in 8 to 19 minutes, published at 11:32.

## F29 Traffic separation schemes missing off the Netherlands (12 Nov 11:18) - fixed
Stuart: some TSS look missing off Holland. OpenStreetMap holds the Dutch separation zones but almost none of the lane edges, so the schemes looked like scattered strips. The weekly chart data job now also takes Rijkswaterstaat's official set, Verkeersscheidingsstelsel Noordzee, from PDOK (CC0): 55 separation zones, 10 precautionary areas, 4 areas to avoid, 2 inshore zones, and the lane and deep-water route boundary lines (drawn as solid edges; they include Dover, Sunk, Humber, Jade and Elbe too). Reporting system limits, channel centre lines, turning circles and wind farm clearways are left out. Credited on the terms page and in Settings.

## F30 Button run: every control tapped on a phone and a computer (12 Nov 12:00)
A test taps all 211 buttons, links and lists in turn and records whether anything happens. Nothing did nothing. Faults found and fixed: Open in chart app failed on a browser without a share sheet (now says to use Save GPX); the sail inventory preset and its Undo failed if used before the sails table had loaded; the course edit bar's Undo and Done failed if pressed outside editing. Controls inside lists that redraw themselves (model lists, sail rows, themes) are not followed by the test and were checked by hand flows instead.

## F31 Fastnet routes never rounded the Rock (12 Nov 13:00) - fixed; corrects F28
After the wider Fastnet area went live, the routes still ran to the new west edge (12 30W). The track showed why: every route passed 60 nm south of the Fastnet Rock, swung north-west past it and stalled against the edge, still on the leg to the Rock. The router keeps the front points furthest from the start of each leg; once a route was west of the Rock, turning back east to cross the rounding line always scored worse than pressing on west, so the routes that would have rounded were dropped. F28 blamed the size of the forecast area; that was wrong, although the wider areas stay. Now, for a long-distance rounding mark, front points within 20 nm of the mark are kept in sectors round the mark (closest wins), and sailing on past the mark loses score. All eight Fastnet routes now round the Rock anticlockwise, leaving it to port, and finish at Cherbourg. Myth of Malham (Eddystone), Morgan Cup, Channel Race and every area page re-tested.
