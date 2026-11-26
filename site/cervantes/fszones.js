/* FirstShift: exclusion zones (Route, Route+, Mark and Mark+; one file).
   Stuart 26 Nov 2026 12:46: "a little tool which allows you on the chart to put in a no-go zone, which would basically be clicking
   points on the chart and making a sort of red line around an area, which means that you couldn't route through ... wind farms".
   Decided 12:53: the name is Exclusion zones (PredictWind and savvy navvy use it; "no-go zone" already means the sector too close
   to the wind); a mock-up first (approved 13:04); sharing by boat code in stage 2; ready-made wind farms with an on or off switch.
   Decided 13:05: the list sits in Chart layers and holds every keep-out switch; Settings keeps a line to the same list; one switch
   means drawn on the chart and kept out of by the routes; wind farms on by default.
   Stage 1 (this file): draw by tapping points round the area, name it, Always or This race only, on or off, kept on the device.
   The routes keep out through the router's own keep-out areas (app.js nogoRings; router.js tests each step exactly, route check 5b).
   Wind farm outlines: EMODnet Human Activities (CETMAR), CC-BY 4.0, zones/windfarms.json, in production or under construction.
   Not in stage 1: dragging one point (Redraw draws the outline again), sharing by boat code, a warning when the boat enters a zone.
   Planning aid, not for navigation. */
(function () {
  'use strict';
  var KEY = 'fs-zones', $ = function (id) { return document.getElementById(id); };
  var Z = load(), FARMS = null, FMETA = null, D = null, PX = null, PY = null, CSSD = 0;
  function load() { var o = null; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} o = o || {}; if (o.farms == null) o.farms = true; if (!Array.isArray(o.list)) o.list = []; return o; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(Z)); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); } catch (e) {} }
  function raceKey() { try { var c = window.__navCourse && window.__navCourse(); return c ? String(c.key || c.name || '') : ''; } catch (e) { return ''; } }
  function live(z) { return z.on && (z.when !== 'race' || !z.race || z.race === raceKey()); }   /* a "this race only" zone counts only in its own race */
  function tssOn() { var t = $('tssNogo'); return !!(t && t.checked); }
  function farmsLoad() { if (FARMS || farmsLoad.busy) return; farmsLoad.busy = 1;
    fetch('../zones/windfarms.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { farmsLoad.busy = 0; if (j && j.zones) { FARMS = j.zones.filter(function (z) { return z.poly && z.poly.length >= 3; }); FMETA = { built: j.built || '', credit: j.credit || '' }; redraw(); listPaint(); if (farmNearCourse()) routeAgain(true); } }).catch(function () { farmsLoad.busy = 0; }); }
  if (Z.farms) farmsLoad();   /* at once, so the outlines are in hand before the first routes are worked */

  /* routes worked before the outlines arrived are worked again only if a wind farm lies near this course */
  function farmNearCourse() { try { var c = window.__navCourse && window.__navCourse(); if (!c || !c.start || !FARMS) return false; var pts = [c.start].concat(c.marks || []).concat(c.finish ? [c.finish] : []), bx = { s: 90, n: -90, w: 180, e: -180 }; pts.forEach(function (p) { bx.s = Math.min(bx.s, p.lat); bx.n = Math.max(bx.n, p.lat); bx.w = Math.min(bx.w, p.lon); bx.e = Math.max(bx.e, p.lon); }); return FARMS.some(function (f) { return f.poly.some(function (q) { return q[0] > bx.s - 0.3 && q[0] < bx.n + 0.3 && q[1] > bx.w - 0.5 && q[1] < bx.e + 0.5; }); }); } catch (e) { return false; } }
  /* ---- for the router and the course check ---- */
  function inRing(r, la, lo) { var c = false; for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var a = r[i], b = r[j]; if ((a[0] > la) !== (b[0] > la) && lo < (b[1] - a[1]) * (la - a[0]) / (b[0] - a[0]) + a[1]) c = !c; } return c; }
  function near(poly, bx) { if (!bx) return true; return poly.some(function (q) { return q[0] > bx.s - 1.5 && q[0] < bx.n + 1.5 && q[1] > bx.w - 2 && q[1] < bx.e + 2; }); }
  function rings(bx) { var out = []; Z.list.forEach(function (z) { if (live(z) && z.poly.length >= 3) out.push(z.poly); }); if (Z.farms && FARMS) FARMS.forEach(function (f) { if (near(f.poly, bx)) out.push(f.poly); }); return out; }
  function inside(la, lo) { var hit = null; Z.list.some(function (z) { if (live(z) && z.poly.length >= 3 && inRing(z.poly, la, lo)) { hit = z.name; return true; } return false; }); if (!hit && Z.farms && FARMS) FARMS.some(function (f) { if (inRing(f.poly, la, lo)) { hit = f.name + ' wind farm'; return true; } return false; }); return hit; }
  function count() { return Z.list.filter(live).length + (Z.farms ? 1 : 0) + (tssOn() ? 1 : 0); }
  var RT = 0; function routeAgain(quiet) { clearTimeout(RT); RT = setTimeout(function () { try { var c = window.__navCourse && window.__navCourse(); if (!c) return; if (window.__fsSetupRender) window.__fsSetupRender(); if (window.__fsRouteNow && window.__fsHasRoutes && window.__fsHasRoutes()) { if (!quiet) toast('Exclusion zones changed: routing again.'); window.__fsRouteNow(); } } catch (e) {} }, 900); }

  /* ---- on the chart ---- */
  function centre(poly) { var la = 0, lo = 0; poly.forEach(function (q) { la += q[0]; lo += q[1]; }); return [la / poly.length, lo / poly.length]; }
  function draw(ctx, X, Y, vb, pat, css, ringOn, zoom) {
    PX = X; PY = Y; var red = css['--shoaledge'] || '#B0302A';
    var path = function (poly) { ctx.beginPath(); poly.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.closePath(); };
    var label = function (txt, poly) { var c = centre(poly), x = X(c[1]), y = Y(c[0]); ctx.font = '700 11px Inter, system-ui, sans-serif'; var w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(8,20,36,.82)'; ctx.fillRect(x - w / 2 - 5, y - 9, w + 10, 17); ctx.fillStyle = '#F2B5AE'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y + 4); ctx.textAlign = 'left'; };
    if (Z.farms && FARMS) FARMS.forEach(function (f) { if (!ringOn(f.poly, vb)) return; path(f.poly); ctx.globalAlpha = 0.6; ctx.fillStyle = pat; ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = red; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1; if (zoom > 500) label(f.name, f.poly); });
    Z.list.forEach(function (z) { if (!live(z) || z.poly.length < 3 || (D && D.id === z.id) || !ringOn(z.poly, vb)) return; path(z.poly); ctx.fillStyle = pat; ctx.fill(); ctx.strokeStyle = red; ctx.lineWidth = 2.2; ctx.stroke(); label(z.name, z.poly); });
    if (D && D.pts.length) { ctx.save(); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.beginPath(); D.pts.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.stroke(); ctx.setLineDash([2, 5]); ctx.globalAlpha = 0.6; if (D.pts.length > 2) { ctx.beginPath(); ctx.moveTo(X(D.pts[D.pts.length - 1][1]), Y(D.pts[D.pts.length - 1][0])); ctx.lineTo(X(D.pts[0][1]), Y(D.pts[0][0])); ctx.stroke(); } ctx.globalAlpha = 1; ctx.setLineDash([]);
      D.pts.forEach(function (q, i) { var x = X(q[1]), y = Y(q[0]); ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fillStyle = i ? '#EF4444' : '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = i ? '#fff' : '#EF4444'; ctx.stroke(); ctx.fillStyle = i ? '#fff' : '#B91C1C'; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x, y + 4); ctx.textAlign = 'left'; }); ctx.restore(); }
  }

  /* ---- drawing: tap the points round the area ---- */
  function css() { if (CSSD) return; CSSD = 1; var st = document.createElement('style');
    st.textContent = '.fzbar{position:fixed;z-index:40;left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));max-width:520px;margin:0 auto;box-sizing:border-box;padding:12px;border-radius:14px;background:var(--panel,#0f2740);border:2px solid #EF4444;box-shadow:0 8px 24px rgba(0,0,0,.45);color:var(--ink,#fff)}.fzbar[hidden]{display:none}.fzbar b{display:block;font-size:15px}.fzbar span{display:block;font-size:13px;color:var(--muted,#9aa);margin:2px 0 10px}.fzbar .r{display:flex;gap:8px}.fzbar .btn{flex:1;min-height:46px;font-weight:700}' +
      '.fzcard{position:fixed;z-index:41;left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 10px);max-width:520px;margin:0 auto;box-sizing:border-box;padding:14px;border-radius:16px;background:var(--panel,#0f2740);border:1px solid var(--line,#27425f);box-shadow:0 10px 30px rgba(0,0,0,.5);color:var(--ink,#fff);display:flex;flex-direction:column;gap:10px}.fzcard[hidden]{display:none}.fzcard h2{margin:0;font-size:17px}.fzcard .row{display:flex;align-items:center;gap:10px}.fzcard .row>label,.fzcard .row>span.k{flex:0 0 92px;font-size:13px;color:var(--muted,#9aa)}.fzcard input[type=text]{flex:1;min-width:0;min-height:44px;border-radius:10px;border:1px solid var(--line,#27425f);background:var(--bg,#081a2e);color:var(--ink,#fff);padding:0 10px;font:inherit;font-size:16px}.fzcard .seg{flex:1;display:flex}.fzcard .seg button{flex:1;min-height:44px;border:1px solid var(--line,#27425f);background:none;color:var(--ink,#fff);font:inherit;font-weight:600}.fzcard .seg button:first-child{border-radius:10px 0 0 10px}.fzcard .seg button:last-child{border-radius:0 10px 10px 0;margin-left:-1px}.fzcard .seg button[aria-pressed=true]{background:var(--brand,#3574BA);color:#fff}.fzcard .r{display:flex;gap:8px}.fzcard .r .btn{flex:1;min-height:48px;font-weight:700}.fzcard .del.arm{background:#B91C1C;color:#fff}' +
      '.fzsw{flex:none;width:58px;height:32px;border-radius:999px;border:0;background:#475569;position:relative;cursor:pointer;padding:0}.fzsw::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;transition:left .12s}.fzsw[aria-checked=true]{background:#22c55e}.fzsw[aria-checked=true]::after{left:29px}.fzsw[disabled]{opacity:.55;cursor:default}' +
      '#fzList .fzh{margin:16px 0 8px;font-size:12px;letter-spacing:.08em;color:var(--muted,#9aa);text-transform:uppercase}#fzList .fzi{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line,#27425f);border-radius:12px;margin-bottom:8px}#fzList .fzi .t{flex:1;min-width:0;background:none;border:0;color:inherit;font:inherit;text-align:left;padding:0;cursor:pointer}#fzList .fzi b{display:block;font-size:15px}#fzList .fzi i{display:block;font-style:normal;font-size:12.5px;color:var(--muted,#9aa);margin-top:2px}#fzList .fzdraw{width:100%;min-height:50px;font-weight:700;margin-top:6px}#fzList .note{font-size:12.5px;color:var(--muted,#9aa)}.fzrow{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:42px;padding:6px 10px;margin:6px 0;border:1px solid var(--line,#27425f);border-radius:10px;background:none;color:var(--ink,#fff);font:inherit;cursor:pointer;box-sizing:border-box}.fzrow b{font-weight:600}.fzrow i{font-style:normal;color:var(--muted,#9aa);font-size:12.5px}';
    document.head.appendChild(st); }
  function bar() { css(); var b = $('fzBar'); if (!b) { b = document.createElement('div'); b.id = 'fzBar'; b.className = 'fzbar'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Draw an exclusion zone'); document.body.appendChild(b);
      b.addEventListener('click', function (e) { var t = e.target.closest('[data-fz]'); if (!t || !D) return; e.stopPropagation(); var k = t.dataset.fz; if (k === 'undo') { D.pts.pop(); barPaint(); redraw(); } else if (k === 'cancel') { D = null; b.hidden = true; redraw(); } else if (k === 'done') closeShape(); }); }
    return b; }
  function barPaint() { var b = bar(); if (!D) { b.hidden = true; return; } var n = D.pts.length, pn = $('panel'), pr = pn && !pn.hidden && pn.getClientRects().length ? pn.getBoundingClientRect() : null, low = pr && pr.top > innerHeight * 0.35 && pr.width > innerWidth * 0.8 ? innerHeight - pr.top + 8 : 10;   /* above the folded panel on a phone, as in the mock-up; the chart above it stays free for the taps */
    b.style.bottom = 'calc(env(safe-area-inset-bottom,0px) + ' + Math.round(low) + 'px)'; b.style.top = 'auto';
    b.innerHTML = '<b>Exclusion zone: tap the points round the area</b><span>' + (n ? n + ' point' + (n === 1 ? '' : 's') + ' so far. ' + (n >= 3 ? 'Tap point 1 again, or Done, to close it.' : 'At least three are needed.') : 'Tap the chart for the first point. Move and zoom the chart as usual.') + '</span><div class="r"><button class="btn" type="button" data-fz="undo"' + (n ? '' : ' disabled') + '>Undo</button><button class="btn primary" type="button" data-fz="done"' + (n >= 3 ? '' : ' disabled') + '>Done</button><button class="btn" type="button" data-fz="cancel">Cancel</button></div>';
    b.hidden = false; }
  function start(id) { var z = id ? Z.list.filter(function (q) { return q.id === id; })[0] : null; D = { id: z ? z.id : null, pts: [] }; listOpen(false); cardOpen(null); ['layers', 'sheet'].forEach(function (i) { var e = $(i); if (e && !e.hidden) { var x = e.querySelector('.close'); if (x) x.click(); } }); try { if (innerWidth <= 700 && window.__fsPanelClose) window.__fsPanelClose(); } catch (x) {}   /* a phone: the panel folds so the chart is there to tap */ barPaint(); setTimeout(barPaint, 150); redraw(); }
  function tap(la, lo, x, y) { if (!D) return false; if (D.pts.length >= 3 && PX && PY && x != null) { var f = D.pts[0]; if (Math.hypot(PX(f[1]) - x, PY(f[0]) - y) < 24) { closeShape(); return true; } }
    D.pts.push([+la.toFixed(5), +lo.toFixed(5)]); barPaint(); redraw(); return true; }
  function closeShape() { if (!D || D.pts.length < 3) return; var pts = D.pts, id = D.id; D = null; $('fzBar').hidden = true;
    var z = id ? Z.list.filter(function (q) { return q.id === id; })[0] : null;
    if (z) { z.poly = pts; save(); redraw(); routeAgain(); cardOpen(z); } else cardOpen({ id: null, name: 'Zone ' + (Z.list.length + 1), poly: pts, on: true, when: 'always' }); redraw(); }

  /* ---- the card: name, Always or This race only, on or off ---- */
  var E = null;
  function cardOpen(z) { css(); var c = $('fzCard'); if (!z) { if (c) c.hidden = true; E = null; redraw(); return; }
    if (!c) { c = document.createElement('div'); c.id = 'fzCard'; c.className = 'fzcard'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Exclusion zone'); document.body.appendChild(c);
      c.addEventListener('click', function (e) { var t = e.target.closest('[data-fz]'); if (!t || !E) return; e.stopPropagation(); var k = t.dataset.fz;
        if (k === 'cancel') { cardOpen(null); return; }
        if (k === 'always' || k === 'race') { E.when = k; cardPaint(); }
        else if (k === 'on') { E.on = !E.on; cardPaint(); }
        else if (k === 'redraw') { keep(); var id = E.id; cardOpen(null); if (id) start(id); }
        else if (k === 'del') { if (!(E.arm && Date.now() - E.arm < 4000)) { E.arm = Date.now(); cardPaint(); setTimeout(function () { if (E) cardPaint(); }, 4100); return; } var id2 = E.id; Z.list = Z.list.filter(function (q) { return q.id !== id2; }); save(); cardOpen(null); listPaint(); routeAgain(); toast('Exclusion zone deleted.'); }
        else if (k === 'save') { keep(); cardOpen(null); listPaint(); routeAgain(); toast('Exclusion zone saved. The routes keep out of it.'); } }); }
    E = { id: z.id, name: z.name, poly: z.poly, on: z.on !== false, when: z.when === 'race' ? 'race' : 'always', arm: 0 }; c.hidden = false; cardPaint(); redraw(); }
  function keep() { if (!E) return; var n = $('fzName'), name = (n && n.value.trim()) || E.name || 'Zone'; var z = E.id ? Z.list.filter(function (q) { return q.id === E.id; })[0] : null;
    if (!z) { z = { id: 'z' + Date.now().toString(36) }; Z.list.push(z); E.id = z.id; } z.name = name.slice(0, 40); z.poly = E.poly; z.on = !!E.on; z.when = E.when; z.race = E.when === 'race' ? raceKey() : ''; save(); }
  function cardPaint() { var c = $('fzCard'); if (!c || !E) return; var n = $('fzName'), nv = n ? n.value : E.name, arm = E.arm && Date.now() - E.arm < 4000;
    c.innerHTML = '<h2>Exclusion zone</h2><div class="row"><label for="fzName">Name</label><input type="text" id="fzName" maxlength="40" value="' + esc(nv) + '" autocomplete="off"></div>' +
      '<div class="row"><span class="k">Applies</span><div class="seg" role="group" aria-label="When the zone applies"><button type="button" data-fz="always" aria-pressed="' + (E.when === 'always') + '">Always</button><button type="button" data-fz="race" aria-pressed="' + (E.when === 'race') + '">This race only</button></div></div>' +
      '<div class="row"><span class="k">Routes keep out</span><button type="button" class="fzsw" role="switch" data-fz="on" aria-checked="' + !!E.on + '" aria-label="Routes keep out of this zone"></button><span style="font-size:13px;color:var(--muted,#9aa)">' + (E.on ? 'On: drawn and kept out of' : 'Off: not drawn, routes may cross') + '</span></div>' +
      '<div class="r"><button class="btn" type="button" data-fz="redraw">Redraw</button>' + (E.id ? '<button class="btn del' + (arm ? ' arm' : '') + '" type="button" data-fz="del">' + (arm ? 'Tap again' : 'Delete') + '</button>' : '<button class="btn" type="button" data-fz="cancel">Cancel</button>') + '<button class="btn primary" type="button" data-fz="save">Save</button></div>'; }

  /* ---- the list: every keep-out switch in one place ---- */
  function listOpen(on) { css(); var s = $('fzList'); if (!on) { if (s) s.hidden = true; return; }
    if (!s) { s = document.createElement('div'); s.id = 'fzList'; s.className = 'sheet'; s.hidden = true; document.body.appendChild(s);
      s.addEventListener('click', function (e) { if (e.target === s) { s.hidden = true; return; } var t = e.target.closest('[data-fz]'); if (!t) return; var k = t.dataset.fz, id = t.dataset.id;
        if (k === 'x') s.hidden = true;
        else if (k === 'farms') { Z.farms = !Z.farms; save(); if (Z.farms) farmsLoad(); listPaint(); redraw(); routeAgain(); }
        else if (k === 'tss') { var on2 = !tssOn(); try { if (window.__fsTssSet) window.__fsTssSet(on2); } catch (x) {} listPaint(); redraw(); routeAgain(); }
        else if (k === 'zon') { var z = Z.list.filter(function (q) { return q.id === id; })[0]; if (z) { z.on = !z.on; save(); listPaint(); redraw(); routeAgain(); } }
        else if (k === 'edit') { var z2 = Z.list.filter(function (q) { return q.id === id; })[0]; if (z2) { s.hidden = true; cardOpen(z2); } }
        else if (k === 'draw') start(null); }); }
    s.hidden = false; if (Z.farms) farmsLoad(); listPaint(); }
  function listPaint() { var s = $('fzList'); if (!s || s.hidden) return; var rk = raceKey(), obs = 0; try { obs = window.__fsRaceObs ? window.__fsRaceObs() : 0; } catch (e) {}
    var sw = function (k, on, id, dis, lab) { return '<button type="button" class="fzsw" role="switch" data-fz="' + k + '"' + (id ? ' data-id="' + id + '"' : '') + ' aria-checked="' + !!on + '" aria-label="' + esc(lab) + '"' + (dis ? ' disabled' : '') + '></button>'; };
    var h = '<div class="in" role="dialog" aria-label="Exclusion zones"><div class="shead"><h2>Exclusion zones</h2><button class="close" data-fz="x" aria-label="Close">×</button></div><div class="sbody">' +
      '<p class="note">Areas the routes keep out of. Switch one off to let routes through without deleting it. On: drawn on the chart and kept out of. Off: neither.</p>' +
      '<div class="fzh">Ready-made</div>' +
      '<div class="fzi"><div class="t"><b>Wind farms</b><i>In production or being built' + (FARMS ? ' · ' + FARMS.length + ' outlines' : Z.farms ? ' · loading' : '') + ' · EMODnet' + (FMETA && FMETA.built ? ', fetched ' + esc(String(FMETA.built).slice(0, 10)) : '') + '</i></div>' + sw('farms', Z.farms, '', false, 'Wind farms') + '</div>' +
      '<div class="fzi"><div class="t"><b>Traffic separation lanes and zones</b><i>As most sailing instructions require</i></div>' + sw('tss', tssOn(), '', false, 'Traffic separation lanes and zones') + '</div>' +
      '<div class="fzi"><div class="t"><b>This race\'s keep-out areas</b><i>From the sailing instructions · ' + (obs ? obs + ' in this race · ' : 'none in this race · ') + 'always on</i></div>' + sw('race', true, '', true, 'This race\'s keep-out areas') + '</div>' +
      '<div class="fzh">Your zones</div>' +
      (Z.list.length ? Z.list.map(function (z) { var other = z.when === 'race' && z.race && z.race !== rk; return '<div class="fzi"><button type="button" class="t" data-fz="edit" data-id="' + z.id + '"><b>' + esc(z.name) + '</b><i>' + (z.when === 'race' ? 'This race only' + (other ? ' (another race: not in use now)' : '') : 'Always') + ' · ' + z.poly.length + ' points · tap to change</i></button>' + sw('zon', z.on, z.id, false, z.name) + '</div>'; }).join('') : '<p class="note">None yet.</p>') +
      '<button class="btn primary fzdraw" type="button" data-fz="draw">Draw an exclusion zone</button>' +
      '<p class="note">Planning aid, not for navigation. A zone keeps the route out of an area; it does not replace the chart, notices to mariners or the sailing instructions.</p>' +
      '<p class="note">Wind farm outlines: EMODnet Human Activities (CETMAR), CC-BY 4.0. Traffic separation: OpenStreetMap, Shom and Rijkswaterstaat.</p></div></div>';
    s.innerHTML = h; }

  window.__fsZoneTap = tap;
  window.FSZones = { rings: rings, inside: inside, draw: draw, count: count, open: function () { listOpen(true); }, drawing: function () { return !!D; }, state: function () { return JSON.parse(JSON.stringify(Z)); }, farms: function () { return FARMS ? FARMS.length : 0; },
    rowHtml: function () { return '<button type="button" class="fzrow" id="fzLayersRow"><b>Exclusion zones</b><i>' + count() + ' on ›</i></button>'; } };
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('#fzLayersRow, #fzSettingsRow'); if (!t) return; e.preventDefault(); css(); listOpen(true); });
  css();
})();
