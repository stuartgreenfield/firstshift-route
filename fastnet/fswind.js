/* FirstShift Route: wind by hand (Stuart 13 Nov 2026: "if the routing wind is way off, a way to put in the wind speed and
   direction by hand and re-route"). Type the wind you can see; Route works out how far the routed forecast is from it at the
   middle of the chart (the boat, when Live GPS is following it), shifts the forecast by that much (up to 40° and 40%, in
   5 steps), and routes again. For 3, 6 or 12 hours it then fades back to the forecast over two hours; or for the whole race.
   Back to the forecast undoes it. Shared with Navigate, which also compares the boat's own measured wind. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function n180(a) { return ((a % 360) + 540) % 360 - 180; }
  function step5(x) { return Math.max(-40, Math.min(40, Math.round(x / 5) * 5)); }
  var note = '';
  function here() { try { var v = window.__navViewGet(); return [v.la, v.lo]; } catch (e) { return null; } }
  function manual(wd, ws, hrs) {
    if (!(ws >= 0 && ws < 80) || !(wd >= 0 && wd <= 360)) { note = 'Type the wind direction (0 to 360°) and strength in knots.'; return false; }
    var fc = window.__navFc && window.__navFc(), p = here();
    if (!fc || !fc.sel || !fc.sel.models || !p || !window.FSRouter || !window.__navAdjust) { note = 'Route first: Route needs a route to compare the wind with.'; return false; }
    var t = (Date.now() / 1000 - fc.T0) / 3600, a = fc.adj || {}, u;
    try { u = FSRouter.windSampler(fc.P, fc.sel.models)(p[0], p[1], t); } catch (e) { u = null; }
    if (!u || !(u[0] > 0)) { note = 'No forecast wind at the middle of the chart now: move the chart over the race area.'; return false; }
    u = [u[0] * (1 + (a.wspd || 0) / 100), (u[1] + (a.wdir || 0) + 360) % 360];
    var dd = n180(wd % 360 - u[1]), ds = 100 * (ws - u[0]) / Math.max(1, u[0]);
    var rd = (a.wdir || 0) + dd, rs = ((1 + (a.wspd || 0) / 100) * (1 + ds / 100) - 1) * 100, wdA = step5(rd), wsA = step5(rs), cut = Math.abs(rd) > 42.5 || Math.abs(rs) > 42.5;
    try { localStorage.setItem('nav-adj-until', hrs > 0 ? String(+(t + hrs).toFixed(2)) : ''); } catch (e) {}
    window.__navAdjust(wdA, wsA);
    note = 'You gave the wind as ' + Math.round(wd % 360) + '° ' + (+ws).toFixed(0) + ' kn: forecast shifted ' + (wdA > 0 ? '+' : '') + wdA + '° and ' + (wsA > 0 ? '+' : '') + wsA + '%' + (cut ? ' (the most Route allows)' : '') + (hrs > 0 ? ', for ' + hrs + ' hours then back to the forecast' : ', for the whole race') + '. Routing again.';
    var r = $('run'); if (r) r.click();
    return true;
  }
  function build() {
    var at = $('adjWdir'), row = at && at.closest('.row'); if (!row || $('fsWind')) return !!$('fsWind');
    var d = document.createElement('div'); d.id = 'fsWind'; d.className = 'nrman';
    d.innerHTML = '<label>The wind here is really</label><div class="nrmanrow"><input id="nrWd" type="number" inputmode="numeric" min="0" max="360" step="5" placeholder="°" aria-label="True wind direction, degrees"><span>° at</span><input id="nrWs" type="number" inputmode="decimal" min="0" max="80" step="1" placeholder="kn" aria-label="True wind speed, knots"><span>kn for</span><select id="nrFor" aria-label="For how long"><option value="3">3 hours</option><option value="6" selected>6 hours</option><option value="12">12 hours</option><option value="0">the whole race</option></select><button class="btn primary" id="nrMan" type="button">Use it</button></div><p class="note" id="nrNote" role="status">Where you are: the middle of the chart, or the boat when Live GPS is following it.</p>';
    row.parentNode.insertBefore(d, row);
    $('nrMan').onclick = function () { manual(+$('nrWd').value, $('nrWs').value === '' ? NaN : +$('nrWs').value, +$('nrFor').value); $('nrNote').textContent = note; };
    return true;
  }
  /* moving the forecast sliders by hand makes the change for the whole race again */
  document.addEventListener('change', function (e) { if (e.target && /^adjW(dir|spd|time)$/.test(e.target.id)) try { localStorage.removeItem('nav-adj-until'); } catch (x) {} }, true);
  (function wait(n) { if (!build() && n < 60) setTimeout(function () { wait(n + 1); }, 300); })(0);
  window.FSWind = { manual: manual, note: function () { return note; } };
})();
