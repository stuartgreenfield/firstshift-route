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
  /* Opening screen style D for all four tools (Stuart 25 Nov 17:4x: "D across all products with the different taglines of course";
     same photo for all four; the website and email line kept, small, at the foot). One filled button (Carry on, or the new-race button when
     there is nothing to carry on), one outlined button, then rows for the film, practice and the tour. The tick list and the first-time line
     go (the first-time hint lives in race set-up). Nothing here changes what any button does: the same buttons are moved and restyled. */
  function D() {
    var sp = $('splash'), tx = sp && sp.querySelector('.sp-txt'); if (!tx || sp.classList.contains('sp-style-d')) return;
    sp.classList.add('sp-style-d');
    var mark = !!window.FS_MARK, nm = (document.querySelector('.sp-txt h1') || {}).textContent || '';
    nm = nm.replace(/[.™\s]+$/g, '').replace(/\.$/, '') || (mark ? 'Mark' : 'Route');
    var lg = sp.querySelector('.sp-logo'); if (lg) { lg.classList.add('sp-logo-top'); sp.appendChild(lg); }
    var acts = document.createElement('div'); acts.className = 'sp-acts';
    var rows = document.createElement('div'); rows.className = 'sp-rows';
    var c = $('spCarry'), no = $('spTourNo'), film = $('spFilm'), tr = $('spTry'), ty = $('spTourYes');
    if (c) acts.appendChild(c);
    if (no) { no.classList.add('sp-new'); if (!c) no.classList.add('sp-pri'); var nb = no.querySelector('b'); if (nb) nb.textContent = mark ? 'Set up today’s race' : 'Plan a new race'; acts.appendChild(no); }
    function row(el, ic, t, sub) { if (!el) return; el.classList.add('sp-row'); el.innerHTML = '<span class="sp-ic" aria-hidden="true">' + ic + '</span><span class="sp-rt"><b>' + t + '</b><i>' + sub + '</i></span><span class="sp-chev" aria-hidden="true">›</span>'; rows.appendChild(el); }
    row(film, '▶', 'Watch the 2-minute film', 'How to use ' + nm + ', with sound');
    row(tr, '◎', 'Practice race', 'Nothing is sent anywhere');
    row(ty, '→', 'Show me round', 'A quick tour of the screen');
    var go = tx.querySelector('.sp-go'), ml = $('spMail'), tm = $('spTerms');
    tx.insertBefore(acts, tm || null); tx.insertBefore(rows, tm || null); if (go) tx.insertBefore(go, tm || null); if (ml) tx.insertBefore(ml, tm || null);
    var t0 = $('spTour'); if (t0) t0.classList.add('sp-empty');
  }
  var css = document.createElement('style');
  css.textContent = '.splash .sp-carry{display:grid;gap:2px;width:100%;text-align:left;background:#3574BA;border:1px solid #6FA3DD;border-radius:10px;padding:9px 12px;color:#fff;cursor:pointer;min-height:52px;font-style:normal}.splash .sp-carry b{font:600 15.5px/1.25 var(--f-body,Inter,system-ui,sans-serif);color:#fff}.splash .sp-carry i{font:400 12px/1.3 var(--f-body,Inter,system-ui,sans-serif);font-style:normal;color:#DCE9F7}';
  css.textContent += [
    '.splash.sp-style-d .sp-list,.splash.sp-style-d #spFirst,.splash.sp-style-d .sp-tour.sp-empty{display:none!important}',
    '.splash.sp-style-d .sp-logo-top{position:absolute;z-index:2;top:calc(env(safe-area-inset-top,0px) + 22px);left:max(22px,env(safe-area-inset-left,0px));height:30px;width:auto}',
    '.splash.sp-style-d .sp-txt{gap:0;width:100%;box-sizing:border-box}',
    '.splash.sp-style-d .sp-txt h1{margin-bottom:2px}',
    '.splash.sp-style-d .sp-lead{font:400 17px/1.35 var(--f-body,Inter,system-ui,sans-serif);opacity:.92;margin:6px 0 18px}',
    '.splash.sp-style-d .sp-acts{display:grid;gap:10px;margin-bottom:14px}',
    '.splash.sp-style-d .sp-carry,.splash.sp-style-d .sp-new{display:grid;gap:2px;width:100%;text-align:left;border-radius:14px;padding:14px 18px;min-height:58px;cursor:pointer;color:#fff;font-style:normal}',
    '.splash.sp-style-d .sp-carry{background:#3574BA;border:1px solid #3574BA}.splash.sp-style-d .sp-carry b{font:600 17px/1.25 var(--f-body,Inter,system-ui,sans-serif)}.splash.sp-style-d .sp-carry i{font:400 13px/1.3 var(--f-body,Inter,system-ui,sans-serif);color:#DCE9F7;font-style:normal}',
    '.splash.sp-style-d .sp-new{background:transparent!important;border:1px solid rgba(255,255,255,.3)!important;align-content:center}.splash.sp-style-d .sp-new b{font:600 16px/1.25 var(--f-body,Inter,system-ui,sans-serif);color:#fff}.splash.sp-style-d .sp-new i{display:none}',
    '.splash.sp-style-d .sp-new.sp-pri{background:#3574BA!important;border-color:#3574BA!important}',
    '.splash.sp-style-d .sp-rows{display:grid;border-top:1px solid rgba(255,255,255,.14);margin-bottom:16px}',
    '.splash.sp-style-d .sp-row{display:flex!important;align-items:center;gap:14px;width:100%;min-height:58px;padding:10px 2px!important;margin:0!important;background:none!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.14)!important;border-radius:0!important;color:#fff!important;text-align:left;text-decoration:none!important;cursor:pointer;font:inherit}',
    '.splash.sp-style-d .sp-ic{flex:none;width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.08);display:grid;place-items:center;font:600 12px var(--f-body,Inter,system-ui,sans-serif);color:#fff}',
    '.splash.sp-style-d .sp-rt{flex:1;display:grid;gap:1px;min-width:0}.splash.sp-style-d .sp-rt b{font:600 15.5px/1.25 var(--f-body,Inter,system-ui,sans-serif);color:#fff}.splash.sp-style-d .sp-rt i{font:400 12.5px/1.3 var(--f-body,Inter,system-ui,sans-serif);font-style:normal;color:#9AB0C6}',
    '.splash.sp-style-d .sp-chev{flex:none;font-size:24px;line-height:1;color:#9AB0C6}',
    '.splash.sp-style-d .sp-go{display:block!important;border:0!important;padding:0!important;font:600 10.5px var(--f-data,monospace)!important;letter-spacing:.14em!important;color:#6F8AA6!important;text-transform:uppercase}',
    '.splash.sp-style-d .sp-mail{display:block!important;margin-top:8px;font:400 11px var(--f-data,monospace);letter-spacing:.04em;color:#6F8AA6;order:0}',
    '.splash.sp-style-d.terms .sp-acts,.splash.sp-style-d.terms .sp-rows,.splash.sp-style-d.terms .sp-mail{display:none!important}',
    '@media (orientation:portrait){.splash.sp-style-d .sp-img{bottom:46%}.splash.sp-style-d .sp-shade{background:linear-gradient(180deg,rgba(2,22,48,.12) 0,rgba(2,22,48,.25) 30%,#021630 56%,#021630 100%)}}',
    '@media (orientation:landscape) and (max-height:500px){.splash.sp-style-d .sp-txt{grid-template-columns:1fr!important}.splash.sp-style-d .sp-txt>*{grid-column:1/-1!important}.splash.sp-style-d .sp-lead{margin:2px 0 8px;font-size:13px}.splash.sp-style-d .sp-carry,.splash.sp-style-d .sp-new{min-height:44px;padding:8px 14px}.splash.sp-style-d .sp-acts{grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.splash.sp-style-d .sp-row{min-height:42px;padding:6px 2px!important}.splash.sp-style-d .sp-logo-top{height:24px;top:calc(env(safe-area-inset-top,0px) + 12px)}}'
  ].join('');
  (document.head || document.documentElement).appendChild(css);
  function filmRow() { var f = $('spFilm'), b = f && f.querySelector('.sp-rt b'), i = f && f.querySelector('.sp-rt i'); if (!b) return; b.textContent = 'Watch the 2-minute film'; var m = /how to use (.+)$/.exec(f.getAttribute('aria-label') || ''); if (m && i) i.textContent = 'How to use ' + m[1] + ', with sound'; }   /* the film's own wiring names the tool after D has run */
  function boot() { build(); D(); setTimeout(filmRow, 60); setTimeout(filmRow, 800); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setInterval(note, 5000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) note(); });
  window.addEventListener('pagehide', note);
  window.FSCarry = { get: get, note: note };
})();
