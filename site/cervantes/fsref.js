/* Quick reference at sea, in Help for all four tools (Stuart 24 Nov 2026 15:47, night jobs 26 to 29; written 25 Nov). Each topic is
   researched from the source named under it, in our own words except the radio message forms, which follow the MCA's published order.
   Man overboard is for Stuart to check before release. No recordings: these pages are pictures and short text (Stuart 25 Nov 23:13). */
(function () {
  'use strict';
  var T = [
    ['ref-mayday', 'Mayday: how to call', [
      'Use Mayday only when a person or the boat is in grave and immediate danger and you need help now.',
      'On a DSC radio: lift the cover, press and hold the red DISTRESS button until the radio says the alert has gone. If there is time, choose the kind of distress first. Then wait for an acknowledgement, or about 15 seconds, and speak on Channel 16.',
      'On Channel 16, slowly and clearly: Mayday, Mayday, Mayday. This is (the boat’s name, three times), the call sign, the MMSI. Mayday, (the boat’s name, call sign and MMSI). Position (latitude and longitude, or a bearing and distance from a known point). The nature of the distress. The help you need. The number of people on board. Any other information. Over.',
      'Then listen. If nobody answers, repeat the call. Keep the radio on Channel 16.',
      'Source: Maritime and Coastguard Agency, GMDSS VHF DSC procedures for small boat users.']],
    ['ref-panpan', 'Pan-Pan: how to call', [
      'Use Pan-Pan when you are concerned for the safety of a person or the boat but the danger is not grave and immediate: for example a disabled boat in no danger yet, or a crew member who needs medical advice.',
      'On a DSC radio, send an urgency call to all ships, then on Channel 16: Pan-Pan, Pan-Pan, Pan-Pan. All stations, all stations, all stations. This is (the boat\u2019s name, three times), the call sign, the MMSI. Please go to Channel (a working channel). Out.',
      'Then, on that working channel, give your position, the problem and the help you need. To call the Coastguard directly instead, call them on Channel 16 and they will give you a working channel.',
      'A Pan-Pan can become a Mayday at any time if things get worse.',
      'Source: Maritime and Coastguard Agency, GMDSS VHF DSC procedures for small boat users.']],
    ['ref-mob', 'Man overboard: what to do', [
      'Shout “Man overboard” and keep shouting until the whole crew knows.',
      'Point: one person does nothing but watch and point at the person in the water, all the time.',
      'Throw the danbuoy, a lifebuoy or a throwing line to mark the place and give them something to hold.',
      'Press MOB: in this tool (the orange MOB button) and on the boat’s plotter, so the position is kept.',
      'Call for help early: a DSC distress alert and a Mayday on Channel 16. You can cancel it if the recovery goes well.',
      'Slow the boat or stop it, under control, so nobody else goes over. Start the engine if you have one, and check that no lines are in the water before putting it in gear.',
      'Come back to the person from downwind, slowly, so the boat drifts to them. Engine in neutral or off when they are alongside: keep them clear of the propeller.',
      'Get them aboard with a line, a ladder, a halyard or a lifting sling. If they are cold or hurt, lift them horizontally if you can.',
      'Then treat for cold and shock, and tell the Coastguard how it ended.',
      'Practise it with your crew before the race: the recovery is the hard part.',
      'Sources: RYA, man overboard; Maritime and Coastguard Agency, MGN 617. To be checked by FirstShift before release.']],
    ['ref-beaufort', 'Beaufort scale', [
      'Force 0, Calm: less than 1 knot. Sea like a mirror.',
      'Force 1, Light air: 1 to 3 knots. Ripples. Waves about 0.1 m.',
      'Force 2, Light breeze: 4 to 6 knots. Small wavelets. About 0.2 m.',
      'Force 3, Gentle breeze: 7 to 10 knots. Large wavelets, crests begin to break. About 0.6 m.',
      'Force 4, Moderate breeze: 11 to 16 knots. Small waves, fairly frequent white horses. About 1 m.',
      'Force 5, Fresh breeze: 17 to 21 knots. Moderate waves, many white horses. About 2 m.',
      'Force 6, Strong breeze: 22 to 27 knots. Large waves, white foam crests everywhere. About 3 m.',
      'Force 7, Near gale: 28 to 33 knots. Sea heaps up, foam blown in streaks. About 4 m.',
      'Force 8, Gale: 34 to 40 knots. Moderately high waves, crests break into spindrift. About 5.5 m.',
      'Force 9, Severe gale: 41 to 47 knots. High waves, dense streaks of foam. About 7 m.',
      'Force 10, Storm: 48 to 55 knots. Very high waves, the sea looks white. About 9 m.',
      'Force 11, Violent storm: 56 to 63 knots. Exceptionally high waves. About 11.5 m.',
      'Force 12, Hurricane force: 64 knots or more. The air is full of foam and spray. 14 m or more.',
      'Wave heights are probable heights in the open sea, well away from land. Source: Met Office, Beaufort wind force scale.']],
    ['ref-convert', 'Conversions', [
      'Distance: 1 nautical mile is 1,852 metres exactly. 1 nautical mile is 1.852 km, or 1.151 statute miles. 1 km is 0.540 nautical miles. 1 statute mile is 0.869 nautical miles.',
      'Speed: 1 knot is 1 nautical mile an hour: 1.852 km/h, 1.151 mph, 0.514 metres a second. 10 knots is about 5.1 metres a second.',
      'Depth and height: 1 metre is 3.281 feet. 1 fathom is 6 feet, 1.829 metres.',
      'A minute of latitude is one nautical mile, anywhere. A minute of longitude is one nautical mile only at the equator; it shrinks with the cosine of the latitude (about 0.64 nautical miles at 50° N).',
      'Latitude and longitude, degrees, minutes and seconds to decimal degrees: degrees plus minutes divided by 60, plus seconds divided by 3,600. For example 50° 45′ 36″ N is 50 + 45/60 + 36/3600 = 50.76° N. South and west are negative.',
      'Decimal degrees to degrees and minutes: the whole number is the degrees; multiply what is left by 60 for the minutes. For example 1.2950° W is 1° 17.70′ W. Charts and most plotters use degrees and decimal minutes.']]
    ,['ref-rules', 'Racing rules: when boats meet', [
      'A short summary in our own words of Part 2 of the Racing Rules of Sailing 2025 to 2028. The rules themselves (World Sailing, from the RYA) and your sailing instructions decide; check them for anything that matters.',
      'Rule 10, opposite tacks: a port-tack boat keeps clear of a starboard-tack boat.',
      'Rule 11, same tack, overlapped: the windward boat keeps clear of the leeward boat.',
      'Rule 12, same tack, not overlapped: the boat clear astern keeps clear of the boat clear ahead.',
      'Rule 13, while tacking: once past head to wind, a boat keeps clear of other boats until she is on her new close-hauled course.',
      'Rule 14, avoiding contact: every boat avoids contact if reasonably possible, the right-of-way boat included.',
      'Rule 15, acquiring right of way: a boat that gains right of way must at first give the other boat room to keep clear.',
      'Rule 16, changing course: a right-of-way boat that changes course gives the other boat room to keep clear.',
      'Rule 17, proper course: a boat that becomes overlapped to leeward from clear astern, within two of her hull lengths, may not sail above her proper course while the overlap lasts, with some exceptions.',
      'Rule 18, mark-room: at a mark, from when the first boat reaches the zone (three hull lengths unless the instructions say otherwise), an outside boat gives an inside overlapped boat room to round, and a boat clear astern keeps clear of one clear ahead. It has limits: for example it does not apply between boats on opposite tacks on a beat to windward. Read rule 18 itself.',
      'Rule 19, room to pass an obstruction, and rule 20, room to tack at an obstruction: a boat may hail for room to tack when an obstruction forces her to, under strict conditions.',
      'Rule 21, exoneration; rule 22, starting errors, taking penalties and moving astern (keep clear of boats that are not); rule 23, keep clear of a capsized, anchored or aground boat or one helping another; rule 24, do not interfere with a boat taking a penalty or on another leg.',
      'Starting: the preparatory signal and the starting signal are set out in rule 26; over the line early, return and start again (rule 29 and 30 for the penalties for the I, Z, U and black flags).',
      'Source: World Sailing, the Racing Rules of Sailing 2025 to 2028; this summary is to be checked by FirstShift before release.']]
    ,['ref-colregs', 'Lights, shapes, sounds and buoys', [
      'For quick checks only. The full rules are the International Regulations for Preventing Collisions at Sea (COLREGs) and, in the UK, MSN 1781.',
      'Lights at night. A sailing boat under sail: red to port, green to starboard, white stern light; under 20 metres these may be one tricolour at the masthead. A power-driven vessel: white masthead light forward (a second, higher, aft if 50 metres or more), red and green sidelights, white stern light. At anchor: an all-round white light. Not under command: two all-round reds, one above the other. Restricted in ability to manoeuvre: red, white, red. Constrained by her draught: three all-round reds. Trawling: green over white; other fishing: red over white.',
      'Shapes by day. At anchor: a black ball. Motor sailing: a cone, point down. Not under command: two balls. Restricted in ability to manoeuvre: ball, diamond, ball. Constrained by draught: a cylinder. Fishing: two cones, points together.',
      'Sound signals in sight of each other: one short blast, I am altering to starboard; two short, to port; three short, my engines are going astern; five or more short, I doubt your intentions.',
      'In restricted visibility: a power-driven vessel making way, one long blast at least every two minutes; a sailing vessel, one long and two short.',
      'Buoys, IALA region A (the UK and Europe): port-hand marks are red cans, starboard-hand marks green cones, coming in from seaward. Region B (the Americas, Japan, Korea, the Philippines) is the other way round: red to starboard coming in.',
      'Cardinal marks, black and yellow: north, two cones pointing up; east, points apart; south, pointing down; west, points together. Pass on the side they are named for. Their lights are white: north continuous quick flashes, east three, south six and a long flash, west nine.',
      'Isolated danger: black and red with two black balls. Safe water: red and white vertical stripes with a red ball. Special marks: yellow with a yellow cross.',
      'Source: COLREGs (International Maritime Organization), MSN 1781 (Maritime and Coastguard Agency), IALA Maritime Buoyage System. To be checked by FirstShift before release.']]
    ,['ref-distoff', 'Distance off', [
      'Doubling the angle on the bow: note the log when a fixed object is at an angle on the bow (say 30 degrees), and again when the angle has doubled (60 degrees). Your distance off at the second bearing equals the distance run between them, in still water.',
      'Four-point bearing: the same with 45 degrees and then the beam (90 degrees): the distance run is your distance off when it is abeam.',
      'Height of a light or cliff: with a sextant, distance in nautical miles is about 1.86 times the height in metres divided by the angle in minutes. Use the height above high water from the chart, and the result is from the base of the object.',
      'The thumb jump: hold a thumb up at arm’s length, close one eye and line it up with one side of an object, then switch eyes. The thumb seems to jump sideways. Your arm is about ten times the gap between your eyes, so the distance is about ten times the size of that jump, if you can judge the jump against something of known size, a ship’s length or the gap between two charted marks.',
      'All of these are estimates; tidal stream and leeway make the running fixes less exact.']]
    ,['ref-suncheck', 'Compass check by the sun', [
      'At sunset (or sunrise) the sun’s true bearing is worked out from its declination and your latitude, and compared with what the compass shows. The difference is the compass error: deviation plus variation.',
      'The amplitude: sine of the amplitude equals sine of the declination divided by cosine of the latitude. At sunset the sun bears 270 degrees plus the amplitude when the declination is north, minus when it is south; at sunrise, 90 degrees minus the amplitude when north, plus when south.',
      'Take the bearing when the sun’s lower edge is about half a sun’s width above the horizon, which is close to the moment the formula uses.',
      'The declination comes from the Nautical Almanac for the date: it runs from about 23.4 degrees north at midsummer to 23.4 degrees south at midwinter, and is zero at the equinoxes.',
      'For example at 50 degrees north with the declination 10 degrees north: sine of the amplitude is 0.174 divided by 0.643, 0.270, so the amplitude is 15.7 degrees and the sun sets bearing about 286 degrees true.']]
    ,['ref-morse', 'Morse code', [
      'SOS is three short, three long, three short, sent as one signal without gaps: dot dot dot, dash dash dash, dot dot dot.',
      'A short is a dot, a long is a dash three times as long. The gap between letters is three dots long, between words seven.',
      'A dot dash. B dash dot dot dot. C dash dot dash dot. D dash dot dot. E dot. F dot dot dash dot. G dash dash dot. H dot dot dot dot. I dot dot. J dot dash dash dash. K dash dot dash. L dot dash dot dot. M dash dash.',
      'N dash dot. O dash dash dash. P dot dash dash dot. Q dash dash dot dash. R dot dash dot. S dot dot dot. T dash. U dot dot dash. V dot dot dot dash. W dot dash dash. X dash dot dot dash. Y dash dot dash dash. Z dash dash dot dot.',
      'Learn it by its sound, not by looking at dots and dashes: the Koch method starts with two letters at full speed and adds one at a time. Single letters are also signals: U (dot dot dash), you are running into danger.',
      'Source: International Code of Signals.']]
    ,['ref-flags', 'Signal flags', [
      'Racing (the race signals of the Racing Rules of Sailing, in our own words; the sailing instructions can change them): AP, the answering pennant, postponed. P, the preparatory signal. I, the round-an-end rule. Z, the 20 per cent penalty. U, the U flag rule. Black flag, disqualified if over in the last minute. X, individual recall. First substitute, general recall. N, abandoned. S, the course is shortened. C, the next mark has moved. M, this object replaces a missing mark. L, come within hail, or follow this boat. Y, wear your lifejackets.',
      'International Code of Signals, one flag: A, diver down, keep clear at slow speed. B, dangerous goods. C, yes. D, keep clear, I am manoeuvring with difficulty. E, I am altering course to starboard. F, I am disabled. G, I need a pilot. H, I have a pilot on board. I, I am altering course to port. J, keep clear, fire or a dangerous cargo leaking. K, I wish to communicate with you. L, stop your vessel instantly. M, my vessel is stopped. N, no. O, man overboard. P, in harbour: all aboard, we are about to sail. Q, my vessel is healthy, I request free pratique. S, my engines are going astern. T, keep clear of me. U, you are running into danger. V, I need assistance. W, I need medical assistance. X, stop and watch for my signals. Y, I am dragging my anchor. Z, I need a tug.',
      'Sources: International Code of Signals; World Sailing, the Racing Rules of Sailing 2025 to 2028, race signals. To be checked by FirstShift before release.']]
    ,['ref-twa', 'True wind from the instruments', [
      'The wind vane and the anemometer feel the apparent wind: the true wind plus the wind of the boat’s own motion. Take the boat’s motion away and what is left is the true wind.',
      'In the picture: the boat moves at its speed through the water (the blue arrow, BSP). Sailing creates a head wind of the same size, from straight ahead. The apparent wind (green, AWS at angle AWA) is the true wind (red, TWS at angle TWA) added to that head wind.',
      'Worked out: TWS is the square root of AWS squared plus BSP squared minus 2 times AWS times BSP times the cosine of AWA. TWA is the angle whose tangent is AWS times sine AWA divided by (AWS times cosine AWA minus BSP).',
      'For example AWS 15 knots at 35 degrees, boat speed 6.5 knots: TWS about 10.4 knots, TWA about 56 degrees. The apparent wind is always further forward and, upwind, stronger than the true wind.',
      'Instruments work it out through the water, so this is the true wind over the water. Over the ground, as the forecasts give it, also adds the tide: the router does that (the wind over the water, in How the routing works).']]
    ,['ref-ep', 'Estimated position with the tide', [
      'Dead reckoning (DR) is where the boat would be from its course and the distance run through the water. The estimated position (EP) adds the tide for the same time, and leeway if there is any.',
      'In the picture: from the last fix, the boat’s water track for one hour (blue: course and distance through the water). From its end, the tide for that hour (orange: the set and drift from the tidal atlas or the forecast). The EP is at the end of the tide arrow; the line from the fix to the EP (red) is the track over the ground.',
      'For example: 6 knots on 180 degrees true for one hour, with a 2 knot tide setting 090 degrees. DR is 6 nm south of the fix; the EP is a further 2 nm east of it: 6.3 nm from the fix, on 162 degrees true.',
      'To steer a course that makes good a chosen track, draw it the other way round: the tide first from the fix, then the boat’s speed reaching the track line; that direction is the course to steer.',
      'Route does the same at every step of every route, with the tide for that place and time from the forecast.']]
    ,['ref-depth', 'Safety depth: what it is measured from', [
      'The safety depth is measured down from lowest astronomical tide (LAT), the chart datum on UK charts: the lowest level the tide is predicted to reach. Set to 3.0 m, it means 3 m below LAT.',
      'It is not measured from mean low water springs (MLWS). MLWS is above LAT, by the height given for your port in the tide tables, so at low water springs there is more water than the figure by that much.',
      'No height of tide is added. At any moment the real depth is the depth below LAT plus the height of tide at that time. The router does not count on the tide.',
      'In the picture: the cream line is the real seabed. The blocks are what the router knows: one average depth for each square about 115 m across. Red squares are shallower than the safety depth and the routes keep out. The pale red square beside them is the Keep clear by margin (Settings, Course): a rock or the edge of a bank can sit inside a square that reads deep.',
      'Near the start, each mark and the finish (within 0.4 nm) only the safety depth applies, so they can still be reached.',
      'Source: EMODnet Bathymetry digital terrain model, whose depths refer to lowest astronomical tide. Planning aid, not for navigation: check the chart.']]
    ,['ref-routing', 'How the routing works', [
      'Route uses isochrones: lines joining the furthest the boat can get in a given time. In the picture each coloured line is one time step from the start.',
      'From every point on the last line, the router tries headings every 5 degrees, and the best angle upwind and downwind on each side.',
      'For each heading it takes the wind there at that time from the chosen forecast, takes away the tide to get the wind over the water, and reads the boat speed for that true wind speed and angle from your polar. Waves slow the boat or, surfing downwind, add a little.',
      'The boat moves at that speed along the heading for the step, then the tide carries it. A tack or a gybe costs its time. A step that crosses land, water shallower than the safety depth, a traffic separation scheme or a keep-out area is thrown away.',
      'Of all the new points, only the one that has got furthest in each slice of the compass is kept. That makes the next line.',
      'When a line reaches the finish, the router follows the kept points back to the start: that is the route. It does this for each forecast model, and for the ensemble members, so you can compare them.',
      'The marks must be rounded on their side: a gate from the buoy stops a route crossing the wrong way.']]
  ];

  /* ---- Pictures for every quick reference page (Stuart 25 Nov 2026 23:13: "Those pages however need graphics throughout to convey the
     information in almost every case / e.g morse code. We need a start page picture as well to represent nautical knowledge").
     Each is drawn here as a small vector picture, 420 wide, in the tools' colours; no files to download, so they work with no signal. ---- */
  var PF = 'font-family="Arial,sans-serif"', BG = '#0B1B30', INK = '#E8F0F8', MUT = '#9AB0C6';
  function tx(x, y, s, t, c, a, b) { return '<text x="' + x + '" y="' + y + '" ' + PF + ' font-size="' + s + '"' + (b ? ' font-weight="700"' : '') + ' fill="' + (c || INK) + '"' + (a ? ' text-anchor="' + a + '"' : '') + '>' + t + '</text>'; }
  function uri(h, g) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ' + h + '"><rect width="420" height="' + h + '" fill="' + BG + '"/>' + g + '</svg>'); }
  function rung(x, y, w, n, t, c, sub) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (sub ? 34 : 24) + '" rx="6" fill="#13263d" stroke="' + c + '" stroke-width="1.5"/><circle cx="' + (x + 14) + '" cy="' + (y + 12) + '" r="9" fill="' + c + '"/>' + tx(x + 14, y + 16, 11, n, '#0B1B30', 'middle', 1) + tx(x + 30, y + 16, 12.5, t, INK, '', 1) + (sub ? tx(x + 30, y + 29, 10.5, sub, MUT) : ''); }
  function boat(x, y, rot, c, tack) { /* a hull seen from above, bow up before turning; the boom shows the tack */ return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><path d="M0 -17 C9 -8 9 8 6 17 L-6 17 C-9 8 -9 -8 0 -17Z" fill="' + c + '" stroke="#0B1B30" stroke-width="1"/><line x1="0" y1="-6" x2="' + (tack === 'p' ? 9 : -9) + '" y2="13" stroke="#fff" stroke-width="2"/></g>'; }
  function arrowD(x, y, len, c, lab) { return '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + len) + '" stroke="' + c + '" stroke-width="3"/><polygon points="' + (x - 6) + ',' + (y + len - 9) + ' ' + (x + 6) + ',' + (y + len - 9) + ' ' + x + ',' + (y + len + 2) + '" fill="' + c + '"/>' + (lab ? tx(x + 9, y + 12, 11, lab, c, '', 1) : ''); }
  var PIC = {
    'ref-mayday': function () { var R = '#E5484D', g = '<rect width="420" height="34" fill="' + R + '"/>' + tx(14, 23, 17, 'MAYDAY', '#fff', '', 1) + tx(406, 22, 11.5, 'grave and immediate danger', '#fff', 'end');
      g += '<circle cx="46" cy="76" r="22" fill="' + R + '" stroke="#fff" stroke-width="2"/>' + tx(46, 73, 8, 'DISTRESS', '#fff', 'middle', 1) + tx(46, 84, 8, 'hold', '#fff', 'middle') + tx(80, 66, 13, '1  Hold the red DISTRESS button', INK, '', 1) + tx(80, 82, 11, 'until the radio says the alert has gone', MUT);
      g += tx(80, 104, 13, '2  Wait for an answer, or about 15 s', INK, '', 1) + tx(14, 128, 13, '3  On Channel 16, slowly and clearly:', INK, '', 1);
      var L = [['MAYDAY, MAYDAY, MAYDAY'], ['THIS IS', 'the boat’s name three times, call sign, MMSI'], ['MAYDAY', 'the boat’s name, call sign, MMSI'], ['POSITION', 'lat and long, or bearing and distance from a known point'], ['NATURE OF THE DISTRESS'], ['HELP YOU NEED'], ['NUMBER OF PEOPLE ON BOARD'], ['ANY OTHER INFORMATION, then OVER']], y = 138;
      L.forEach(function (q, i) { g += rung(14, y, 392, String.fromCharCode(97 + i), q[0], R, q[1]); y += q[1] ? 38 : 28; });
      g += tx(14, y + 14, 11.5, 'Then listen. No answer: repeat the call. Stay on Channel 16.', MUT); return uri(y + 26, g); },
    'ref-panpan': function () { var A = '#F5A524', g = '<rect width="420" height="34" fill="' + A + '"/>' + tx(14, 23, 17, 'PAN-PAN', '#0B1B30', '', 1) + tx(406, 22, 11.5, 'urgent, but not grave and immediate', '#0B1B30', 'end');
      g += tx(14, 58, 13, '1  DSC urgency call to all ships', INK, '', 1) + tx(14, 82, 13, '2  On Channel 16:', INK, '', 1);
      var L = [['PAN-PAN, PAN-PAN, PAN-PAN'], ['ALL STATIONS, ALL STATIONS, ALL STATIONS'], ['THIS IS', 'the boat’s name three times, call sign, MMSI'], ['PLEASE GO TO CHANNEL …', 'a working channel, then OUT']], y = 92;
      L.forEach(function (q, i) { g += rung(14, y, 392, String.fromCharCode(97 + i), q[0], A, q[1]); y += q[1] ? 38 : 28; });
      g += tx(14, y + 18, 13, '3  On the working channel:', INK, '', 1); y += 28;
      ['POSITION', 'THE PROBLEM', 'THE HELP YOU NEED'].forEach(function (t, i) { g += '<rect x="' + (14 + i * 133) + '" y="' + y + '" width="126" height="26" rx="6" fill="#13263d" stroke="' + A + '" stroke-width="1.5"/>' + tx(77 + i * 133, y + 17, 11.5, t, INK, 'middle', 1); });
      g += tx(14, y + 46, 11.5, 'It can become a Mayday at any time if things get worse.', MUT); return uri(y + 58, g); },
    'ref-mob': function () { var O = '#F26B21', g = '', S = [['SHOUT', 'Man overboard!'], ['POINT', 'one person only watches'], ['THROW', 'danbuoy, lifebuoy, line'], ['PRESS MOB', 'here and on the plotter'], ['CALL', 'DSC alert and Mayday'], ['SLOW', 'stop under control'], ['APPROACH', 'from downwind, slowly'], ['RECOVER', 'line, ladder, halyard, sling']];
      var ic = [function (x, y) { return '<path d="M' + (x - 14) + ' ' + (y - 10) + 'h28a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-14l-8 8v-8h-6a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4z" fill="none" stroke="#fff" stroke-width="2"/>' + tx(x, y + 5, 13, '!', '#fff', 'middle', 1); },
        function (x, y) { return '<circle cx="' + (x - 14) + '" cy="' + y + '" r="5" fill="#fff"/><line x1="' + (x - 8) + '" y1="' + y + '" x2="' + (x + 14) + '" y2="' + (y - 8) + '" stroke="#fff" stroke-width="2.5"/><polygon points="' + (x + 18) + ',' + (y - 10) + ' ' + (x + 8) + ',' + (y - 11) + ' ' + (x + 12) + ',' + (y - 2) + '" fill="#fff"/>'; },
        function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="12" fill="none" stroke="#fff" stroke-width="6"/><circle cx="' + x + '" cy="' + y + '" r="12" fill="none" stroke="' + O + '" stroke-width="6" stroke-dasharray="9.4 9.4"/>'; },
        function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="15" fill="' + O + '" stroke="#fff" stroke-width="2"/>' + tx(x, y + 4, 10, 'MOB', '#fff', 'middle', 1); },
        function (x, y) { return '<rect x="' + (x - 7) + '" y="' + (y - 12) + '" width="14" height="26" rx="3" fill="none" stroke="#fff" stroke-width="2"/><line x1="' + (x + 3) + '" y1="' + (y - 12) + '" x2="' + (x + 3) + '" y2="' + (y - 19) + '" stroke="#fff" stroke-width="2"/><path d="M' + (x + 12) + ' ' + (y - 8) + 'q7 8 0 16M' + (x + 17) + ' ' + (y - 12) + 'q11 12 0 24" fill="none" stroke="#fff" stroke-width="1.8"/>'; },
        function (x, y) { return '<path d="M' + (x - 16) + ' ' + (y + 6) + 'h32l-5 8h-22z" fill="#fff"/><line x1="' + x + '" y1="' + (y + 6) + '" x2="' + x + '" y2="' + (y - 14) + '" stroke="#fff" stroke-width="2"/><path d="M' + (x + 2) + ' ' + (y - 12) + 'l10 16h-10z" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"/>'; },
        function (x, y) { return '<circle cx="' + x + '" cy="' + (y - 10) + '" r="4" fill="' + O + '"/><path d="M' + x + ' ' + (y + 16) + 'l-6 -12h12z" fill="#fff"/><line x1="' + x + '" y1="' + (y + 3) + '" x2="' + x + '" y2="' + (y - 3) + '" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 2"/><line x1="' + (x + 16) + '" y1="' + (y - 16) + '" x2="' + (x + 16) + '" y2="' + (y + 2) + '" stroke="#8fc7ef" stroke-width="2"/><polygon points="' + (x + 12) + ',' + (y - 2) + ' ' + (x + 20) + ',' + (y - 2) + ' ' + (x + 16) + ',' + (y + 6) + '" fill="#8fc7ef"/>'; },
        function (x, y) { return '<line x1="' + (x - 7) + '" y1="' + (y - 14) + '" x2="' + (x - 7) + '" y2="' + (y + 14) + '" stroke="#fff" stroke-width="2"/><line x1="' + (x + 7) + '" y1="' + (y - 14) + '" x2="' + (x + 7) + '" y2="' + (y + 14) + '" stroke="#fff" stroke-width="2"/>' + [-8, 0, 8].map(function (d) { return '<line x1="' + (x - 7) + '" y1="' + (y + d) + '" x2="' + (x + 7) + '" y2="' + (y + d) + '" stroke="#fff" stroke-width="2"/>'; }).join(''); }];
      S.forEach(function (s, i) { var cx = 14 + (i % 4) * 100, cy = 12 + Math.floor(i / 4) * 112; g += '<rect x="' + cx + '" y="' + cy + '" width="92" height="104" rx="8" fill="#13263d" stroke="' + O + '" stroke-width="1.5"/><circle cx="' + (cx + 14) + '" cy="' + (cy + 14) + '" r="9" fill="' + O + '"/>' + tx(cx + 14, cy + 18, 11, i + 1, '#fff', 'middle', 1) + ic[i](cx + 46, cy + 46) + tx(cx + 46, cy + 78, 11.5, s[0], INK, 'middle', 1);
        var w = s[1].split(' '), l1 = '', l2 = ''; w.forEach(function (q) { if ((l1 + ' ' + q).length <= 15 && !l2) l1 += (l1 ? ' ' : '') + q; else l2 += (l2 ? ' ' : '') + q; }); g += tx(cx + 46, cy + 90, 8.6, l1, MUT, 'middle') + (l2 ? tx(cx + 46, cy + 100, 8.6, l2, MUT, 'middle') : ''); });
      g += tx(14, 252, 11.5, 'Then treat for cold and shock, and tell the Coastguard how it ended.', MUT); return uri(264, g); },
    'ref-beaufort': function () { var B = [['0', 'Calm', 0, 1, '0'], ['1', 'Light air', 1, 3, '0.1'], ['2', 'Light breeze', 4, 6, '0.2'], ['3', 'Gentle breeze', 7, 10, '0.6'], ['4', 'Moderate breeze', 11, 16, '1'], ['5', 'Fresh breeze', 17, 21, '2'], ['6', 'Strong breeze', 22, 27, '3'], ['7', 'Near gale', 28, 33, '4'], ['8', 'Gale', 34, 40, '5.5'], ['9', 'Severe gale', 41, 47, '7'], ['10', 'Storm', 48, 55, '9'], ['11', 'Violent storm', 56, 63, '11.5'], ['12', 'Hurricane force', 64, 70, '14+']];
      var col = ['#8fc7ef', '#8fc7ef', '#6FD3B0', '#4CC38A', '#4CC38A', '#B6D34A', '#F5D020', '#F5A524', '#F26B21', '#E5484D', '#D0303A', '#B01E38', '#8E1238'], g = tx(14, 18, 11, 'FORCE', MUT, '', 1) + tx(150, 18, 11, 'KNOTS', MUT, '', 1) + tx(406, 18, 11, 'WAVES, m', MUT, 'end', 1), k = 2.4;
      B.forEach(function (b, i) { var y = 26 + i * 23; g += tx(14, y + 15, 14, b[0], col[i], '', 1) + tx(38, y + 15, 11.5, b[1], INK) + '<rect x="150" y="' + (y + 3) + '" width="' + (b[3] * k).toFixed(0) + '" height="16" rx="3" fill="#13263d"/><rect x="' + (150 + b[2] * k).toFixed(0) + '" y="' + (y + 3) + '" width="' + Math.max(4, (b[3] - b[2]) * k).toFixed(0) + '" height="16" rx="3" fill="' + col[i] + '"/>' + tx(150 + b[3] * k + 6, y + 15, 11, i === 0 ? 'under 1' : i === 12 ? '64 or more' : b[2] + ' to ' + b[3], INK) + tx(406, y + 15, 11.5, b[4], INK, 'end', 1); });
      g += tx(14, 26 + 13 * 23 + 12, 10.5, 'Wave heights are the probable heights in the open sea, well away from land.', MUT); return uri(26 + 13 * 23 + 22, g); },
    'ref-convert': function () { var g = '', ruler = function (y, t, a, an, b, bn, max, sa, sb, fa, fb) { var x0 = 30, w = 360, s = tx(14, y - 26, 12, t, INK, '', 1) + '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + y + '" y2="' + y + '" stroke="#E8F0F8" stroke-width="2"/>';
          for (var v = 0; v <= max + 1e-9; v += sa) { var x = x0 + v / max * w; s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (y - 8) + '" y2="' + y + '" stroke="#6FA9E0" stroke-width="2"/>' + tx(x.toFixed(1), y - 11, 10.5, fa ? fa(v) : v, '#6FA9E0', 'middle', 1); }
          var mb = max * b; for (var u = 0; u <= mb + 1e-9; u += sb) { var x2 = x0 + u / mb * w; s += '<line x1="' + x2.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y + '" y2="' + (y + 8) + '" stroke="#F5A524" stroke-width="2"/>' + tx(x2.toFixed(1), y + 20, 10.5, fb ? fb(u) : u, '#F5A524', 'middle', 1); }
          return s + tx(406, y - 26, 10.5, an, '#6FA9E0', 'end', 1) + tx(406, y + 34, 10.5, bn, '#F5A524', 'end', 1); };
      g += ruler(50, 'Distance', 1, 'nautical miles', 1.852, 'kilometres', 10, 1, 2) + ruler(134, 'Speed', 1, 'knots', 0.5144, 'metres a second', 40, 5, 2) + ruler(218, 'Depth and height', 1, 'metres', 3.2808, 'feet', 10, 1, 5);
      g += tx(14, 274, 11.5, '1 nm = 1,852 m = 1.151 statute miles', INK) + tx(14, 291, 11.5, '1 knot = 1.852 km/h = 0.514 m/s', INK) + tx(14, 308, 11.5, '1 fathom = 6 feet = 1.829 m', INK) + tx(14, 325, 11.5, '1 minute of latitude = 1 nautical mile, anywhere', INK); return uri(338, g); },
    'ref-rules': function () { var G = '#4CC38A', R = '#E5484D', g = arrowD(210, 6, 22, '#8fc7ef', 'WIND') + tx(14, 20, 10.5, 'green: right of way', G, '', 1) + tx(406, 20, 10.5, 'red: keeps clear', R, 'end', 1);
      var box = function (x, y, n, t) { return '<rect x="' + x + '" y="' + y + '" width="126" height="118" rx="8" fill="#13263d" stroke="#2c4866"/>' + tx(x + 8, y + 16, 11.5, 'Rule ' + n, INK, '', 1) + tx(x + 63, y + 110, 9.6, t, MUT, 'middle'); };
      g += box(14, 40, 10, 'opposite tacks') + boat(48, 104, 45, R, 'p') + boat(106, 104, -45, G, 's') + tx(48, 138, 8.5, 'port', R, 'middle', 1) + tx(106, 138, 8.5, 'starboard', G, 'middle', 1);
      g += box(147, 40, 11, 'same tack, overlapped') + boat(190, 92, 45, R, 'p') + boat(222, 116, 45, G, 'p') + tx(182, 70, 8.5, 'windward', R, 'middle', 1) + tx(240, 142, 8.5, 'leeward', G, 'middle', 1);
      g += box(280, 40, 12, 'same tack, not overlapped') + boat(322, 122, 45, R, 'p') + boat(362, 82, 45, G, 'p') + tx(312, 96, 8.5, 'astern', R, 'middle', 1) + tx(372, 118, 8.5, 'ahead', G, 'middle', 1);
      g += '<rect x="14" y="166" width="392" height="150" rx="8" fill="#13263d" stroke="#2c4866"/>' + tx(22, 182, 11.5, 'Rule 18, mark-room', INK, '', 1) + '<circle cx="250" cy="236" r="62" fill="none" stroke="#F5A524" stroke-width="1.8" stroke-dasharray="6 5"/><circle cx="250" cy="236" r="7" fill="#F5A524" stroke="#000"/>' + tx(250, 308, 9.6, 'the zone: three hull lengths', '#F5A524', 'middle', 1);
      g += boat(228, 262, 20, G, 'p') + boat(204, 276, 20, R, 'p') + tx(118, 256, 9.6, 'inside, overlapped:', G, 'middle', 1) + tx(118, 268, 9.6, 'gets room to round', G, 'middle', 1) + tx(118, 290, 9.6, 'outside: gives room', R, 'middle', 1) + '<path d="M232 244 C236 214 262 206 276 222" fill="none" stroke="#4CC38A" stroke-width="1.6" stroke-dasharray="4 4"/>';
      g += tx(398, 196, 9.2, 'Not between boats on', MUT, 'end') + tx(398, 207, 9.2, 'opposite tacks on a beat', MUT, 'end'); return uri(326, g); },
    'ref-distoff': function () { var g = '', tri = function (x0, t, a1, a2, note) { var y = 150, run = 110, R2 = Math.PI / 180, xA = x0, xB = x0 + run, ox, oy, t1 = Math.tan(a1 * R2), t2 = Math.tan(a2 * R2); if (a2 === 90) { ox = xB; oy = y - run * t1; } else { ox = (xB * t2 - xA * t1) / (t2 - t1); oy = y - (ox - xA) * t1; }
          var s = tx(x0 - 6, 22, 12, t, INK, '', 1) + '<line x1="' + (x0 - 14) + '" y1="' + y + '" x2="' + (x0 + 178) + '" y2="' + y + '" stroke="#5B8DEF" stroke-width="2.5" stroke-dasharray="7 5"/><line x1="' + xA + '" y1="' + y + '" x2="' + xB + '" y2="' + y + '" stroke="#5B8DEF" stroke-width="4"/>';
          s += '<line x1="' + xA + '" y1="' + y + '" x2="' + ox.toFixed(1) + '" y2="' + oy.toFixed(1) + '" stroke="#9AB0C6" stroke-width="1.6"/><line x1="' + xB + '" y1="' + y + '" x2="' + ox.toFixed(1) + '" y2="' + oy.toFixed(1) + '" stroke="#E5484D" stroke-width="3"/>';
          s += '<path d="M' + (ox - 7).toFixed(1) + ' ' + oy.toFixed(1) + 'l7 -16l7 16z" fill="#F5A524" stroke="#000"/>' + tx(ox - 12, oy - 4, 10, 'the object', '#F5A524', 'end', 1);
          s += boat(xA, y, 90, '#E8F0F8', 's') + boat(xB, y, 90, '#E8F0F8', 's') + tx(xA + 24, y - 6, 11, a1 + '°', INK, '', 1) + tx(xB + (a2 === 90 ? 6 : 24), y - (a2 === 90 ? 22 : 6), 11, a2 + '°', INK, '', 1);
          s += tx((xA + xB) / 2, y + 28, 10.5, 'distance run', '#5B8DEF', 'middle', 1) + tx((xB + ox) / 2 + (a2 === 90 ? 34 : 52), (y + oy) / 2 + (a2 === 90 ? 0 : 14), 10.5, 'distance off', '#E5484D', 'middle', 1) + tx(x0 + 80, y + 50, 10.5, note, INK, 'middle') + tx(x0 + 80, y + 64, 10.5, '= distance run', INK, 'middle', 1); return s; };
      g += tri(26, 'Doubling the angle', 30, 60, 'distance off at the second bearing') + tri(232, 'Four-point bearing', 45, 90, 'distance off when it is abeam');
      g += '<line x1="210" y1="10" x2="210" y2="220" stroke="#2c4866"/>' + tx(14, 244, 10.5, 'Both assume still water and a steady course: tide and leeway make them less exact.', MUT); return uri(256, g); },
    'ref-suncheck': function () { var cx = 150, cy = 128, r = 92, R2 = Math.PI / 180, P = function (b, k) { return [cx + (k || r) * Math.sin(b * R2), cy - (k || r) * Math.cos(b * R2)]; }, g = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#13263d" stroke="#9AB0C6" stroke-width="1.5"/>';
      [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (q) { var p = P(q[1], r + 12); g += tx(p[0].toFixed(0), (p[1] + 4).toFixed(0), 12, q[0], INK, 'middle', 1); var a = P(q[1], r - 8), b2 = P(q[1]); g += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b2[0].toFixed(1) + '" y2="' + b2[1].toFixed(1) + '" stroke="#9AB0C6" stroke-width="2"/>'; });
      var w = P(270), s = P(285.7), s2 = P(285.7, r + 24); g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + w[0] + '" y2="' + w[1] + '" stroke="#9AB0C6" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="' + cx + '" y1="' + cy + '" x2="' + s[0].toFixed(1) + '" y2="' + s[1].toFixed(1) + '" stroke="#F5A524" stroke-width="3"/><circle cx="' + s2[0].toFixed(1) + '" cy="' + s2[1].toFixed(1) + '" r="10" fill="#F5A524"/>';
      var a1 = P(270, 46), a2 = P(285.7, 46); g += '<path d="M' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + 'A46 46 0 0 1 ' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1) + '" fill="none" stroke="#F5A524" stroke-width="2"/>' + tx(cx - 60, cy - 14, 10.5, '15.7°', '#F5A524', '', 1) + boat(cx, cy, 0, '#E8F0F8', 's');
      g += tx(266, 40, 12, 'Sunset, an example', INK, '', 1) + tx(266, 60, 11, 'Latitude 50° N', INK) + tx(266, 76, 11, 'Declination 10° N', INK) + tx(266, 100, 11, 'sin A = sin dec ÷ cos lat', '#8fc7ef', '', 1) + tx(266, 116, 11, '0.174 ÷ 0.643 = 0.270', INK) + tx(266, 132, 11, 'Amplitude A = 15.7°', '#F5A524', '', 1) + tx(266, 156, 11, 'Sun sets bearing', INK) + tx(266, 172, 13, '270° + 15.7° = 286° T', INK, '', 1) + tx(266, 196, 10.5, 'Compare with the compass:', MUT) + tx(266, 210, 10.5, 'the difference is its error', MUT);
      g += tx(14, 246, 10.5, 'Declination north: add at sunset (to 270°), take away at sunrise (from 090°).', MUT) + tx(14, 260, 10.5, 'Declination south: the other way round.', MUT); return uri(272, g); },
    'ref-morse': function () { var M = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
      var draw = function (x, y, code, c, k) { var s = ''; k = k || 1; code.split('').forEach(function (ch) { if (ch === '.') { s += '<circle cx="' + (x + 4 * k) + '" cy="' + y + '" r="' + 4 * k + '" fill="' + c + '"/>'; x += 13 * k; } else if (ch === '-') { s += '<rect x="' + x + '" y="' + (y - 4 * k) + '" width="' + 20 * k + '" height="' + 8 * k + '" rx="' + 3 * k + '" fill="' + c + '"/>'; x += 25 * k; } else x += 10 * k; }); return s; };
      var g = '<rect x="14" y="10" width="392" height="46" rx="8" fill="#13263d" stroke="#E5484D" stroke-width="1.5"/>' + tx(26, 40, 20, 'SOS', '#E5484D', '', 1) + draw(96, 33, '... --- ...', '#E5484D', 1.25) + tx(398, 50, 9, 'one signal, no gaps', MUT, 'end');
      Object.keys(M).forEach(function (L2, i) { var col = i < 13 ? 0 : 1, row = i % 13, x = 14 + col * 200, y = 70 + row * 25; g += '<rect x="' + x + '" y="' + y + '" width="192" height="22" rx="5" fill="' + (row % 2 ? '#0f2036' : '#13263d') + '"/>' + tx(x + 14, y + 16, 15, L2, INK, 'middle', 1) + draw(x + 36, y + 11, M[L2], '#6FA9E0'); });
      g += tx(14, 410, 10.5, 'A dash is three dots long. Between letters, three dots; between words, seven.', MUT); return uri(422, g); },
    'ref-colregs': function () { var g = '', R = '#E5484D', G = '#4CC38A', Wh = '#F4F6F8', Y = '#F5D020', K = '#111', R2 = Math.PI / 180;
      var arc = function (cx, cy, r, b1, b2, c) { var p1 = [cx + r * Math.sin(b1 * R2), cy - r * Math.cos(b1 * R2)], p2 = [cx + r * Math.sin(b2 * R2), cy - r * Math.cos(b2 * R2)], lg = ((b2 - b1 + 360) % 360) > 180 ? 1 : 0; return '<path d="M' + cx + ' ' + cy + 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 ' + lg + ' 1 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'Z" fill="' + c + '" fill-opacity=".5" stroke="' + c + '" stroke-width="1.2"/>'; };
      var plan = function (cx, cy, t, mast) { return tx(cx, cy - 62, 11.5, t, INK, 'middle', 1) + (mast ? arc(cx, cy, 54, -112.5, 112.5, Wh) : '') + arc(cx, cy, 42, -112.5, 0, R) + arc(cx, cy, 42, 0, 112.5, G) + arc(cx, cy, 42, 112.5, 247.5, Wh) + boat(cx, cy, 0, '#0B1B30', 's').replace('stroke="#0B1B30"', 'stroke="#fff"'); };
      g += tx(14, 18, 12.5, 'LIGHTS, seen from above', '#8fc7ef', '', 1) + plan(110, 96, 'Under sail', 0) + plan(310, 96, 'Power-driven', 1) + tx(110, 158, 9.6, 'red port · green starboard · white stern', MUT, 'middle') + tx(310, 158, 9.6, 'plus a white masthead light ahead', MUT, 'middle');
      var stack = function (x, y, cols, t) { var s = ''; cols.forEach(function (c, i) { s += '<circle cx="' + x + '" cy="' + (y + i * 15) + '" r="6" fill="' + c + '" stroke="#0B1B30"/>'; }); var w = t.split('|'); return s + tx(x, y + cols.length * 15 + 8, 8.8, w[0], INK, 'middle') + (w[1] ? tx(x, y + cols.length * 15 + 18, 8.8, w[1], INK, 'middle') : ''); };
      g += tx(14, 184, 12.5, 'ALL-ROUND LIGHTS', '#8fc7ef', '', 1) + stack(44, 202, [Wh], 'at anchor') + stack(110, 202, [R, R], 'not under|command') + stack(180, 202, [R, Wh, R], 'restricted|to manoeuvre') + stack(250, 202, [R, R, R], 'constrained|by draught') + stack(316, 202, [G, Wh], 'trawling') + stack(380, 202, [R, Wh], 'other|fishing');
      var ball = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="7" fill="' + K + '" stroke="#9AB0C6"/>'; }, cone = function (x, y, up) { return '<path d="M' + (x - 7) + ' ' + (up ? y + 7 : y - 7) + 'h14l-7 ' + (up ? -14 : 14) + 'z" fill="' + K + '" stroke="#9AB0C6"/>'; }, dia = function (x, y) { return '<path d="M' + x + ' ' + (y - 8) + 'l7 8l-7 8l-7 -8z" fill="' + K + '" stroke="#9AB0C6"/>'; };
      var sy = 300; g += tx(14, sy - 16, 12.5, 'SHAPES BY DAY', '#8fc7ef', '', 1) + '<rect x="14" y="' + (sy - 12) + '" width="392" height="48" rx="6" fill="#b9cbdc"/>' + ball(44, sy) + tx(44, sy + 44, 8.8, 'at anchor', INK, 'middle') + cone(110, sy, 0) + tx(110, sy + 44, 8.8, 'motor sailing', INK, 'middle') + ball(180, sy) + ball(180, sy + 16) + tx(180, sy + 44, 8.8, 'not under command', INK, 'middle') + ball(250, sy - 4) + dia(250, sy + 12) + ball(250, sy + 28) + tx(250, sy + 44, 8.8, 'restricted', INK, 'middle') + '<rect x="309" y="' + (sy - 8) + '" width="14" height="24" fill="' + K + '" stroke="#9AB0C6"/>' + tx(316, sy + 44, 8.8, 'by draught', INK, 'middle') + cone(380, sy, 0) + cone(380, sy + 14, 1) + tx(380, sy + 44, 8.8, 'fishing', INK, 'middle');
      var snd = function (x, y, code, t) { var s = '', xx = x; code.split('').forEach(function (ch) { if (ch === '.') { s += '<rect x="' + xx + '" y="' + (y - 4) + '" width="8" height="8" rx="2" fill="#F5A524"/>'; xx += 12; } else { s += '<rect x="' + xx + '" y="' + (y - 4) + '" width="26" height="8" rx="2" fill="#F5A524"/>'; xx += 30; } }); return s + tx(x + 78, y + 4, 10.5, t, INK); };
      var qy = 388; g += tx(14, qy - 14, 12.5, 'SOUNDS (short blast, long blast)', '#8fc7ef', '', 1) + snd(14, qy, '.', 'altering to starboard') + snd(14, qy + 18, '..', 'altering to port') + snd(14, qy + 36, '...', 'engines going astern') + snd(14, qy + 54, '.....', 'I doubt your intentions') + snd(226, qy, '-', 'fog: power, making way') + snd(226, qy + 18, '-..', 'fog: sailing vessel');
      var by = 490, buoy = function (x, y, kind) { var s = ''; if (kind === 'port') s = '<rect x="' + (x - 9) + '" y="' + (y - 12) + '" width="18" height="24" fill="' + R + '" stroke="#000"/>'; else if (kind === 'stbd') s = '<path d="M' + (x - 11) + ' ' + (y + 12) + 'h22l-11 -26z" fill="' + G + '" stroke="#000"/>';
          else { var bands = { N: [K, Y], S: [Y, K], E: [K, Y, K], W: [Y, K, Y], D: [K, R, K], SW: null, SP: [Y] }[kind]; if (kind === 'SW') { for (var i = 0; i < 4; i++) s += '<rect x="' + (x - 8 + i * 4) + '" y="' + (y - 10) + '" width="4" height="24" fill="' + (i % 2 ? Wh : R) + '"/>'; s += '<rect x="' + (x - 8) + '" y="' + (y - 10) + '" width="16" height="24" fill="none" stroke="#000"/><circle cx="' + x + '" cy="' + (y - 20) + '" r="4.5" fill="' + R + '"/>'; }
            else { var h = 24 / bands.length; bands.forEach(function (c, i2) { s += '<rect x="' + (x - 8) + '" y="' + (y - 10 + i2 * h) + '" width="16" height="' + h + '" fill="' + c + '"/>'; }); s += '<rect x="' + (x - 8) + '" y="' + (y - 10) + '" width="16" height="24" fill="none" stroke="#9AB0C6"/>';
              var c1 = function (yy, up) { return '<path d="M' + (x - 5) + ' ' + (up ? yy + 5 : yy - 5) + 'h10l-5 ' + (up ? -10 : 10) + 'z" fill="' + K + '" stroke="#9AB0C6" stroke-width=".8"/>'; };
              if (kind === 'N') s += c1(y - 30, 1) + c1(y - 19, 1); if (kind === 'S') s += c1(y - 30, 0) + c1(y - 19, 0); if (kind === 'E') s += c1(y - 30, 1) + c1(y - 19, 0); if (kind === 'W') s += c1(y - 30, 0) + c1(y - 19, 1);
              if (kind === 'D') s += '<circle cx="' + x + '" cy="' + (y - 28) + '" r="4.5" fill="' + K + '" stroke="#9AB0C6"/><circle cx="' + x + '" cy="' + (y - 18) + '" r="4.5" fill="' + K + '" stroke="#9AB0C6"/>'; if (kind === 'SP') s += '<path d="M' + (x - 5) + ' ' + (y - 27) + 'l10 10m0 -10l-10 10" stroke="' + Y + '" stroke-width="3"/>'; } }
          return s; };
      g += tx(14, by - 22, 12.5, 'BUOYS (region A: UK and Europe, coming in from seaward)', '#8fc7ef', '', 1) + '<rect x="14" y="' + (by - 16) + '" width="392" height="52" rx="6" fill="#b9cbdc"/><rect x="14" y="' + (by + 70) + '" width="230" height="58" rx="6" fill="#b9cbdc"/>' + buoy(40, by + 20, 'port') + tx(40, by + 48, 8.8, 'port hand', INK, 'middle') + buoy(96, by + 20, 'stbd') + tx(96, by + 48, 8.8, 'starboard', INK, 'middle');
      [['N', 'north', 'quick'], ['E', 'east', '3'], ['S', 'south', '6 + long'], ['W', 'west', '9']].forEach(function (q, i) { var x = 158 + i * 52; g += buoy(x, by + 20, q[0]) + tx(x, by + 48, 8.8, q[1], INK, 'middle') + tx(x, by + 59, 8, q[2], MUT, 'middle'); });
      g += buoy(40, by + 110, 'D') + tx(40, by + 138, 8.8, 'isolated danger', INK, 'middle') + buoy(130, by + 110, 'SW') + tx(130, by + 138, 8.8, 'safe water', INK, 'middle') + buoy(210, by + 110, 'SP') + tx(210, by + 138, 8.8, 'special mark', INK, 'middle') + tx(406, by + 100, 9.6, 'Cardinals: pass on the side named.', MUT, 'end') + tx(406, by + 112, 9.6, 'White flashes: the number shown.', MUT, 'end');
      return uri(by + 150, g); }
  };
  /* the start picture for the section (its card on Help's front page): a compass rose, signal flags, a cardinal mark and SOS in Morse */
  function headSvg() { var cx = 128, cy = 130, R2 = Math.PI / 180, g = '<rect width="420" height="260" fill="#0B1B30"/><circle cx="' + cx + '" cy="' + cy + '" r="104" fill="#0f2036" stroke="#3574BA" stroke-width="2.5"/><circle cx="' + cx + '" cy="' + cy + '" r="86" fill="none" stroke="#2c4866" stroke-width="1.2"/>';
    for (var a = 0; a < 360; a += 10) { var k = a % 90 === 0 ? 18 : a % 30 === 0 ? 12 : 6; g += '<line x1="' + (cx + 104 * Math.sin(a * R2)).toFixed(1) + '" y1="' + (cy - 104 * Math.cos(a * R2)).toFixed(1) + '" x2="' + (cx + (104 - k) * Math.sin(a * R2)).toFixed(1) + '" y2="' + (cy - (104 - k) * Math.cos(a * R2)).toFixed(1) + '" stroke="#6FA9E0" stroke-width="' + (a % 90 === 0 ? 2.5 : 1.5) + '"/>'; }
    g += '<path d="M' + cx + ' ' + (cy - 60) + 'l12 60l-12 60l-12 -60z" fill="#13263d" stroke="#6FA9E0" stroke-width="1.5" transform="rotate(45 ' + cx + ' ' + cy + ')"/><path d="M' + cx + ' ' + (cy - 60) + 'l12 60l-12 60l-12 -60z" fill="#13263d" stroke="#6FA9E0" stroke-width="1.5" transform="rotate(-45 ' + cx + ' ' + cy + ')"/>';
    g += '<path d="M' + (cx - 80) + ' ' + cy + 'l80 -14l80 14l-80 14z" fill="#1b3350" stroke="#6FA9E0" stroke-width="1.5"/><path d="M' + cx + ' ' + (cy - 80) + 'l14 80l-14 80l-14 -80z" fill="#1b3350" stroke="#6FA9E0" stroke-width="1.5"/><path d="M' + cx + ' ' + (cy - 80) + 'l14 80h-28z" fill="#E5484D"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#E8F0F8"/>';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (q) { g += tx((cx + 118 * Math.sin(q[1] * R2)).toFixed(0), (cy - 118 * Math.cos(q[1] * R2) + 5).toFixed(0), 14, q[0], '#E8F0F8', 'middle', 1); });
    var fl = [['#fff', '#1d4ed8', 'v'], ['#E5484D', '', 's'], ['#F5D020', '#1d4ed8', 'h'], ['#1d4ed8', '#fff', 'c'], ['#F5D020', '#E5484D', 'd'], ['#fff', '#E5484D', 'x']];
    fl.forEach(function (f, i) { var x = 270 + (i % 3) * 46, y = 30 + Math.floor(i / 3) * 38; g += '<rect x="' + x + '" y="' + y + '" width="38" height="28" fill="' + f[0] + '" stroke="#0B1B30"/>'; if (f[2] === 'v') g += '<rect x="' + (x + 19) + '" y="' + y + '" width="19" height="28" fill="' + f[1] + '"/>'; if (f[2] === 'h') g += '<rect x="' + x + '" y="' + (y + 10) + '" width="38" height="8" fill="' + f[1] + '"/>'; if (f[2] === 'c') g += '<rect x="' + (x + 11) + '" y="' + (y + 8) + '" width="16" height="12" fill="' + f[1] + '"/>'; if (f[2] === 'd') g += '<path d="M' + x + ' ' + y + 'l38 28v-28z" fill="' + f[1] + '"/>'; if (f[2] === 'x') g += '<path d="M' + x + ' ' + y + 'l38 28M' + (x + 38) + ' ' + y + 'l-38 28" stroke="' + f[1] + '" stroke-width="5"/>'; });
    g += '<rect x="286" y="150" width="26" height="20" fill="#111"/><rect x="286" y="170" width="26" height="20" fill="#F5D020"/><rect x="286" y="150" width="26" height="40" fill="none" stroke="#9AB0C6"/><path d="M291 144h16l-8 -15z M291 126h16l-8 -15z" fill="#111" stroke="#9AB0C6"/><path d="M266 200q33 -12 66 0" fill="none" stroke="#6FA9E0" stroke-width="2"/>';
    g += '<circle cx="372" cy="150" r="7" fill="#F5A524"/><rect x="360" y="164" width="24" height="26" fill="#E5484D" stroke="#000"/><path d="M344 200q28 -10 56 0" fill="none" stroke="#6FA9E0" stroke-width="2"/>';
    var mx = 262, my = 232; '... --- ...'.split('').forEach(function (ch) { if (ch === '.') { g += '<circle cx="' + (mx + 4) + '" cy="' + my + '" r="4" fill="#6FA9E0"/>'; mx += 13; } else if (ch === '-') { g += '<rect x="' + mx + '" y="' + (my - 4) + '" width="20" height="8" rx="3" fill="#6FA9E0"/>'; mx += 25; } else mx += 9; });
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260">' + g + '</svg>'); }
  var PICALT = { 'ref-mayday': 'The Mayday call in order: hold the DISTRESS button, wait, then the words to say on Channel 16', 'ref-panpan': 'The Pan-Pan call in order', 'ref-mob': 'Man overboard in eight steps: shout, point, throw, press MOB, call, slow, approach from downwind, recover', 'ref-beaufort': 'The Beaufort scale as bars: force, knots and wave height', 'ref-convert': 'Scales side by side: nautical miles and kilometres, knots and metres a second, metres and feet', 'ref-rules': 'Racing rules 10, 11, 12 and 18 drawn with boats: who has right of way and who keeps clear', 'ref-distoff': 'Doubling the angle on the bow and the four-point bearing, drawn', 'ref-suncheck': 'A compass rose with the sun setting at 286 degrees true, and the sum', 'ref-morse': 'The Morse code for SOS and A to Z, drawn as dots and dashes', 'ref-colregs': 'Lights seen from above, all-round lights, day shapes, sound signals and buoys, drawn' };
  /* the safety depth picture (Stuart 26 Nov 2026 06:35 "Draw a picture to explain the min depth"; 06:44 yes to Help and a quick reference page):
     water levels, the safety depth below LAT, the real seabed against the depth squares, the no-go and keep-clear squares */
  function depthSvg() {
    var F = 'font-family="Arial,sans-serif"', LAT = 112, M = 26, y = function (d) { return LAT + d * M; }, x0 = 20, w = 54, av = [7.0, 5.6, 4.4, 3.3, 2.3, 1.1, -0.4], SAFE = 3, B = 322, g = '';
    g += '<rect width="420" height="370" fill="#0B1B30"/><rect x="' + x0 + '" y="52" width="' + 7 * w + '" height="' + (LAT - 52) + '" fill="#1b4668" opacity=".55"/><rect x="' + x0 + '" y="' + LAT + '" width="' + 7 * w + '" height="' + (B - LAT) + '" fill="#12304a"/>';
    av.forEach(function (d, i) { var c = d < 0 ? '#5c6b3a' : d < SAFE ? '#b23a3a' : av[i + 1] < SAFE ? '#7d4a52' : '#1d5a7a', xx = x0 + i * w, yy = y(d);
      g += '<rect x="' + xx + '" y="' + yy.toFixed(0) + '" width="' + w + '" height="' + (B - yy).toFixed(0) + '" fill="' + c + '" stroke="#0B1B30" stroke-width="1.5"/><text x="' + (xx + w / 2) + '" y="' + (B - 8) + '" ' + F + ' font-size="12" font-weight="700" fill="#fff" text-anchor="middle">' + (d < 0 ? 'dries' : d.toFixed(1) + ' m') + '</text>'; });
    g += '<polyline points="20,' + y(7.6) + ' 74,' + y(6.3) + ' 128,' + y(5.0) + ' 182,' + y(3.8) + ' 200,' + y(3.6) + ' 208,' + y(1.3) + ' 216,' + y(3.4) + ' 236,' + y(2.9) + ' 290,' + y(1.7) + ' 344,' + y(0.4) + ' 398,' + y(-1.1) + '" fill="none" stroke="#f1d9a0" stroke-width="2.5"/>';
    var L = function (yy, c, t, dash, bold) { return '<line x1="' + x0 + '" x2="' + (x0 + 7 * w) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + c + '" stroke-width="' + (bold ? 2.5 : 1.8) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/><text x="' + (x0 + 4) + '" y="' + (yy - 5) + '" ' + F + ' font-size="12" font-weight="700" fill="' + c + '">' + t + '</text>'; };
    g += L(52, '#8fc7ef', 'High water', '2 5') + L(92, '#8fc7ef', 'Mean low water springs', '7 5') + L(LAT, '#ffffff', '', '', 1) + '<text x="' + (x0 + 4) + '" y="' + (LAT + 15) + '" ' + F + ' font-size="12" font-weight="700" fill="#fff">LAT = chart datum</text>';
    g += '<line x1="' + x0 + '" x2="' + (x0 + 7 * w) + '" y1="' + y(SAFE) + '" y2="' + y(SAFE) + '" stroke="#FFCC1A" stroke-width="2.5" stroke-dasharray="9 6"/><text x="' + (x0 + 4) + '" y="' + (y(SAFE) - 6) + '" ' + F + ' font-size="12" font-weight="700" fill="#FFCC1A">Safety depth 3.0 m</text>';
    var ar = function (x, y1, y2, c) { return '<line x1="' + x + '" x2="' + x + '" y1="' + (y1 + 3) + '" y2="' + (y2 - 3) + '" stroke="' + c + '" stroke-width="2"/><path d="M' + (x - 5) + ' ' + (y1 + 9) + 'L' + x + ' ' + (y1 + 2) + 'L' + (x + 5) + ' ' + (y1 + 9) + 'M' + (x - 5) + ' ' + (y2 - 9) + 'L' + x + ' ' + (y2 - 2) + 'L' + (x + 5) + ' ' + (y2 - 9) + '" fill="none" stroke="' + c + '" stroke-width="2"/>'; };
    g += ar(150, LAT, y(SAFE), '#FFCC1A') + '<text x="143" y="' + (LAT + 46) + '" ' + F + ' font-size="13" font-weight="700" fill="#FFCC1A" text-anchor="end">3.0 m</text>';
    g += ar(196, 52, LAT, '#8fc7ef') + '<text x="204" y="74" ' + F + ' font-size="12" font-weight="700" fill="#8fc7ef">Height of tide:</text><text x="204" y="88" ' + F + ' font-size="12" fill="#8fc7ef">not added</text>';
    g += '<circle cx="208" cy="' + y(1.3) + '" r="9" fill="none" stroke="#fff" stroke-width="1.5"/><text x="222" y="' + (y(1.3) + 4) + '" ' + F + ' font-size="11" fill="#fff">a rock</text>';
    var br = function (a, b2, c, t, end) { return '<path d="M' + a + ' 32H' + b2 + 'M' + a + ' 27v10M' + b2 + ' 27v10" stroke="' + c + '" stroke-width="2.5" fill="none"/><text x="' + (end ? b2 : a) + '" y="22" ' + F + ' font-size="12" font-weight="700" fill="' + c + '" text-anchor="' + (end ? 'end' : 'start') + '">' + t + '</text>'; };
    g += br(x0 + 3 * w + 2, x0 + 4 * w - 4, '#e8a0a8', 'Keep clear', 1) + br(x0 + 4 * w + 4, x0 + 7 * w, '#ff7b7b', 'No-go: under 3.0 m');
    g += '<line x1="20" x2="44" y1="338" y2="338" stroke="#f1d9a0" stroke-width="2.5"/><text x="50" y="342" ' + F + ' font-size="11" fill="#c9d6e4">real seabed</text><rect x="20" y="349" width="24" height="13" fill="#1d5a7a"/><text x="50" y="360" ' + F + ' font-size="11" fill="#c9d6e4">depth square, about 115 m across: its average is all the router knows</text>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 370">' + g + '</svg>');
  }
  var DEPTH_ALT = 'A slice from deep water to the shore: high water, mean low water springs and lowest astronomical tide; the safety depth 3 m below lowest astronomical tide; the real seabed against the depth squares; the no-go squares and the keep-clear square';
  /* the vector pictures for the true wind, estimated position and routing topics */
  function vecSvg(k) {
    var A = function (x1, y1, x2, y2, c, lab, lx, ly) { var a = Math.atan2(y2 - y1, x2 - x1), h = 10; return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="3.5"/><polygon points="' + x2 + ',' + y2 + ' ' + (x2 - h * Math.cos(a - 0.4)) + ',' + (y2 - h * Math.sin(a - 0.4)) + ' ' + (x2 - h * Math.cos(a + 0.4)) + ',' + (y2 - h * Math.sin(a + 0.4)) + '" fill="' + c + '"/>' + (lab ? '<text x="' + lx + '" y="' + ly + '" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="' + c + '">' + lab + '</text>' : ''); };
    var g = '';
    if (k === 'ref-twa') {   /* the triangle of air motions (where the air goes), boat heading up the page: apparent = true + the head wind of the boat's motion */
      var px = 300, py = 60, Ax = -94.6, Ay = 135.2, Hy = 71.5, Tx = Ax, Ty = Ay - Hy;   /* AWS 15 kn at 35 deg, BSP 6.5 kn, 11 px a knot */
      g += '<rect width="420" height="300" fill="#0B1B30"/><text x="12" y="22" font-family="Arial,sans-serif" font-size="13" fill="#9AB0C6">Where the air goes, boat heading up the page</text>';
      g += '<path d="M60 150 q 14 30 0 90 q -14 -60 0 -90z" fill="#E8F0F8"/>' + A(60, 270, 60, 200, '#5B8DEF', '', 0, 0) + '<text x="76" y="250" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#5B8DEF">Boat 6.5 kn</text>';
      g += A(px, py, px + Tx, py + Ty, '#E5484D', 'True 10.4 kn, TWA 56°', px - 20, py - 12);
      g += A(px + Tx, py + Ty, px + Tx, py + Ty + Hy, '#5B8DEF', 'Head wind 6.5 kn', px + Tx + 10, py + Ty + 40);
      g += A(px, py, px + Ax, py + Ay, '#4CC38A', 'Apparent 15 kn, AWA 35°', px - 40, py + Ay + 30);
    } else if (k === 'ref-ep') {
      var s2 = 30, fx = 200, fy = 40;
      g += '<rect width="420" height="300" fill="#0B1B30"/><circle cx="' + fx + '" cy="' + fy + '" r="6" fill="none" stroke="#E8F0F8" stroke-width="2"/><text x="' + (fx + 10) + '" y="' + (fy + 4) + '" font-family="Arial,sans-serif" font-size="13" fill="#E8F0F8">Fix</text>';
      g += A(fx, fy, fx, fy + 6 * s2, '#5B8DEF', 'Water track 180°, 6 nm', fx - 110, fy + 100);
      g += A(fx, fy + 6 * s2, fx + 2 * s2, fy + 6 * s2, '#F5A524', 'Tide 090°, 2 kn', fx - 10, fy + 6 * s2 + 22);
      g += A(fx, fy, fx + 2 * s2, fy + 6 * s2, '#E5484D', 'Ground track 162°, 6.3 nm', fx + 2 * s2 + 10, fy + 120);
      g += '<polygon points="' + (fx + 2 * s2) + ',' + (fy + 6 * s2 - 9) + ' ' + (fx + 2 * s2 + 8) + ',' + (fy + 6 * s2 + 5) + ' ' + (fx + 2 * s2 - 8) + ',' + (fy + 6 * s2 + 5) + '" fill="none" stroke="#E8F0F8" stroke-width="2"/><text x="' + (fx + 2 * s2 + 12) + '" y="' + (fy + 6 * s2 + 4) + '" font-family="Arial,sans-serif" font-size="13" fill="#E8F0F8">EP</text>';
    } else {   /* isochrones: the reach after 1, 2, 3 and 4 hours, a few of the headings tried, and the route traced back */
      g += '<rect width="420" height="300" fill="#0B1B30"/><text x="12" y="22" font-family="Arial,sans-serif" font-size="13" fill="#9AB0C6">How far the boat can get in 1, 2, 3 and 4 hours</text>';
      var cx = 50, cy = 265, cols = ['#5B8DEF', '#4CC38A', '#F5A524', '#E5484D'];
      for (var a3 = 0; a3 <= 90; a3 += 15) { var rr = a3 * Math.PI / 180; g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 70 * Math.cos(rr)).toFixed(1) + '" y2="' + (cy - 52 * Math.sin(rr)).toFixed(1) + '" stroke="#9AB0C6" stroke-width="1.2" stroke-dasharray="3 3"/>'; }
      for (var r = 1; r <= 4; r++) { var d = ''; for (var a2 = 0; a2 <= 90; a2 += 5) { var rad = a2 * Math.PI / 180, k2 = 1 - 0.18 * Math.sin(rad * 2); d += (a2 ? ' L' : 'M') + (cx + r * 78 * k2 * Math.cos(rad)).toFixed(1) + ' ' + (cy - r * 56 * k2 * Math.sin(rad)).toFixed(1); }
        g += '<path d="' + d + '" fill="none" stroke="' + cols[r - 1] + '" stroke-width="2.5"/><text x="' + (cx + r * 78 + 4) + '" y="' + (cy - 4) + '" font-family="Arial,sans-serif" font-size="12" fill="' + cols[r - 1] + '">' + r + ' h</text>'; }
      g += '<polyline points="' + cx + ',' + cy + ' 110,222 165,175 222,128 282,92" fill="none" stroke="#FF4FB4" stroke-width="3"/><text x="150" y="150" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#FF4FB4">the route</text>';
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#E8F0F8"/><text x="' + (cx - 30) + '" y="' + (cy + 4) + '" font-family="Arial,sans-serif" font-size="12" fill="#E8F0F8">Start</text>';
      g += '<circle cx="300" cy="80" r="7" fill="none" stroke="#E8F0F8" stroke-width="2"/><text x="312" y="76" font-family="Arial,sans-serif" font-size="13" fill="#E8F0F8">Finish</text>';
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">' + g + '</svg>');
  }

  /* the flags drawn (International Code of Signals designs), one picture for the Signal flags topic */
  function flagSvg() {
    var Y = '#F7C500', B = '#1F4FA3', R = '#D7261E', W = '#FFFFFF', K = '#111111', w = 60, h = 40;
    function rect(x, y, a, b, c) { return '<rect x="' + x + '" y="' + y + '" width="' + a + '" height="' + b + '" fill="' + c + '"/>'; }
    function poly(pts, c) { return '<polygon points="' + pts + '" fill="' + c + '"/>'; }
    var F = {
      A: poly('0,0 30,0 30,40 0,40', W) + poly('30,0 60,0 45,20 60,40 30,40', B),
      B: poly('0,0 60,0 45,20 60,40 0,40', R),
      C: rect(0, 0, w, 8, B) + rect(0, 8, w, 8, W) + rect(0, 16, w, 8, R) + rect(0, 24, w, 8, W) + rect(0, 32, w, 8, B),
      D: rect(0, 0, w, 10, Y) + rect(0, 10, w, 20, B) + rect(0, 30, w, 10, Y),
      E: rect(0, 0, w, 20, B) + rect(0, 20, w, 20, R),
      F: rect(0, 0, w, h, W) + poly('30,2 58,20 30,38 2,20', R),
      G: [0, 1, 2, 3, 4, 5].map(function (i) { return rect(i * 10, 0, 10, h, i % 2 ? B : Y); }).join(''),
      H: rect(0, 0, 30, h, W) + rect(30, 0, 30, h, R),
      I: rect(0, 0, w, h, Y) + '<circle cx="30" cy="20" r="11" fill="' + K + '"/>',
      J: rect(0, 0, w, 13, B) + rect(0, 13, w, 14, W) + rect(0, 27, w, 13, B),
      K: rect(0, 0, 30, h, Y) + rect(30, 0, 30, h, B),
      L: rect(0, 0, 30, 20, Y) + rect(30, 0, 30, 20, K) + rect(0, 20, 30, 20, K) + rect(30, 20, 30, 20, Y),
      M: rect(0, 0, w, h, B) + '<path d="M0 0L60 40M60 0L0 40" stroke="' + W + '" stroke-width="8"/>',
      N: [0, 1, 2, 3].map(function (r) { return [0, 1, 2, 3].map(function (c) { return rect(c * 15, r * 10, 15, 10, (r + c) % 2 ? W : B); }).join(''); }).join(''),
      O: poly('0,0 60,0 60,40', R) + poly('0,0 60,40 0,40', Y),
      P: rect(0, 0, w, h, B) + rect(20, 13, 20, 14, W),
      Q: rect(0, 0, w, h, Y),
      R: rect(0, 0, w, h, R) + rect(25, 0, 10, h, Y) + rect(0, 15, w, 10, Y),
      S: rect(0, 0, w, h, W) + rect(20, 13, 20, 14, B),
      T: rect(0, 0, 20, h, R) + rect(20, 0, 20, h, W) + rect(40, 0, 20, h, B),
      U: rect(0, 0, 30, 20, R) + rect(30, 0, 30, 20, W) + rect(0, 20, 30, 20, W) + rect(30, 20, 30, 20, R),
      V: rect(0, 0, w, h, W) + '<path d="M0 0L60 40M60 0L0 40" stroke="' + R + '" stroke-width="8"/>',
      W: rect(0, 0, w, h, B) + rect(10, 7, 40, 26, W) + rect(20, 14, 20, 12, R),
      X: rect(0, 0, w, h, W) + rect(25, 0, 10, h, B) + rect(0, 15, w, 10, B),
      Y: '',   /* drawn below */
      Z: poly('0,0 60,0 30,20', Y) + poly('0,0 30,20 0,40', K) + poly('0,40 30,20 60,40', R) + poly('60,0 60,40 30,20', B)
    };
    /* Y: diagonal stripes from the upper fly to the lower hoist */
    F.Y = '<clipPath id="fy"><rect width="60" height="40"/></clipPath><g clip-path="url(#fy)">' + rect(0, 0, w, h, Y) + [0, 1, 2, 3, 4, 5].map(function (i) { var x = -20 + i * 18; return poly((x + 9) + ',0 ' + (x + 18) + ',0 ' + (x - 22) + ',40 ' + (x - 31) + ',40', R); }).join('') + '</g>';
    var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), cols = 6, cw = 78, ch = 64, svg = '';
    L.forEach(function (c, i) { var x = (i % cols) * cw + 6, y = Math.floor(i / cols) * ch + 4; svg += '<g transform="translate(' + x + ',' + y + ')"><g clip-path="url(#fcl)">' + F[c].replace(/id="fy"/g, 'id="fy' + c + '"').replace(/url\(#fy\)/g, 'url(#fy' + c + ')') + '</g><rect width="60" height="40" fill="none" stroke="#7a8ca0" stroke-width="1"/><text x="30" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#E8F0F8">' + c + '</text></g>'; });
    /* racing extras: the answering pennant, first substitute and the black flag */
    var ex = [['AP', poly('0,0 60,20 0,40', W) + '<clipPath id="fap"><polygon points="0,0 60,20 0,40"/></clipPath><g clip-path="url(#fap)">' + [0, 2, 4].map(function (i) { return rect(i * 12, 0, 12, 40, R); }).join('') + '</g>'], ['1st sub', poly('0,0 60,20 0,40', B) + poly('6,5 46,20 6,35', Y)], ['Black', rect(0, 0, w, h, K)]];
    ex.forEach(function (e, j) { var i = L.length + j, x = (i % cols) * cw + 6, y = Math.floor(i / cols) * ch + 4; svg += '<g transform="translate(' + x + ',' + y + ')">' + e[1] + '<text x="30" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#E8F0F8">' + e[0] + '</text></g>'; });
    var rows = Math.ceil((L.length + ex.length) / cols);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (cols * cw + 6) + ' ' + (rows * ch + 6) + '"><defs><clipPath id="fcl"><rect width="60" height="40"/></clipPath></defs><rect width="100%" height="100%" fill="#0B1B30"/>' + svg + '</svg>');
  }
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function build() {
    var list = $('helpList'); if (!list) return false; if ($('fsRef')) return true;
    var sec = document.createElement('section'); sec.id = 'fsRef'; sec.className = 'fsref';
    sec.innerHTML = '<h3 class="navhelph">Quick reference at sea</h3>' + T.map(function (t) { return '<div class="htopic" data-k="' + t[0] + '"><h3>' + esc(t[1]) + '</h3>' + t[2].map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + (PIC[t[0]] ? '<img class="hpic" alt="' + PICALT[t[0]] + '" src="' + PIC[t[0]]() + '">' : t[0] === 'ref-flags' ? '<img class="hpic" alt="The signal flags A to Z, the answering pennant, the first substitute and the black flag" src="' + flagSvg() + '">' : t[0] === 'ref-depth' ? '<img class="hpic" alt="' + DEPTH_ALT + '" src="' + depthSvg() + '">' : /^ref-(twa|ep|routing)$/.test(t[0]) ? '<img class="hpic" alt="Vector picture: ' + esc(t[1]) + '" src="' + vecSvg(t[0]) + '">' : '') + '</div>'; }).join('');
    list.parentNode.insertBefore(sec, list.nextSibling);
    return true;
  }
  /* the same picture in Settings, under the safety depth and its note (both the Course tab's and the Charts tab's sliders) */
  function setPic() { var done = false; ['depth', 'depth2'].forEach(function (id) { var d = document.getElementById(id); if (!d) return; done = true; if (document.getElementById(id + 'Pic')) return; var row = d.closest('.row'), nx = row && row.nextElementSibling, im = document.createElement('img'); im.id = id + 'Pic'; im.alt = DEPTH_ALT; im.src = depthSvg(); im.style.cssText = 'display:block;width:100%;max-width:520px;height:auto;margin:8px 0;border-radius:10px'; (nx && nx.matches && nx.matches('p.note') ? nx : row).insertAdjacentElement('afterend', im); }); return done; }
  var n2 = 0, tm2 = setInterval(function () { if (setPic() || ++n2 > 60) clearInterval(tm2); }, 500);
  var n = 0, tm = setInterval(function () { if (build() || ++n > 60) clearInterval(tm); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(build, 30); }, true);
  window.FSRef = { titles: T.map(function (t) { return t[1]; }), head: headSvg, pics: PIC };
})();
