/* Quick reference at sea, in Help for all four tools (Stuart 24 Nov 2026 15:47, night jobs 26 to 29; written 25 Nov). Each topic is
   researched from the source named under it, in our own words except the radio message forms, which follow the MCA's published order.
   Man overboard is for Stuart to check before release. Emma reads each topic (helpmedia/voice, made by tools/help_voice.py). */
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
  ];

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
    sec.innerHTML = '<h3 class="navhelph">Quick reference at sea</h3>' + T.map(function (t) { return '<div class="htopic" data-k="' + t[0] + '"><h3>' + esc(t[1]) + '</h3>' + t[2].map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + (t[0] === 'ref-flags' ? '<img class="hpic" alt="The signal flags A to Z, the answering pennant, the first substitute and the black flag" src="' + flagSvg() + '">' : '') + '</div>'; }).join('');
    list.parentNode.insertBefore(sec, list.nextSibling);
    return true;
  }
  var n = 0, tm = setInterval(function () { if (build() || ++n > 60) clearInterval(tm); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(build, 30); }, true);
  window.FSRef = { titles: T.map(function (t) { return t[1]; }) };
})();
