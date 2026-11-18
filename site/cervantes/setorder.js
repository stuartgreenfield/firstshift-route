/* F32 (Stuart 17 Nov 2026 23:43): "review all the functions and options in all the different setting categories and ensure they
   are group correctly and intuitively i think there are a few oddities". Review: docs/SETTINGS-REVIEW.md. This file moves the
   misplaced sections into the tab where a sailor would look for them, in all four tools, after Settings is built (some sections
   are added later by other files, so it checks for 30 s). Each section keeps its own controls and ids; only its place changes.
   - Boat: "If you think the forecast is wrong" goes to Forecasts (it corrects the forecast, not the boat)
   - Boat: "Class start" goes to Course (it is the race, not the boat), and the heading "Start and manoeuvres" becomes "Manoeuvres"
   - Forecasts: "Sea state effect" goes to Boat (it is how the boat sails in waves)
   - Display: "Data sources" is renamed "Sources and credits" (Route+ also has Data sources for the instruments)
   - My set-up: "Clear screen" and "Window positions" go to Display (they are how the screen looks)
   - Mark and Mark+: Charts, "Racing in the Solent" goes to Course */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function txt(e) { return (e.textContent || '').trim().replace(/\s+/g, ' '); }
  function isHead(e) { return /^H[2-5]$/.test(e.tagName); }
  /* a heading and everything after it up to the next heading at the same level or above */
  function section(pane, title) {
    if (!pane) return null; var hs = pane.querySelectorAll('h3,h4'), h = null;
    for (var i = 0; i < hs.length; i++) if (txt(hs[i]).indexOf(title) === 0 && !hs[i].dataset.moved) { h = hs[i]; break; }
    if (!h) return null; var lv = +h.tagName[1], out = [h], n = h.nextElementSibling;
    while (n && !(isHead(n) && +n.tagName[1] <= lv)) { out.push(n); n = n.nextElementSibling; }
    return out;
  }
  function move(nodes, dest, before) { if (!nodes || !dest) return false; nodes[0].dataset.moved = '1'; nodes.forEach(function (n) { dest.insertBefore(n, before || null); }); return true; }
  var done = {};
  function run() {
    var boat = $('s-boat'), fc = $('s-fc'), course = $('s-course'), disp = $('s-display'), mine = $('s-mine'), charts = $('s-charts');
    if (!done.adj) done.adj = move(section(boat, 'If you think the forecast is wrong'), fc);
    if (!done.sea) { var sea = section(fc, 'Sea state effect'), stm = boat && [].filter.call(boat.querySelectorAll('h3'), function (h) { return /^(Start and manoeuvres|Manoeuvres)/.test(txt(h)); })[0]; if (sea && boat) done.sea = move(sea, boat, stm || null); }
    if (!done.cls) { var cs = $('startSel'), row = cs && cs.closest('.row'); if (!row && boat) row = [].filter.call(boat.querySelectorAll('.row'), function (r) { return /^Class start/.test(txt(r)); })[0];
      if (row && course && boat && boat.contains(row)) { row.dataset.moved = '1'; course.insertBefore(row, course.firstChild); done.cls = true; [].forEach.call(boat.querySelectorAll('h3'), function (h) { if (txt(h) === 'Start and manoeuvres') h.textContent = 'Manoeuvres'; }); } }
    if (!done.src && disp) { [].forEach.call(disp.querySelectorAll('h3'), function (h) { if (txt(h) === 'Data sources') { h.textContent = 'Sources and credits'; done.src = true; } }); }
    var cred = disp && [].filter.call(disp.querySelectorAll('h3'), function (h) { return /^(Sources and credits|Data sources)$/.test(txt(h)); })[0];   /* above the credits, which stay last */
    if (!done.clear) done.clear = move(section(mine, 'Clear screen'), disp, cred);
    if (!done.win) done.win = move(section(mine, 'Window positions'), disp, cred);
    if (window.FS_MARK && !done.solent) done.solent = move(section(charts, 'Racing in the Solent'), course);
  }
  var n = 0, t = setInterval(function () { try { run(); } catch (e) {} if (++n > 30) clearInterval(t); }, 1000);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#setBtn')) setTimeout(function () { try { run(); } catch (x) {} }, 300); }, true);
  window.FSSetOrder = { run: run, done: function () { return done; } };
})();
