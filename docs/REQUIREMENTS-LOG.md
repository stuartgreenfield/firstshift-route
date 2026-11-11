# FirstShift Route: requirements log

Every requirement Stuart has asked for, newest first, with its status. Kept in the repository (docs/), on Stuart's Mac (FirstShift tools site/routing/) and summarised in the routing doc ("Requirements: running list").
Status: Built · Partly built · To build · Researching · Later.

## 11 November 2026
| Time | Requirement | Status |
| --- | --- | --- |
| 12:05 | Route immediately with the latest forecast; when new data arrives, a button 'New data: update routing' | Built: checks every 5 minutes |
| 12:03 | Sunrise: TCC 1.098 confirmed; fully crewed, 450 kg crew | Logged; crew weight as a boat setting later |
| 11:28 | Fastnet demo starting now: Sunrise at 95% polars; play and speed up showing conditions on the chosen route; finish time box for every route and the combined route | Built (Fastnet live race, finish boxes) |
| 11:22 | Show when each forecast reached the server and its age on the device | Built |
| 10:20 | If the server has no forecast, the tool fetches forecasts itself over the internet | Proposed: light fallback from Open-Meteo (wind, waves along the course); awaiting Stuart |
| 10:18 | See and use the full tool in the browser pane regularly | Done: opened in the pane; reloaded at each new version |
| 10:16 | Boat code for several devices at once (no login) | Approved; to build |
| 10:16 | Connect to NMEA over the boat's wifi if it has one, otherwise mobile or Starlink; no new equipment to buy | Agreed; NMEA over wifi needs the free FirstShift app wrapper |
| 10:16 | Logins later (paid version) | Later |
| 10:16 | Routes made on one device visible on the others, plus a local route on each | To build with the boat code |
| 10:08 | Regular demo of each version, a to-do list, and competitor-inspired ideas; feedback saved per item | Built: test card (claude.ai/artifact/YFzQi6rjdcpdww3Nrg31sw) with video, checklist, to-do, ideas |
| 10:11 | Work out use on phone, Mac, PC and tablet at the same time without a login | Answered: boat code |
| 17:13 | How does Google Play work for us? | Answered; to do (item 39): personal Play account, Polar Live closed test with 12 testers for 14 days, then production |
| 17:09 | Will Route be on the Wix site like the other tools? | For later (items 36 to 38): route.firstshiftsailing.com, Route card on the tools site and Wix Tools page, phone app for the boat connection |
| 17:06 | Standard warning box on every RORC course: check against the sailing instructions; some courses only published the day before and can change up to the start | Built (item 35) |
| 16:50 | All courses, from the race list or made by hand, editable on screen and in the list of marks; marks enterable as latitude and longitude | To do: item 34, starting now |
| 16:25 | (item 2) More wind models | Built: Meteo-France AROME (2.5 km, 48 h) and ARPEGE (0.1°, 102 h) from Meteo-France open data, tested on GitHub; in the forecast job with ICON-EU. A run with all of them started 15:22 UTC |
| 15:50 | (items 7, 25, 6) Boat code, AIS owe/get, laylines | Built: boat code (needs a Cloudflare KV binding), owe/get for AIS race boats, laylines to the next mark. Depth with tide height researched and parked (needs a datum model) |
| 15:01 | Test card notes: unclear items 1 and 2, course editor menu vanishes and needs a start time, how to go back to the forecast, screen drop-down, export and crew sharing need explaining, how to change play speed | Built 15:20: speed button by Play, Forecast changed note with Back to the forecast, OFFLINE label on phones, start time in the course editor, screen menu, Send to crew (WhatsApp) with an opening link, clearer card wording |
| 15:35 | (items 4, 27, 28) Route comparison, Ask Route, crew sharing | Built: Compare the routes table, Ask Route with read-aloud, Send to crew |
| 14:48 | AIS comes over the Zeus NMEA feed; build a test engine that emulates AIS over that channel and live test from a free online server | Built: AIS engine (decode and encode !AIVDM), targets, CPA alarm, test fleet in the app, Zeus 3 TCP emulator (scripts/ais-emulator.js), live relay /api/ais for aisstream.io. Waiting: free aisstream.io key |
| 14:45 | Morning After's plotter: B&G Zeus 3 | Logged; dock test for the Wi-Fi stream and AIS written up in BOAT-CONNECTION-RESEARCH.md |
| 14:40 | (item 1) Forecasts for the whole area | In progress: English Channel and southern North Sea area pages added to the forecast job; every Channel race and own courses inside the box route there. Irish Sea, Ireland and Biscay next |
| 14:30 | (item 5) Man overboard | Built |
| 14:25 | (item 18) Plotter connection research | Done: docs/BOAT-CONNECTION-RESEARCH.md |
| 14:06 | Continue the list unattended for 2 hours; skip anything needing Stuart's input; save to Mac and GitHub | Working through: MOB, plotter research, whole-area forecasts |
| 14:02 | Load a new race or build your own course | Built: race menu (tap the race name), My races on the device, course editor (items 10, 31, 32) |
| 13:57 | Route button out of the header; logo in its own box, race name in a second box | Built: routes on closing Settings after a change; Route again in Decision |
| 13:55 | Settings: Boat tab rendering wrong, tab strip cut through | Fixed |
| 13:32 | Slider to dim wind barbs and tide arrows | Built (item 33) |
| 13:25 | Use the FirstShift logo colours and sails logo through the tool | Built: sails mark, two blues for controls, pink kept as Route's tool colour |
| 13:23 | Start a new race without losing the running one; menu for RORC races or own course | Built 14:02 (items 31, 32, 10) |
| 13:17 | Dark mode: lighter surfaces per layer rather than edges only | Built |
| 13:14 | Moon button cycles night red, dark and light | Built |
| 13:13 | Reload takes a few seconds; offline at sea? | Answered; offline mode built (item 11) |
| 12:59 | iPhone pinch not working; dark mode as default | Fixed (F02); dark default (item 30) |
| 12:54 | Replay slider glitch | Fixed (F01) |
| 12:38 | Vision: flexible, no logins, phone-first best-of-breed UI, fast, voice/text/picture help, route choice with polar, wind and tide overrides, reroute from position, AIS competitors in range and over the horizon when online, Q&A while racing, crew moments, friends and family view | Assessed with Stuart and approved: to-do items 21 to 29. Satellite AIS, AI answers and YB feed flagged as cost or third-party |
| 12:17 | Research every way to link Route to onboard plotters and instruments, all manufacturers (NMEA 0183, NMEA 2000, wifi, gateways) | To do: research job added to the list |
| 12:14 | Charts: build options 1 and 2 (GPX/KML export, help, open-in buttons); keep Route free of other businesses | Approved: to build. Option 3 (licensed charts) not pursued |
| 12:14 | Routing must be almost instant once forecasts are loaded | Measured: Fastnet, 5 solutions, 54 s on a 2-core test machine. Plan: server pre-routes on each forecast, quick first route then refine, faster engine |
| 12:12 | Open-Meteo device fallback when GitHub has no forecast | Approved by Stuart: to build |
| 12:12 | Morning After plotter: B&G Zeus | Noted: Zeus wifi hotspot can send NMEA 0183 over TCP port 10110 (user reports); Route needs the app wrapper to read it; model to confirm |
| 10:01 | Morning After: AIS transponder on NMEA 2000, broadcast across the boat network | Noted: needs a NMEA 2000 wifi gateway or Signal K to reach Route; gateway make to confirm |
| 10:01 | Online AIS: prefer a free service rather than a FirstShift receiver | Agreed direction: aisstream.io through a FirstShift relay; AISHub receiver later if coverage is thin |
| 10:01 | UKHO tidal stream enquiry | Stuart sending it |
| 09:59 | GeoGarage and C-MAP chart download button and help | Researched: both need a partner licence to show their charts inside Route; route export (GPX, KML) and help can be built now. Awaiting Stuart's choice |
| 09:57 | Use NavimetriX as the model for the route comparison screen | Waiting: NavimetriX window not visible to Claude |
| 09:51 | Traffic separation schemes in the tool, switchable, usable as no-go zones | Built: layer plus "keep out" switch; data from OpenStreetMap and Shom, refreshed weekly. Race keep-out boxes from sailing instructions (Fastnet 2025 entered) |
| 09:51 | Main buoys and lighthouses in RORC race areas as a simple list, shown on the basic chart; not for navigation | Built: lighthouses, cardinal, safe water, isolated danger and named special buoys from OpenStreetMap |
| 09:51 | Constant list of requirement changes, Mac kept up to date, regular progress report, better communication | Running: this log, progress report doc (claude.ai/artifact/FQpEkDnC8W41DzVSeAS743), Mac copies |
| 09:52 | Check the weather downloads are working and complete | Answered: all 9 sources from 00Z; back-up run added |
| 09:48 | Screen settings Light, Dark and Night | Built (Auto, Light, Dark, Night red) |
| 09:47 | CPA alarm with sound for close proximity and flashing boats, following the norm | Researched (IMO SN.1/Circ.243); to build with the targets overlay |
| 09:46 | Target tools: tracks, COG and SOG vectors, CPA, laylines from wind direction, managed and changed at will | To build |
| 09:41 | AIS input: race boats and ships live, online over wifi or mobile, from the boat's system when signal is lost | Researched; build order agreed in the routing doc |
| 09:41 | Identify race boats, assign TCC, show owe or get time and distance for each | To build |
| 09:41 | Man overboard button: locked position, distance, bearing and time, from the boat's or phone's position | To build |
| 09:23 | Icons for Decision, Plan, Fleet and Data tabs; neat and finely rendered | Built (option 1 of each) |
| 09:21 | Boat set three ways: standard list of yachts, TCC or rating, full polar or ORC VPP input screen | Built (generic types; own polar upload; no ORC licence approach) |
| 09:21 | Tune the polar for conditions: upwind, reaching and downwind targets | Built (three sliders) |
| 09:21 | See every route from every wind and tide source before choosing; excellent UI | Partly built (wind routes and decision table); comparison screen to build |
| 09:21 | All RORC races preloaded; previous year's course with a warning when the new one is not published | Built (9 races); routes outside the Cervantes strip need the full-area forecasts |

## 10 November 2026
| Requirement | Status |
| --- | --- |
| Free product for UK, France, Ireland and North Sea; worldwide later as a paid version | Agreed |
| Active area 35.5 to 61.5 N, 15 W to 12 E with a border on the chart; marks outside give "Cannot route" | To build |
| Fetch every free tide source; tide drop-down, all on by default, finest source used where it covers | To build |
| Higher-resolution tides; check free sources, price a licence | Researching (UKHO enquiry drafted) |
| ICON, ARPEGE and AROME models | To build |
| Manual race course entry | To build |
| Many more free gribs; worldwide coverage later; number of simultaneous users | Answered; tiles plan agreed |
| Name FirstShift Route with version numbers | Built (v0.4.1) |
| Server running the forecasts every six hours (option 2) | Built |
| Several weather models with a drop-down, a combined route | Built |
| Several tide models; sea-state gribs adjusting the polar | Built |
| Depth contour slider | Built |
| Interactive chart readout; boat figures only on a route | Built |
| TCC or full polar | Built |
| Fleet at its published TCC around you | Built |
| Re-route from a point with new weather | Built |
| Sail crossover plan | Built |
| Phone, pad and PC layout; fixed time bar; settings sheet; tabs; Night red; x to close | Built |
| Grib resolution and bandwidth choice on screen; grib area cut to the race | Built |
| Wind and tide symbol choice (W2, W5, W6, W7; T1, T3, T5, T6); FirstShift triangles | Built |

## 11 Nov 2026, 17:20 to 17:55
- 40. "make it easy to manually add the sail log wind speeds from - to angles for downwind sails and wind speeds etc research it first". Researched PredictWind sail crossover charts (separate mainsail and headsail charts, templates as a starting point), SailGrib SailChart (TWA by TWS grid, tab-separated .sail file) and UK Sailmakers' crossover guide. Built: Settings, Sails table (name, TWA from and to, TWS from and to), typical inventories, crossover chart with the route's winds as dots and gaps in grey, tap to read, paste a grid. Saved on the device and with a saved boat. Done.
- 41. "also reefs when they go in 1 2 and 3 etc". Reef 1 to 3 by true wind speed, upwind and downwind. Defaults from John Jourdane, "Sailing Under Control as the Wind Increases", Pacific Cup knowledge base: "Reefing begins sooner upwind than downwind because the apparent wind is greater sailing a beat or close reach." Done.
- 42. "can the map move when you move the sider so boats stay in middle of screen and also on auto play - maybe this toggles". Follow the boat button. Done.

## 11 Nov 2026, 18:00 to 19:45
- 43. Polar Live on Google Play: Play-ready bundle built (targets Android 16, edge to edge fixed), store pack on the Mac. Closed test of 12 testers for 14 days needed before production. In progress.
- To-do 7 boat code: Cloudflare KV created and bound as ROUTE_KV, live round trip tested. Done.
- Live AIS: aisstream key added by Stuart as a Cloudflare secret; relay fixed to read aisstream's binary messages; real ships returned. Done.
- Test card round 2 (v0.5.1):
  - Item 1: progress card for loading and routing, with steps, percentage and time left (NN/g guidance). Done.
  - Item 2: OFFLINE tag was under the iPhone notch; now beside the race name. Done.
  - Item 4: new course asks the start day and time first, then Save and route. Done.
  - Item 5: Forecast changed bar moved to the top of the chart. Done.
  - Item 7: numbered steps for Send to crew (with message preview) and for the plotter. Done.
  - Item 8: SPEED button opens a speed menu (adds 6 h a second). Done.
  - Item 9: race boats from AIS with TCC, red ring and Close quarters banner, colours work in light and dark. Done. Sailgate entry list download not done: paste the entry list for now.
  - Item 10: Read it out becomes Stop reading. Done.
  - Item 11: Myth of Malham is listed and routes; explained.
  - Item 13: ICON-EU is live; old page cached on the phone.
  - Item 14: Layers: Show all and Just the route. Done.
  - Item 15: Fleet tab was empty (no 2027 entry lists); added Boats you are racing, add by hand or paste a list. Done.
- Found: GitHub skipped the 13:17 scheduled forecast build (and its 13:47 back-up); a build was started by hand at 19:00. Needs a more reliable trigger.

## 11 Nov 2026, 20:00 to 22:45 (stop and check)
- 47. Guided set-up in the order a sailor thinks (boat, race, start, fleet, check, route); a new course moves to the area page that covers it. Built.
- 48. "some gribs are 3 days some up to 14 ... inform the user": start step shows model by model whether the forecasts cover the race. Built. Longer (10-day) forecasts to do, after researching PredictWind (10 days, AROME then ECMWF chains, ensemble beyond) and NavimetriX (multi-GRIB chaining, ensemble routing).
- "class start ... exact time": exact start to the minute in the set-up, course form and Settings. Built.
- "automated testing ... each upgrade and once a day ... email report": tests/check.js (230 checks, 10 screen sizes); GitHub workflow Check runs after each forecast build, each app change, daily 05:41 UTC and by hand. Email report waits for Stuart's OK.
- "Myth ... doesn't go around the Eddystone": real fault, fixed (out-and-back marks rounded 10 nm short). Also fixed the Fastnet not finishing.
- Fixes from the check: race opened on the wrong page (Myth on Cervantes); every RORC race pre-routed; From here refuses land and recovers; phones on their side; address follows the course; smooth depth layer; area pages keep 135 h.

## 11 Nov 2026, 22:50 to 12 Nov, overnight ("work through the jobs during the night and skip any that needs my input")
- "yes send email": daily email of the morning check, 06:17 UK, scheduled task. Built (to-do 50).
- "north head buoy is half a nautical mile south of north head point" and "eddystone to port": Myth finish at North Head buoy, 50 42.69N 001 35.52W (SCRA 2026 Solent race marks list, mark 1K); Eddystone to port. Done (to-do 51).
- Found while checking the Myth: rounding marks could be "rounded" by sailing round the far end of the router's gate line, up to 24 nm short at Fastnet Rock. Fixed (F13).
- "Sail type panel drop down not working": choosing a typical inventory needed two more taps. Now applies at once with Undo. Fixed (F14).
- Overnight, no input needed: landscape readings row (check failures); forecast build watchdog (to-do 44); Open-Meteo device fallback (17); 10-day ECMWF, AIFS and GFS (48); GPS reroute timer (24); help pictures (22); crew moments through the boat code (28); area overrides (23); router 2.5 to 3 times faster (20); isochrones and tap-to-route (4, idea 7); wind over the water (idea 11); race briefing (idea 3).
- Skipped, needs Stuart: new areas (Irish Sea, Biscay: which first), tide sources and UKHO data (licences), RORC entry list source, friends and family page (YB or RORC permission), Google Play steps, phone design pass (taste), Safari on the Mac.
