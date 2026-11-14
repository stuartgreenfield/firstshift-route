/* FirstShift Route: Settings laid out as tabs only (Stuart 13 Nov 2026: "that menu needs a redesign to make it easier
   to understand"; chosen: tabs only, a search box, and a plain-English line for each part).
   Tabs: Boat, Forecasts, Course, Sails, Display, Charts (14 Nov 2026), My set-up. Nothing sits above the tabs.
   My set-up holds My defaults and named set-ups, Ready for offline, panel positions and the clear-screen timing.
   The search box finds a setting by name in any tab, opens that tab and shows the setting. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var SUM = {
    boat: 'Your boat: its type, rating or polar, and how hard you are sailing today. Route works out boat speed from this.',
    fc: 'Which weather and tide models are used, how much is downloaded, and how old each forecast is.',
    course: 'The race, its marks and keep-out areas, the safety depth, and what Route does while you race.',
    sails: 'Your sails and reefs, the wind each is for, and the crossover chart.',
    display: 'What the chart shows: wind and tide symbols, AIS, replay speed and data sources.',
    charts: 'Where the chart comes from, how to change what it shows, and why it is not for navigation.',
    mine: 'Save the way you like Route, keep this race ready for no signal, and arrange the screen.'
  };
  var NAME = { boat: 'Boat', fc: 'Forecasts', course: 'Course', sails: 'Sails', display: 'Display', charts: 'Charts', mine: 'My set-up' };
  function tabOf(el) { var b = el && el.closest('.sbody'); return b && b.id ? b.id.replace(/^s-/, '') : null; }
  function open(tab) { var t = document.querySelector('.stabs .tab[data-s="' + tab + '"]'); if (t) t.click(); }

  /* ---- the two new tabs ---- */
  var placed = false;
  function place() {
    var mine = $('s-mine'); if (!mine) return false;
    var pr = $('navPrefs'), off = $('navOff');
    if (!pr || !off) return false;
    if (pr.parentNode !== mine) mine.appendChild(pr);
    if (off.parentNode !== mine) mine.appendChild(off);
    pr.open = true; off.open = true;
    placed = true; return true;
  }
  /* ---- a plain-English line at the top of each tab ---- */
  function sums() {
    Object.keys(SUM).forEach(function (k) { var b = $('s-' + k); if (!b || b.querySelector(':scope > .tabsum')) return; var p = document.createElement('p'); p.className = 'tabsum'; p.textContent = SUM[k]; b.insertBefore(p, b.firstChild); });
  }
  /* ---- search ---- */
  var IDX = [];
  function index() {
    IDX = [];
    [].forEach.call(document.querySelectorAll('#sheet .sbody'), function (b) {
      var tab = tabOf(b); if (!tab || !NAME[tab]) return;
      [].forEach.call(b.querySelectorAll('h3, h4, label, summary b, .navchk span, button.btn, .tabsum'), function (e) {
        var t = (e.childNodes.length && e.tagName === 'LABEL' ? [].map.call(e.childNodes, function (n) { return n.nodeType === 3 ? n.textContent : (n.tagName === 'SPAN' || n.tagName === 'B' ? n.textContent : ''); }).join(' ') : e.textContent).replace(/\s+/g, ' ').trim();
        if (t.length < 3 || t.length > 120) return; IDX.push({ t: t, tab: tab, el: e });
      });
    });
  }
  var SYN = { depth: ['shallow'], tide: ['stream', 'current'], wind: ['tws', 'twa', 'breeze'], gps: ['position'], ais: ['ships', 'traffic', 'cpa'], night: ['red', 'dark'], polar: ['target', 'speed'], offline: ['signal', 'download'] };
  function terms(q) { var w = q.toLowerCase().split(/\s+/).filter(Boolean), out = []; w.forEach(function (x) { out.push([x].concat(Object.keys(SYN).filter(function (k) { return SYN[k].indexOf(x) >= 0; }))); }); return out; }
  function find(q) {
    if (!q || q.trim().length < 2) return [];
    index(); var T = terms(q), seen = {}, res = [];
    IDX.forEach(function (r) { var l = r.t.toLowerCase(); if (!T.every(function (alts) { return alts.some(function (a) { return l.indexOf(a) >= 0; }); })) return; var k = r.tab + '|' + r.t; if (seen[k]) return; seen[k] = 1;
      var sc = T.reduce(function (a, alts) { return a + (l.indexOf(alts[0]) >= 0 ? 3 : 1); }, 0) - (r.el.classList.contains('tabsum') ? 2 : 0) + (/^(LABEL|H3|H4)$/.test(r.el.tagName) ? 1 : 0) - r.t.length / 200;   /* the word typed beats a related word; a setting beats a description */
      res.push({ t: r.t, tab: r.tab, el: r.el, sc: sc }); });
    res.sort(function (a, b) { return b.sc - a.sc; });
    return res.slice(0, 12);
  }
  function go(r) {
    open(r.tab); var d = r.el.closest('details'); if (d) d.open = true;
    setTimeout(function () { try { r.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { r.el.scrollIntoView(); } var row = r.el.closest('.row, label, .navchk, h3, h4') || r.el; row.classList.add('sethit'); setTimeout(function () { row.classList.remove('sethit'); }, 2500); }, 80);
  }
  function searchBuild() {
    var tabs = document.querySelector('#sheet .stabs'); if (!tabs || $('setFind')) return !!$('setFind');
    var w = document.createElement('div'); w.className = 'setfind';
    w.innerHTML = '<input id="setFind" type="search" placeholder="Find a setting: tide, alarm, depth…" aria-label="Find a setting" autocomplete="off"><div id="setFindRes" class="setfindres" hidden role="listbox"></div>';
    tabs.parentNode.insertBefore(w, tabs);
    var inp = $('setFind'), out = $('setFindRes'), cur = [];
    inp.addEventListener('input', function () {
      cur = find(inp.value);
      if (!inp.value.trim()) { out.hidden = true; return; }
      out.innerHTML = cur.length ? cur.map(function (r, i) { return '<button type="button" role="option" data-i="' + i + '"><b>' + esc(r.t) + '</b><span>' + NAME[r.tab] + '</span></button>'; }).join('') : '<p class="note">Nothing called that. Try another word, or look through the tabs.</p>';
      out.hidden = false;
    });
    out.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; var r = cur[+b.dataset.i]; out.hidden = true; inp.value = ''; go(r); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && cur[0]) { out.hidden = true; var r = cur[0]; inp.value = ''; go(r); } if (e.key === 'Escape') { out.hidden = true; inp.value = ''; } });
    return true;
  }
  var n = 0, t = setInterval(function () { var a = place(), b = searchBuild(); sums(); if ((a && b) || ++n > 80) clearInterval(t); }, 400);
  window.NavSet = { open: open, find: function (q) { return find(q).map(function (r) { return { t: r.t, tab: r.tab }; }); }, go: function (q) { var r = find(q)[0]; if (r) go(r); return !!r; } };
})();
