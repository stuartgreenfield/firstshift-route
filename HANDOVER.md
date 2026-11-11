# FirstShift Route: handover (updated 11 Nov 2026, 14:10)

Live: https://firstshift-route.pages.dev/cervantes/ and /fastnet/ (v0.5.0). Repo: github.com/stuartgreenfield/firstshift-route (main).

## How it runs
- forecast.yml, four times a day (01:17, 07:17, 13:17, 19:17 UTC, back-up at :47): fetch.py downloads the models, build.py builds packs for each race in the command (cervantes fastnet channel-area northsea-area), publishes site/ to the 'site' branch (Cloudflare Pages), then preroute.js routes each race for the standard settings for the next 6 start hours and publishes again.
- chartdata.yml, weekly: TSS (OSM and SHOM) and lights/buoys into site/zones/.
- App files live in site/cervantes/ and are copied to every other race page by build.py. sw.js is the offline worker (network first, kept copy when there is no signal).

## Areas and models
- Race pages: cervantes, fastnet. Area pages (whole box routable, built by make_static.py from 'regions' in site/courses/rorc.json): channel-area (Myth, De Guingand, Morgan, Dinard, Channel Race, Cherbourg) and northsea-area (North Sea Race). A race's 'page' field says which page opens it; the race menu adds ?race=<id>.
- Wind models: UKV, ECMWF IFS, GFS, AIFS, Met Office Global, DWD ICON-EU (downloaded once for the whole area into work/_shared, then cut per page). Tides: Copernicus NW Shelf and IBI. Waves: Copernicus NW Shelf, ECMWF.
- Meteo-France ARPEGE and AROME: the AWS bucket mf-nwp-models is stale (2019); the current open data is on data.gouv.fr object storage, not reachable from the build container, so it needs testing from GitHub.

## Docs
- docs/REQUIREMENTS-LOG.md: every request, newest first, with status.
- docs/FAULTS.md: fault-finding list.
- docs/BOAT-CONNECTION-RESEARCH.md: linking Route to plotters and gateways.
- Test card (to-do and feedback): https://claude.ai/artifact/YFzQi6rjdcpdww3Nrg31sw

## Cloudflare settings still to do (Stuart)
- AISSTREAM_KEY environment variable (free key from aisstream.io) for /api/ais.
- KV namespace bound as ROUTE_KV for /api/boat/<code>.

## Waiting on Stuart
- Plotter make and gateway details beyond "B&G Zeus" (which Zeus).
- UKHO reply (English-side TSS, tidal streams).
