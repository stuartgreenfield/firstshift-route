# F44: Mark's start engine in Route and Route+

Stuart, 18 Nov 07:29: "Integrate Mark's start line and starting sequence engine into Route and Route+". It takes in F22 (start plan for
offshore races), F18 (flags) and F30 (spoken start coach), and cures Route's blank time to burn. Answers 18 Nov 15:25 are in DECISIONS.md.

## What Route and Route+ get

| Part | From Mark | In Route and Route+ |
|---|---|---|
| Start sequence bar (countdown, flags, sound) | solent.js sqRender, sqPaint | Yes. Default 5-4-1-0; choices 10-5-0, 10-4-1-0 (Fastnet), 3-2-1-0 |
| Start screen (line picture, bias, ladder, time to burn, moving line) | ssDraw, startMaths | Yes |
| START SEQUENCE and STOP RACE buttons (M71 logic tree) | rbRender | Yes, same places and rules |
| Start screen button in the GPS window | new | Yes, beside Ping boat and Ping pin |
| Spoken start coach (Emma) | startcoach.js | Yes, off by default |
| Solent marks, course builder, first card, test mode | solent.js | No: Route keeps its own courses |

## The gun

Route already asks for your class start. That time is the gun for the sequence and the start screen, and a gun set from the sequence
(for example after a general recall) goes back into Route's start time, as it does in Mark (window.__fsGun).

## The start line, five ways

1. Ping each end with the GPS (Route has this).
2. Shore line (RYS line and the like): run down the transit and ping close inshore (Route has the transit kind).
3. Bearing and distance from one end.
4. Latitude and longitude from the sailing instructions (Mark's typed ends).
5. Touch the chart for each end (as Mark).

Plus a preset: **RYS line**. From the Rolex Fastnet Race 2025 sailing instructions 14.1 and 14.2: the RYS Flagstaff, about 50°46.004'N
001°18.055'W, in line with the white line on the orange diamond on the Castle; outer limit the Williams Shipping Buoy, 50°47.20'N
001°18.55'W, left to starboard, not on the line; inner limit an inflatable up to 200 m from the flagstaff; start to the west. The RYS
sailing instructions give the transit as about 346°T. The preset draws the line from the flagstaff on 346°T to abeam the Williams buoy
(about 2.3 km) and says "check the sailing instructions for this race".

## Time to burn, the cures

1. Below 0.2 kn towards the line Route showed nothing. Now the time to the line uses the speed the boat will reach (Mark's start maths:
   good speed seen, polar, or typed), so it shows while the boat is stopped.
2. "Ping both ends" was shown whatever the reason. Now it says which end is missing, or that there is no GPS fix.
3. A ping with no GPS fix did nothing. Now it says "No GPS fix: the end was not saved".
4. Two ends in one place, or an end on land, were accepted. Now a line under 20 m is refused with a message, and an end on land asks
   "On land: is that right?" (a shore transit end is allowed on the shore).

## F45 inside it

Time to the line allows for speeding up (learnt, typed, or by wind speed), tacks and gybes needed to reach the line (typed, then
learnt), and poorer pointing at slow speed (from the polar).
