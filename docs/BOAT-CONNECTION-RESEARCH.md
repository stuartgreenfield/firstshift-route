# Linking Route to the boat: every way in, by make

Research for to-do item 18, 11 November 2026. Aim: Route reads the boat's GPS, heading, wind, speed and AIS with kit the owner already has. Sources are listed at the end; anything marked *to confirm* comes from a single user report or an old page.

## The one technical constraint that decides the design

Every route below ends in one of three forms: **NMEA 0183 sentences over TCP or UDP** (most plotters and gateways), **a WebSocket** (Signal K servers), or **a maker's private protocol** (Garmin, Furuno, Raymarine's own apps).

A web page in a phone's browser cannot open a raw TCP or UDP connection at all. It can open a WebSocket, but a page served over https (as Route is) is blocked from talking to an unencrypted `ws://192.168…` address on the boat's own network. So:

- **The browser version of Route cannot read the boat's data directly.** It keeps using the phone's own GPS (already built: From here, MOB).
- **The FirstShift app version (the same Route inside a thin iPhone and Android app, like Polar Live) can.** The app opens the TCP or UDP port, reads NMEA 0183, and hands it to Route. Polar Live already reads NMEA over Wi-Fi on Android, so that code is the starting point.

## What each make does on its own (no extra box)

| Make | Plotter Wi-Fi gives third-party apps | How Route would connect | Notes |
|---|---|---|---|
| **B&G** (Zeus 3, Zeus 3S, Zeus SR, Zeus S) and **Simrad** (NSS, NSX) | NMEA 0183 over TCP. Users report: turn on the plotter's Wi-Fi hotspot, enable "NMEA 0183 over TCP" in network settings, connect on **port 10110** | App joins the plotter's hotspot, opens TCP 10110 | This is Morning After's route. AIS in that stream *to confirm on board*: one Expedition user found B&G's separate WebSocket feed "does not send AIS data" |
| **Raymarine** (Axiom, older a/c/e/eS/gS) | Raymarine's own page says Wi-Fi is for Raymarine's apps; for NMEA it points to a third-party NMEA 0183 or NMEA 2000 to Wi-Fi interface | Needs a gateway (below) | Page covers the older series and may be out of date for Axiom; *to confirm* |
| **Garmin** chartplotters | Garmin's network is closed to third parties. **Exception:** Garmin's own help says a Garmin VHF with Wi-Fi broadcasts NMEA 0183, including data from the NMEA 2000 network, on **TCP port 39150** | If the boat has a Wi-Fi Garmin VHF: TCP 39150. Otherwise a gateway | |
| **Furuno** TZtouch2, TZtouch3, TZT XL | Shares "position, course and speed over ground, heading, depth, wind and AIS" over Wi-Fi, but only to TimeZero's apps (TZ iBoat, paid Essential plan); protocol not published | Not open to Route; needs a gateway | |
| **Vesper** Cortex (AIS and VHF) | Has its own Wi-Fi and serves NMEA to apps (port in its manual) | TCP to the Cortex | *to confirm* port and sentence set |
| **Victron** Cerbo GX (if fitted) | Runs a Signal K server | WebSocket via the app | Common on newer cruiser-racers |

## Morning After: B&G Zeus 3 (confirmed by Stuart, 11 Nov 2026)

Same Navico family as the Zeus 3S. On the plotter: turn on its Wi-Fi hotspot and enable NMEA 0183 over TCP in the network settings. A third-party autopilot guide gives the plotter's usual address on its own hotspot as **192.168.76.1**, port **10110**. Dock test from a Mac joined to the Zeus hotspot, in Terminal: `nc 192.168.76.1 10110` should scroll NMEA sentences; lines starting `!AIVDM` mean AIS is in the stream. Source: [PCNautic Autopilot guide, B&G, Simrad and Navico](https://pcnautic.gitbook.io/autopilot/navigation-and-data-connections/b-and-g-simrad-navico.md).

## Gateways the owner may already have

If any of these is aboard, Route connects to it rather than the plotter. All carry AIS.

| Gateway | What it serves | Default |
|---|---|---|
| **Yacht Devices YDWG-02** (NMEA 2000 Wi-Fi) | NMEA 0183 and RAW over TCP and UDP at once; converts NMEA 2000 AIS to VDM/VDO sentences | Own network "YDWG" at 192.168.4.1, server 1 on TCP 1456; or joins the boat's Wi-Fi |
| **Yacht Devices YDWN-02** (NMEA 0183 Wi-Fi) | NMEA 0183 over TCP and UDP | Similar set-up |
| **Digital Yacht** WLN10, WLN10HS (AIS rate), AIT3000 (AIS transponder with Wi-Fi), iAIS | NMEA 0183 over Wi-Fi | Per manual |
| **Actisense**, **Quark-elec**, **Comar NMEA-2-WiFi** | NMEA 0183 over TCP or UDP | Per manual |
| **Signal K server** (Raspberry Pi with OpenPlotter, Victron Cerbo) | WebSocket and REST on the usual web ports; its NMEA 0183 data server for older apps | Entry point at `http://«host»/signalk`; TCP and UDP services on port 8375 |

## Getting the data off the boat when nobody is aboard with a phone

Mobile signal or Starlink only matters for the server and the shore: forecasts in, positions out (friends and family view, item 29). The link from instruments to Route is always the boat's own Wi-Fi; no internet is needed for it.

## Recommendation

1. **Build the reader once, in the FirstShift app wrapper:** NMEA 0183 over TCP or UDP with a host and port the owner types in, plus a short list of presets: B&G or Simrad 10110, Garmin VHF 39150, Yacht Devices 1456, Signal K 8375 and WebSocket. That covers B&G, Simrad, Garmin with a Wi-Fi VHF, every gateway above and Signal K.
2. **Sentences to read:** RMC and GGA (position, time), VTG (COG, SOG), HDG or HDT (heading), MWV and MWD (wind), VHW (speed through water), DPT or DBT (depth), VDM and VDO (AIS).
3. **Morning After first:** confirm the Zeus model and that the TCP stream carries AIS, then test at the dock.
4. **Raymarine, Furuno and Garmin without a Wi-Fi VHF need a gateway.** That breaks the no-new-kit rule for those owners, so Route says so plainly and keeps working from the phone's GPS.

## Sources
- [qtVlm forum: NMEA from a B&G Zeus 3S over Wi-Fi (port 10110)](https://meltemus.com/index.php/en/forum/qtvlm-application/659-get-nmea-data-from-b-g-zeus-3s-to-qtvlm-over-wifi)
- [Expedition forum: B&G WebSocket feed without AIS](https://expedition.boardhost.com/viewtopic_mobile.php?id=2617)
- [Raymarine forum: NMEA over Wi-Fi with Wi-Fi equipped MFDs](https://forum.raymarine.com/showthread.php?tid=380)
- [Garmin: accessing data over the Wi-Fi network (TCP 39150)](https://www8.garmin.com/manuals/webhelp/GUID-376DCF06-863E-4772-9B73-834F8852F379/EN-US/GUID-F9A8FF9A-A9CB-450C-A149-BC4889C9E44C.html)
- [TimeZero: Furuno TZtouch2 and TZtouch3 with TZ iBoat](https://userguide.mytimezero.com/tz-iboat/InstrumentsConnection/Furuno_TZtouch_2_and_TZtouch_3.htm)
- [Yacht Devices YDWG-02 manual](https://www.yachtd.com/downloads/ydwg02.pdf)
- [Signal K specification: URLs and ports](https://signalk.org/specification/1.7.0/doc/urls_ports.html)
- [Digital Yacht: getting NMEA data to an iPad or iPhone](https://digitalyacht.net/getting-nmea-data-to-an-ipad-or-iphone/)
- [Vesper Cortex Hub installation guide](https://defender.com/assets/pdf/vesper/cortex_hub_installation_guide_626-00003-b_apr22.pdf)
