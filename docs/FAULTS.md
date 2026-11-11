# FirstShift Route: fault-finding list

Faults Stuart or testing has found, with what was checked and the fix. Newest first.

| # | Reported | What | Where | Status |
|---|---|---|---|---|
| F02 | 11 Nov 12:59, Stuart | Pinch to zoom does not work on iPhone | Chart, iPhone Safari | Fix in the next publish: Safari's own pinch gesture now zooms the chart instead of the page. Emulated pinch tested; needs checking on a real iPhone |
| F01 | 11 Nov 12:54, Stuart | Replay slider glitches and the boat jumps at about 84h 48 since start (Sun 15 Nov 01:47), Fastnet demo, Sunrise 95%, on the return leg near 4°W. Screenshot: fault-f01-slider-jump.png | Fastnet, Decision replay | Fixed in the next publish: the replay stalled for about 0.2 s every few hours of race time (the browser tidying memory while redrawing), and at 3 h a second each stall skipped the boat about 40 minutes ahead. The replay now never advances more than one frame's worth at a time. Still to do: cut the redraw work so the stalls go too |
