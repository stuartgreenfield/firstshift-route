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
