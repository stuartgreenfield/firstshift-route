/* FirstShift: make a window on the map bigger, for hard light (Route, Route+, Mark and Mark+).
   Stuart 28 Nov 17:51: "I think a way of zooming in on a window would be very useful use in difficult light conditions and you propose
   A simple way to do this on all map windows ?". 19:28, in the question card: "ZM1 + ZM2" and "Every window on the map".
   ZM1: each window on the map has a small magnifier button at its top right corner. One tap makes that window 1.5 times bigger (text,
   figures and buttons together), a second tap puts it back. Remembered for each window on this device (fs-wzoom).
   ZM2: Settings, Display, Map view, "Size of the cards and windows": Large (1.45 times) and Extra large (1.8 times) for every window at
   once (fs-cbtext, the same setting as the chart box cards; Back to default clears it). The two multiply.
   A window never grows past the screen: its contents are drawn bigger inside its own place and width (text wraps), and if it would then
   run off the screen the factor is stepped down until it fits, so at the largest sizes it may be less than the full factor.
   The chart box cards (the route card, open water, your boat, your track, the Mac chip) have their own magnifier and sizing in app.js
   (cbZoom); this file covers the other windows. */
(function () {
  'use strict';
  var KEY = 'fs-wzoom', STEP = 1.5;
  /* the windows over the chart: GPS window, plotter bar (Route and Mark / Route+ and Mark+), boat figures strip, lift and header,
     start screen, countdown box, tide window, course card */
  var WINS = [['liveBox', 'GPS window'], ['fsPlot', 'Plotter'], ['navPlot', 'Plotter'], ['navStrip', 'Boat figures'], ['lhPop', 'Lift and header'],
    ['solStartScr', 'Start screen'], ['solSeq', 'Countdown'], ['tgPop', 'Tide window'], ['solLegs', 'Course card']];
  function $(id) { return document.getElementById(id); }
  function ld() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function sv(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function glob() { var t = ''; try { t = localStorage.getItem('fs-cbtext') || ''; } catch (e) {} return t === 'large' ? 1.45 : t === 'xl' ? 1.8 : 1; }
  function ins() { try { return window.__fsInsets ? window.__fsInsets() : { t: 0, r: 0, b: 0, l: 0 }; } catch (e) { return { t: 0, r: 0, b: 0, l: 0 }; } }
  function shown(el) { if (!el || el.hidden || !el.getClientRects().length) return false; var c = getComputedStyle(el); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; var r = el.getBoundingClientRect(); return r.width > 20 && r.height > 12; }
  var btns = {};
  function mkBtn(id, name) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fswz'; b.id = 'fswz-' + id; b.hidden = true;
    b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path class="v" d="M10.5 7.5v6"/><path d="M7.5 10.5h6"/></svg>';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var o = ld(); if (o[id]) delete o[id]; else o[id] = 1; sv(o); run(); });
    b.__name = name; document.body.appendChild(b); btns[id] = b; return b;
  }
  /* The window's contents are drawn bigger (CSS zoom on its children), the window itself keeps its place and its width: a window as wide as
     the screen (the plotter, the boat figures) cannot grow wider, so its text wraps and it grows taller. Then, if it would run past the
     top or the foot of the screen (or a side), the factor is stepped down until it fits, never below 1. Set by an attribute and a
     variable, not a class, because some windows rewrite their own class list every second (the boat figures strip). */
  function apply(el, want) {
    var s = ins(), fits = function () { var r = el.getBoundingClientRect(); return r.top >= s.t + 2 && r.bottom <= innerHeight - s.b - 2 && r.left >= s.l - 1 && r.right <= innerWidth - s.r + 1; };
    var k = Math.round(want * 100) / 100;
    if (k <= 1) { if (el.hasAttribute('data-fswz')) { el.removeAttribute('data-fswz'); el.style.removeProperty('--fswz'); } return 1; }
    if (el.getAttribute('data-fswz') === String(k) && fits()) return k;
    el.setAttribute('data-fswz', String(k)); el.style.setProperty('--fswz', String(k));
    for (var n = 0; n < 8 && !fits() && k > 1; n++) { k = Math.max(1, Math.round(k * 0.9 * 100) / 100); el.setAttribute('data-fswz', String(k)); el.style.setProperty('--fswz', String(k)); }
    if (k <= 1) { el.removeAttribute('data-fswz'); el.style.removeProperty('--fswz'); }
    return k;
  }
  function place(b, el) {
    var r = el.getBoundingClientRect(), s = ins(), W = 36, H = 28;
    var cands = [[r.right - W - 2, r.top - H - 2], [r.right - W - 2, r.bottom + 2], [r.left + 2, r.top - H - 2], [r.left + 2, r.bottom + 2], [r.right + 2, r.top], [r.left - W - 2, r.top], [r.right - W - 2, r.top + 2], [r.right - W - 2, r.bottom - H - 2]];
    var mp = $('map');
    var ok = function (c) { if (c[0] < s.l + 2 || c[1] < s.t + 2 || c[0] + W > innerWidth - s.r - 2 || c[1] + H > innerHeight - s.b - 2) return false;
      var prev = b.style.visibility; b.style.visibility = 'hidden'; var hit = document.elementFromPoint(c[0] + W / 2, c[1] + H / 2); b.style.visibility = prev;
      if (hit && hit.closest && hit.closest('button, a, input, select, textarea, [role=button], .fswz')) return false;   /* never on a button, its own window's included (seen 19:50: on the boat strip's POLARS button) */
      return !hit || hit === document.body || hit === document.documentElement || el.contains(hit) || (mp && (hit === mp || hit.contains(mp))) || (hit.tagName === 'CANVAS' || !!(hit.closest && hit.closest('#map, .chart'))) && !(hit.closest && hit.closest('.top, #mkTop, .bar, #panel, .fabhelp, .tip, .sheet, .livebox, .solrb, ' + WINS.map(function (w) { return '#' + w[0]; }).join(', '))); };   /* and only on this window, the chart or nothing: never on a bar (seen 19:50: by the boat strip it sat on the top bar's buttons, which lie inside the chart's box) */
    var pick = null; for (var i = 0; i < cands.length; i++) if (ok(cands[i])) { pick = cands[i]; break; }
    if (!pick) { b.hidden = true; return; }
    b.style.left = Math.round(pick[0]) + 'px'; b.style.top = Math.round(pick[1]) + 'px'; b.hidden = false;
  }
  var busy = false;
  function run() {
    if (busy) return; busy = true;
    try {
      var o = ld(), g = glob();
      WINS.forEach(function (w) { var el = $(w[0]); var b = btns[w[0]];
        if (!shown(el)) { if (b) b.hidden = true; return; }
        if (!b) b = mkBtn(w[0], w[1]);
        var on = !!o[w[0]], want = g * (on ? STEP : 1); apply(el, want);
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', (on ? 'Make the ' : 'Make the ') + w[1].toLowerCase() + (on ? ' smaller' : ' bigger')); b.title = on ? 'Smaller' : 'Bigger'; b.classList.toggle('on', on);
        place(b, el); });
    } catch (e) {}
    busy = false;
  }
  var css = document.createElement('style');
  css.textContent = '.fswz{position:fixed;z-index:70;width:36px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid var(--line,#2c3e55);background:var(--panel,#13233a);color:var(--ink,#e8eef6);box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation;opacity:.9}'
    + '.fswz[hidden]{display:none}.fswz.on{background:var(--brand,#3574BA);color:#fff;border-color:var(--brand,#3574BA)}.fswz.on .v{display:none}'
    + 'body.navclear .fswz,body.fsdeck .fswz{display:none}[data-fswz]>*{zoom:var(--fswz,1)}';
  (document.head || document.documentElement).appendChild(css);
  function boot() { run(); if (window.FSBeat) FSBeat.set(run, 500, true); else setInterval(run, 500); window.addEventListener('resize', run); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FSZoom = { run: run, state: function () { return ld(); }, factor: glob };
})();
