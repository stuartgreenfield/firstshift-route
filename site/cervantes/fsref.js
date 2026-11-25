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
  ];
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function build() {
    var list = $('helpList'); if (!list) return false; if ($('fsRef')) return true;
    var sec = document.createElement('section'); sec.id = 'fsRef'; sec.className = 'fsref';
    sec.innerHTML = '<h3 class="navhelph">Quick reference at sea</h3>' + T.map(function (t) { return '<div class="htopic" data-k="' + t[0] + '"><h3>' + esc(t[1]) + '</h3>' + t[2].map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>'; }).join('');
    list.parentNode.insertBefore(sec, list.nextSibling);
    return true;
  }
  var n = 0, tm = setInterval(function () { if (build() || ++n > 60) clearInterval(tm); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(build, 30); }, true);
  window.FSRef = { titles: T.map(function (t) { return t[1]; }) };
})();
