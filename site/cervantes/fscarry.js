/* Carry on where you left off (Stuart 25 Nov 2026 16:40; answers 16:5x): a button at the top of each tool's opening screen, shown only when
   there is something to carry on. One file for all four tools. The opening screen still shows (button only, no skipping). The tap does what
   Set up a race does without the set-up, keeps the routes, chart view and Live GPS as they were, and does not ask "Start a new race or boat?". */
(function () {
  'use strict';
  var page = location.pathname.replace(/\/+$/, '').split('/').pop() || 'x', KEY = 'fs-carry-' + page, DAYS = 7;
  var $ = function (id) { return document.getElementById(id); };
  function get() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && o.name && Date.now() - o.at < DAYS * 864e5 ? o : null; } catch (e) { return null; } }
  function note() {   /* what is open now, kept every few seconds while the chart is in use */
    var sp = $('splash'); if (sp && !sp.hidden) return;
    var c = null; try { c = window.__navCourse && window.__navCourse(); } catch (e) {}
    if (!c || !c.name) return;
    try { localStorage.setItem(KEY, JSON.stringify({ name: c.name, at: Date.now() })); } catch (e) {}
  }
  function ago(ms) { var m = Math.round(ms / 60000); if (m < 2) return 'a moment ago'; if (m < 60) return m + ' minutes ago'; var h = Math.round(m / 60); if (h < 2) return 'an hour ago'; if (h < 24) return h + ' hours ago'; var d = Math.round(h / 24); return d < 2 ? 'yesterday' : d + ' days ago'; }
  function hm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function quiet() {   /* no "Start a new race or boat?" after carrying on */
    var n = 0, t = setInterval(function () { var b = $('sessBox'); if (b && !b.hidden) b.hidden = true; if (++n > 120) clearInterval(t); }, 250);
  }
  function build() {
    var tour = $('spTour'), o = get(); if (!tour || !o || $('spCarry')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'spCarry'; b.className = 'sp-carry';
    b.innerHTML = '<b>Carry on where you left off</b><i>' + esc(o.name) + ', left ' + ago(Date.now() - o.at) + ' at ' + hm(o.at) + '</i>';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      try { sessionStorage.setItem('fs-wiz', ''); } catch (x) {}
      quiet();
      var n = $('spTourNo'); if (n) n.click();
      var sp = $('splash'); if (sp && !sp.hidden) { sp.classList.add('out'); setTimeout(function () { sp.hidden = true; }, 550); }
    });
    var film = $('spFilm'), at = film && film.parentNode ? film : tour.firstChild; (at && at.parentNode ? at.parentNode : tour).insertBefore(b, at && at.parentNode ? at : null);   /* first and largest: above the film */
    var f1 = $('spFirst'); if (f1) f1.hidden = true;   /* not a first time */
  }
  var css = document.createElement('style');
  css.textContent = '.splash .sp-carry{display:grid;gap:2px;width:100%;text-align:left;background:#3574BA;border:1px solid #6FA3DD;border-radius:10px;padding:9px 12px;color:#fff;cursor:pointer;min-height:52px;font-style:normal}.splash .sp-carry b{font:600 15.5px/1.25 var(--f-body,Inter,system-ui,sans-serif);color:#fff}.splash .sp-carry i{font:400 12px/1.3 var(--f-body,Inter,system-ui,sans-serif);font-style:normal;color:#DCE9F7}';
  (document.head || document.documentElement).appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  setInterval(note, 5000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) note(); });
  window.addEventListener('pagehide', note);
  window.FSCarry = { get: get, note: note };
})();
