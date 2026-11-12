# Live AIS when online: options (researched 12 Nov 2026)

Stuart, 12 Nov: the free feed is not fit for purpose; research how to get proper AIS on screen when Route is online.

## Today
aisstream.io: free, volunteer receivers, about 1 to 2 messages a second per area measured on 12 Nov (Dover Strait: 4 ships in 9 s), 3 connections per account. Route's server listens 14 s per area and remembers targets 20 min, which helps, but coverage is thin.

## Options
| Option | Cost | Coverage | Fit for Route |
|---|---|---|---|
| AISHub: share our own receiver, get the combined feed | Receiver kit: dAISy HAT dual-channel £75.90 (The Pi Hut) + Raspberry Pi + VHF antenna and cable; free data after | 1,797 stations in 82 countries (aishub.net); combined network | One area call a minute, cached on Route's server for every user. Terms on public use still to be read |
| MyShipTracking API | Basic €90/month, 50,000 credits; Standard €185, 200,000; Unlimited €350/month (apis.io listing, unconfirmed by the provider) | Terrestrial network | 1 credit per vessel returned (3 extended), so a busy Channel view of 300 ships costs 300 credits a call: only Unlimited works for a shared live view. Redistribution terms to check |
| VesselFinder Custom Area API | Monthly subscription quoted on request (area size, traffic, call rate) | VesselFinder terrestrial network | Built for exactly this; price unknown until asked |
| Datalastic | Starter 20,000 credits, Growth 80,000, Developer Pro unlimited; prices not shown in text | Includes Area Traffic Scan | Ask for prices |
| Boat's own AIS through the phone app (t38) | Free, kit already aboard | VHF range, every target, live | The real answer at sea; needs the 2027 app |

## Recommendation
1. Now, free and best value: put a receiver up in Cowes (good Solent and approaches coverage), share it with AISHub, and switch Route's server from aisstream to AISHub (one call a minute for the whole area, cached). Keep aisstream as a second source. Read AISHub's terms first.
2. If that is still thin offshore: ask VesselFinder and MyShipTracking for a quote for a shared, cached area feed for a free public tool, and confirm they allow it.
3. At sea: the boat's own AIS through the app (t38) stays the only complete source; internet AIS is for the shore and for coverage near land.

Sources: aishub.net, aishub.net/api, api.myshiptracking.com/docs/vessels-in-zone, apis.io/plans/myshiptracking, vesselfinder.com/vessel-positions-custom-area-api, datalastic.com/pricing, thepihut.com dAISy HAT.
