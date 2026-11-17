/* FirstShift: windows over the chart float and move (Route, Route+, Mark and Mark+).
   Stuart 13 Nov 2026: "can the pills and panels be moveable around the screen by holding with finger or mouse and dragging".
   Stuart 17 Nov 05:30 to 05:33, decided:
   - "All windows on all FirstShift tools need to be floating and moveable with defaults set in settings": the windows over the
     chart (GPS window, plotter bar, Layers box, instrument strip) and the round buttons; the main panel stays docked.
   - "A grip at any time but subtle and small needing a long touch to start then surround of windows flashes until another long
     push secures it in new location": each window has a small faint grip at its corner, there all the time; a round button is
     its own grip (a short tap still works it). A long touch (half a second) starts the move and the outline flashes; drag it;
     another long press locks it there.
   - "it cannot be moved to a location that prevents other buttons to be covered or mean the tool can't be moved", "Slide to the
     nearest gap": when locked, a window that would cover a button, a bar, another window or the phone's own bars slides to the
     nearest place where it covers nothing, and always stays wholly on the screen.
   - "there is always a button that appears to say undo": Undo shows while moving and for ten seconds after.
   - Defaults: Reset to FirstShift layout (Settings), and your own layout saved with My set-up, as Route's.
   Positions are kept for each screen size and orientation (a phone upright and on its side are different layouts). */
(function () {
  'use strict';
  var KEY = 'nav-pos', LONG = 500;
  var PANELS = [['liveBox', 'GPS window', 'win'], ['fsPlot', 'Plotter bar', 'win'], ['layers', 'Layers box', 'win'], ['navStrip', 'Instrument strip', 'win'],
    ['fsRulerBtn', 'Ruler button'], ['helpBtn', 'Help button'], ['oriBtn', 'North up button'], ['editFab', 'Edit course button'], ['fromHere', 'From here button'], ['navClearBtn', 'Clear screen button'], ['navMenuBtn', 'MENU button'], ['navCentreBtn', 'Centre on the boat button']];   /* man overboard stays where it is */
  function $(id) { return document.getElementById(id); }
  function ld() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function sv(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function bucket() { return (innerWidth > innerHeight ? 'L' : 'P') + Math.round(innerWidth / 100); }
  function set(el, dx, dy) { el.style.translate = (dx || dy) ? Math.round(dx) + 'px ' + Math.round(dy) + 'px' : ''; }
  function cur(el) { var t = (el.style.translate || '').split(' '); return [parseFloat(t[0]) || 0, parseFloat(t[1]) || 0]; }
  function shown(el) { if (!el || el.hidden) return false; var r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; var st = getComputedStyle(el); return st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0.05; }
  function ins() { try { return window.__fsInsets ? window.__fsInsets() : { t: 0, r: 0, b: 0, l: 0 }; } catch (e) { return { t: 0, r: 0, b: 0, l: 0 }; } }

  /* ---- what a moved window may not cover ---- */
  var OBST = '.top .ib,.top .logobox,.top .brand,#mkTop .ib,#mkTop .mklogo,#mkTop .mkbrand,.bar,#panel,#mkPanel,.mobbtn,.fabhelp,.livebox,#fsPlot,#layers,#navStrip,#astroLine,#mkPick,#mkTestBar,.navundo';
  function obstacles(me) {
    var out = []; [].forEach.call(document.querySelectorAll(OBST), function (e) { if (e === me || me.contains(e) || e.contains(me) || !shown(e)) return; var r = e.getBoundingClientRect(); out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); }); return out; }
  function hits(a, list) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1) return true; } return false; }
  function onScreen(a) { var s = ins(); return a.l >= s.l + 2 && a.t >= s.t + 2 && a.r <= innerWidth - s.r - 2 && a.b <= innerHeight - s.b - 2; }
  /* the nearest place, from where it was dropped, where it covers nothing and is wholly on the screen */
  function settle(el) {
    var c = cur(el), r0 = el.getBoundingClientRect(), list = obstacles(el), base = { l: r0.left - c[0], t: r0.top - c[1], w: r0.width, h: r0.height };
    function ok(dx, dy) { var a = { l: base.l + dx, t: base.t + dy, r: base.l + dx + base.w, b: base.t + dy + base.h }; return onScreen(a) && !hits(a, list); }
    if (ok(c[0], c[1])) return c;
    for (var rad = 8; rad <= Math.max(innerWidth, innerHeight); rad += 8) { var n = Math.max(16, Math.round(rad / 4));
      for (var k = 0; k < n; k++) { var an = k / n * 2 * Math.PI, dx = c[0] + rad * Math.cos(an), dy = c[1] + rad * Math.sin(an); if (ok(dx, dy)) return [dx, dy]; } }
    return null;
  }

  var M = { el: null, id: null, from: null, drag: null, ut: null }, swallow = 0;
  function apply() {
    var all = ld(), b = all[bucket()] || {};
    PANELS.forEach(function (p) { var el = $(p[0]); if (!el || el === M.el) return; var v = b[p[0]]; set(el, v ? v[0] : 0, v ? v[1] : 0); if (v && shown(el)) { var s = settle(el); if (s) set(el, s[0], s[1]); } });
    place();
  }
  function save(id, dx, dy) { var all = ld(), k = bucket(); all[k] = all[k] || {}; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) delete all[k][id]; else all[k][id] = [Math.round(dx), Math.round(dy)]; sv(all); }
  function reset() { var all = ld(); delete all[bucket()]; sv(all); apply(); }
  function resetAll() { sv({}); apply(); }

  /* ---- the grips: small and faint, on each window, all the time ---- */
  var grips = {};
  function mkGrip(p) {
    var g = document.createElement('button'); g.type = 'button'; g.className = 'navgrip2'; g.id = 'grip-' + p[0]; g.hidden = true; g.title = 'Hold to move the ' + p[1].toLowerCase(); g.setAttribute('aria-label', 'Hold to move the ' + p[1].toLowerCase());
    g.innerHTML = '<svg viewBox="0 0 20 8" width="20" height="8" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="2" r="1.3"/><circle cx="10" cy="2" r="1.3"/><circle cx="17" cy="2" r="1.3"/><circle cx="3" cy="6" r="1.3"/><circle cx="10" cy="6" r="1.3"/><circle cx="17" cy="6" r="1.3"/></g></svg>';
    document.body.appendChild(g); grips[p[0]] = g; hold(g, function () { return $(p[0]); }, p[0]);
  }
  function place() {
    PANELS.forEach(function (p) { if (p[2] !== 'win') return; var el = $(p[0]); if (!grips[p[0]] && el) mkGrip(p); var g = grips[p[0]]; if (!g) return;
      var v = shown(el); g.hidden = !v; if (!v) return; var r = el.getBoundingClientRect(); g.style.left = Math.round(r.right - 34) + 'px'; g.style.top = Math.round(r.top + 2) + 'px'; });
  }

  /* ---- long touch to start, drag, long press to lock ---- */
  function hold(target, elOf, id) {
    var t = null, sx = 0, sy = 0, fired = false;
    target.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; var el = elOf(); if (!el) return; sx = e.clientX; sy = e.clientY; fired = false; clearTimeout(t);
      if (M.el === el) { e.preventDefault(); e.stopPropagation(); try { target.setPointerCapture(e.pointerId); } catch (x) {} var c = cur(el); M.drag = { x: e.clientX, y: e.clientY, dx: c[0], dy: c[1], moved: false }; t = setTimeout(function () { if (M.drag && !M.drag.moved) { fired = true; lock(); } }, LONG); return; }
      t = setTimeout(function () { fired = true; begin(el, id); try { target.setPointerCapture(e.pointerId); } catch (x) {} var c = cur(el); M.drag = { x: sx, y: sy, dx: c[0], dy: c[1], moved: false }; if (navigator.vibrate) try { navigator.vibrate(30); } catch (x) {} }, LONG);
    }, true);
    target.addEventListener('pointermove', function (e) {
      if (!M.drag || M.el !== elOf()) { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(t); t = null; } return; }
      var dx = e.clientX - M.drag.x, dy = e.clientY - M.drag.y; if (Math.hypot(dx, dy) > 6) { M.drag.moved = true; clearTimeout(t); }
      e.preventDefault(); e.stopPropagation(); set(M.el, M.drag.dx + dx, M.drag.dy + dy); place();
    }, true);
    var up = function (e) { clearTimeout(t); t = null; if (M.drag && M.el === elOf()) { M.drag = null; e.stopPropagation(); } if (fired) swallow = Date.now(); };
    target.addEventListener('pointerup', up, true); target.addEventListener('pointercancel', up, true);
    target.addEventListener('click', function (e) { if (Date.now() - swallow < 700 || M.el === elOf()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);   /* a long press never also presses the button */
    target.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function begin(el, id) { if (M.el && M.el !== el) lock(); M.el = el; M.id = id; M.from = cur(el); el.classList.add('navmove-on'); undoBar(true); }
  function lock() {
    var el = M.el; if (!el) return; var s = settle(el);
    if (!s) set(el, M.from[0], M.from[1]); else set(el, s[0], s[1]);
    var c = cur(el); save(M.id, c[0], c[1]); el.classList.remove('navmove-on'); var last = { id: M.id, el: el, from: M.from };
    M.el = null; M.id = null; M.drag = null; place(); try { window.dispatchEvent(new Event('resize')); } catch (x) {}
    undoBar(false, last);
  }
  /* Undo: while moving, and for ten seconds after */
  function undoBar(moving, last) {
    var b = $('navUndo'); if (!b) { b = document.createElement('div'); b.id = 'navUndo'; b.className = 'navundo'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    clearTimeout(M.ut); b.hidden = false;
    if (moving) { b.innerHTML = '<span>Moving: drag it, then hold to lock it there.</span><button class="btn" type="button" id="navUndoB">Undo</button>'; $('navUndoB').onclick = function () { var el = M.el; if (!el) return; set(el, M.from[0], M.from[1]); el.classList.remove('navmove-on'); M.el = null; M.drag = null; b.hidden = true; place(); }; return; }
    b.innerHTML = '<span>Moved.</span><button class="btn" type="button" id="navUndoB">Undo</button>';
    $('navUndoB').onclick = function () { set(last.el, last.from[0], last.from[1]); save(last.id, last.from[0], last.from[1]); b.hidden = true; place(); try { window.dispatchEvent(new Event('resize')); } catch (x) {} };
    M.ut = setTimeout(function () { b.hidden = true; }, 10000);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && M.el) { var b = $('navUndoB'); if (b) b.click(); } });

  /* round buttons: the button itself is the grip */
  function wireButtons() { PANELS.forEach(function (p) { if (p[2] === 'win') return; var el = $(p[0]); if (!el || el.__fsHold) return; el.__fsHold = 1; hold(el, function () { return el; }, p[0]); }); }

  var css = '.navgrip2{position:fixed;z-index:59;width:32px;height:18px;border:0;border-radius:9px;padding:0;display:grid;place-items:center;background:transparent;color:var(--muted,#888);opacity:.55;cursor:grab;touch-action:none}' +
    '.navgrip2:hover{opacity:.9}.navgrip2[hidden]{display:none}' +
    '.navmove-on{outline:3px solid #F2B233!important;outline-offset:3px;animation:navflash .8s ease-in-out infinite;touch-action:none;z-index:58!important}' +
    '@keyframes navflash{50%{outline-color:rgba(242,178,51,.15)}}@media (prefers-reduced-motion:reduce){.navmove-on{animation:none}}' +
    '.navundo{position:fixed;z-index:61;left:50%;translate:-50% 0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;align-items:center;gap:10px;padding:6px 6px 6px 14px;background:var(--panel,#0f2235);color:var(--ink,#fff);border:1px solid #F2B233;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.35);font:600 13px var(--f-body,system-ui);max-width:calc(100% - 24px);box-sizing:border-box}' +
    '.navundo[hidden]{display:none}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  setInterval(function () { wireButtons(); if (!M.drag) place(); }, 500);
  var rt = 0; window.addEventListener('resize', function () { if (M.drag) return; clearTimeout(rt); rt = setTimeout(apply, 250); });
  var n = 0, w = setInterval(function () { apply(); if (++n > 40) clearInterval(w); }, 500);   /* panels are built after load */

  /* Settings, My set-up: the layout (Stuart 05:33: "Reset to FirstShift layout"; your layout is saved with My set-up) */
  var bt = setInterval(function () {
    var body = document.querySelector('#navPrefs .npbody'); if (!body || $('navMoveAll')) { if ($('navMoveAll')) clearInterval(bt); return; }
    var h = document.createElement('div');
    h.innerHTML = '<h4>Window positions</h4><p class="note">Hold the small grip on a window, or hold a round button, to move it; drag it, then hold again to lock it. It never covers another button: it slides to the nearest gap. Kept for each screen size and orientation, and saved with My set-up.</p><div class="xrow"><button class="btn" id="navMoveAll" type="button">Reset to FirstShift layout</button></div>';
    var note = body.querySelector('.npask'); body.insertBefore(h, note || null);
    $('navMoveAll').onclick = function () { resetAll(); };
    clearInterval(bt);
  }, 500);
  window.NavDrag = { reset: reset, resetAll: resetAll, apply: apply, bucket: bucket, begin: function (id) { var el = $(id); if (el) begin(el, id); }, lock: lock, settle: settle, moving: function () { return M.id; }, start: function () {}, on: function () { return !!M.el; } };
})();
