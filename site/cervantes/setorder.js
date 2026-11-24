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
    /* F51 (Stuart 18 Nov 17:20, answers in docs/SETTINGS-REVIEW.md) */
    if (!done.fix) { var fs = $('fixSet'); if (fs) { fs.hidden = true; fs.dataset.f51 = 'Course only'; done.fix = true; } }   /* 1: Fixed wind route in Course only */
    if (!done.depth && charts) { var d2 = $('depth2'), r2 = d2 && d2.closest('.row'); if (r2) { var nt = r2.nextElementSibling; r2.hidden = true; if (nt && nt.classList.contains('note')) { nt.textContent = 'The safety depth (water shallower than it is red, and the routes keep out of it) is in Settings, Course, beside the other depth settings.'; } done.depth = true; } }   /* 2: both depths in Course: the No-go depth here was the same slider as Course's Safety depth */
    var inst = $('s-inst'), plus = !!window.__navBoat;
    if (plus && inst && inst.children.length && !done.dr) { var dr = $('drOn'), drr = dr && dr.closest('.row'); if (drr && course && course.contains(drr)) { drr.hidden = true; var dn = drr.nextElementSibling; if (dn && dn.classList.contains('note') && /reckon/i.test(txt(dn))) dn.hidden = true; done.dr = true; } }   /* 3: dead reckoning in Instruments only (+ tools) */
    if (plus && inst && inst.children.length && !done.ais) { var al = [].filter.call(inst.querySelectorAll('h3,h4'), function (h) { return /^Alarms/.test(txt(h)); })[0], aisS = section(disp, 'AIS'); if (aisS) { var after = null; if (al) { var n2 = al.nextElementSibling; while (n2 && !(isHead(n2) && +n2.tagName[1] <= +al.tagName[1])) n2 = n2.nextElementSibling; after = n2; } done.ais = move(aisS, inst, after); } }   /* 5: AIS with the alarms (+ tools) */
    if (!done.follow && mine && mine.children.length) { var st = $('shareTrack'), sr = st && st.closest('.row'); if (sr && course && course.contains(sr)) { var h = document.createElement('h3'); h.textContent = 'Share with family and friends'; h.dataset.moved = '1'; var grp = [h, sr]; var x = sr.nextElementSibling; while (x && (x.id === 'shareNote' || (x.classList.contains('xrow') && x.querySelector('#shareLink')))) { grp.push(x); x = x.nextElementSibling; } grp.forEach(function (e) { mine.appendChild(e); }); done.follow = true; } }   /* 6: Follow the boat in My set-up */
    if (window.FS_MARK && !done.more && course) { var ko = section(course, 'Keep-out areas'); if (ko) { var dt = document.createElement('details'); dt.className = 'f51more'; dt.innerHTML = '<summary>More: offshore settings (keep-out areas, traffic lanes)</summary>'; course.insertBefore(dt, ko[0]); ko.forEach(function (e) { dt.appendChild(e); }); done.more = true; } }   /* 7: Mark's offshore settings behind More */
    if (!done.turns) { var tl = $('tackS'), gl = $('gybeS'); if (tl && gl) { var lab = function (id, s) { var l = document.querySelector('label[for="' + id + '"]'); if (l) l.textContent = s; }; lab('tackS', 'Tack loss (routing)'); lab('gybeS', 'Gybe loss (routing)');   /* 8: turn loss and turn time side by side */
      var gr = gl.closest('.row'); if (gr && !$('startTk')) { var mk = function (id, l) { var r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<label for="' + id + '">' + l + '</label><input type="number" id="' + id + '" min="0" max="60" step="1" inputmode="numeric" placeholder="s"> s'; return r; };
        var r1 = mk('startTk', 'Tack time (start)'), r3 = mk('startGy', 'Gybe time (start)'), nn = document.createElement('p'); nn.className = 'note'; nn.textContent = 'Loss is the seconds of sailing a turn costs on the route; time is how long the boat takes to turn at the start, used for time to the line until it is learnt from your own turns.';
        var ins = gr.nextElementSibling && gr.nextElementSibling.classList.contains('note') ? gr.nextElementSibling.nextElementSibling : gr.nextElementSibling; [r1, r3, nn].forEach(function (e) { gr.parentNode.insertBefore(e, ins); });
        var st0 = function () { try { return window.FSSolent && FSSolent.state ? FSSolent.state() : null; } catch (e) { return null; } };
        var sync = function () { var s = st0(); if (!s) return; [['startTk', 'tackS'], ['startGy', 'gybeS']].forEach(function (q) { var e = $(q[0]); if (e && document.activeElement !== e) e.value = s[q[1]] || ''; }); };
        [['startTk', 'tackS'], ['startGy', 'gybeS']].forEach(function (q) { $(q[0]).addEventListener('change', function () { var s = st0(), v = this.value; if (!s) return; s[q[1]] = v === '' ? null : Math.max(0, Math.min(60, Math.round(+v))); try { localStorage.setItem(window.FS_SOLENT ? 'fs-solent-b' : 'fs-route-start', JSON.stringify(s)); } catch (e) {} }); });
        sync(); FSBeat.set(sync, 3000); }
      done.turns = true; } }
  }
  (function () { var st = document.createElement('style'); st.textContent = 'details.f51more{margin:10px 0;border:1px solid var(--line);border-radius:10px;padding:6px 10px}details.f51more>summary{cursor:pointer;font-weight:600;padding:4px 0}'; document.head.appendChild(st); })();
  var n = 0, t = FSBeat.set(function () { try { run(); } catch (e) {} if (++n > 30) FSBeat.clear(t); }, 1000);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#setBtn')) setTimeout(function () { try { run(); } catch (x) {} }, 300); }, true);
  window.FSSetOrder = { run: run, done: function () { return done; } };
})();
