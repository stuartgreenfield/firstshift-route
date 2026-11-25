/* CLEAR, the button row (Stuart 25 Nov 2026, BRIEF-CLEAR-BUTTON-ROW-2026-11-25.md; decided 16:02, 16:12, 16:38, 16:45). One file for all four
   tools (Route and Mark through fscore.js, Route+ and Mark+ through navigate.js), so the behaviour cannot drift between them.
   - CLEAR takes away only the row of big buttons (play, speed, GPS, FOLLOW, PLOT, 20/20, TIDE) and the time row; the LIVE line, the ROUTE line
     and the slider stay, MOB stays with the slider. The top band stays, on a solid band with a blue line. The side panel, Edit, Help and the
     boat warning hide as before; the plotter bar stays as before.
   - The buttons come back from MENU or a swipe up on the bar, never from touching the chart (a touch on the chart reads the wind and tide there).
   - They clear by themselves after a time untouched: Off, 30 s, 1 min (the default) or 2 min (Settings, Display). Never while a panel, Settings
     or another window is open, while typing, or during the start sequence.
   - An alarm (man overboard, an AIS warning) or the start sequence brings them back by itself.
   - A swipe down on the bar clears them, a swipe up brings them back; the CLEAR and MENU buttons always work too.
   - Upright and on its side each keep their own state while the tool is open; every tool still opens with its buttons showing (17 Nov 14:19). */
(function () {
  'use strict';
  var KEY = 'fs-clear-v2', S = { auto: 60, told: false }, st = { up: false, side: false }, timer = 0;
  try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') { if ([0, 30, 60, 120].indexOf(+o.auto) >= 0) S.auto = +o.auto; S.told = !!o.told; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };
  function way() { return window.matchMedia && matchMedia('(orientation:landscape)').matches ? 'side' : 'up'; }
  function on() { return document.body.classList.contains('navclear'); }
  function shown(e) { return !!(e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'); }
  function toast(t) { try { if (window.NavToast) window.NavToast(t); } catch (e) {} }
  function relayout() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  /* busy: never clear by itself while something is being used */
  function busy() {
    var a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'range') return true;
    var pn = $('panel'); if (pn && shown(pn) && !pn.classList.contains('collapsed') && innerWidth < 900) return true;
    if (['sheet', 'races', 'help', 'layers', 'wiz', 'fsTour', 'tgPop', 'mob', 'solSeq', 'solStartScr', 'navHideCard'].some(function (id) { return shown($(id)); })) return true;
    if (document.querySelector('[role=dialog]:not([hidden])') && [].some.call(document.querySelectorAll('[role=dialog]:not([hidden])'), shown)) return true;
    return false;
  }
  /* alarms and the start sequence bring the buttons back */
  function alarm() { return ['mob', 'cpaWarn', 'solSeq', 'solGunBar', 'aisAlarm'].some(function (id) { return shown($(id)); }); }
  function arm() {
    clearTimeout(timer); timer = 0;
    if (on() || !S.auto) return;
    timer = setTimeout(function () { timer = 0; if (on()) return; if (busy() || alarm()) { arm(); return; } set(true, 'auto'); }, S.auto * 1000);
  }
  function set(v, why) {
    v = !!v; var was = on();
    document.body.classList.toggle('navclear', v); st[way()] = v;
    var mb = $('navMenuBtn'), tr = $('trow'), bar = $('bar');   /* MENU sits at the end of the slider row while cleared, small, never across the bar */
    if (mb && tr && bar) { if (v && mb.parentNode !== tr) tr.appendChild(mb); else if (!v && mb.parentNode !== bar) bar.appendChild(mb); }
    if (v && !was && !S.told) { S.told = true; save(); toast('Buttons cleared. MENU, or a swipe up on the bar, brings them back.'); }
    if (v !== was) relayout();
    arm();
  }
  var last = way();
  function turned() { var w = way(); if (w === last) return; last = w; if (st[w] !== on()) set(st[w], 'turned'); }
  function build() {
    var bar = $('bar'); if (!bar || bar._fsclear) return; bar._fsclear = true;
    /* any touch or key keeps the buttons up a while longer (the timer starts again) */
    ['pointerdown', 'keydown', 'wheel'].forEach(function (k) { document.addEventListener(k, function () { if (!on()) arm(); }, { capture: true, passive: true }); });
    /* swipe down on the bar clears, swipe up restores; not when the finger starts on the slider */
    var y0 = null, x0 = 0, t0 = 0;
    bar.addEventListener('touchstart', function (e) { var t = e.target; if (t && t.type === 'range') { y0 = null; return; } var p = e.touches[0]; y0 = p.clientY; x0 = p.clientX; t0 = Date.now(); }, { passive: true });
    bar.addEventListener('touchend', function (e) { if (y0 == null) return; var p = e.changedTouches[0], dy = p.clientY - y0, dx = p.clientX - x0; y0 = null; if (Date.now() - t0 > 800 || Math.abs(dy) < 40 || Math.abs(dx) > Math.abs(dy)) return; if (dy > 0 && !on()) set(true, 'swipe'); else if (dy < 0 && on()) set(false, 'swipe'); }, { passive: true });
    window.addEventListener('resize', turned);
    if (window.FSBeat) FSBeat.set(function () { if (on() && alarm()) set(false, 'alarm'); }, 1000, true);   /* always: an alarm must bring the buttons back even straight after a touch */
    arm();
  }
  /* the Settings choice; the old menu-hiding choice (1, 5, 10 minutes with a boat connection) is replaced by this one */
  function auto(v) { if (v === undefined) return S.auto; v = +v; if ([0, 30, 60, 120].indexOf(v) < 0) v = 60; S.auto = v; save(); arm(); return v; }
  var css = document.createElement('style'); css.id = 'fsClearCss';
  css.textContent = [
    'body.navclear .top{background:var(--panel);border-bottom:2px solid var(--mk-blue,#3574BA);margin:0;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 6px) var(--gutR,10px) 6px var(--gut,10px);pointer-events:auto}',
    'body.navclear #fsBadge{display:none!important}',
    'body.navclear .bar>.pgrp>:not(.mobbtn),body.navclear #tzRow,body.navclear #clock{display:none!important}',
    'body.navclear #trow>.navmenub{display:block;flex:none;width:auto;min-width:56px;height:40px;font-size:12px}',
    ':root[data-night] body.navclear .top{border-bottom-color:#6A0F0B}',
    /* Stuart 25 Nov 16:50: on a phone on its side the refining-the-routes box was far too big: one small line and the bar, at the left, all four tools */
    '@media (orientation:landscape) and (max-height:500px){#prog{left:var(--gut,12px)!important;right:auto!important;transform:none!important;width:min(250px,34vw)!important;max-width:250px;padding:4px 8px!important;font-size:11.5px}#prog .pg-t{font-size:11.5px;line-height:1.2}#prog #pgD,#prog #pgCk{display:none!important}#prog .pgmin{min-height:24px;min-width:24px}}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);
  window.FSClear = { set: set, on: on, arm: arm, auto: auto, build: build, busy: busy, alarm: alarm, state: function () { return { up: st.up, side: st.side, auto: S.auto }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
