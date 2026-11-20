/* FirstShift Mark and Mark+: the inshore race guide in Help (M50, Stuart 17 Nov 2026 13:37 and 17:00: "build with pics, voice text
   for all parts of the tool"; "Every part of mark needs a help so always check back to route"). Mark's own topics go first, in the
   order of a race day; Route's topics follow under their usual cards, so nothing Route can do is missing from Mark's Help. Each topic
   is one slide: a screen picture, short steps, and Emma reading it. Topics marked plus show only in Mark+. */
(function () {
  'use strict';
  if (!window.FS_MARK) return;
  var PLUS = !!window.NAV_VERSION;
  /* [title, paragraphs, plus only] */
  var T = [
    /* Getting started */
    ['VMG and VMC', ['VMG (velocity made good) is your speed towards the wind on a beat, or away from it on a run. Instruments work it out through the water: boat speed times the cosine of the true wind angle. It shows how well you are sailing the angles, and the polar gives a target VMG for the wind speed.', 'VMC (velocity made on course) is your speed over the ground towards the next mark, tide included: speed over the ground times the cosine of the angle between your course over the ground and the bearing to the mark. It is the speed that gets you to the mark, on any leg.', 'They are different numbers. On a reach VMG means little and VMC is what counts. Some GPS units label VMC as VMG to waypoint; FirstShift always calls it VMC.', 'Mark has only the phone’s GPS, so its VMG is your speed over the ground along the wind direction in use (forecast or typed in), tide included, and it says so beside the number. Mark+ takes VMG from the boat’s instruments, through the water. Both show the polar target and how close you are to it.']],   /* 20 Nov VMG/VMC review (Stuart 09:25) */
    ['What Mark does', ['Mark is FirstShift’s inshore racing tool for the Solent: round the cans and windward-leeward.', 'Set the course from the Solent racing marks, set the start line, run the start sequence, and Mark shows the favoured end, time to the line and time to burn, then the bearing and distance to every mark.', 'Route it on the forecast when you want to. Everything Route does is here too. A planning aid, not for navigation.']],
    ['Mark and Mark+', ['Mark runs in the phone’s browser and uses the phone’s own GPS.', 'Mark+ is the Android app. It does everything Mark does and connects to the boat’s instruments, so the start screen also shows boat speed, true and apparent wind angle and heel, the tide can come from the boat, and Mark+ learns how quickly your boat gets up to speed.']],
    ['Your first race', ['The Start new race card keeps a short list of the steps of a first race and ticks each one as you do it: a practice race, a course, a start line, a start sequence, the start screen, a course change and the finish.', 'Do them in any order; the question mark beside each opens its Help. The list goes once every step is ticked, or tap Hide this list.']],
    ['Test mode', ['Test mode sails a practice boat round a Solent course so you can watch the start, the line, the racing window and the finish ashore. Nothing goes to the crew.', 'Open it from Test mode on the Start new race card. The gun is two and a half minutes away.', 'The orange bar changes the speed (times 1, 5, 20 or 60), shifts the wind 10 degrees either way, gives a course change or an early start. Stop ends it and puts your own race back.']],
    /* 'The practice race with Emma' topic taken out with the tour level, 18 Nov 19:55; back with the rebuild */
    ['Stored races', ['Every race you set is kept with its date and time. Stored races on the Start new race card opens the list; tap one to open it again, with its course, line and settings.']],
    ['The crew in step', ['Share, at the top of Settings, gives the boat code. Everyone on the boat who opens it with the code sees the same course, line and gun, in Mark or Mark+, Route or Route+.']],
    /* Set the course */
    ['Start new race', ['After the opening screen Mark shows Start new race. Choose Round the cans or Windward-leeward from the two pictures.', 'Last course opens the course you set before. The step box then takes you through the course one step at a time; Next and Back move between steps.']],
    ['Route this race, or not?', ['Step 1 asks whether to route. No routing gives the course as a list of legs with bearings, distances and whether each is a beat, a reach or a run. Route it routes the race on the forecast as Route does, with one step more for the wind and tide.']],
    ['Round the cans', ['Tap the first buoy on the chart, then each buoy in turn. Choose Port or Starboard for each, the side you leave it.', 'You can also type a buoy’s code (2C, 3F and so on) in the box below. Tap the sea away from a buoy and Mark names the nearest one.', 'Then the finish: at the start line, or a buoy or point.']],
    ['Windward-leeward', ['The windward mark: a buoy, a point you tap or ping, or a heading and distance from the line.', 'The leeward mark: the start line, a buoy, a point, or a gate of two marks.', 'Then the laps and where you finish: leeward, the start line or windward.']],
    ['The wind', ['Type the wind direction and speed. Or sail close-hauled on each tack and tap Starboard tack, then Port tack: the wind is halfway between the two headings, and half the angle between them is how high you point. Head to wind takes the heading with the bow into the wind.', 'Mark+ adds From the boat. The wind sets the leg types, the line bias and header or lift.']],
    ['The tide', ['Forecast uses the tidal streams in the forecast. By hand: type the rate and the direction it runs to, as you see it on a buoy. Mark+ adds From the boat. The tide is used for the laylines and the route.']],
    ['Check the course', ['The last step lists the course. Something is missing says what to add. Show the course puts it on the chart; Route it routes it.']],
    ['The course card', ['The course card shows the race leg by leg with each mark, side, bearing and distance, and the panel for the start: start time, start line, tide, sequence, our start, boat length, time to full speed and when the start screen opens.']],
    /* The start line */
    ['Set the start line', ['Choose how to set it: Tap the ends on the chart (committee boat first, then the pin), Ping each end as you pass it, Boat, direction, length from the committee boat, or Lat and long typed in.', 'A shore transit works too: choose Shore transit for a line between two points ashore.']],
    ['Ping the ends', ['Sail past the committee boat and tap Ping boat as the GPS passes it, then the pin and Ping pin.', 'With a bow offset set, ping when the phone is on the line, not the bow: Mark moves the ping forward to the bow for you.']],
    ['Line bias and the favoured end', ['With the wind set, Mark works out which end is closer to the wind, the favoured end, and by how much in metres and boat lengths (set your boat length in the course card).', 'FAVOURED shows at that end on the chart and the start picture.']],
    ['The ladder rung', ['On the start picture a line runs through the favoured end square to the wind: a boat on it is level with a boat at the favoured end. It shows how far behind the favoured end you are anywhere on the line.']],
    ['Line check', ['Mark checks the line as you set it: an end set more than 20 minutes ago (ping again if the committee has moved it), a line under 30 metres or over 2,000, and a pin to starboard of the committee boat looking up the wind, which usually means the ends are swapped.']],
    /* The start */
    ['The start sequence', ['Set the start time in the course card and choose the sequence: 5-4-1-0, 3-2-1-0 or 10-5-0. A box under the top bar counts down to the gun from 15 minutes before, with a long sound at each signal and short ones in the last ten seconds; the phone vibrates with them.']],
    ['Sync and the minute buttons', ['Tap Sync at a signal to put the count on the whole minute. Minus 1 min and plus 1 min move the gun. AP postpones. The flag shows P, I, Z, U or black, with what it means.']],
    ['A series of starts', ['When classes start one after another, set Our start: your place in the series and the minutes between starts. Mark counts down to your own gun and shows the series above the count.']],
    ['The start screen', ['The start screen opens 10, 5 or 3 minutes before the gun (set it with Opens on the start screen or in the course card, or Off; Show now opens it at any time).', 'At first the chart shows through it, north up, fitted to the line with the favoured end marked, and Ping boat end and Ping pin end are on the screen. Picture swaps to the drawn picture; See chart swaps back.', 'The picture shows the line, the favoured end, the laylines, the line to the first mark, the wind and the tide. Zoom with the plus and minus buttons, pinch, or double tap. Chart goes back to the chart.']],
    ['Time to line and time to burn', ['To the line is the distance from the bow to the line. Time to line is how long you need at your best speed of the last two minutes, allowing for getting up to speed. Time to burn is the time spare: green, on time; amber, early, burn it; red, late, go.', 'The moving line on the picture shows where you would be at the gun: red ahead of the line if early, blue behind it if late.']],
    ['Getting up to speed', ['To full speed, in the course card, sets how many seconds your boat takes from stopped to full speed, so time to line allows for it.', 'Typed: your own figure. Learn: Mark learns it from your own speed-ups (from the GPS in Mark, from the log in Mark+).']],
    ['Course side', ['If you are on the course side before the gun, To the line turns red and the bar at the foot says go back before the gun.']],
    ['General recall', ['After the gun the box shows General recall and the cross. General recall starts a new sequence from now and says when the new gun is; Sync at the next signal to line it up with the committee.']],
    /* Racing the legs */
    ['The next mark', ['After the gun a blue dotted line runs from the boat to the next mark, with its bearing in degrees true and distance in nautical miles. The GPS window shows the same, with the speed you are making towards it.']],
    ['Laylines and the tide', ['The laylines on the chart and the start picture allow for the tide, so they show the course you will make over the ground, not just the heading.']],
    ['Header or lift', ['On a beat Mark compares your heading with the wind you set and shows HEADER or LIFT and by how many degrees, or ON THE WIND.']],
    ['The time slider folds away', ['While the GPS is live the time slider and the clock fold away to give the chart more room. TIME in the bottom bar brings them back, and folds them again.']],
    ['Course change', ['If the committee changes the course, tap the red COURSE CHANGE button in the bottom bar. The course opens leg by leg.', 'Change swaps a mark: tap a buoy, or the water for a waypoint. The arrows swap Port and Starboard. The cross takes a mark out. Done puts the new course on the chart and the next mark follows it.']],
    /* Finish and after */
    ['The finish', ['The finish is the start line or the mark you set. The race ends when you cross it, or when you tap Stop race.']],
    ['Stop race and start new race', ['Stop race, on the Start new race card, ends the race and files your track. Start new race clears the marks and keeps the start line and the wind, ready for the next race of the day.']],
    /* Mark+ on board */
    ['Instruments on the start screen', ['Mark+ adds boxes for boat speed from the log, true wind angle and apparent wind angle with the wind speed, and heel when your instruments send it.'], true],
    ['Wind and tide from the boat', ['Mark+ can take the wind from the instruments (From the boat in the wind step) and the tide from the boat: from the instruments’ own tide if they send it, or by comparing the GPS with the log and compass.'], true],
    ['Learning your boat', ['Mark+ learns from your sailing: how quickly the boat gets up to speed, for time to line, and the polar, as Route+ does. Changes to the polar wait for you to approve them.'], true]
  ];
  var esc = function (s) { return String(s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); };
  window.FSMarkHelp = T.filter(function (t) { return PLUS || !t[2]; }).map(function (t) { return t[0]; });
  function build() {
    var list = document.getElementById('helpList'); if (!list) return false; if (document.getElementById('markHelp')) return true;
    var sec = document.createElement('section'); sec.id = 'markHelp';
    sec.innerHTML = '<h3 class="navhelph">The inshore race guide</h3>' + T.filter(function (t) { return PLUS || !t[2]; }).map(function (t) {
      return '<div class="htopic markht"><h3>' + esc(t[0]) + '</h3>' + t[1].map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>'; }).join('');
    var nh = document.getElementById('navHelp'), at = nh || list; at.parentNode.insertBefore(sec, at);
    try { var hs = document.querySelector('#help .hbrand span'); if (hs && /Route help/.test(hs.textContent)) hs.textContent = PLUS ? 'Mark+ help' : 'Mark help'; } catch (e) {}
    return true;
  }
  /* Help's cards for Mark, in the order of a race day; Route's own cards follow */
  window.FS_HELP_SECTIONS = [
    { id: 'mstart', name: 'Getting started', blurb: 'What Mark does, test mode, your first race', titles: ['What Mark does', 'Mark and Mark+', 'Your first race', 'Test mode', 'Stored races', 'The crew in step', 'Try it safely first', 'My set-up', 'Find a setting', 'Your boat'], re: /$^/ },
    { id: 'mcourse', name: 'Set the course', blurb: 'Round the cans, windward-leeward, wind and tide', titles: ['Start new race', 'Route this race, or not?', 'Round the cans', 'Windward-leeward', 'The wind', 'The tide', 'Check the course', 'The course card', 'Solent races on the chart', 'Tide by hand'], re: /$^/ },
    { id: 'mline', name: 'The start line', blurb: 'Set it, ping it, the favoured end', titles: ['Set the start line', 'Ping the ends', 'Start line and bow offset', 'Line bias and the favoured end', 'The ladder rung', 'Line check'], re: /$^/ },
    { id: 'mgun', name: 'The start', blurb: 'Sequence, start screen, time to burn', titles: ['The start sequence', 'Sync and the minute buttons', 'A series of starts', 'The start screen', 'Time to line and time to burn', 'Getting up to speed', 'Course side', 'General recall'], re: /$^/ },
    { id: 'mrace', name: 'Racing the legs', blurb: 'Next mark, laylines, course change', titles: ['VMG and VMC', 'The next mark', 'Laylines and the tide', 'Header or lift', 'The time slider folds away', 'Course change', 'Basic plotter', 'Live GPS while racing', 'Tide gate', 'Move the GPS window', 'Man overboard', 'AIS'], re: /$^/ },
    { id: 'mfin', name: 'Finish and after', blurb: 'The finish, your track, the crew ashore', titles: ['The finish', 'Stop race and start new race', 'My tracks', 'Follow the boat', 'Family and friends'], re: /$^/ },
    { id: 'mplus', name: 'Mark+ on board', blurb: 'Instruments, wind and tide from the boat, learning', titles: ['Instruments on the start screen', 'Wind and tide from the boat', 'Learning your boat'], re: /$^/ },
    { id: 'boat', name: 'The boat and instruments', blurb: 'Connecting, the strip, data and alarms', titles: [], re: /instrument|gateway|nmea|data sour|connect|alarm|depth|starlink/i },
    { id: 'wx', name: 'Forecasts and routing', blurb: 'Routes, models, wind by hand', titles: [], re: /forecast|route|isochrone|model|wind|ask/i },
    { id: 'chart', name: 'Chart and screen', blurb: 'Charts, layers, the screen', titles: [], re: /chart|mark|waypoint|screen|move|astro|track/i },
    { id: 'polar', name: 'Polars and the log', blurb: 'Learning polars, the race log', titles: [], re: /polar|log\b|debrief/i },
    { id: 'more', name: 'More', blurb: 'Everything else', titles: [], re: /$^/ }
  ];
  window.FS_HELP_PATHS = [
    { id: 'mp1', name: 'My first inshore race', steps: ['What Mark does', 'Test mode', 'Start new race', 'Round the cans', 'Set the start line', 'The start sequence', 'The start screen', 'Time to line and time to burn', 'The next mark', 'The finish'] },
    { id: 'mp2', name: 'Get the start right', steps: ['Ping the ends', 'Line bias and the favoured end', 'The ladder rung', 'Line check', 'Time to line and time to burn', 'Getting up to speed', 'Course side'] },
    { id: 'mp3', name: 'The committee changed it', steps: ['Course change', 'The next mark', 'General recall', 'Sync and the minute buttons'] }
  ].concat(PLUS ? [{ id: 'mp4', name: 'Mark+ on the boat', steps: ['Mark and Mark+', 'Instruments on the start screen', 'Wind and tide from the boat', 'Learning your boat'] }] : []);

  /* "?" on every Mark panel (Stuart 17 Nov 17:20, "Yes"): opens that part's Help topic */
  var STEPQ = { plan: 'route-this-race-or-not', start: 'set-the-start-line', marks: 'round-the-cans', fin: 'the-finish', wind: 'windward-leeward', lee: 'windward-leeward', laps: 'windward-leeward', wt: 'the-tide', check: 'check-the-course' };
  var PANELS = [
    { id: 'solStartScr', hd: '.sshd', t: function () { return 'the-start-screen'; } },
    { id: 'solSeq', hd: '.sqhd', t: function () { return 'the-start-sequence'; } },
    { id: 'solStep', hd: '.solhd', t: function () { var k = null; try { k = window.FSSolent.stepState().key; } catch (e) {} return STEPQ[k] || 'start-new-race'; } },
    { id: 'solLegs', abs: true, t: function () { return document.getElementById('solCC') ? 'course-change' : 'the-course-card'; } },
    { id: 'solCE', abs: true, t: function () { return 'course-change'; } },
    { id: 'solCard', hd: '.shead', t: function () { return 'start-new-race'; } }
  ];
  function shownEl(e) { return e && !e.hidden && e.getClientRects().length; }
  function qCss() { if (document.getElementById('mkqCss')) return; var st = document.createElement('style'); st.id = 'mkqCss';
    st.textContent = '.mkq{flex:none;width:32px;height:32px;min-height:0;padding:0;border-radius:50%;border:1px solid var(--line,#456);background:var(--panel,#13283c);color:var(--ink,#e6edf2);font:700 15px system-ui,sans-serif;cursor:pointer;margin-left:auto}.mkq.abs{position:absolute;top:6px;right:46px;z-index:2}.shead .mkq{margin-right:6px}';
    document.head.appendChild(st); }
  function qTick() { qCss(); PANELS.forEach(function (P) { var e = document.getElementById(P.id); if (!shownEl(e)) return; var b = e.querySelector('.mkq');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'mkq' + (P.abs ? ' abs' : ''); b.textContent = '?'; b.setAttribute('aria-label', 'Help for this'); b.title = 'Help for this';
      var hd = P.hd ? e.querySelector(P.hd) : null;
      if (P.abs || !hd) e.appendChild(b); else { var cl = hd.querySelector('.close'); if (cl) hd.insertBefore(b, cl); else hd.appendChild(b); } }
    b.dataset.mkq = P.t(); }); }
  function openTopic(slug) {
    try { var ss = document.getElementById('solStartScr'); if (shownEl(ss)) { var ch = [].slice.call(ss.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === 'Chart'; })[0]; if (ch) ch.click(); } } catch (e) {}
    var hb = document.getElementById('helpBtn'); if (hb) hb.click();
    setTimeout(function () { try { build(); window.FSHelpFind && window.FSHelpFind.open(slug); } catch (e) {} }, 350);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.mkq'); if (!b) return; e.preventDefault(); e.stopPropagation(); openTopic(b.dataset.mkq); }, true);
  setInterval(qTick, 800);
  window.FSMarkHelpOpen = openTopic;

  /* "Your first race" checklist on the Start new race card (Stuart 17 Nov 17:20, "Yes"): ticks as each step is done; goes once all are done */
  var FKEY = 'fs-mark-first', FIRST = [
    ['practice', 'A practice race in test mode', 'test-mode'], ['course', 'Set a course', 'start-new-race'], ['line', 'Set a start line', 'set-the-start-line'],
    ['seq', 'Run a start sequence', 'the-start-sequence'], ['ss', 'Use the start screen', 'the-start-screen'], ['cc', 'Change the course', 'course-change'], ['fin', 'Finish a race', 'the-finish']];
  function fGet() { try { return JSON.parse(localStorage.getItem(FKEY) || '{}') || {}; } catch (e) { return {}; } }
  function fSet(o) { try { localStorage.setItem(FKEY, JSON.stringify(o)); } catch (e) {} }
  function fTick() { var F = fGet(), was = JSON.stringify(F), S = window.FSSolent, B = null; try { B = S.state(); } catch (e) {}
    var tm = false; try { tm = !!S.testing(); if (tm) F.practice = 1; } catch (e) {}
    if (B && !tm) { if (B.shown && ((B.marks && B.marks.length) || B.type === 'wl')) F.course = 1; if (B.startAt) F.seq = 1; if (B.edited) F.cc = 1; if (B.ended && B.startAt && B.ended > B.startAt * 1000) F.fin = 1; }
    if (!tm) { try { var l = window.__fsLine && window.__fsLine(); if (l && l.boat && l.pin) F.line = 1; } catch (e) {} if (shownEl(document.getElementById('solStartScr'))) F.ss = 1; }
    if (JSON.stringify(F) !== was) fSet(F);
    var card = document.getElementById('solCard'), body = card && !card.hidden && card.querySelector('.sbody'), box = body && body.querySelector('.mkfirst'), n = FIRST.filter(function (x) { return F[x[0]]; }).length;
    if (!body || F.hide || n === FIRST.length) { if (box) box.remove(); return; }
    var html = '<b>Your first race</b> <span>' + n + ' of ' + FIRST.length + '</span><ul>' + FIRST.map(function (x) { return '<li class="' + (F[x[0]] ? 'done' : '') + '"><span>' + (F[x[0]] ? '✓' : '') + '</span>' + esc(x[1]) + ' <button type="button" class="mkq mkqs" data-mkq="' + x[2] + '" aria-label="Help: ' + esc(x[1]) + '">?</button></li>'; }).join('') + '</ul><button type="button" class="linkbtn" data-mkfx="1">Hide this list</button>';
    if (!box) { box = document.createElement('div'); box.className = 'mkfirst'; body.appendChild(box); }
    if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; } }
  function fCss() { if (document.getElementById('mkfCss')) return; var st = document.createElement('style'); st.id = 'mkfCss';
    st.textContent = '.mkfirst{margin-top:12px;padding:10px 12px;border:1px solid var(--line,#456);border-radius:12px}.mkfirst>b{font-size:15px}.mkfirst>span{color:var(--muted,#9ab);font-size:13px;margin-left:6px}.mkfirst ul{list-style:none;margin:8px 0;padding:0;display:flex;flex-direction:column;gap:4px}.mkfirst li{display:flex;align-items:center;gap:8px;font-size:14px}.mkfirst li>span{width:22px;height:22px;border-radius:50%;border:1px solid var(--line,#456);display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#22c55e;flex:none}.mkfirst li.done{color:var(--muted,#9ab)}.mkfirst li.done>span{border-color:#22c55e}.mkqs{width:26px;height:26px;font-size:13px;margin-left:auto}';
    document.head.appendChild(st); }
  document.addEventListener('click', function (e) { var x = e.target.closest && e.target.closest('[data-mkfx]'); if (!x) return; var F = fGet(); F.hide = 1; fSet(F); fTick(); }, true);
  setInterval(function () { try { fCss(); fTick(); } catch (e) {} }, 1000);

  /* The button tour for Mark (Stuart 17 Nov 17:20: "Both solutions would be best so guided button tour and Emma tutorial"): Route's tour,
     with Mark's buttons. Mark has Level 1; Mark+ adds Route+'s Connect to the boat and Polars levels after it. */
  function cardOff() { try { var c = document.getElementById('solCard'); if (c) c.hidden = true; } catch (e) {} }   /* the steps on the main buttons put the race menu away first, so nothing covers what the tour points at */
  function card() { try { var c = document.getElementById('solCard'); if (!c || c.hidden) window.FSSolent.start(); } catch (e) {} }
  var MARK1 = [
    { el: '#solCardM', before: card, t: 'Round the cans', x: 'Tap the buoys on the chart in order and choose Port or Starboard for each. The step box takes you through it.', help: 'Round the cans' },
    { el: '#solCardW', before: card, t: 'Windward-leeward', x: 'A windward mark, a leeward mark or gate, the laps and the finish.', help: 'Windward-leeward' },
    { el: '#solCardT', before: card, test: true, t: 'Try it safely first', x: 'Test mode sails a practice boat round a Solent course: watch the start screen, the gun and the race ashore. Nothing goes to the crew.', help: 'Test mode' },
    { el: '.mkfirst', before: card, alt: '#solCardStored', t: 'Your first race', x: 'Seven steps that tick as you do them. The question mark beside each opens its Help.', help: 'Your first race' },
    { el: '#solCardStored', before: card, t: 'Stored races', x: 'Every race you set, kept with its date and time, to open again.', help: 'Stored races' },
    { el: '#setBtn', before: cardOff, t: 'Settings', x: 'Your boat, the safety depth, your units, and Share for the boat code that keeps the crew in step.', help: 'The crew in step' },
    { el: '#liveBtn', before: cardOff, t: 'GPS', x: 'Turns on the phone’s GPS: ping the line ends, then the bearing and distance to every mark.', help: 'Ping the ends' },
    { el: function () { return [].filter.call(document.querySelectorAll('.navgrip2'), function (g) { return !g.hidden && g.getClientRects().length; })[0] || null; }, alt: '#fsPlotBtn,#navPlotBtn,#liveBtn', t: 'Move or put away any window', x: 'Drag the small dots on any window over the chart, such as the plotter bar or the GPS window, to move it anywhere; let go and it stays. Drag it off the left or right side and it tucks away to a light blue tab on that edge, clearing the screen for the chart; tap the tab to bring it back. Settings, Display, Window positions: Lock layout, and the dots on the left, middle or right.', help: 'Move the GPS window' },
    { el: '#layersBtn', before: cardOff, t: 'Layers', x: 'What the chart shows: wind, tide, depth and the racing marks.', help: 'Charts' },
    { el: '#solCard .mkq', before: card, t: 'Help on every panel', x: 'Every panel has a question mark that opens its own Help page: the inshore race guide, in the order of a race day, with a picture and Emma reading each topic. Help is also at the top of Settings.' }
  ];
  window.FSTourTry = '<p><b>Test mode</b>, on the Start new race card, sails a practice boat round a Solent course so you can watch the start screen, the gun and the race. Nothing goes to the crew. Stop puts your own race back.</p>';

  /* The practice race with Emma (Stuart 17 Nov 17:20, "Emma tutorial"): test mode sails the practice boat while Emma talks through each
     step, lighting up the real button; Next moves on when you are ready. Her recordings are in helpmedia/coach/ (coach.json). */
  var MEDIA = window.FS_HELPMEDIA || '../helpmedia/', CA = null, CMAN = null;
  function coachMuted() { try { return localStorage.getItem('fs-coach-mute') === '1'; } catch (e) { return false; } }
  function coachSay(k) { try { if (CA) { CA.pause(); CA = null; } if (coachMuted()) return; var go = function () { var f = CMAN && CMAN[k]; if (!f) return; CA = new Audio(MEDIA + 'coach/' + f); CA.play().catch(function () {}); };
    if (CMAN) go(); else fetch(MEDIA + 'coach/coach.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { CMAN = j || {}; go(); }, function () {}); } catch (e) {} }
  function coachStop() { try { if (CA) CA.pause(); } catch (e) {} CA = null; }
  /* Stuart 18 Nov 19:51: Emma can be turned off and on from the tour card, and she stops when More opens Help */
  window.FSTourSound = { on: function () { return !coachMuted(); }, toggle: function () { var m = !coachMuted(); try { localStorage.setItem('fs-coach-mute', m ? '1' : '0'); } catch (e) {} if (m) coachStop(); return !m; }, stop: coachStop };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-fst="end"]')) coachStop(); }, true);
  function testOn() { try { var S = window.FSSolent; if (!S.testing()) { var c = document.getElementById('solCard'); if (c) c.hidden = true; S.test(true); } } catch (e) {} }
  function tagCell(label, key) { var ss = document.getElementById('solStartScr'); if (!ss) return; [].forEach.call(ss.querySelectorAll('.ssc'), function (c) { var sp = c.querySelector('span'); if (sp && sp.textContent.trim().toUpperCase() === label) c.setAttribute('data-coach', key); }); }
  function ssHold() { try { window.FSSolent.ssHold(true); } catch (e) {} }   /* the start screen waits until Emma comes to it, so the first steps do not jump */
  function ssOpen() { try { var ss = document.getElementById('solStartScr'); if (shownEl(ss)) return; window.FSSolent.showList(); setTimeout(function () { var b = document.querySelector('[data-k="nxnow"]'); if (b) b.click(); var l = document.getElementById('solLegs'); if (l) l.hidden = true; }, 250); } catch (e) {} }
  function ssClose() { var ss = document.getElementById('solStartScr'); if (!shownEl(ss)) return; var ch = [].slice.call(ss.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === 'Chart'; })[0]; if (ch) ch.click(); }
  var COACH = [
    { k: 'c1', el: '#solTestBar', before: function () { testOn(); ssHold(); }, t: 'A practice race', x: 'This is a practice race in test mode. A practice boat is sailing a Solent course, and the gun is about two and a half minutes away. Nothing goes to the crew. Tap Next when you are ready.', help: 'Test mode' },
    { k: 'c2', el: '#solLegs', before: function () { testOn(); ssHold(); try { window.FSSolent.showList(); } catch (e) {} }, t: 'The course card', x: 'This is the course card: the race leg by leg, and below it the start: the start time, the line, the tide, the sequence and when the start screen opens.', help: 'The course card' },
    { k: 'c3', el: '#solSeq', alt: '#solTestBar', before: function () { var l = document.getElementById('solLegs'); if (l) l.hidden = true; ssClose(); }, t: 'The countdown', x: 'The countdown box counts down to the gun, with a sound at every signal. When the committee boat makes a signal, tap Sync to put the count on the whole minute.', help: 'The start sequence' },
    { k: 'c4', wait: 1000, el: '#solStartScr .sscv', alt: '#solStartScr [data-q="ssview"]', before: ssOpen, t: 'The start screen', x: 'This is the start screen: the line, the favoured end, the laylines and the line to the first mark. The chart shows through it, north up; Picture swaps to the drawn picture, which zooms with plus and minus, or a pinch.', help: 'The start screen' },
    { k: 'c5', wait: 1300, el: '#solStartScr .ssnum > .ssc:nth-child(3)', before: function () { ssOpen(); tagCell('TIME TO BURN', 'burn'); setTimeout(function () { tagCell('TIME TO BURN', 'burn'); }, 300); }, t: 'Time to burn', x: 'Time to burn is the time you have spare. Green, you are on time. Amber, you are early: burn some time. Red, you are late: go.', help: 'Time to line and time to burn' },
    { k: 'c6', wait: 1300, el: '#solStartScr .ssnum > .ssc:nth-child(4)', before: function () { ssOpen(); tagCell('BIAS', 'bias'); setTimeout(function () { tagCell('BIAS', 'bias'); }, 300); }, t: 'The favoured end', x: 'Bias shows which end of the line is favoured, and by how many metres. Start at that end if you can.', help: 'Line bias and the favoured end' },
    { k: 'c7', el: '[data-em="spd"]', before: function () { ssOpen(); }, t: 'Speed it up', x: 'To reach the gun sooner, tap the speed button on the orange bar: times 5, 20 or 60. Watch the boat run to the line and the countdown reach the gun.', help: 'Test mode' },
    { k: 'c8', wait: 1600, el: '#solCC', before: function () { try { var S = window.FSSolent, B = S.state(); if (!(B.startAt && B.startAt < Date.now() / 1000)) { S.set({ startAt: Math.round(Date.now() / 1000 - 2) }); if (window.__fsGun) window.__fsGun(S.state().startAt); } } catch (e) {} ssClose(); }, t: 'After the gun', x: 'The gun has gone. On the chart a blue dotted line runs from the boat to the next mark, with its bearing and distance. If the committee changes the course, tap Course change.', help: 'The next mark' },
    { k: 'c9', el: '[data-em="cc"]', before: function () { ssClose(); }, t: 'Practise a course change', x: 'Course change on the orange bar gives you a course change to practise with: change a mark, then Done, and the next mark follows the new course.', help: 'Course change' },
    { k: 'c10', el: '[data-em="x"]', t: 'Finish', x: 'That is the race. Stop ends the practice and puts your own race back. Every step has its own page in Help, and the question mark on each panel opens it.', help: 'Your first race' }
  ];
  COACH.forEach(function (st) { var b0 = st.before; st.before = function () { if (b0) b0(); coachSay(st.k); }; });
  window.FSMarkCoach = COACH.map(function (st) { return { k: st.k, t: st.t, words: st.x }; });
  function tourLevels() { if (window.__mkTour) return; var base = window.FSTourLevels; window.__mkTour = 1;
    window.FSTourLevels = [{ n: 1, name: 'Race the cans', note: 'Course, line, start and the race', steps: MARK1 }]   /* Stuart 18 Nov 19:55: Emma's practice race is taken out to be rebuilt from scratch (COACH kept for the rebuild) */.concat(PLUS && base && base.length > 1 ? base.slice(1).map(function (L, i) { return Object.assign({}, L, { n: i + 3 }); }) : []); }
  /* 17 Nov 20:30 (Stuart's photo: Mark+ showed Route+'s levels): set the levels as soon as every script has run (Route+'s navtour.js sets its own after this file), not 2.5 s later, so a quick Yes to Show me round still gets Mark's levels */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tourLevels); else setTimeout(tourLevels, 0);
  var n = 0, t = setInterval(function () { if (build() || ++n > 60) clearInterval(t); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) build(); }, true);
})();
