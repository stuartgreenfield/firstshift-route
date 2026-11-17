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
    ['What Mark does', ['Mark is FirstShift’s inshore racing tool for the Solent: round the cans and windward-leeward.', 'Set the course from the Solent racing marks, set the start line, run the start sequence, and Mark shows the favoured end, time to the line and time to burn, then the bearing and distance to every mark.', 'Route it on the forecast when you want to. Everything Route does is here too. A planning aid, not for navigation.']],
    ['Mark and Mark+', ['Mark runs in the phone’s browser and uses the phone’s own GPS.', 'Mark+ is the Android app. It does everything Mark does and connects to the boat’s instruments, so the start screen also shows boat speed, true and apparent wind angle and heel, the tide can come from the boat, and Mark+ learns how quickly your boat gets up to speed.']],
    ['Your first race', ['The Start new race card keeps a short list of the steps of a first race and ticks each one as you do it: a practice race, a course, a start line, a start sequence, the start screen, a course change and the finish.', 'Do them in any order. The list goes once every step is ticked.']],
    ['Test mode', ['Test mode sails a practice boat round a Solent course so you can watch the start, the line, the racing window and the finish ashore. Nothing goes to the crew.', 'Open it from Test mode on the Start new race card. The gun is two and a half minutes away.', 'The orange bar changes the speed (times 1, 5, 20 or 60), shifts the wind 10 degrees either way, gives a course change or an early start. Stop ends it and puts your own race back.']],
    ['The practice race with Emma', ['A coached race in test mode: Emma talks you through each step as you do it, from choosing the course to crossing the finish.', 'Each step lights up the button to press and waits for you. More opens the Help topic for that step.']],
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
    ['The start screen', ['The start screen opens 10 or 5 minutes before the gun (set it in the course card, or Off; Show now opens it at any time).', 'The picture shows the line, the favoured end, the laylines, the line to the first mark, the wind and the tide. Zoom with the plus and minus buttons, pinch, or double tap. Chart goes back to the chart.']],
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
    { id: 'mstart', name: 'Getting started', blurb: 'What Mark does, test mode, your first race', titles: ['What Mark does', 'Mark and Mark+', 'Your first race', 'Test mode', 'The practice race with Emma', 'Stored races', 'The crew in step', 'Try it safely first', 'My set-up', 'Find a setting', 'Your boat'], re: /$^/ },
    { id: 'mcourse', name: 'Set the course', blurb: 'Round the cans, windward-leeward, wind and tide', titles: ['Start new race', 'Route this race, or not?', 'Round the cans', 'Windward-leeward', 'The wind', 'The tide', 'Check the course', 'The course card', 'Solent races on the chart', 'Tide by hand'], re: /$^/ },
    { id: 'mline', name: 'The start line', blurb: 'Set it, ping it, the favoured end', titles: ['Set the start line', 'Ping the ends', 'Start line and bow offset', 'Line bias and the favoured end', 'The ladder rung', 'Line check'], re: /$^/ },
    { id: 'mgun', name: 'The start', blurb: 'Sequence, start screen, time to burn', titles: ['The start sequence', 'Sync and the minute buttons', 'A series of starts', 'The start screen', 'Time to line and time to burn', 'Getting up to speed', 'Course side', 'General recall'], re: /$^/ },
    { id: 'mrace', name: 'Racing the legs', blurb: 'Next mark, laylines, course change', titles: ['The next mark', 'Laylines and the tide', 'Header or lift', 'The time slider folds away', 'Course change', 'Basic plotter', 'Live GPS while racing', 'Tide gate', 'Move the GPS window', 'Man overboard', 'AIS'], re: /$^/ },
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
  var n = 0, t = setInterval(function () { if (build() || ++n > 60) clearInterval(t); }, 500);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) build(); }, true);
})();
