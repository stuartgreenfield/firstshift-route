/* FirstShift Route: move the panels (Stuart 13 Nov 2026: "can the pills and panels be moveable around the screen by
   holding with finger or mouse and dragging").
   Move panels (Settings, My defaults) puts a grip on the GPS window (and, in the app with the boat link, the instrument strip and plotter bar); drag a grip to move its panel, then Done. Positions are kept for each screen size and orientation (a
   phone upright and on its side are different layouts), go into My defaults with everything else, and Reset positions
   puts them all back. A moved panel can never leave the screen. */
(function () {
  'use strict';
  var KEY = 'nav-pos', PANELS = [['liveBox', 'GPS window']];
  function $(id) { return document.getElementById(id); }
  function ld() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function sv(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function bucket() { return (innerWidth > innerHeight ? 'L' : 'P') + Math.round(innerWidth / 100); }
  var ON = false, grips = {}, done = null, drag = null;
  function set(el, dx, dy) { el.style.translate = (dx || dy) ? Math.round(dx) + 'px ' + Math.round(dy) + 'px' : ''; }
  function cur(el) { var t = (el.style.translate || '').split(' '); return [parseFloat(t[0]) || 0, parseFloat(t[1]) || 0]; }
  /* keep at least 48 px of the panel on the screen */
  function clamp(el, dx, dy) {
    var c = cur(el); set(el, 0, 0); var r = el.getBoundingClientRect(); set(el, c[0], c[1]);
    if (!r.width) return [dx, dy];
    var m = 48;
    dx = Math.max(m - r.right, Math.min(innerWidth - m - r.left, dx));
    dy = Math.max(-r.top + 4, Math.min(innerHeight - m - r.top, dy));
    return [dx, dy];
  }
  function apply() {
    var all = ld(), b = all[bucket()] || {};
    PANELS.forEach(function (p) { var el = $(p[0]); if (!el) return; var v = b[p[0]]; if (v) { var c = clamp(el, v[0], v[1]); set(el, c[0], c[1]); } else set(el, 0, 0); });
  }
  function save(id, dx, dy) { var all = ld(), k = bucket(); all[k] = all[k] || {}; all[k][id] = [Math.round(dx), Math.round(dy)]; sv(all); }
  function reset() { var all = ld(); delete all[bucket()]; sv(all); apply(); place(); }
  function resetAll() { sv({}); apply(); place(); }
  function place() {
    PANELS.forEach(function (p) {
      var el = $(p[0]), g = grips[p[0]]; if (!g) return;
      var vis = ON && el && !el.hidden && el.offsetParent !== null; g.hidden = !vis; if (!vis) return;
      var r = el.getBoundingClientRect(); g.style.left = Math.max(2, r.left - 10) + 'px'; g.style.top = Math.max(2, r.top - 10) + 'px';
    });
  }
  function start(on) {
    ON = !!on; document.body.classList.toggle('navmoving', ON);
    if (ON && !done) {
      PANELS.forEach(function (p) {
        var g = document.createElement('button'); g.type = 'button'; g.className = 'navgrip'; g.hidden = true; g.title = 'Drag to move: ' + p[1]; g.setAttribute('aria-label', 'Drag to move the ' + p[1].toLowerCase());
        g.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="currentColor"><circle cx="8" cy="6" r="1.8"/><circle cx="16" cy="6" r="1.8"/><circle cx="8" cy="12" r="1.8"/><circle cx="16" cy="12" r="1.8"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/></g></svg>';
        g.addEventListener('pointerdown', function (e) { var el = $(p[0]); if (!el) return; e.preventDefault(); e.stopPropagation(); try { g.setPointerCapture(e.pointerId); } catch (x) {} var c = cur(el); drag = { id: p[0], el: el, x: e.clientX, y: e.clientY, dx: c[0], dy: c[1] }; });
        g.addEventListener('pointermove', function (e) { if (!drag || drag.id !== p[0]) return; var v = clamp(drag.el, drag.dx + e.clientX - drag.x, drag.dy + e.clientY - drag.y); set(drag.el, v[0], v[1]); place(); });
        var end = function () { if (!drag || drag.id !== p[0]) return; var c = cur(drag.el); save(p[0], c[0], c[1]); drag = null; try { window.dispatchEvent(new Event('resize')); } catch (x) {} };
        g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
        document.body.appendChild(g); grips[p[0]] = g;
      });
      done = document.createElement('div'); done.className = 'navmovebar'; done.setAttribute('role', 'dialog'); done.setAttribute('aria-label', 'Moving panels');
      done.innerHTML = '<span>Drag the grips to move the panels.</span><button class="btn" type="button" id="navMoveReset">Reset positions</button><button class="btn primary" type="button" id="navMoveDone">Done</button>';
      document.body.appendChild(done);
      $('navMoveDone').onclick = function () { start(false); };
      $('navMoveReset').onclick = function () { reset(); };
    }
    if (done) done.hidden = !ON;
    place();
  }
  var tick = setInterval(function () { if (ON) place(); }, 400);
  var rt = 0; window.addEventListener('resize', function () { if (drag) return; clearTimeout(rt); rt = setTimeout(function () { apply(); place(); }, 250); });
  /* panels are built after load: apply once they exist, and again whenever one is shown */
  var n = 0, w = setInterval(function () { apply(); if (++n > 40) clearInterval(w); }, 500);
  /* buttons in My defaults */
  var bt = setInterval(function () {
    var body = document.querySelector('#navPrefs .npbody'); if (!body || $('navMoveBtn')) { if ($('navMoveBtn')) clearInterval(bt); return; }
    var h = document.createElement('div');
    h.innerHTML = '<h4>Panel positions</h4><p class="note">Move the GPS window where it suits you. Kept for each screen size and orientation.</p><div class="xrow"><button class="btn" id="navMoveBtn" type="button">Move panels</button><button class="btn" id="navMoveAll" type="button">Reset all positions</button></div>';
    var note = body.querySelector('.npask'); body.insertBefore(h, note || null);
    $('navMoveBtn').onclick = function () { var s = $('sheet'); if (s) s.hidden = true; start(true); };
    $('navMoveAll').onclick = function () { resetAll(); };
    clearInterval(bt);
  }, 500);
  window.NavDrag = { start: start, reset: reset, resetAll: resetAll, apply: apply, bucket: bucket, on: function () { return ON; } };
})();
