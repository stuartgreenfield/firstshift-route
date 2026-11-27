/* One heartbeat (docs/SPEED-CORE.md step 1; Stuart 18 Nov 21:46 "Clever coding is essential no short cuts please"; 24 Nov 20:57
   "next job code untangling and speed refinement"). One timer in place of the many each feature added for itself.
   - FSBeat.set(fn, ms, always) and FSBeat.clear(id) take the place of setInterval and clearInterval, so a job moves over unchanged.
   - Jobs that fall due together run in one pass, every 250 ms at most.
   - Nothing runs while the app is in the background, except jobs marked always (start countdown, alarms, man overboard).
   - The finger first: for 300 ms after a touch, only the always jobs run, so the tap is answered before anything else.
   - Battery saver halves the rate of the jobs that are not marked always.
   Loaded first, in all four tools. A job that throws is reported once in the console and keeps its place. */
(function () {
  'use strict';
  var BASE = 250, jobs = [], seq = 0, finger = 0, said = {};
  function set(fn, ms, always) { var j = { id: ++seq, fn: fn, ms: Math.max(BASE, +ms || BASE), due: Date.now() + Math.max(BASE, +ms || BASE), always: !!always }; jobs.push(j); return j.id; }
  function clear(id) { for (var i = 0; i < jobs.length; i++) if (jobs[i].id === id) { jobs[i].dead = true; jobs.splice(i, 1); return; } }
  function beat() {
    var now = Date.now(), quiet = document.hidden || now < finger, slow = window.__fsSaver ? 2 : 1, run = jobs.slice();
    for (var i = 0; i < run.length; i++) { var j = run[i]; if (j.dead || now < j.due) continue; if (quiet && !j.always) continue;
      j.due = now + j.ms * (j.always ? 1 : slow);
      try { j.fn(); } catch (e) { if (!said[j.id]) { said[j.id] = 1; try { console.warn('FSBeat job', j.id, e); } catch (x) {} } } }
  }
  setInterval(beat, BASE);
  window.addEventListener('pointerdown', function () { finger = Date.now() + 300; }, true);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
  /* The tool's own name, set in this one place (Stuart 27 Nov 2026 08:06: each tool names only itself, everywhere). Mark and Mark+ are the
     /mark/ page (FS_MARK, set in the page head); Route+ and Mark+ set FS_PLUS in navigate.js, loaded straight after this file. Every sentence
     that means "this tool" takes the name from here. */
  window.FSTool = function () { return (window.FS_MARK ? 'Mark' : 'Route') + (window.FS_PLUS || window.NAV_VERSION ? '+' : ''); };
  /* fixed text in the page marks each such name with class "tn"; filled once when the page has loaded */
  document.addEventListener('DOMContentLoaded', function () { var nm = window.FSTool(), l = document.querySelectorAll('.tn'); for (var i = 0; i < l.length; i++) if (l[i].textContent !== nm) l[i].textContent = nm; });
  window.FSBeat = { set: set, clear: clear, count: function () { return jobs.length; }, list: function () { return jobs.map(function (j) { return { id: j.id, ms: j.ms, always: j.always }; }); } };
})();
