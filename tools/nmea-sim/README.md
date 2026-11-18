# FirstShift boat simulator (F37)

Built 18 Nov 2026 for Stuart's request: "Two boat simulators to test everything virtually: one sends a complete NMEA 0183 stream as a
boat's router does, one an NMEA 2000 stream; normal sailing, every sentence, and faults (dropouts, bad data). All four tools."

## What it is

A pretend boat and a pretend Wi-Fi router. The boat sails a windward-leeward course off Cowes, about 1.2 nm legs: it beats, tacks on
the laylines with a speed loss and a recovery, rounds the windward mark, runs with gybes, rounds the leeward mark and beats again. The
wind shifts (about 8 degrees every 7 minutes) and gusts, the tide sets it, the depth changes with position (with a shoal patch), and
two AIS targets (a yacht and a ferry) move about.

The router sends that boat's data in the same forms as real kit:

| Output | Port | As sent by |
| --- | --- | --- |
| NMEA 0183 over TCP | 10110 | B&G Zeus, Signal K, the Route+ default |
| NMEA 0183 over UDP (to the whole Wi-Fi) | 2000 | Digital Yacht WLN10 |
| NMEA 2000, Yacht Devices RAW over TCP | 1456 | YDWG-02 / YDWN-02 with a server set to RAW |
| NMEA 2000 ASCII over TCP | 60001 | Actisense W2K-1 data server |
| Control page (web) | 8899 | this tool |

NMEA 0183 sentences: RMC, GGA, GLL, VTG (GPS), VHW (log), HDT, HDG, HDM (heading), MWV apparent and true, VWR, MWD (wind), DPT and
DBT (depth), VDR (tide), XDR (heel, pitch, pressure, air), MTW and MDA (sea temperature, weather), !AIVDM (AIS, Class A and B).
Heading and apparent wind four times a second, the rest once a second.

NMEA 2000 messages: 127250 heading, 127257 heel and pitch, 127258 variation, 128259 boat speed, 128267 depth, 129025 position,
129026 COG and SOG, 130306 apparent and true wind, 130312 and 130316 temperatures, 130314 pressure.

## Faults (switch on from the control page, for 30 seconds or until off)

| Fault | What happens |
| --- | --- |
| silence | Nothing sent: the router has gone quiet |
| drop (a feed) | One feed stops: gps, log, wind, heading, depth, env, attitude, tide or ais |
| freeze (a feed) | One feed sticks at its last values |
| spike (a feed) | Wild values now and then (depth 0 or 999 m, 45 kn boat speed, 199 kn wind) |
| badck | One line in five with a wrong checksum |
| garbage | Junk lines: half lines, noise, unknown sentences |
| empty | Value fields left empty |
| gpsinvalid | GPS with no fix (RMC and GLL V, GGA quality 0) |
| jump | Position jumps 5 nm |
| twogps | A second GPS 40 m away also sends |
| magonly | Magnetic heading only, no variation |
| twbad | Instruments' true wind 20 degrees off |
| n2kna | NMEA 2000 "not available" values |
| nocksum | Sentences without a checksum |
| slow, burst | A fifth of, or ten times, the normal rate |
| split, endings | Lines cut across packets; CR-only or LF-only line ends |
| disconnect | Every connected device is dropped |

## How to run it

Needs Node.js (free, nodejs.org) on a Mac, PC or Raspberry Pi. In this folder:

    node server.js
    node server.js --tws 18 --drift 2      (stronger wind, more tide)
    node server.js --log today.nmea        (also saves the NMEA 0183 stream to a file)

The phone or tablet joins the same Wi-Fi as that computer. In Route+ (Settings, Instruments, Boat link) choose "Something else", type
the computer's address shown at the top of the control page, the port from the table, TCP (or UDP for port 2000). Open
http://(the computer's address):8899 on any browser to watch the boat and switch faults on and off.

## The automated test

`tests/nmea-sim.js` sails the boat for four minutes in each of the three streams, feeds everything into Route+ and compares every value
Route+ reads with the simulator's own figures, then runs the faults. Run: `node tests/nmea-sim.js http://localhost:8768` with
`tools/devserver.py` serving.

First run, 18 Nov 2026: 54 passed, 1 failed, 3 findings.

- **Failed (a real fault in Route+):** a router that sends both DPT and DBT (B&G does) makes the depth flick between two values each
  second. DPT gives depth below the surface (10.93 m with the 0.5 m offset); DBT, a moment later, overwrites it with the depth below
  the transducer (10.4 m). Fix: ignore DBT while DPT is arriving.
- **Finding:** two GPS sources on the network (GP and GN, 40 m apart): Route+ takes whichever spoke last, so the boat jumps between them.
  A choice of GPS source (or the first one heard) would cure it.
- **Finding:** depth spikes of 0 m or 999 m are taken as real readings for the figure shown (the shallow alarm already uses the median
  of three, so it is not fooled).
- **Finding:** a frozen log (boat speed stuck while the GPS speed moves) is not spotted. A stuck-sensor warning could be added.

## Not yet

- Multi-frame NMEA 2000 messages (AIS over 2000, GNSS details): Route+ reads those from NMEA 0183 for now, so the simulator does not send them.
- Two-way data (Route+ sending waypoints to the plotter): the router accepts what the app sends and ignores it for now.
- A version that runs inside the app itself on the phone (Practice already does a simpler job there).
