/* FirstShift Route: help for the newer features, with a screen picture for each (Stuart 13 Nov 2026: "build help as
   we go along with screen images to ensure we keep in step"). The topics sit at the top of Help, before Route's own; the
   pictures load only when Help is opened. Each topic has its own Listen button. */
(function () {
  'use strict';
  var T = [
    ['plot', 'Basic plotter', 'PLOT, by the GPS button, shows the next mark from this phone’s own GPS: its bearing (BTW, true), distance (DTW), the speed you are making towards it (VMC), the time you will get there at that speed (ETA, UTC) and how far you are off the leg from the last mark (XTE, left or right). Arrows step to the previous or next mark; within 0.1 nm the next mark comes up by itself. On the chart: a dotted bearing line, a ring on the next mark and a 10-minute line along your course over the ground. Hide shrinks it to one line. PLOT turns on Live GPS. Not for navigation.'],
    ['charts', 'Charts', 'Settings, Charts says what the chart is drawn from, how to change what it shows with the layers button, and why it is not for navigation. Official charts from GeoGarage are coming.'],
    ['tap', 'Route from any point', 'Tap the water anywhere on the chart. The boat is here: route the rest of the race takes that spot as the boat’s position now and routes the rest of the race from it, in every model, with all the figures. Route to here (what if) routes from where the boat is at the slider time to that spot, for a waypoint, a tidal gate or a what-if.'],
    ['clear', 'Clear screen', 'CLEAR on the chart, or a long press on the chart, leaves just the chart, MOB and MENU. MENU brings everything back; the menus hide again after a minute without a tap (change the time in Settings, Display, Clear screen). MOB is never hidden.'],
    ['wind', 'Wind by hand', 'If the wind you can see is not the forecast, open Settings, Forecasts, If you think the forecast is wrong, and type The wind here is really, in degrees and knots, and choose for how many hours. Route shifts the forecast to match at the middle of the chart (the boat, when Live GPS is following it), up to 40° and 40%, and routes again, fading back to the forecast afterwards. Back to the forecast undoes it.'],
    ['models', 'Forecast models: ages and blending', 'Each model shows the time of its run and how old it is. Leave out model runs older than drops stale runs from the routing; the newest always stay in. Combine the models: Standard is how Route has always worked; Smooth blend averages the wind speeds and fades one model into the next at the end of its forecast and the edge of its area.'],
    ['mine', 'My set-up', 'Save as my defaults keeps the way you like Route; Back to my defaults returns to it. Named set-ups (Night watch, Deliveries, Training) and Export to a file for another device. Ready for offline downloads everything this race needs before you leave harbour. Your race and marks are never changed by a set-up.'],
    ['move', 'Move the GPS window', 'Drag the small dots on any window over the chart (the GPS window, the plotter bar, the Layers box or the instrument strip) to move it; let go and it stays. It never covers a button: it slides to the nearest gap. Drag it off the left or right side, or flick it there, and it tucks away to a light blue tab on that edge, clearing the screen for the chart; tap the tab to bring it back. Settings, Display, Window positions: Lock layout, the dots on the left, in the middle or on the right, and Reset to FirstShift layout. Positions are kept for each screen size and orientation.'],
    ['find', 'Find a setting', 'Type a word such as tide, offline, night or AIS in the box at the top of Settings. Tap a result to open its tab; the setting is highlighted.'],
    ['tracks', 'My tracks', 'File track in the GPS window keeps the boat\u2019s trail in My tracks (Settings, Charts) with its date, race and distance, and starts a fresh trail; Live GPS keeps running. Each filed track can be shown on the chart, saved as GPX, or saved as a log in PDF: an entry each hour with the time, position, course and speed made good, distance run and the forecast wind, with space for the boat and crew. Delete needs a second tap. Tracks in Layers hides every track without deleting anything.'],
    ['astro', 'Astro', 'The Astro button in the top bar (on a phone, at the top of Layers) gives sunrise, sunset, first and last light, moonrise and moonset, and how much of the moon is lit, at the boat or the start, for the day on the time slider. A band shows day, twilight and night from midday to midday, with a bar for when the moon is up. Tick the box to keep a line of sun and moon times on the chart. Worked out on the phone, with no internet.'],
    ['tidegate', 'Tide gate', 'TIDE, by PLOT and DECK, shows whether you will reach the next mark before the tide along the leg turns: the tide along the leg in knots and as a share of boat speed, when it turns at the mark, your arrival time and the minutes in hand or short, the speed needed if you would miss it, and what arriving half an hour later costs. The next leg follows. Add rivals by name and TCC, or give an AIS boat a TCC, to see when each reaches the mark, elapsed and corrected. An alarm sounds 15 minutes before the gate closes if you would miss it.'],
    ['solmap', 'Solent races on the chart', 'Races, then Solent races, then Round the cans: tap each buoy on the chart and choose Port or Starboard beside it. The course grows on the chart and as chips at the bottom: tap a chip to swap sides, Undo takes the last one off, Finish opens the builder with the legs. All the buoys lists every Solent mark, searched by code or name, each with Port and Starboard. Windward-leeward takes a leeward buoy or a gate of two buoys, and a finish at leeward, the start line or windward.'],
    ['tidehand', 'Tide by hand', 'In Settings, Forecasts, If you think the forecast is wrong: Tide direction turns the tide by up to 60 degrees either way, with Tide strength and Tide timing, for the whole race or an area you draw. On a Solent race the legs table has a tide strength and direction for each leg, kept with the race. The chart note says what has been changed.'],
    ['bow', 'Start line and bow offset', 'In the GPS window, Ping boat and Ping pin mark the ends of the start line. Set the Bow offset in Settings, Course (from the GPS to the bow, in metres) and each ping is moved forward along the heading to where the bow is. With both ends pinged, Start from the line moves the course start to the middle of the line and routes again.']
  ];
  function $(id) { return document.getElementById(id); }
  var speaking = null;
  function say(i, btn) {
    try { speechSynthesis.cancel(); } catch (e) {}
    if (speaking === i) { speaking = null; return; }
    if (!window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(T[i][1] + '. ' + T[i][2]); u.lang = 'en-GB'; var v = speechSynthesis.getVoices().filter(function (x) { return /en-GB/i.test(x.lang); })[0]; if (v) u.voice = v;
    u.onend = function () { speaking = null; }; speaking = i; speechSynthesis.speak(u);
  }
  function build() {
    var list = $('helpList'); if (!list || $('navHelp')) return !!$('navHelp');
    var sec = document.createElement('section'); sec.id = 'navHelp'; sec.className = 'navhelp';
    sec.innerHTML = '<h3 class="navhelph">New in Route</h3><p class="note">The newest features, with a picture of each. The rest of the help follows below.</p>' +
      T.map(function (t, i) { return '<div class="htopic navht" data-k="' + t[0] + '"><h3>' + t[1] + '<button class="btn say" type="button" data-nsay="' + i + '">Listen</button></h3><p>' + t[2] + '</p><img class="hpic" alt="Screen picture: ' + t[1] + '" data-pic="' + t[0] + '"></div>'; }).join('') +
      '<h3 class="navhelph">Route help</h3>';
    list.parentNode.insertBefore(sec, list);
    sec.addEventListener('click', function (e) { var b = e.target.closest('[data-nsay]'); if (b) say(+b.dataset.nsay, b); });
    return true;
  }
  /* the pictures: a separate file, fetched the first time Help is opened */
  var loading = false;
  function pics() {
    var fill = function () { [].forEach.call(document.querySelectorAll('#navHelp img[data-pic]'), function (im) { var s = window.__navHelpImg && window.__navHelpImg[im.dataset.pic]; if (s && !im.src) im.src = s; if (!s) im.hidden = true; }); };
    if (window.__navHelpImg) { fill(); return; }
    if (loading) return; loading = true;
    var sc = document.createElement('script'); sc.src = 'fshelpimg.js'; sc.onload = fill; sc.onerror = function () { loading = false; }; document.head.appendChild(sc);
  }
  var n = 0, t = setInterval(function () { if (build() || ++n > 60) clearInterval(t); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(function () { build(); pics(); }, 50); }, true);
  window.FSHelp = { topics: T.map(function (x) { return x[0]; }), pics: pics };
})();
