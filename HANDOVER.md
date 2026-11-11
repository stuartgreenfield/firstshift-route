# FirstShift Route: handover (updated 11 Nov 2026, 14:10)

Live: https://firstshift-route.pages.dev/cervantes/ and /fastnet/ (v0.5.0). Repo: github.com/stuartgreenfield/firstshift-route (main).

## How it runs
- forecast.yml, four times a day (01:17, 07:17, 13:17, 19:17 UTC, back-up at :47): fetch.py downloads the models, build.py builds packs for each race in the command (cervantes fastnet), publishes site/ to the 'site' branch (Cloudflare Pages), then preroute.js routes each race for the standard settings for the next 6 start hours and publishes again.
- chartdata.yml, weekly: TSS (OSM and SHOM) and lights/buoys into site/zones/.
- App files live in site/cervantes/ and are copied to every other race page by build.py. sw.js is the offline worker (network first, kept copy when there is no signal).

## Docs
- docs/REQUIREMENTS-LOG.md: every request, newest first, with status.
- docs/FAULTS.md: fault-finding list.
- Test card (to-do and feedback): https://claude.ai/artifact/YFzQi6rjdcpdww3Nrg31sw

## Waiting on Stuart
- Plotter make and gateway details beyond "B&G Zeus" (which Zeus).
- UKHO reply (English-side TSS, tidal streams).
