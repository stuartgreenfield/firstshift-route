/* A phone on its side (Stuart 26 Nov 2026 07:25 to 08:13, PROPOSAL-LANDSCAPE-2026-11-26.md; decided "B: Side rail", "15 seconds",
   "Whatever applies to the leg", then "go with your choice": B3, R1, D1, H1).
   The screen is split down the middle of its long side: the chart on the left, a panel on the right.
   - The bottom bar's buttons become a rail down the left edge of the chart. With no touch on it for 15 seconds it folds to a thin
     TOOLS tab; a touch on the tab, or an alarm, opens it again. It lies over the chart's edge, so the chart never jumps.
   - The logo, the race name, Layers, Results, Night and Settings sit in one row across the head of the right-hand panel (B3), with
     the ROUTE | RACE switch (Mark: COURSE, START, RACE) under it. Nothing lies over the chart.
   - The clock, the LIVE and PLAN figures live in the right-hand panel; the time slider is a thin line along the foot of the chart.
   - Windows that take chart room (boat strip, plotter, tide, GPS) start as tabs at the edge; the one that applies to the leg opens.
   - Man overboard never hides.
   Upright phones and tablets are untouched: everything here hangs off the class "fsland" on the body, set only while the screen is
   wider than it is tall and no more than 500 px high. One file for all four tools. */
(function () {
  'use strict';
  var MQ = window.matchMedia ? window.matchMedia('(orientation: landscape) and (max-height: 500px)') : null; if (!MQ) return;
  var $ = function (id) { return document.getElementById(id); }, IDLE = 15000, lastTouch = Date.now(), on = false, homes = [], side = null;
  function css() { if ($('fsLandCss')) return; var s = document.createElement('style'); s.id = 'fsLandCss'; s.textContent =
    'body.fsland{--sidew:clamp(236px,36vw,320px);--railw:54px;--tabw:22px}' +
    'body.fsland #app{grid-template-columns:var(--tabw) minmax(0,1fr) var(--sidew)!important;grid-template-rows:minmax(0,1fr)!important}' +
    'body.fsland .chart{grid-column:1/3!important;grid-row:1!important;min-width:0}' +
    /* the rail */
    'body.fsland #bar{grid-column:1!important;grid-row:1!important;position:relative;z-index:8;width:var(--railw);display:flex!important;flex-direction:column;gap:0;padding:calc(env(safe-area-inset-top,0px) + 5px) 4px calc(env(safe-area-inset-bottom,0px) + 5px) max(4px,env(safe-area-inset-left,0px));border:0;border-right:1px solid var(--line);background:var(--panel);box-sizing:content-box;overflow:hidden;transition:width .18s}' +
    'body.fsland #bar .pgrp{display:flex!important;flex-direction:column;flex-wrap:nowrap;gap:4px;align-items:stretch;justify-content:flex-start;overflow-y:auto;scrollbar-width:none;width:100%;min-height:0;flex:1}' +
    'body.fsland #bar .pgrp>button{width:100%!important;min-width:0!important;max-width:none;height:32px!important;min-height:32px!important;flex:none;padding:0!important;font-size:10px!important;letter-spacing:0;border-radius:9px;margin:0}' +
    'body.fsland #bar .pgrp>button svg{width:18px;height:18px}body.fsland #bar .pgrp>button small,body.fsland #bar .pgrp>button .sub{display:none}' +
    'body.fsland.fsidle #bar{width:calc(var(--tabw) - 9px);cursor:pointer}body.fsland.fsidle #bar .pgrp{display:none!important}' +
    'body.fsland #bar::after{content:"TOOLS";display:none;writing-mode:vertical-rl;font:700 10px var(--f-body,system-ui);letter-spacing:.1em;color:var(--brand,#6FA9E0);margin:auto}body.fsland.fsidle #bar::after{display:block}' +
    /* the right-hand panel */
    '#fsSide{display:none}body.fsland #fsSide{display:flex;flex-direction:column;gap:6px;grid-column:3;grid-row:1;min-width:0;background:var(--panel);border-left:1px solid var(--line);padding:var(--toph,calc(env(safe-area-inset-top,0px) + 84px)) max(10px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 6px) 10px;overflow-y:auto;scrollbar-width:none;z-index:5}' +
    /* B3: the head row, and the switch under it */
    'body.fsland .top{position:fixed!important;left:auto!important;right:env(safe-area-inset-right,0px)!important;top:env(safe-area-inset-top,0px)!important;width:var(--sidew)!important;height:auto!important;padding:6px 8px 0!important;margin:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:5px 5px!important;align-items:center;z-index:9;pointer-events:auto;background:var(--panel)}' +
    'body.fsland .top .lead{display:contents!important}body.fsland .top .tools{display:flex!important;gap:4px!important;grid-column:2;grid-row:1;flex-wrap:nowrap}' +
    'body.fsland .top .logobox{grid-column:1;grid-row:1;width:36px!important;height:34px!important;min-width:0!important;padding:2px!important;justify-self:start;position:relative}body.fsland .top .logobox svg{max-width:100%;max-height:100%}' +
    'body.fsland .top #raceBtn{grid-column:1;grid-row:1;margin-left:41px!important;min-width:0!important;max-width:none!important;height:34px!important;min-height:0!important;padding:2px 8px!important;display:flex!important;align-items:center;overflow:hidden}' +
    'body.fsland .top #raceBtn #raceTitle,body.fsland .top #raceBtn #dataChip,body.fsland .top #raceBtn .offb{display:none!important}body.fsland .top #raceBtn #raceShort{display:block!important;font-size:13px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    'body.fsland .top .tools .ib{width:32px!important;height:34px!important;min-width:0!important;min-height:0!important;padding:0!important}body.fsland .top .tools .ib .lbl{display:none!important}body.fsland .top .tools #fromHere{display:none!important}' +
    'body.fsland .top #startChip{display:none!important}body.fsland .top .fsmode,body.fsland .top .fssteps{grid-column:1/-1;grid-row:2;width:100%!important;max-width:none!important;height:30px!important;min-height:0!important;margin:0!important;display:flex!important}body.fsland .top .fsmode button,body.fsland .top .fssteps button{flex:1;min-height:0!important;height:100%!important;font-size:11px!important}body.fsland .top .fssteps i{display:inline!important}' +
    'body.fsland #readyChip{display:none!important}' +
    /* the figures in the panel */
    'body.fsland #fsSide #clock{font-size:14px;text-align:left;padding:0}body.fsland #fsSide #tzRow{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:11px;align-items:center}body.fsland #fsSide #tzRow .tzb{min-width:30px;min-height:28px}' +
    'body.fsland #fsSide .now{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px 6px!important;padding:6px 0 0 14px!important;overflow:visible!important;border-top:1px solid var(--line);position:relative}body.fsland #fsSide .now>div{width:auto!important;min-width:0}body.fsland #fsSide .now .kvw{grid-column:span 2}body.fsland #fsSide .now b{font-size:15px!important}body.fsland #fsSide .now:not(:has(>div)){display:none!important}body.fsland .solmk{padding:calc(env(safe-area-inset-top,0px) + 8px) 8px 8px calc(var(--railw) + 10px)}body.fsland .solmk .in{max-height:calc(100vh - 16px);width:min(440px,calc(100vw - var(--sidew) - var(--railw) - 20px))}' +
    /* the slider: a thin line along the foot of the chart that thickens under a finger */
    'body.fsland #trow{position:absolute;left:calc(var(--railw) + 14px);right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 1px);z-index:3;height:22px;display:flex;align-items:center;padding:0;margin:0;background:none}body.fsland #trow input{width:100%;height:22px;margin:0;opacity:.75}body.fsland #trow:active input,body.fsland #trow input:focus{opacity:1}' +
    /* man overboard: always there, at the foot of the chart beside the rail */
    'body.fsland #mobBtn.fslmob{position:absolute!important;left:calc(var(--railw) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 26px);z-index:7;width:38px!important;height:38px!important;margin:0!important}' +
    /* the results panel opens over the right-hand panel, under the head row; folded, it is out of the way */
    'body.fsland #panel{position:fixed!important;right:0;top:var(--toph2,calc(env(safe-area-inset-top,0px) + 80px));bottom:0;left:auto!important;width:var(--sidew)!important;max-width:none!important;height:auto!important;max-height:none!important;grid-column:auto!important;grid-row:auto!important;z-index:10;border-radius:0!important;transform:none!important}body.fsland #panel.collapsed{display:none!important}body.fsland #panel .grab{display:none}body.fsland #panel .tabs{gap:2px;padding-left:6px;padding-right:4px}body.fsland #panel .tabs .tab{padding:6px 6px!important;font-size:12px!important;min-width:0}body.fsland #panel .tabs .tab svg{display:none}' +
    /* what sits over the chart keeps clear of the rail's tab */
    'body.fsland .fabhelp{translate:0 -24px}body.fsland .chartcredit{left:calc(var(--railw) + 60px)}' +
    /* window tabs sit at the chart's own edges: right of the rail, and left of the right-hand panel */
    'body.fsland .fswtab.l{left:calc(var(--railw) + 10px)!important}body.fsland.fsidle .fswtab.l{left:calc(var(--tabw) - 4px)!important}body.fsland .fswtab.r{right:var(--sidew)!important}' +
    /* one notice at a time, and never on the chart: the course banner sits at the head of the figures */
    'body.fsland #fsSide #cbanner{position:relative!important;left:auto!important;right:auto!important;top:auto!important;visibility:visible!important;max-width:none!important;width:auto!important;margin:0!important;flex:none}body.fsland #fsSide .cbanner:not(.open){max-height:none}body.fsland #fsSide .cbanner:not(.open) #cbannerTxt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}body.fsland #fsSide .cbanner:not(.open)::after{position:static;display:block;text-align:right;padding:0;margin-top:1px;background:none}' +
    /* PRACTICE: the short wording, at the head of the chart, where nothing else is now */
    'body.fsland .navpractag{left:calc((100vw - var(--sidew) + var(--tabw)) / 2)!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;bottom:auto!important;max-width:calc(100vw - var(--sidew) - 130px)!important;font-size:12px;padding:5px 12px;white-space:nowrap}body.fsland .navpractag .pt-l{display:none}body.fsland .navpractag .pt-s{display:inline}';
    document.head.appendChild(s); }
  function move(el, to, before) { if (!el || !to) return; var mark = document.createComment('fsland ' + (el.id || '')); el.parentNode.insertBefore(mark, el); homes.push([el, mark]); if (before) to.insertBefore(el, before); else to.appendChild(el); }
  function enter() {
    if (on) return; var app = $('app'), bar = $('bar'), chart = document.querySelector('.chart'); if (!app || !bar || !chart || !$('now')) return;
    on = true; css(); document.body.classList.add('fsland');
    if (!side) { side = document.createElement('div'); side.id = 'fsSide'; side.setAttribute('aria-label', 'Figures'); }
    app.appendChild(side);
    ['cbanner', 'clock', 'tzRow', 'now', 'now2'].forEach(function (id) { move($(id), side); });
    move($('trow'), chart); var mb = $('mobBtn'); if (mb) { move(mb, chart); mb.classList.add('fslmob'); }
    wake(); stashAll(); kick();
  }
  function leave() {
    if (!on) return; on = false; document.body.classList.remove('fsland', 'fsidle');
    homes.reverse().forEach(function (h) { try { h[1].parentNode.insertBefore(h[0], h[1]); h[1].remove(); } catch (e) {} }); homes = [];
    var mb = $('mobBtn'); if (mb) mb.classList.remove('fslmob'); if (side && side.parentNode) side.remove(); kick();
  }
  function kick() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 250); }
  function wake() { lastTouch = Date.now(); document.body.classList.remove('fsidle'); }
  /* L1: the windows that take chart room start as tabs at the left edge; the one that applies to the leg is opened (L1 with "Whatever
     applies to the leg"): the plotter while racing a leg. A window the user opens or closes by hand stays as they left it. */
  var WINS = ['navStrip', 'navPlot', 'fsPlot', 'tgPop', 'liveBox'], done = {};
  function stashAll() { var D = window.NavDrag; if (!D || !D.stash) return; WINS.forEach(function (id, i) { var k = D.bucket() + id; if (done[k]) return; done[k] = 1; try { if (!D.stashed(id)) D.stash(id, 'l', 60 + i * 78); } catch (e) {} }); }   /* each tab at its own height, so none lies on another */
  var topH = 0;
  function beat() {
    var want = MQ.matches && !document.body.classList.contains('fsdeck'); if (want !== on) { if (want) enter(); else leave(); } if (!on) return;
    /* the head of the side column is one row on Route and two on Mark (its three steps): the figures and the panel start under whatever height it really is */
    var tp = document.querySelector('.top'), tb = tp && tp.getClientRects().length ? Math.round(tp.getBoundingClientRect().bottom) : 0; if (tb && tb !== topH) { topH = tb; document.body.style.setProperty('--toph', (tb + 5) + 'px'); document.body.style.setProperty('--toph2', (tb + 1) + 'px'); }
    var alarm = false; try { alarm = !!(window.FSClear && window.FSClear.alarm && window.FSClear.alarm()); } catch (e) {}
    if (alarm) wake(); else if (Date.now() - lastTouch > IDLE) document.body.classList.add('fsidle');
  }
  document.addEventListener('pointerdown', function (e) { if (!on) return; var b = $('bar'); if (b && b.contains(e.target)) { var idle = document.body.classList.contains('fsidle'); wake(); if (idle) { e.preventDefault(); e.stopPropagation(); } } }, true);
  document.addEventListener('click', function (e) { if (!on) return; var b = $('bar'); if (b && e.target === b) { e.preventDefault(); e.stopPropagation(); } }, true);
  if (MQ.addEventListener) MQ.addEventListener('change', function () { setTimeout(beat, 50); });
  function boot() { beat(); if (window.FSBeat && window.FSBeat.set) window.FSBeat.set(beat, 1000); else setInterval(beat, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 600); }); else setTimeout(boot, 600);
  window.FSLand = { on: function () { return on; }, wake: wake };
})();
