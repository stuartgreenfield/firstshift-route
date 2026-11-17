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
   Positions are kept for each screen size and orientation (a phone upright and on its side are different layouts).
   F15 (Stuart 17 Nov 18:34 "Slide off"; 19:28 "Windows trial is good - this change to all 4 tools"): while moving a window, drag
   it most of the way off the left or right edge, or flick it quickly towards one, and it slides away leaving a small tab on that
   edge; tap the tab and it comes back where it was. Left and right only: the top and the foot carry the bars. Settings, Window
   positions: Lock layout (nothing moves), and the grip on the left, in the middle or on the right (Stuart 17:15: "a left/right
   hand setting"). */
(function () {
  'use strict';
  var KEY = 'nav-pos', LONG = 500;
  var PANELS = [['liveBox', 'GPS window', 'win', 'GPS'], ['fsPlot', 'Plotter bar', 'win', 'PLOT'], ['navPlot', 'Plotter bar', 'win', 'PLOT'], ['solSeq', 'Start sequence', 'win', 'START'], ['solLegs', 'Course card', 'win', 'COURSE'], ['layers', 'Layers box', 'win', 'LAYERS'], ['navStrip', 'Instrument strip', 'win', 'BOAT'],
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
  var OBST = '#solTestBar,#solSeq,.fswtab,.top .ib,.top .logobox,.top .brand,#mkTop .ib,#mkTop .mklogo,#mkTop .mkbrand,.bar,#panel,#mkPanel,.mobbtn,.fabhelp,.livebox,#fsPlot,#navPlot,#layers,#navStrip,#astroLine,#mkPick,#mkTestBar,.navundo';
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
    PANELS.forEach(function (p) { var el = $(p[0]); if (!el || el === M.el) return; if (p[2] === 'win') el.classList.toggle('fsstashed', !!b['~' + p[0]]); var v = b[p[0]]; set(el, v ? v[0] : 0, v ? v[1] : 0); if (v && shown(el)) { var s = settle(el); if (s) set(el, s[0], s[1]); } });
    place();
  }
  function save(id, dx, dy) { var all = ld(), k = bucket(); all[k] = all[k] || {}; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) delete all[k][id]; else all[k][id] = [Math.round(dx), Math.round(dy)]; sv(all); }
  function stashOf(id) { var b = ld()[bucket()] || {}; return b['~' + id] || null; }
  function setStash(id, v) { var all = ld(), k = bucket(); all[k] = all[k] || {}; if (v) all[k]['~' + id] = v; else delete all[k]['~' + id]; sv(all); }
  function opt(k, d) { try { var v = localStorage.getItem('fs-win-' + k); return v == null ? d : v; } catch (e) { return d; } }
  function setOpt(k, v) { try { localStorage.setItem('fs-win-' + k, v); } catch (e) {} }
  function locked() { return opt('lock', '0') === '1'; }
  function reset() { var all = ld(); delete all[bucket()]; sv(all); apply(); }
  function resetAll() { sv({}); apply(); }

  /* ---- the grips: small and faint, on each window, all the time ---- */
  var grips = {};
  function mkGrip(p) {
    var g = document.createElement('button'); g.type = 'button'; g.className = 'navgrip2'; g.id = 'grip-' + p[0]; g.hidden = true; g.title = 'Hold to move the ' + p[1].toLowerCase(); g.setAttribute('aria-label', 'Hold to move the ' + p[1].toLowerCase());
    g.innerHTML = '<svg viewBox="0 0 20 8" width="20" height="8" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="2" r="1.3"/><circle cx="10" cy="2" r="1.3"/><circle cx="17" cy="2" r="1.3"/><circle cx="3" cy="6" r="1.3"/><circle cx="10" cy="6" r="1.3"/><circle cx="17" cy="6" r="1.3"/></g></svg>';
    document.body.appendChild(g); grips[p[0]] = g; hold(g, function () { return $(p[0]); }, p[0]);
    /* 17 Nov 21:19 (Stuart, iPhone 14 Plus: "I could see the dots but ... it didn't work"): as in the trial, drag the dots and the
       window comes with you at once; let go and it stays there (or goes to a tab off the side). The long press still works. */
    var gd = null;
    g.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });   /* no iPhone magnifier or menu on the dots */
    g.addEventListener('pointerdown', function (e) { if (e.button > 0 || M.el || locked()) return; gd = { x: e.clientX, y: e.clientY }; try { g.setPointerCapture(e.pointerId); } catch (x) {} });
    g.addEventListener('pointermove', function (e) { if (!gd || M.drag) return; if (Math.hypot(e.clientX - gd.x, e.clientY - gd.y) < 6) return; var el = $(p[0]); if (!el) return; begin(el, p[0]); var c = cur(el); M.drag = { x: gd.x, y: gd.y, dx: c[0], dy: c[1], moved: true, direct: true }; gd = null; swallow = Date.now(); });
    var gu = function () { gd = null; }; g.addEventListener('pointerup', gu); g.addEventListener('pointercancel', gu);
  }
  /* F15: the tab of a window slid off an edge; it shows only when the window would otherwise be on the screen */
  var tabs = {};
  function tabFor(p) {
    var el = $(p[0]), st = stashOf(p[0]), t = tabs[p[0]];
    var ssc = $('solStartScr'), want = el && st && !el.hidden && !(ssc && !ssc.hidden) && (function () { el.classList.remove('fsstashed'); var on = shown(el); el.classList.add('fsstashed'); return on; })();
    if (!want) { if (t) t.hidden = true; return; }
    if (!t) { t = document.createElement('button'); t.type = 'button'; t.className = 'fswtab'; t.setAttribute('aria-label', 'Bring back the ' + p[1].toLowerCase()); t.title = 'Bring back the ' + p[1].toLowerCase();
      t.textContent = p[3] || p[1].split(' ')[0]; t.addEventListener('click', function () { setStash(p[0], null); el.classList.remove('fsstashed'); t.hidden = true; apply(); try { window.dispatchEvent(new Event('resize')); } catch (x) {} }); document.body.appendChild(t); tabs[p[0]] = t; }
    var s = ins(); t.hidden = false; t.classList.toggle('r', st[0] === 'r'); t.classList.toggle('l', st[0] !== 'r');
    /* at the height it went, or the nearest height where it covers no bar or button */
    var list = obstacles(t), x0 = st[0] === 'r' ? innerWidth - s.r - 26 : s.l, y0 = Math.max(s.t + 8, Math.min(innerHeight - s.b - 80, st[1])), y = y0;
    for (var k = 0; k < 120; k++) { var cand = y0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8; if (cand < s.t + 8 || cand > innerHeight - s.b - 80) continue; if (!hits({ l: x0, t: cand, r: x0 + 26, b: cand + 72 }, list)) { y = cand; break; } }
    t.style.top = Math.round(y) + 'px';
  }
  /* 17 Nov 22:55 (Stuart: Mark+ slow on the tablet): the buttons on the screen are read once per check, not once per window,
     and a window that has not moved keeps its grip without a new search (checked again every 5 s) */
  var BC = null;
  function btnsAll() { if (!BC) BC = [].filter.call(document.querySelectorAll('button,select,a[href],[role=button],input'), function (b) { return !b.classList.contains('navgrip2') && b.getClientRects().length && !b.closest('[hidden]'); }).map(function (b) { return b.getBoundingClientRect(); }); return BC; }
  function place() {
    BC = null; var now = Date.now();
    PANELS.forEach(function (p) { if (p[2] === 'win') tabFor(p); });
    PANELS.forEach(function (p) { if (p[2] !== 'win') return; var el = $(p[0]); if (!grips[p[0]] && el) mkGrip(p); var g = grips[p[0]]; if (!g) return;
      var v = shown(el); g.hidden = !v; if (!v) return; var r = el.getBoundingClientRect(), cx = (r.left + r.right) / 2;
      var key = Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ',' + innerWidth + ',' + innerHeight; if (g.__key === key && now - g.__at < 5000 && !M.el) return; g.__key = key; g.__at = now;
      /* the grip goes where it covers no button (17 Nov screen check: on the window's corner it sat on OPEN and on MARK) */
      var hand = opt('hand', 'c'), first = hand === 'l' ? [r.left + 2, r.top - 19] : hand === 'r' ? [r.right - 34, r.top - 19] : [cx - 16, r.top - 19];
      var cands = [first, [cx - 16, r.top - 19], [cx - 16, r.bottom + 1], [r.left - 33, r.top + 2], [r.right + 1, r.top + 2], [cx - 16, r.bottom - 9], [r.left + 2, r.bottom - 20], [r.right - 34, r.bottom - 20], [cx - 16, r.top - 9]]; for (var sx = r.left + 2; sx <= r.right - 34; sx += 16) { cands.push([sx, r.bottom - 20]); cands.push([sx, r.top + 2]); } var btns = btnsAll();
      var pick = cands.filter(function (c) { if (c[0] < 2 || c[1] < 2 || c[0] + 32 > innerWidth - 2 || c[1] + 18 > innerHeight - 2) return false; var ins0 = window.__fsInsets ? window.__fsInsets() : { t: 0, r: 0, b: 0, l: 0 }; if (c[0] < ins0.l + 2 || c[1] < ins0.t + 2 || c[0] + 32 > innerWidth - ins0.r - 2 || c[1] + 18 > innerHeight - ins0.b - 2) return false; return !btns.some(function (b) { return b.width > 0 && c[0] < b.right && c[0] + 32 > b.left && c[1] < b.bottom && c[1] + 18 > b.top; }); })[0];
      if (!pick) { g.hidden = true; return; }   /* nowhere free of a button: no grip rather than one on top of a button */
      g.style.left = Math.round(pick[0]) + 'px'; g.style.top = Math.round(pick[1]) + 'px'; });
  }

  /* ---- long touch to start, drag, long press to lock ---- */
  function hold(target, elOf, id) {
    var t = null, sx = 0, sy = 0;
    target.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || M.el || locked()) return; var el = elOf(); if (!el) return; sx = e.clientX; sy = e.clientY; clearTimeout(t);
      t = setTimeout(function () { t = null; swallow = Date.now(); begin(el, id); var c = cur(el); M.drag = { x: sx, y: sy, dx: c[0], dy: c[1], moved: false }; if (navigator.vibrate) try { navigator.vibrate(30); } catch (x) {} }, LONG);
    }, true);
    target.addEventListener('pointermove', function (e) { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(t); t = null; } }, true);
    var up = function () { if (t) { clearTimeout(t); t = null; } };
    target.addEventListener('pointerup', up, true); target.addEventListener('pointercancel', up, true);
    target.addEventListener('click', function (e) { if (Date.now() - swallow < 900 || M.el === elOf()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);   /* a long press never also presses the button */
    target.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  /* while moving: drag it from anywhere on it (or its grip); let go and it slides clear at once; a long press anywhere on it locks it */
  var lt = null;
  function onIt(e) { if (!M.el) return false; var g = grips[M.id], tg = e.target; return M.el.contains(tg) || (g && g.contains(tg)) || (function () { var r = M.el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; })(); }
  window.addEventListener('pointerdown', function (e) {
    if (!M.el || M.drag) return; if (!onIt(e)) return; e.preventDefault(); e.stopPropagation(); swallow = Date.now();
    var c = cur(M.el); M.drag = { x: e.clientX, y: e.clientY, dx: c[0], dy: c[1], moved: false }; clearTimeout(lt); lt = setTimeout(function () { if (M.drag && !M.drag.moved) { M.drag = null; lock(); } }, LONG);
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!M.el || !M.drag) return; var dx = e.clientX - M.drag.x, dy = e.clientY - M.drag.y; if (Math.hypot(dx, dy) > 6) { M.drag.moved = true; clearTimeout(lt); }
    var nt = performance.now(), dtm = Math.max(1, nt - (M.drag.pt || nt - 16)); M.drag.vx = 0.6 * (M.drag.vx || 0) + 0.4 * (e.clientX - (M.drag.px == null ? e.clientX : M.drag.px)) / dtm; M.drag.px = e.clientX; M.drag.pt = nt;
    e.preventDefault(); e.stopPropagation(); set(M.el, M.drag.dx + dx, M.drag.dy + dy); place();
  }, true);
  var drop = function (e) { clearTimeout(lt); if (!M.el || !M.drag) return; var dg = M.drag; M.drag = null; e.stopPropagation(); swallow = Date.now(); if (slideOff(dg)) return; if (dg.direct) { lock(); return; } var s2 = settle(M.el); if (s2) set(M.el, s2[0], s2[1]); place(); };
  window.addEventListener('pointerup', drop, true); window.addEventListener('pointercancel', drop, true);
  window.addEventListener('click', function (e) { if (M.el && onIt(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  /* F15: most of the way off the left or right edge, or a quick flick towards one: it slides away to a tab */
  function slideOff(dg) {
    var p = PANELS.filter(function (q) { return q[0] === M.id; })[0]; if (!p || p[2] !== 'win') return false;
    var r = M.el.getBoundingClientRect(), offL = -r.left / r.width, offR = (r.right - innerWidth) / r.width, edge = offL > 0.45 ? 'l' : offR > 0.45 ? 'r' : null;
    if (!edge && dg.moved && performance.now() - (dg.pt || 0) < 120 && Math.abs(dg.vx || 0) > 0.9) edge = dg.vx > 0 ? 'r' : 'l';
    if (!edge) return false;
    var el = M.el, id = M.id, from = M.from; setStash(id, [edge, Math.round(r.top)]); set(el, from[0], from[1]); save(id, from[0], from[1]); el.classList.remove('navmove-on'); el.classList.add('fsstashed');
    M.el = null; M.id = null; M.drag = null; place(); try { window.dispatchEvent(new Event('resize')); } catch (x) {}
    var b = $('navUndo'); if (b) { clearTimeout(M.ut); b.hidden = false; b.innerHTML = '<span>' + p[1] + ' put away. Tap its tab on the edge to bring it back.</span><button class="btn" type="button" id="navUndoB">Undo</button>'; $('navUndoB').onclick = function () { setStash(id, null); el.classList.remove('fsstashed'); b.hidden = true; apply(); }; M.ut = setTimeout(function () { b.hidden = true; }, 10000); }
    return true;
  }
  function begin(el, id) { if (M.el && M.el !== el) lock(); M.el = el; M.id = id; M.from = cur(el); el.classList.add('navmove-on'); undoBar(true); }
  function lock() {
    var el = M.el; if (!el) return; swallow = Date.now() + 1500; var s = settle(el);   /* the locking press never also presses the button */
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

  var css = '.navgrip2{position:fixed;z-index:59;width:32px;height:18px;border:1px solid rgba(111,169,224,.55);border-radius:9px;padding:0;display:grid;place-items:center;background:rgba(4,45,94,.75);color:#6FA9E0;opacity:.95;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    '.navgrip2:hover{opacity:1}.navgrip2[hidden]{display:none}' +
    '.navmove-on{outline:3px solid #F2B233!important;outline-offset:3px;animation:navflash .8s ease-in-out infinite;touch-action:none;z-index:58!important}' +
    '@keyframes navflash{50%{outline-color:rgba(242,178,51,.15)}}@media (prefers-reduced-motion:reduce){.navmove-on{animation:none}}' +
    '.navundo{position:fixed;z-index:61;left:50%;translate:-50% 0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;align-items:center;gap:10px;padding:6px 6px 6px 14px;background:var(--panel,#0f2235);color:var(--ink,#fff);border:1px solid #F2B233;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.35);font:600 13px var(--f-body,system-ui);max-width:calc(100% - 24px);box-sizing:border-box}' +
    '.navundo[hidden]{display:none}' +
    '.fsstashed{display:none!important}.fswtab{position:fixed;z-index:57;width:26px;height:72px;padding:0;background:#6FA9E0;color:#042D5E;border:1px solid #042D5E;font:700 11px/1 var(--f-body,system-ui);letter-spacing:.04em;writing-mode:vertical-rl;box-shadow:0 4px 12px rgba(0,0,0,.4);cursor:pointer;touch-action:manipulation}' +
    '.fswtab.l{left:env(safe-area-inset-left,0px);border-radius:0 10px 10px 0}.fswtab.r{right:env(safe-area-inset-right,0px);border-radius:10px 0 0 10px}.fswtab[hidden]{display:none}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  setInterval(function () { wireButtons(); if (!M.drag) place(); }, 500);
  var rt = 0; window.addEventListener('resize', function () { if (M.drag) return; clearTimeout(rt); rt = setTimeout(apply, 250); });
  var n = 0, w = setInterval(function () { apply(); if (++n > 40) clearInterval(w); }, 500);   /* panels are built after load */

  /* Settings, My set-up: the layout (Stuart 05:33: "Reset to FirstShift layout"; your layout is saved with My set-up) */
  var bt = setInterval(function () {
    var body = document.querySelector('#navPrefs .npbody'); if (!body || $('navMoveAll')) { if ($('navMoveAll')) clearInterval(bt); return; }
    var h = document.createElement('div');
    h.innerHTML = '<h4>Window positions</h4><p class="note">Drag the small dots on a window to move it; let go and it stays there. Hold a round button to move it, drag it, then hold again to lock it. It never covers another button: it slides to the nearest gap. While moving, drag a window most of the way off the left or right edge, or flick it towards one, to put it away; tap its tab on the edge to bring it back. Kept for each screen size and orientation, and saved with My set-up.</p>' +
      '<label class="np-row"><input type="checkbox" id="fsWinLock"> Lock layout: nothing moves</label><label class="np-row">Grip on each window <select id="fsWinHand"><option value="c">In the middle</option><option value="l">On the left (left hand)</option><option value="r">On the right (right hand)</option></select></label>' +
      '<div class="xrow"><button class="btn" id="navMoveAll" type="button">Reset to FirstShift layout</button></div>';
    var note = body.querySelector('.npask'); body.insertBefore(h, note || null);
    $('navMoveAll').onclick = function () { resetAll(); };
    $('fsWinLock').checked = locked(); $('fsWinLock').onchange = function () { setOpt('lock', this.checked ? '1' : '0'); };
    $('fsWinHand').value = opt('hand', 'c'); $('fsWinHand').onchange = function () { setOpt('hand', this.value); place(); };
    clearInterval(bt);
  }, 500);
  window.NavDrag = { stash: function (id, edge) { setStash(id, edge ? [edge, 200] : null); apply(); }, stashed: stashOf, reset: reset, resetAll: resetAll, apply: apply, bucket: bucket, begin: function (id) { var el = $(id); if (el) begin(el, id); }, lock: lock, settle: settle, moving: function () { return M.id; }, start: function () {}, on: function () { return !!M.el; } };
})();
