/* A phone on its side is for watching (Stuart 26 Nov 2026 09:07 to 09:33: "the portrait format is where you do all the work, and the
   landscape version is where you do all the viewing"; "Ok go with the new idea for view only in landscape ... otherwise just too many
   options"). One screen, no choices: the chart (or the start screen, which has its own layout), the slider as a thin line, the BOAT and
   PLAN figures and a TIDE line along the foot, man overboard, the PRACTICE label, one VIEW button (Chart, 20/20, HELM) and a help button.
   Everything else (menus, tools, Settings, windows) is upright only.
   Kept live on its side because they cannot wait for a turn of the wrist: man overboard, alarms, the start screen's own buttons, Rounded,
   the slider, a touch on the route. HELM keeps its own pickers. The chart pinches to zoom; dragged, it goes back to the boat after 10 seconds.
   How it is done: almost all of it is CSS hung on the class "fsview" on the body; nothing is moved in the page, so upright is untouched
   and there is nothing to put back. The class goes on only when the SCREEN is on its side (not just the page: the Android keyboard
   shrinks the page), no more than 500 px high, steady for a second, and nothing is open (a sheet or a half-typed name stays as it is
   until closed). One file for all four tools. PROPOSAL-LANDSCAPE-VIEW-ONLY-2026-11-26.md. */
(function () {
  'use strict';
  var MQ = window.matchMedia ? window.matchMedia('(orientation: landscape) and (max-height: 500px)') : null; if (!MQ) return;
  var $ = function (id) { return document.getElementById(id); }, on = false, want0 = false, ui = null, folAt = 0, folWas = false, opened = { deck: false, helm: false }, hintAt = 0, lastTide = 0;
  function css() { if ($('fsViewCss')) return; var s = document.createElement('style'); s.id = 'fsViewCss'; s.textContent =
    /* the page: the chart, then the foot (the bar that is already there, with all but its figures put away) */
    'body.fsview #app{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr) auto!important}' +
    'body.fsview #app>.chart{grid-column:1!important;grid-row:1!important;min-width:0;min-height:0;display:block}' +
    'body.fsview #app>#bar{grid-column:1!important;grid-row:2!important}' +
    'body.fsview .top,body.fsview #panel,body.fsview .fswtab,body.fsview #navStrip,body.fsview #navPlot,body.fsview #fsPlot,body.fsview #tgPop,body.fsview #liveBox,body.fsview #liveBig,body.fsview #cbanner,body.fsview #readyChip,body.fsview .readychip,body.fsview .fsmodepill,body.fsview #boatWarn,body.fsview #lhPop,body.fsview .fabhelp,body.fsview .navgrip2,body.fsview #solRaceBtns,body.fsview #solLegs,body.fsview #solAfter,body.fsview #solChain,body.fsview #newData,body.fsview #momentBox,body.fsview #mkUtc,body.fsview .folchips{display:none!important}' +
    'body.fsview #bar{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:0 12px;align-items:center;padding:1px max(10px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 3px) max(10px,env(safe-area-inset-left,0px))!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;grid-template-rows:auto!important;grid-auto-rows:auto!important;position:relative!important;border-top:1px solid var(--line)}' +
    'body.fsview #bar .pgrp{display:contents!important}body.fsview #bar .pgrp>*:not(#mobBtn),body.fsview #bar #tzRow{display:none!important}' +
    'body.fsview #bar #trow{grid-column:1!important;grid-row:1!important;display:flex!important;align-items:center;height:20px;min-height:0;padding:0;margin:0;background:none}body.fsview #bar #trow>*:not(#time):not(#mobBtn){display:none!important}body.fsview #bar #trow #time{width:100%;height:20px;margin:0;opacity:.8}' +
    'body.fsview #bar #clock{grid-column:2!important;grid-row:1!important;display:block!important;font-size:11px!important;line-height:1.2;white-space:nowrap;text-align:right;padding:0;margin:0}body.fsview #bar #clock small{display:inline!important;margin-left:6px;font-size:10px}' +
    'body.fsview #bar #now{grid-row:2!important}body.fsview #bar #now2{grid-row:3!important}body.fsview #bar .now{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:0 6px!important;padding:1px 0 1px 40px!important;overflow:visible!important;position:relative;min-height:0;border:0}' +
    'body.fsview #bar .now[hidden]{display:none!important}body.fsview #bar .now:not(:has(>div)){display:none!important}' +
    /* twelve columns, the label over its figure: BOAT and PLAN line up column for column, and nothing is cut on a 667-wide phone; Mark, Start, Gun, Line and Burn take two */
    'body.fsview #bar .now>div{display:flex!important;flex-direction:column;align-items:flex-start;gap:0;width:auto!important;min-width:0;grid-column:auto!important;overflow:visible}body.fsview #bar .now>div.kvw{grid-column:span 2!important}body.fsview #bar .now span{font-size:9px!important;line-height:1.05;letter-spacing:.06em!important;white-space:nowrap}body.fsview #bar .now b{font-size:16px!important;line-height:1.05;white-space:nowrap;letter-spacing:-.01em}body.fsview #bar #now2 b{font-size:14px!important}' +
    'body.fsview #bar .now::before{transform:none!important;top:9px!important;left:0!important;width:auto!important;font-size:10px!important}' +
    '#fsvTide{display:none}body.fsview #bar #fsvTide{grid-column:1/-1!important;grid-row:4!important;display:flex;gap:0 16px;flex-wrap:wrap;white-space:nowrap;overflow:hidden;height:19px;align-items:baseline;font:400 11.5px var(--f-data,ui-monospace,monospace);color:var(--muted);padding:2px 0 0 0;border-top:1px solid var(--line);margin-top:1px}body.fsview #bar #fsvTide[hidden]{display:none}' +
    '#fsvTide span{flex:none;line-height:17px}#fsvTide i{font:700 10px/17px var(--f-data,monospace);font-style:normal;letter-spacing:.12em;color:#4CC38A;width:30px;flex:none}#fsvTide b{font:400 14px var(--f-data,monospace);color:var(--ink)}' +
    /* man overboard: always there, top left, whichever row of the bar it lives in */
    'body.fsview #bar #mobBtn{position:fixed!important;left:max(10px,env(safe-area-inset-left,0px))!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;bottom:auto!important;right:auto!important;z-index:24;width:44px!important;height:44px!important;min-height:0!important;margin:0!important;translate:none!important;display:inline-flex!important}' +
    'body.fsview #navPracTag{left:calc(max(10px,env(safe-area-inset-left,0px)) + 54px)!important;right:auto!important;top:calc(env(safe-area-inset-top,0px) + 13px)!important;bottom:auto!important;translate:none!important;transform:none!important;font-size:12px!important;padding:5px 12px!important;white-space:nowrap;z-index:24}body.fsview #navPracTag .pt-m,body.fsview #navPracTag .pt-l{display:none!important}body.fsview #navPracTag .pt-s{display:inline!important}' +
    /* Route's demo: its label and Stop stay, beside man overboard like the PRACTICE label; its commentary is for the upright screen */
    'body.fsview #fsDemo{left:calc(max(10px,env(safe-area-inset-left,0px)) + 54px)!important;right:auto!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;transform:none!important;width:auto!important;max-width:calc(100vw - 330px);padding:4px 8px!important;z-index:24}body.fsview #fsDemo>*:not(.dmhd){display:none!important}body.fsview #fsDemo .dmhd{gap:6px;margin:0}body.fsview #fsDemo .dmhd [data-d="again"]{display:none!important}body.fsview #fsDemo .dmhd .btn{min-height:34px!important;height:34px}' +
    /* the three things this screen adds: VIEW, help, and the line that says where the menus are */
    '.fsv{display:none}body.fsview .fsv{display:flex}body.fsview .fsv[hidden]{display:none}body.fsview.fsss .fsv,body.fsview:has(#mob:not([hidden])) .fsv,body.fsview:has(.sheet:not([hidden])) .fsv{display:none!important}' +
    '#fsvTop{position:fixed;z-index:75;right:max(10px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 8px);gap:8px;align-items:center}' +
    '#fsvTop button{height:44px;min-width:44px;border-radius:12px;border:1px solid var(--line,#2E4860);background:var(--panel,#182D40);color:var(--ink,#E2EBF0);font:600 13px var(--f-data,ui-monospace,monospace);padding:0 14px;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer}#fsvTop #fsvHelp{border-radius:50%;padding:0;font-size:18px}#fsvTop #fsvView i{font-style:normal;color:var(--muted);margin-left:6px}' +
    '#fsvHint{position:absolute;z-index:6;left:50%;transform:translateX(-50%);bottom:8px;height:28px;padding:0 14px;align-items:center;border-radius:14px;border:1px solid var(--line,#2E4860);background:var(--panel,#182D40);color:var(--muted,#9fb0c6);font:400 12px var(--f-body,system-ui);white-space:nowrap;pointer-events:none;opacity:1;transition:opacity .6s}#fsvHint.gone{opacity:0}' +
    /* the countdown box (Mark, and Route's start): it keeps its buttons, moved clear of VIEW and help */
    'body.fsview #solSeq{left:calc(max(10px,env(safe-area-inset-left,0px)) + 54px)!important;right:auto!important;transform:none!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;width:min(420px,calc(100vw - 270px))!important}body.fsview.mkfold #bar #clock,body.fsview.mkfold #bar #trow #time{display:none!important}body.fsview.mkfold #bar #trow{height:0!important}' +
    '#fsvRound{position:fixed;z-index:24;right:max(10px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 62px);height:44px;padding:0 16px;align-items:center;border-radius:12px;border:1px solid var(--line,#2E4860);background:var(--panel,#182D40);color:var(--ink,#E2EBF0);font:600 14px var(--f-body,system-ui);box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer}' +
    '#fsvCard{position:fixed;z-index:76;inset:0;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:14px}#fsvCard .in{background:var(--panel,#182D40);color:var(--ink,#E2EBF0);border:1px solid var(--line,#2E4860);border-radius:14px;max-width:560px;max-height:calc(100vh - 28px);overflow:auto;padding:12px 16px;font:400 14px/1.4 var(--f-body,system-ui)}#fsvCard h3{margin:0 0 6px;font:600 16px var(--f-head,var(--f-body,system-ui))}#fsvCard p{margin:0 0 8px}#fsvCard button{min-height:42px;padding:0 18px;border-radius:10px;border:1px solid var(--line,#2E4860);background:var(--route,#5B9BD5);color:#06121f;font:600 14px var(--f-body,system-ui)}' +
    /* a touch on the route still shows the plan at that point; the buttons in that box that change things are upright only */
    'body.fsview #tipBody button:not(#tipBack):not(#tipFwd):not(#tipNext){display:none!important}body.fsview #tipBody input,body.fsview #tipBody select,body.fsview #tipBody label,body.fsview #tipBody :has(>input),body.fsview #tipBody :has(>select){display:none!important}' +
    /* the box itself, squeezed together (Stuart 26 Nov 11:27, picture of a tablet on its side: names hard left, figures hard right, the whole width of the chart): a card between MOB and VIEW, two columns, each name beside its figure, and short enough to leave the chart in sight */
    'body.fsview #tip.docked{left:calc(max(10px,env(safe-area-inset-left,0px)) + 52px)!important;right:auto!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;width:min(560px,calc(100vw - 252px));max-width:none;max-height:calc(100% - 12px);overflow-y:auto;overscroll-behavior:contain;padding:4px 10px 6px;line-height:1.42}body.fsview #tip.docked #tipBody{columns:2 200px;column-gap:18px;column-rule:1px solid var(--line,#2E4860)}body.fsview #tip.docked #tipBody>*{break-inside:avoid}body.fsview #tip.docked .r{flex-wrap:wrap;gap:0 12px}body.fsview #tip.docked .r span:last-child{text-align:right;margin-left:auto}body.fsview #tip.docked .tipgrip{margin:-2px -10px 0}body.fsview #tip.docked .tipstep{margin:2px 0 4px}body.fsview #tip.docked .tipsec{margin:5px 0 1px;padding-top:4px}' +
    /* 20/20 on its side: the four figures across the whole width, two by two; which figures is chosen upright */
    'body.fsview.fsdeck #app{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr) auto!important}body.fsview.fsdeck #app>.chart,body.fsview.fsdeck #app>#panel{display:none!important}' +
    'body.fsview.fsdeck #deckNums{grid-column:1!important;grid-row:1!important;display:grid!important;grid-template-columns:1fr 1fr!important;grid-template-rows:0 0 minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important;border:0!important;padding:calc(env(safe-area-inset-top,0px) + 46px) max(8px,env(safe-area-inset-right,0px)) 6px max(8px,env(safe-area-inset-left,0px))!important}' +
    'body.fsview.fsdeck #deckNums .dkbar{display:none!important}body.fsview.fsdeck #deckNums .dkbox{pointer-events:none}body.fsview.fsdeck #deckNums .dkbox .dkv{font-size:clamp(28px,min(60cqh,25cqw),160px)!important}body.fsview.fsdeck #deckNums .dkbox .dkt{display:none}' +
    'body.fsview.fsdeck #bar{display:block!important;height:0!important;min-height:0!important;padding:0!important;border:0!important;overflow:visible}body.fsview.fsdeck #bar>*:not(.pgrp):not(#trow){display:none!important}body.fsview.fsdeck #bar #trow{height:0!important;overflow:visible}body.fsview.fsdeck #bar #trow #time{display:none!important}body.fsview.fsdeck #solTestBar,body.fsview.fsdeck #solSeq{display:none!important}' +
    /* HELM on its side: the figures only; its own man overboard and Red stay, the rest of its bar is upright only */
    'body.fsview #navHelm .nhseg,body.fsview #navHelm #nhX,body.fsview #fsHelm .fhseg,body.fsview #fsHelm #fhX{display:none!important}body.fsview #navHelm .nhbar,body.fsview #fsHelm .fhbar{padding-right:196px!important;min-height:44px}' +
    /* HELM before the start, on a screen this low: the countdown and the line figures sized to the height, so the Ping buttons stay on the screen */
    'body.fsview #navHelm .nhstart{margin-top:4px;padding:4px 8px}body.fsview #navHelm .nsclock b{font-size:clamp(40px,24vh,140px)!important}body.fsview #navHelm .nsrow{margin-top:2px}body.fsview #navHelm .nsrow b{font-size:clamp(18px,8vh,44px)!important}body.fsview #navHelm .nsrow .nshint span{font-size:11px!important}body.fsview #navHelm .nsfav{margin-top:2px;font-size:13px!important}body.fsview #navHelm .nsbtns{margin-top:4px}body.fsview #navHelm .nsbtns .nhbtn{min-height:34px!important;height:34px}';
    document.head.appendChild(s); }
  function vis(e) { return !!(e && !e.hidden && e.getClientRects().length); }
  /* is the SCREEN on its side, not just the page wider than tall? */
  function scrSide() { try { var o = screen.orientation && screen.orientation.type; if (o) return /^landscape/.test(o); } catch (e) {} if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90; return true; }
  /* something open that belongs to the working screen: it stays, and view only waits */
  var OPEN = '.sheet:not([hidden]), #help:not([hidden]), #layers:not([hidden]), #splash:not([hidden]), .solstep, #fsTour:not([hidden]), .dkpick:not([hidden]), #fsZoom:not([hidden]), #raceMenu:not([hidden]), #wiz:not([hidden]), #races:not([hidden]), #solList:not([hidden])';
  function sheetOpen() { var l = document.querySelectorAll(OPEN); for (var i = 0; i < l.length; i++) if (vis(l[i])) return true; return false; }
  function busy() { if (sheetOpen()) return true; var a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'range'); }   /* typing a name counts as open */
  function helmEl() { var a = $('navHelm'), b = $('fsHelm'); return vis(a) ? a : vis(b) ? b : null; }
  function deckOn() { try { return !!(window.FSDeck && window.FSDeck.on()); } catch (e) { return false; } }
  function view() { return helmEl() ? 'helm' : deckOn() ? 'deck' : 'chart'; }
  function helmOpen() { try { if (window.FSHelm && window.FSHelm.open) { window.FSHelm.open(); return; } } catch (e) {} var b = document.querySelector('.navhelmb'); if (b) b.click(); }
  function helmClose() { try { if (window.FSHelm && window.FSHelm.close) window.FSHelm.close(); } catch (e) {} var x = $('nhX'); if (x && helmEl()) x.click(); }
  function hasHelm() { return !!(window.FSHelm || document.querySelector('.navhelmb') || $('navHelm')); }
  function kick() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 300); }
  function setView(v) {
    if (v !== 'helm' && helmEl()) helmClose();
    if (v !== 'deck' && deckOn()) { try { window.FSDeck.set(false); } catch (e) {} }
    if (v === 'deck' && !deckOn()) { try { window.FSDeck.set(true); opened.deck = true; } catch (e) {} }
    if (v === 'helm' && !helmEl()) { helmOpen(); opened.helm = true; }
    setTimeout(paint, 60); kick();
  }
  function next() { var order = ['chart']; if (window.FSDeck) order.push('deck'); if (hasHelm()) order.push('helm'); var i = order.indexOf(view()); setView(order[(i + 1) % order.length]); }
  var NAMES = { chart: 'Chart', deck: '20/20', helm: 'HELM' };
  function build() {
    if (ui) return; ui = {};
    var top = document.createElement('div'); top.id = 'fsvTop'; top.className = 'fsv'; top.innerHTML = '<button type="button" id="fsvHelp" aria-label="What this screen does">?</button><button type="button" id="fsvView" aria-label="Change the view">VIEW<i></i></button>'; document.body.appendChild(top);
    var hint = document.createElement('div'); hint.id = 'fsvHint'; hint.className = 'fsv'; hint.setAttribute('role', 'status'); hint.textContent = 'Turn the phone upright to change anything'; (document.querySelector('.chart') || document.body).appendChild(hint);   /* at the foot of the chart, clear of everything at the top */
    var rd = document.createElement('button'); rd.type = 'button'; rd.id = 'fsvRound'; rd.className = 'fsv'; rd.hidden = true; rd.textContent = 'Rounded'; rd.title = 'Count this mark as rounded'; document.body.appendChild(rd);
    var card = document.createElement('div'); card.id = 'fsvCard'; card.className = 'fsv'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'On its side: watching');
    card.innerHTML = '<div class="in"><h3>Upright to work, on its side to watch</h3><p>On its side the phone shows what you need to watch: the chart or the start, your figures along the foot, and man overboard.</p><p><b>VIEW</b> steps between the chart, 20/20 and HELM. Move the line above the figures to look ahead along the plan. Touch the route for the plan at that point. Pinch to zoom; drag the chart and it goes back to the boat after 10 seconds.</p><p>To change anything else (the course, routes, layers, settings, which figures show), turn the phone upright: every menu is there.</p><button type="button" id="fsvCardX">OK</button></div>'; document.body.appendChild(card);
    var tide = document.createElement('div'); tide.id = 'fsvTide'; tide.hidden = true; tide.setAttribute('aria-label', 'Tide'); var bar = $('bar'); if (bar) bar.appendChild(tide);
    $('fsvView').addEventListener('click', function (e) { e.stopPropagation(); next(); });
    $('fsvHelp').addEventListener('click', function (e) { e.stopPropagation(); card.hidden = false; hintShow(); });
    card.addEventListener('click', function (e) { if (e.target === card || e.target.id === 'fsvCardX') card.hidden = true; });
    rd.addEventListener('click', function (e) { e.stopPropagation(); var b = $('mkSkip'); if (b) b.click(); setTimeout(paint, 200); });
    ui.top = top; ui.hint = hint; ui.round = rd; ui.card = card; ui.tide = tide;
  }
  function hintShow() { hintAt = Date.now(); if (ui) ui.hint.classList.remove('gone'); }
  function tideLine() {
    if (!ui || Date.now() - lastTide < 10000) return; lastTide = Date.now(); var h = '';
    try { var G = window.FSTideGate, r = G && G.work ? G.work() : null;
      if (r && !r.why && r.T1) {
        var td = window.__fsTideAt ? window.__fsTideAt(r.here.lat, r.here.lon, Date.now() / 1000) : null, hm = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
        h = '<i>TIDE</i>';
        if (td) { var sp = Math.hypot(td[0], td[1]), set = (Math.atan2(td[0], td[1]) * 180 / Math.PI + 360) % 360; h += '<span>here <b>' + sp.toFixed(1) + '</b> kn to <b>' + ('00' + Math.round(set)).slice(-3) + '°</b></span>'; }
        h += '<span>to next mark <b>' + r.T1.now + '</b></span>';
        if (r.T1.t) { h += '<span>turns ' + r.T1.to + ' <b>' + hm(r.T1.t) + '</b></span>'; if (r.margin != null && isFinite(r.margin)) { var m = Math.round(Math.abs(r.margin)), mm = m >= 60 ? Math.floor(m / 60) + ' h ' + ('0' + m % 60).slice(-2) : m + ' min'; h += '<span>you arrive <b>' + mm + '</b> ' + (r.margin >= 0 ? 'before' : 'after') + '</span>'; } }
        else h += '<span>no turn in the next 12 hours</span>';
      } } catch (e) { h = ''; }
    ui.tide.innerHTML = h; ui.tide.hidden = !h;
  }
  function paint() {
    if (!ui) return; var v = view(); var i = $('fsvView').querySelector('i'); if (i) i.textContent = NAMES[v] + ' ›';
    ui.round.hidden = !(v === 'chart' && $('mkSkip'));
    if (Date.now() - hintAt > 8000) ui.hint.classList.add('gone');
    if (v === 'chart') tideLine();
  }
  function enter() {
    if (on) return; if (!$('app') || !$('bar') || !$('now')) return;
    on = true; css(); build(); opened = { deck: false, helm: false }; document.body.classList.add('fsview'); ui.card.hidden = true; hintShow(); lastTide = 0;
    var f = $('followBtn'); folWas = !!(f && f.getAttribute('aria-pressed') === 'true'); folAt = 0; paint(); kick();
  }
  function leave() {
    if (!on) return; on = false;
    /* what this screen opened, it closes: upright comes back as it was left */
    if (opened.helm && helmEl()) helmClose(); if (opened.deck && deckOn()) { try { window.FSDeck.set(false); } catch (e) {} }
    document.body.classList.remove('fsview'); if (ui) ui.card.hidden = true; kick();
  }
  function beat() {
    var side = MQ.matches && scrSide(), want = side && (on ? !sheetOpen() : !busy());   /* a sheet that opens while this screen is up takes it down: the sheet needs the working screen's room */
    if (want !== on) { if (want === want0) { if (want) enter(); else leave(); } }   /* the same answer twice running, a second apart: a phone swinging on a lanyard does not flip the screen */
    want0 = want; if (!on) return;
    paint();
    /* the chart goes back to the boat 10 seconds after it was last dragged, if it was following when the phone was turned */
    if (folWas && folAt && Date.now() - folAt > 10000) { folAt = 0; var f = $('followBtn'); if (f && f.getAttribute('aria-pressed') === 'false') f.click(); }
  }
  document.addEventListener('pointerup', function (e) { if (!on) return; var c = document.querySelector('.chart'); if (c && c.contains(e.target)) folAt = Date.now(); }, true);
  if (MQ.addEventListener) MQ.addEventListener('change', function () { setTimeout(beat, 50); });
  function boot() { want0 = MQ.matches && scrSide() && !busy();   /* opened already on its side: no second's wait, straight to this screen */ beat(); if (window.FSBeat && window.FSBeat.set) window.FSBeat.set(beat, 1000); else setInterval(beat, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 300); }); else setTimeout(boot, 300);
  window.FSView = { on: function () { return on; }, view: view, set: setView };
})();
