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
