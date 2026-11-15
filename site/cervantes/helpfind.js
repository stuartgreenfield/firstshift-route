/* FirstShift Route and Navigate: find your way round Help (Stuart 15 Nov 2026, 17:59: "a search and topic list at the beginning of the
   help area"; 20:45: search "Both ways" (as you type, and a Search button), "Grouped chips", "Folded, tap to open").
   At the top of Help: a search box with a Search button, then every topic as a chip, in groups. Topics start folded to their heading;
   a tap opens one. Typing keeps only the topics that match every word, opens them and marks the words. Works offline: it searches the
   text already in Help. Covers Route's topics, Route's "New in Route" topics and Navigate's own. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var GROUPS = [
    ['Getting started', /try it|tour|getting|set-up|setting up|first|race$|^race\b|start and|the start|my races|boat code/i],
    ['Racing', /racing|live gps|plotter|mob|deck|start line|solent|catch|follow|fleet|log\b|dead reckoning|while/i],
    ['Forecasts and routing', /forecast|model|routing|route|wind|tide|sea state|wave|ensemble|isochron|keep-out|tss/i],
    ['Chart and marks', /chart|mark|depth|zoom|layer|waypoint|measur|ais|screen|night|clear/i],
    ['Boat and polars', /boat|polar|sail|crossover|tuning|speed|heel/i],
    ['Instruments', /data source|instrument|gateway|nmea|link|wi-?fi|starlink|zeus|alarm/i]
  ];
  function groupOf(t) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(t)) return i; return GROUPS.length; }
  function topics() { return [].slice.call(document.querySelectorAll('#help .htopic')); }
  function title(d) { var h = d.querySelector('h3'); return h && h.firstChild ? String(h.firstChild.textContent).trim() : ''; }
  function css() {
    if ($('hfCss')) return; var s = document.createElement('style'); s.id = 'hfCss';
    s.textContent = '.hfbar{position:sticky;top:0;z-index:2;background:var(--panel,#fff);padding:8px 0 6px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--line,#ccc)}' +
      '.hfrow{display:flex;gap:8px}.hfrow input{flex:1;min-width:0;min-height:42px;font-size:16px;padding:0 10px;border-radius:9px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--ink,#000)}' +
      '.hfchips{display:flex;flex-direction:column;gap:6px;max-height:34vh;overflow:auto}.hfg b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#667);margin:2px 0}' +
      '.hfg div{display:flex;flex-wrap:wrap;gap:6px}.hfchip{min-height:32px;padding:0 10px;border-radius:16px;border:1px solid var(--line,#ccc);background:none;color:var(--ink,#000);font-size:13px;cursor:pointer}' +
      '.hfnote{font-size:12px;color:var(--muted,#667)}#help .htopic.hffold>:not(h3){display:none}#help .htopic.hffold h3{cursor:pointer}#help .htopic h3::before{content:"\\25B8  ";color:var(--muted,#667)}#help .htopic:not(.hffold) h3::before{content:"\\25BE  "}' +
      '#help .htopic.hfout{display:none}#help mark.hfq{background:#fde68a;color:#111;border-radius:2px}#help .navhelph.hfout{display:none}';
    document.head.appendChild(s);
  }
  function fold(d, f) { d.classList.toggle('hffold', f); if (!f) { var im = d.querySelector('img[data-pic]'); if (im && window.__navHelpPics) try { window.__navHelpPics(); } catch (e) {} } }
  function unmark() { [].forEach.call(document.querySelectorAll('#help mark.hfq'), function (m) { var t = document.createTextNode(m.textContent); m.parentNode.replaceChild(t, m); t.parentNode.normalize(); }); }
  function mark(d, words) {
    var w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return n.parentNode && /^(BUTTON|SCRIPT|STYLE|MARK)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), ns = [], n;
    while ((n = w.nextNode())) ns.push(n);
    var re = new RegExp('(' + words.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    ns.forEach(function (t) { if (!re.test(t.nodeValue)) return; re.lastIndex = 0; var f = document.createDocumentFragment(), s = t.nodeValue, i = 0, m;
      while ((m = re.exec(s))) { f.appendChild(document.createTextNode(s.slice(i, m.index))); var k = document.createElement('mark'); k.className = 'hfq'; k.textContent = m[0]; f.appendChild(k); i = m.index + m[0].length; }
      f.appendChild(document.createTextNode(s.slice(i))); t.parentNode.replaceChild(f, t); });
  }
  function search(q) {
    unmark(); var words = String(q || '').toLowerCase().split(/\s+/).filter(function (x) { return x.length > 1; }), n = 0, all = topics();
    all.forEach(function (d) { if (!words.length) { d.classList.remove('hfout'); fold(d, true); return; } var t = d.textContent.toLowerCase(), hit = words.every(function (w) { return t.indexOf(w) >= 0; }); d.classList.toggle('hfout', !hit); if (hit) { n++; fold(d, false); mark(d, words); } });
    [].forEach.call(document.querySelectorAll('#help .navhelph'), function (h) { h.classList.toggle('hfout', words.length > 0); });
    var nt = $('hfNote'); if (nt) nt.textContent = !words.length ? 'Tap a topic to open it, or search.' : n ? n + ' topic' + (n === 1 ? '' : 's') + ' mention ' + q.trim() + '.' : 'No topic mentions ' + q.trim() + '. Try fewer or other words.';
    $('hfChips').hidden = words.length > 0;
    return n;
  }
  function chips() {
    var gs = GROUPS.map(function (g) { return { name: g[0], items: [] }; }).concat([{ name: 'Settings and more', items: [] }]);
    topics().forEach(function (d, i) { var t = title(d); if (!t) return; d.dataset.hfi = i; gs[groupOf(t + ' ' + (d.dataset.k || ''))].items.push([i, t]); });
    return gs.filter(function (g) { return g.items.length; }).map(function (g) { return '<div class="hfg"><b>' + g.name + '</b><div>' + g.items.map(function (x) { return '<button class="hfchip" type="button" data-hf="' + x[0] + '">' + x[1].replace(/</g, '&lt;') + '</button>'; }).join('') + '</div></div>'; }).join('');
  }
  function build() {
    var help = $('help'), body = help && help.querySelector('.sbody'); if (!body || !topics().length) return;
    css();
    var bar = $('hfBar'); if (!bar) { bar = document.createElement('div'); bar.id = 'hfBar'; bar.className = 'hfbar'; body.insertBefore(bar, body.firstChild);
      bar.innerHTML = '<div class="hfrow"><input type="search" id="hfQ" placeholder="Search Help, for example polar, tide, MOB" aria-label="Search Help" enterkeyhint="search"><button class="btn primary" type="button" id="hfGo">Search</button></div><p class="hfnote" id="hfNote">Tap a topic to open it, or search.</p><div class="hfchips" id="hfChips"></div>';
      $('hfQ').addEventListener('input', function () { search(this.value); });
      $('hfQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(this.value); this.blur(); } });
      $('hfGo').onclick = function () { search($('hfQ').value); $('hfQ').blur(); };
      bar.addEventListener('click', function (e) { var c = e.target.closest('[data-hf]'); if (!c) return; var d = document.querySelector('#help .htopic[data-hfi="' + c.dataset.hf + '"]'); if (!d) return; $('hfQ').value = ''; search(''); fold(d, false); d.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      help.addEventListener('click', function (e) { var h = e.target.closest('.htopic > h3'); if (!h || e.target.closest('button')) return; fold(h.parentNode, !h.parentNode.classList.contains('hffold')); });
    }
    topics().forEach(function (d) { if (!d.dataset.hfSeen) { d.dataset.hfSeen = '1'; fold(d, true); } });
    $('hfChips').innerHTML = chips();
  }
  /* Help is filled when it is first opened (and Navigate adds its own topics): build or refresh each time it opens */
  function watch() { var h = $('help'); if (!h) return setTimeout(watch, 500); new MutationObserver(function () { if (!h.hidden) setTimeout(build, 60); }).observe(h, { attributes: true, attributeFilter: ['hidden'] }); if (!h.hidden) build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window.FSHelpFind = { build: build, search: search, topics: function () { return topics().map(title); } };
})();
