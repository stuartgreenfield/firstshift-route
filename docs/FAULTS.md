# FirstShift Route: fault-finding list

Faults Stuart or testing has found, with what was checked and the fix. Newest first.

| # | Reported | What | Where | Status |
|---|---|---|---|---|
| F03 | 11 Nov 13:03, Stuart | Cannot see all the model routes on the chart | Fastnet chart | Fixed in the next publish: not a routing error. The five routes run within about 0.7 nm of each other for half the race (up to 8.6 nm apart off the Rock), so the thick chosen route drawn on top hid the rest. The chosen route is now a wide band underneath with every route drawn on top. After: fault-f03-after.png |
| F02 | 11 Nov 12:59, Stuart | Pinch to zoom does not work on iPhone | Chart, iPhone Safari | Fix in the next publish: Safari's own pinch gesture now zooms the chart instead of the page. Emulated pinch tested; needs checking on a real iPhone |
| F01 | 11 Nov 12:54, Stuart | Replay slider glitches and the boat jumps at about 84h 48 since start (Sun 15 Nov 01:47), Fastnet demo, Sunrise 95%, on the return leg near 4°W. Screenshot: fault-f01-slider-jump.png | Fastnet, Decision replay | Fixed in the next publish: the replay stalled for about 0.2 s every few hours of race time (the browser tidying memory while redrawing), and at 3 h a second each stall skipped the boat about 40 minutes ahead. The replay now never advances more than one frame's worth at a time. Still to do: cut the redraw work so the stalls go too. Profiled 11 Nov 14:50: the stalls are the canvas drawing itself (stroke, fill and text for every wind barb and tide arrow, each drawn separately), not memory. Fixed 14:58: all barbs now drawn as one path per frame; slider redraw p95 from 165 ms to 5 ms |
