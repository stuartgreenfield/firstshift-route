/* FirstShift Route and Navigate: tracks (job N, Stuart 15 Nov 2026). "File this track button (saves the trail as a log, GPX export,
   clears it from the chart) and a Hide all tracks switch." 20:45: filed tracks kept "A list on the phone". Chosen overnight while
   Stuart was away (his other three questions still open, docs/N-TRACKS-QUESTIONS-2026-11-15.md): Live GPS keeps running with a
   fresh trail; Hide all tracks is a switch in Layers; in Navigate a filed track goes into this same list, the log is untouched. */
(function () {
  'use strict';
  var KEY = 'fs-tracks', MAX = 30, PTS = 2000, SHOWN = {};
  function $(id) { return document.getElementById(id); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(a) { while (true) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { if (a.length <= 1) return false; a.pop(); } } }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 4000); } }
  function nm(a, b) { var R = 3440.065, la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180, dl = (b[0] - a[0]) * Math.PI / 180, dn = (b[1] - a[1]) * Math.PI / 180; var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); }
  function dist(p) { var d = 0; for (var i = 1; i < p.length; i++) d += nm(p[i - 1], p[i]); return d; }
  function thin(p) { if (p.length <= PTS) return p; var k = p.length / PTS, o = []; for (var i = 0; i < PTS - 1; i++) o.push(p[Math.floor(i * k)]); o.push(p[p.length - 1]); return o; }
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function when(t) { var d = new Date(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function gpx(t) {
    var x = function (s) { return esc(s); };
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FirstShift" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>' + x(t.name || 'Track') + '</name><desc>' + x(when(t.at) + ', ' + t.nm.toFixed(1) + ' nm') + '</desc><trkseg>\n' +
      t.pts.map(function (q) { return '<trkpt lat="' + q[0].toFixed(5) + '" lon="' + q[1].toFixed(5) + '"><time>' + new Date(q[2]).toISOString() + '</time>' + (q[3] != null ? '<extensions><sog>' + q[3] + '</sog></extensions>' : '') + '</trkpt>'; }).join('\n') + '\n</trkseg></trk>\n</gpx>\n';
  }
  function fileName(t) { var d = new Date(t.at); return 'firstshift-track-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2) + '.gpx'; }
  function saveGpx(t) {
    var g = gpx(t), n = fileName(t);
    if (window.NativeLink && window.NativeLink.saveText) { window.NativeLink.saveText(n, g); toast('Choose where to save ' + n + '.'); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([g], { type: 'application/gpx+xml' })); a.download = n; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Saved ' + n);
  }
  /* File track: keep it, offer the GPX, the caller clears the trail */
  function file(trail, name) {
    var p = (trail || []).filter(function (q) { return q && isFinite(q[0]) && isFinite(q[1]); });
    if (p.length < 2) { toast('Nothing to file yet: the trail has fewer than two points.'); return false; }
    var t = { id: 't' + Date.now(), name: name || 'Track', at: p[0][2] || Date.now(), end: p[p.length - 1][2] || Date.now(), nm: +dist(p).toFixed(2), pts: thin(p) };
    var a = load(); a.unshift(t); if (a.length > MAX) a.length = MAX;
    if (!save(a)) { toast('No room on this device to keep the track: save it as GPX instead.'); saveGpx(t); return false; }
    list(); card(t); return true;
  }
  function card(t) {
    var c = $('trkCard'); if (!c) { c = document.createElement('div'); c.id = 'trkCard'; c.className = 'trkcard'; c.setAttribute('role', 'status'); (document.querySelector('.app>.chart') || document.body).appendChild(c); }
    c.innerHTML = '<button class="close" type="button" aria-label="Close">×</button><b>Track filed</b><span>' + esc(t.name) + ' · ' + when(t.at) + ' · ' + t.nm.toFixed(1) + ' nm. A fresh trail has started.</span><div class="xrow"><button class="btn primary" type="button" data-k="gpx">Save GPX</button><button class="btn" type="button" data-k="show">Show on chart</button></div>';
    c.hidden = false; c.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.classList.contains('close')) c.hidden = true; else if (b.dataset.k === 'gpx') saveGpx(t); else { SHOWN[t.id] = true; c.hidden = true; redraw(); list(); } };
    clearTimeout(c.__t); c.__t = setTimeout(function () { c.hidden = true; }, 20000);
  }
  var armed = null;
  function list() {
    var el = $('trkList'); if (!el) return; var a = load();
    if (!a.length) { el.innerHTML = '<p class="note">No tracks filed yet. Use File track in the GPS window.</p>'; return; }
    el.innerHTML = a.map(function (t) { return '<div class="trkrow" data-id="' + t.id + '"><label><input type="checkbox" data-k="show"' + (SHOWN[t.id] ? ' checked' : '') + '> <b>' + esc(t.name) + '</b></label><span>' + when(t.at) + ' · ' + t.nm.toFixed(1) + ' nm</span><span class="trkb"><button class="btn" type="button" data-k="gpx">GPX</button><button class="btn" type="button" data-k="del">' + (armed === t.id ? 'Tap again to delete' : 'Delete') + '</button></span></div>'; }).join('');
  }
  function onList(e) {
    var row = e.target.closest('.trkrow'), k = e.target.dataset.k; if (!row || !k) return; var id = row.dataset.id, a = load(), t = a.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    if (k === 'show') { SHOWN[id] = e.target.checked; redraw(); return; }
    if (k === 'gpx') { saveGpx(t); return; }
    if (k === 'del') { if (armed !== id) { armed = id; list(); setTimeout(function () { if (armed === id) { armed = null; list(); } }, 4000); return; } armed = null; save(a.filter(function (x) { return x.id !== id; })); delete SHOWN[id]; list(); redraw(); toast('Track deleted.'); }
  }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); else window.dispatchEvent(new Event('resize')); } catch (e) {} }
  /* filed tracks the crew chose to show, purple, under everything else; hidden with the other tracks by Tracks in Layers */
  function overlay(ctx, X, Y) {
    if (window.__fsShowTracks && !window.__fsShowTracks()) return; var ids = Object.keys(SHOWN).filter(function (k) { return SHOWN[k]; }); if (!ids.length) return;
    load().forEach(function (t) { if (!SHOWN[t.id] || t.pts.length < 2) return; ctx.strokeStyle = document.documentElement.hasAttribute('data-night') ? '#7A1E40' : '#A855F7'; ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath(); t.pts.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.stroke(); var e = t.pts[t.pts.length - 1]; ctx.globalAlpha = 1; ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px Inter, sans-serif'; ctx.fillText(t.name + ' ' + new Date(t.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), X(e[1]) + 6, Y(e[0]) - 6); });
  }
  function css() { if ($('trkCss')) return; var s = document.createElement('style'); s.id = 'trkCss'; s.textContent = '.trkcard{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);z-index:7;max-width:min(calc(100% - 24px),380px);background:var(--panel);color:var(--ink);border:1px solid #A855F7;border-radius:10px;padding:8px 32px 8px 12px;display:flex;flex-direction:column;gap:4px;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.3)}.trkcard[hidden]{display:none}.trkcard .close{position:absolute;right:6px;top:4px}.trklist{display:flex;flex-direction:column;gap:6px;margin:4px 0}.trkrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:6px 8px;border:1px solid var(--line);border-radius:8px}.trkrow span{font-size:12px;color:var(--muted)}.trkrow .trkb{margin-left:auto;display:flex;gap:6px}'; document.head.appendChild(s); }
  function init() { css(); list(); var el = $('trkList'); if (el && !el.__on) { el.__on = 1; el.addEventListener('click', function (e) { if (e.target.dataset.k && e.target.dataset.k !== 'show') onList(e); }); el.addEventListener('change', onList); } }
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  window.FSTracks = { file: file, list: load, show: function (id, on) { SHOWN[id] = on !== false; redraw(); list(); }, gpx: gpx, refresh: list };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
