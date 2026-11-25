/* ROUTE and RACE on Route and Route+ (named ROUTE | RACE by Stuart 25 Nov 18:1x: PLAN is already the PLAN line and the Plan tab; inside the code the mode is still called 'plan') (Stuart 25 Nov 2026 16:50; decided 17:2x: "C: switch plus pill", the pill when "Gun within 2 h, or GPS
   near line"). Routing a day or two out is PLAN: no start tools on the chart. On the boat it is RACE: GPS on, the LIVE line, and the start
   sequence and race buttons as before; after the gun it carries on as now. Back to PLAN at any time. The start time set in race set-up is
   the routing start in both; the start tools use it as the gun only in RACE. Mark and Mark+ have no switch: the start is their front page.
   One file for Route and Route+. On a phone the switch takes the START chip's place and shows the start time under PLAN; a tap on PLAN
   when it is already chosen opens the start time, as the START chip did. On a Route+ phone the BOAT chip leaves the top band for room: the
   instrument strip under it shows the same connection and CONNECT BOAT (Stuart to confirm). */
(function () {
  'use strict';
  if (window.FS_MARK) return;
  var page = location.pathname.replace(/\/+$/, '').split('/').pop() || 'x', KEY = 'fs-mode-' + page, $ = function (id) { return document.getElementById(id); };
  var M = { mode: null, pillOff: 0, el: null, pill: null };
  try { M.mode = localStorage.getItem(KEY); } catch (e) {}
  function gun() { try { return window.__fsGunAt ? window.__fsGunAt() : null; } catch (e) { return null; } }
  function now() { return Date.now() / 1000; }
  /* a race already under way (from the gun to 10 hours after it) opens in RACE when nothing was chosen */
  if (M.mode !== 'plan' && M.mode !== 'race') M.mode = null;
  function mode() { if (M.mode) return M.mode; var g = gun(); return g && now() > g - 600 && now() < g + 36000 ? 'race' : 'plan'; }
  function save() { try { localStorage.setItem(KEY, M.mode); } catch (e) {} }
  function liveOn() { try { return !!(window.__navLiveState && window.__navLiveState().on); } catch (e) { return false; } }
  function set(m) {
    M.mode = m; save(); apply();
    if (m === 'race' && !liveOn()) { var l = $('liveBtn'); if (l) l.click(); }   /* RACE brings in the GPS and the LIVE line */
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }
  function hm(ep) { var d = new Date(ep * 1000); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function dur(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' h ' + String(m).padStart(2, '0') : m + ' min'; }
  function near() {   /* the boat within 2 nm of the start */
    try { var f = window.__fsFixNow && window.__fsFixNow(), c = window.__navCourse && window.__navCourse(); if (!f || !c || !c.start) return false;
      var dLa = (f.la - c.start.lat) * 60, dLo = (f.lo - c.start.lon) * 60 * Math.cos(f.la * Math.PI / 180); return Math.sqrt(dLa * dLa + dLo * dLo) <= 2; } catch (e) { return false; }
  }
  function build() {
    var sc = $('startChip'); if (!sc || M.el) return !!M.el;
    var e = document.createElement('div'); e.className = 'fsmode'; e.setAttribute('role', 'group'); e.setAttribute('aria-label', 'Route or race');
    e.innerHTML = '<button type="button" data-m="plan"><b>ROUTE</b><i></i></button><button type="button" data-m="race"><b>RACE</b><i></i></button>';
    sc.parentNode.insertBefore(e, sc.nextSibling); M.el = e;
    e.addEventListener('click', function (ev) { var b = ev.target.closest('[data-m]'); if (!b) return; ev.stopPropagation(); var m = b.dataset.m;
      if (m === mode()) { if (m === 'plan') sc.click(); return; }   /* ROUTE again: change the start time, as the START chip does */
      set(m); });
    var p = document.createElement('button'); p.type = 'button'; p.className = 'fsmodepill'; p.hidden = true; document.body.appendChild(p); M.pill = p;
    p.addEventListener('click', function (ev) { ev.stopPropagation(); if (ev.target.closest('[data-x]')) { M.pillOff = Date.now(); p.hidden = true; return; } set('race'); });
    var css = document.createElement('style'); css.id = 'fsModeCss';
    css.textContent = '.fsmode{display:flex;align-self:stretch;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);flex:none}' +
      '.fsmode button{display:grid;align-content:center;justify-items:center;gap:1px;min-width:62px;padding:0 10px;border:0;background:none;color:var(--muted);cursor:pointer;font:inherit}' +
      '.fsmode b{font:700 12px var(--f-data);letter-spacing:.08em}.fsmode i{font:400 10.5px var(--f-data);font-style:normal;white-space:nowrap}.fsmode i:empty{display:none}' +
      '.fsmode button.on{background:var(--brand,#3574BA);color:#fff}.fsmode button.on i{color:#DCE9F7}' +
      ':root[data-night] .fsmode button.on{background:#3A0A08;color:#E0322A}' +
      '@media (max-width:600px),(orientation:landscape) and (max-height:500px){#navBoatBtn{width:0!important;min-width:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}#startChip{display:none!important}.fsmode button{min-width:44px;padding:0 6px}.fsmode b{font-size:11px;letter-spacing:.04em}.fsmode i{display:none}}' +   /* a phone: room for the two words only; the start time stays on the bar (Start 0h 39) and in race set-up */
      'body.fsplan #solRaceBtns,body.fsplan #solSeq,body.fsplan #solGunBar,body.fsplan #solStartScr{display:none!important}' +
      '.fsmodepill{position:fixed;z-index:31;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center;max-width:calc(100% - 24px);padding:8px 8px 8px 14px;border-radius:999px;border:1px solid var(--brand,#3574BA);background:var(--panel);color:var(--ink);font:600 13px var(--f-body);box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer;white-space:nowrap}' +
      '.fsmodepill em{font-style:normal;color:var(--brand,#7FB2EA)}.fsmodepill span[data-x]{display:grid;place-items:center;min-width:28px;min-height:28px;border-radius:50%;color:var(--muted)}.fsmodepill[hidden]{display:none}';
    document.head.appendChild(css);
    return true;
  }
  function apply() {
    if (!build()) return; var m = mode(), g = gun(), t = now();
    document.body.classList.toggle('fsplan', m === 'plan'); document.body.classList.toggle('fsrace', m === 'race');
    [].forEach.call(M.el.querySelectorAll('[data-m]'), function (b) { var on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    var sv = document.querySelector('#startChip .stv'), pi = M.el.querySelector('[data-m=plan] i'), ri = M.el.querySelector('[data-m=race] i');
    pi.textContent = sv ? sv.textContent.replace(/^tap to choose$/, 'set start') : '';
    ri.textContent = g ? (t < g ? 'gun ' + dur(g - t) : t < g + 36000 ? 'racing' : '') : '';
    M.el.title = m === 'plan' ? 'ROUTE: routing only. RACE: GPS, the LIVE line and the start tools.' : 'RACE: GPS, the LIVE line and the start tools. ROUTE: routing only.';
    /* the pill: in PLAN, the gun within 2 hours, or the boat within 2 nm of the start */
    var want = m === 'plan' && Date.now() - M.pillOff > 30 * 60000 && ((g && t > g - 7200 && t < g + 600) || near()), p = M.pill;
    if (want) { try { if (window.FSClear && (FSClear.busy() || FSClear.alarm())) want = false; } catch (e) {} if (['liveBig', 'fsHelm', 'navHelm', 'fhHelm', 'deckNums', 'dkView', 'solStartScr'].some(function (id) { var e = $(id); return e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'; })) want = false; }   /* nor over the big numbers, HELM or the deck view */   /* never over a panel, Settings, Layers, an alarm or the start sequence (screens check 25 Nov) */
    if (!want) { p.hidden = true; return; }
    p.innerHTML = (g && t < g ? 'Gun in ' + dur(g - t) : 'Near the start') + ' <em>On the boat? Tap for RACE</em><span data-x="1" aria-label="Not now">✕</span>';
    var top = 0; ['.top', '#cbanner', '#navStrip', '#navPlot', '#fsPlot', '#prog', '#folStrip', '#readyChip'].forEach(function (q) { var e = document.querySelector(q); if (e && !e.hidden && e.getClientRects().length) { var r = e.getBoundingClientRect(); if (r.top < innerHeight * 0.4) top = Math.max(top, r.bottom); } });
    p.style.top = Math.round(top + 8) + 'px'; p.hidden = false;
  }
  function boot() { apply(); if (window.FSBeat) FSBeat.set(apply, 1000); else setInterval(apply, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FSMode = { get: mode, set: set };
})();
