/* FirstShift Route and Navigate: Solent race marks and the Solent race builder (Stuart 15 Nov 2026, job J).
   Stuart, 08:24: "add this to both tools route and navigate with an on off button in settings under charts so when racing in Solent it
   can be used. Have a racing in Solent button in charts which creates a Solent racing drop down that gives a build a Solent race tool
   that allows you to pick a start line point of mark on the chart then build the course using the marks inc port and starboard also give
   option for a windward leeward course with a windward mark either a buoy or a compass heading and distance. Once built the course can be
   routed as normal giving all relevant data as the normal routing software a box allowing min depth should also be relevant."
   08:26: "the Solent race took can use mark downloads or build on screen of course once the Solent marks have been switched on".
   The marks: JOG / SCRA "Solent Area Mark Codes 2026" (list dated 23 February 2026), in ../courses/solent-marks.json. */
(function () {
  'use strict';
  var R = Math.PI / 180, KEY = 'fs-solent', BKEY = 'fs-solent-b';
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function INK() { var r = document.documentElement, cs = getComputedStyle(r); var v = (cs.getPropertyValue('--ink') || '').trim(); return v || '#0f172a'; }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var C = ld(KEY, { on: false }), MK = null, BY = {}, SRC = null, NOTE = null, last = null, pick = null;
  var B = ld(BKEY, null) || { type: 'marks', name: 'Solent race', start: null, marks: [], fin: 'start', finish: null, wl: { wkind: 'brg', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'start', lcode: '', side: 'port' } };
  function saveB() { sv(BKEY, B); }
  function redraw() { try { if (window.__fsRedraw) window.__fsRedraw(); } catch (e) {} }
  function toast(t) { try { if (window.NavToast) return window.NavToast(t); } catch (e) {} var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 4000); } }

  /* ---- the marks ---- */
  function load() {
    if (MK || load.p) return load.p || Promise.resolve(MK);
    load.p = fetch('../courses/solent-marks.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      MK = d.marks; SRC = d.source; NOTE = d.note; BY = {}; MK.forEach(function (m) { BY[m.id] = m; }); load.p = null; redraw(); return MK;
    }).catch(function () { load.p = null; return null; });
    return load.p;
  }
  function mark(code) { return BY[String(code || '').trim().toUpperCase()] || null; }
  var COLS = { Y: ['#facc15'], R: ['#dc2626'], G: ['#16a34a'], B: ['#111827'], RW: ['#dc2626', '#ffffff'], BY: ['#111827', '#facc15'], YB: ['#facc15', '#111827'], BYB: ['#111827', '#facc15', '#111827'], YBY: ['#facc15', '#111827', '#facc15'] };
  var COLN = { Y: 'yellow', R: 'red', G: 'green', B: 'black', RW: 'red and white', BY: 'black over yellow (north cardinal)', YB: 'yellow over black (south cardinal)', BYB: 'black, yellow, black (east cardinal)', YBY: 'yellow, black, yellow (west cardinal)' };
  function flagText(f) { return f === 'pass' ? 'For passing and keeping boats out of the channel, not for ordinary rounding.' : f === 'consent' ? 'Only with prior consent of KHM, sought in weekday office hours.' : f === 'sunday' ? 'Sundays: SBSC only, except Cowes Week.' : ''; }
  function dot(ctx, x, y, r, col) {
    var c = COLS[col] || ['#facc15'], n = c.length;
    for (var i = 0; i < n; i++) { ctx.beginPath(); ctx.fillStyle = c[i]; ctx.rect(x - r, y - r + 2 * r * i / n, 2 * r, 2 * r / n + 0.5); ctx.save(); ctx.clip(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.stroke();
  }
  function overlay(ctx, X, Y, editing) {
    last = { X: X, Y: Y };
    if (!C.on && !pick && !builderOpen()) return; if (!MK) { load(); return; }
    var pxnm = Math.abs(Y(50.8) - Y(50.8 + 1 / 60)); if (pxnm < 1.2) return;
    var r = pxnm > 40 ? 6 : pxnm > 12 ? 5 : 3.5, code = pxnm > 9, name = pxnm > 45, used = usedCodes();
    ctx.font = (pxnm > 25 ? '600 12px ' : '600 11px ') + 'system-ui, sans-serif'; ctx.textBaseline = 'middle';
    var oncourse = {}; try { var cc = window.__navCourse && window.__navCourse(); if (cc) [cc.start].concat(cc.marks || []).concat([cc.finish]).forEach(function (q) { var k = /^(?:Start, |Finish, )?(\d[0-9A-Z]) /.exec((q && q.name) || ''); if (k) oncourse[k[1]] = 1; }); } catch (e) {}
    MK.forEach(function (m) {
      var x = X(m.lon), y = Y(m.lat); dot(ctx, x, y, used[m.id] ? r + 2 : r, m.col);
      if (oncourse[m.id] && !used[m.id]) return;   /* the course already labels its own marks */
      if (used[m.id]) { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); }
      if (!code) return; var t = m.id + (name ? ' ' + m.name : '');
      ctx.fillStyle = INK(); ctx.fillText(t, x + r + 3, y);   /* plain text, no halo (Stuart 15 Nov 17:52): white on the dark screen, dark on the light one, red at night */
    });
    if (builderOpen() || pick) drawPlan(ctx, X, Y);
  }
  function usedCodes() { var u = {}; if (!builderOpen() && !pick) return u; (B.marks || []).forEach(function (m) { if (m.code) u[m.code] = 1; }); if (B.start && B.start.code) u[B.start.code] = 1; if (B.wl.wcode) u[B.wl.wcode.toUpperCase()] = 1; return u; }
  function drawPlan(ctx, X, Y) {
    var c = build(true); if (!c || !c.start) return; var p = [c.start].concat(c.marks).concat(c.finish ? [c.finish] : []);
    ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); ctx.setLineDash([]);
    if (pick === 'chain') { ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'middle'; c.marks.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x - 12, y - 12, 9, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x - 12, y - 12); ctx.textAlign = 'left'; }); }   /* numbered while building on the map */
    var s = c.start; ctx.beginPath(); ctx.moveTo(X(s.lon) - 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon) + 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon), Y(s.lat) + 6); ctx.closePath(); ctx.fillStyle = '#2563eb'; ctx.fill();
  }
  function hit(x, y) {
    if (!MK || !last) return null; var best = null, bd = 22;
    MK.forEach(function (m) { var d = Math.hypot(last.X(m.lon) - x, last.Y(m.lat) - y); if (d < bd) { bd = d; best = m; } });
    return best;
  }
  function showMark(m) {
    var p = $('solPop'); if (!p) { p = document.createElement('div'); p.id = 'solPop'; p.className = 'solpop'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    p.innerHTML = '<button class="close" aria-label="Close">×</button><b>' + esc(m.id) + ' ' + esc(m.name) + '</b><span>' + esc(COLN[m.col] || m.col) + ' · ' + m.zone + '</span><span>' + ddm(m.lat, 'N', 'S') + ' ' + ddm(m.lon, 'E', 'W') + '</span>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '') + '<span class="soln">JOG / SCRA Solent mark list 2026</span>';
    p.hidden = false; p.querySelector('.close').onclick = function () { p.hidden = true; };
    clearTimeout(showMark.t); showMark.t = setTimeout(function () { p.hidden = true; }, 9000);
  }
  function ddm(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), mn = (a - d) * 60; return (d < 10 && pos === 'E' ? '00' : d < 100 && pos === 'E' ? '0' : '') + d + '° ' + mn.toFixed(2) + "' " + (v >= 0 ? pos : neg); }
  function tapHook(la, lo, x, y, editing) {
    if (pick === 'chain') { var mc = hit(x, y); if (mc) sidePop(mc, x, y); else toast('Tap one of the Solent buoys.'); return true; }
    if (pick) { var m = hit(x, y); pickDone(m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }); return true; }
    if (editing || !C.on) return false;
    var m2 = hit(x, y); if (m2) { showMark(m2); return true; }
    return false;
  }

  /* ---- building the course ---- */
  function toPt(m, side) { var o = { name: m.code ? m.code + ' ' + (BY[m.code] ? BY[m.code].name : '') : m.name, lat: m.lat, lon: m.lon }; if (side) o.side = side; return o; }
  function fromCode(code, side) { var m = mark(code); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side || 'port' } : null; }
  function offset(p, brg, nm) { return { lat: p.lat + nm * Math.cos(brg * R) / 60, lon: p.lon + nm * Math.sin(brg * R) / (60 * Math.cos(p.lat * R)) }; }
  function windward() {
    var w = B.wl; if (w.wkind === 'buoy') { var m = mark(w.wcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; }
    if (!B.start || !(w.brg >= 0 && w.brg <= 360) || !(w.dist > 0)) return null; var q = offset(B.start, w.brg, w.dist); return { code: null, name: 'Windward mark, ' + ('00' + Math.round(w.brg)).slice(-3) + '°T ' + w.dist + ' nm', lat: q.lat, lon: q.lon };
  }
  function leeward() { var w = B.wl; if (w.lkind === 'buoy') { var m = mark(w.lcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; } return B.start ? { code: B.start.code, name: 'Leeward mark (start line)', lat: B.start.lat, lon: B.start.lon } : null; }
  function build(soft) {
    if (!B.start) return soft ? null : { err: 'Choose the start: tap Start, then a mark or a point on the chart.' };
    var marks = [], fin;
    if (B.type === 'wl') {
      var W = windward(), L = leeward(); if (!W) return soft ? { start: B.start, marks: [] } : { err: B.wl.wkind === 'buoy' ? 'Type the code of the windward buoy (for example 3G).' : 'Give the windward mark a compass heading (0 to 360°T) and a distance in nm, or use the forecast wind.' };
      if (!L) return soft ? null : { err: 'Type the code of the leeward buoy.' };
      var n = Math.max(1, Math.min(6, Math.round(B.wl.laps || 1)));
      for (var i = 0; i < n; i++) { marks.push(toPt(W, B.wl.side)); if (i < n - 1) marks.push(toPt(L, B.wl.side)); }
      fin = toPt(L); fin.name = 'Finish, ' + L.name;
    } else {
      marks = (B.marks || []).map(function (m) { return toPt(m, m.side || 'port'); });
      if (!marks.length && !soft) return { err: 'Add at least one mark: type the codes from the course board, or tap Add mark and then the mark on the chart.' };
      fin = B.fin === 'mark' && B.finish ? toPt(B.finish) : toPt(B.start); fin.name = 'Finish, ' + (B.fin === 'mark' && B.finish ? B.finish.name : 'start line');
    }
    var st = toPt(B.start); st.name = 'Start, ' + B.start.name;
    return { name: (B.name || 'Solent race').slice(0, 60), start: st, marks: marks, finish: fin };
  }
  /* the course board: codes with p or s (or red/green), e.g. "3G p, 4F s, 2B" (port when not given) */
  function parseBoard(t) {
    var out = [], bad = [];
    String(t || '').toUpperCase().replace(/[,;\/]+/g, ' ').split(/\s+/).filter(Boolean).forEach(function (tok, i, all) {
      if (/^(P|S|PORT|STBD|STARBOARD|RED|GREEN|R|G|\(P\)|\(S\))$/.test(tok)) { var lastM = out[out.length - 1]; if (lastM) lastM.side = /^(S|STBD|STARBOARD|GREEN|G|\(S\))$/.test(tok) ? 'starboard' : 'port'; return; }
      var m = /^(\d[0-9A-Z])[-(.:]?(P|S)?\)?[.:]?$/.exec(tok); if (!m) return;   /* a pasted VHF, SMS or WhatsApp message: words are passed over, only mark codes count */
      var k = fromCode(m[1], m[2] === 'S' ? 'starboard' : 'port'); if (k) out.push(k); else bad.push(m[1]);
    });
    return { marks: out, bad: bad };
  }

  /* ---- the builder sheet ---- */
  function builderOpen() { var s = $('solSheet'); return !!(s && !s.hidden); }
  function css() {
    if ($('solCss')) return; var st = document.createElement('style'); st.id = 'solCss';
    st.textContent = '.solpop{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:60;max-width:min(92vw,360px);background:var(--bg,#fff);color:var(--ink,#0f172a);border:1px solid var(--line,#cbd5e1);border-radius:12px;padding:10px 34px 10px 12px;box-shadow:0 4px 18px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:2px;font-size:13px}.solpop[hidden]{display:none}.solpop .close{position:absolute;right:6px;top:4px}.solpop .soln{color:var(--muted,#64748b);font-size:12px}' +
      '.solpick{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);z-index:61;background:#1d4ed8;color:#fff;border-radius:22px;padding:8px 8px 8px 16px;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:94vw}.solpick button{background:#fff;color:#1d4ed8;border:0;border-radius:16px;padding:6px 12px;font-weight:600}' +
      '.solrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.solrow b{min-width:0;flex:1 1 140px}.solrow select{max-width:130px}.solrow .btn{padding:4px 9px}.soltxt{width:100%;min-height:44px;font:inherit;box-sizing:border-box}.solerr{color:#b91c1c;font-weight:600}.soltab{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.soltab th,.soltab td{text-align:left;padding:3px 6px;border-bottom:1px solid var(--line,#e2e8f0)}.soltab td:nth-child(3),.soltab td:nth-child(4){text-align:right}';
    st.textContent += '.solchain{position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:62;background:var(--panel,#fff);color:var(--ink,#000);border:2px solid #1d4ed8;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:720px;margin:0 auto}.solchain[hidden]{display:none}.solcl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.solcn{margin-left:auto;font-size:12px;color:var(--muted,#667)}' +
      '.solchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}.solchip{flex:none;min-height:34px;padding:0 10px;border-radius:17px;border:1px solid var(--line,#ccc);background:none;color:var(--ink,#000);font:700 13px var(--f-data,monospace)}.solchip.port{border-color:#dc2626;color:#dc2626}.solchip.stbd{border-color:#16a34a;color:#16a34a}' +
      '.solside{position:fixed;z-index:63;width:270px;background:var(--panel,#fff);color:var(--ink,#000);border:1px solid var(--line,#ccc);border-radius:12px;padding:8px 10px;box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:6px}.solside[hidden]{display:none}.solside .btn{min-height:42px}' +
      '.sollq{width:100%;min-height:44px;font-size:16px;padding:0 10px;border-radius:9px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--ink,#000)}.solla{margin:10px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#667)}.sollr{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.sollr b{width:34px;font-family:var(--f-data,monospace)}.sollr span{flex:1;min-width:0;display:flex;flex-direction:column}.sollr small{color:var(--muted,#667)}.sollr .btn{min-height:38px}' +
      '.solcards{display:flex;flex-direction:column;gap:10px}.solcards .btn{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:12px;min-height:64px;gap:2px}.solcards span{font-size:12px;opacity:.85;font-weight:400}';
    document.head.appendChild(st);
  }
  function openBuilder() {
    css(); zoomMax(); load().then(render);
    var s = $('solSheet'); if (!s) { s = document.createElement('div'); s.className = 'sheet'; s.id = 'solSheet'; s.hidden = true;
      s.innerHTML = '<div class="in" role="dialog" aria-label="Solent race builder"><div class="shead"><h2>Solent race</h2><button class="close" id="solX" aria-label="Close the Solent race builder">×</button></div><div class="sbody" id="solBody"></div></div>';
      document.body.appendChild(s); $('solX').onclick = function () { s.hidden = true; redraw(); }; }
    try { var sh = $('sheet'); if (sh && !sh.hidden && $('sheetX')) $('sheetX').click(); } catch (e) {}
    s.hidden = false; render(); redraw();
  }
  function ptLabel(p) { return p ? esc(p.name) : '<i>not chosen</i>'; }
  function render() {
    var b = $('solBody'); if (!b) return;
    if (!MK) { b.innerHTML = '<p class="note">Loading the Solent mark list…</p>'; return; }
    var w = B.wl, h = '';
    h += '<p class="note">Marks from the JOG / SCRA <b>Solent Area Mark Codes 2026</b> list (23 February 2026). Check the course against the sailing instructions and the course board on the day: marks can move, and most yellow race marks are laid March to November only.</p>';
    h += '<div class="row"><label for="solName">Race name</label><input id="solName" maxlength="60" value="' + esc(B.name) + '"></div>';
    h += '<div class="row"><span class="rowlbl" id="solTypeL">Course</span><div class="seg" role="group" aria-labelledby="solTypeL"><button type="button" data-t="marks" aria-pressed="' + (B.type !== 'wl') + '">Round the marks</button><button type="button" data-t="wl" aria-pressed="' + (B.type === 'wl') + '">Windward-leeward</button></div></div>';
    h += '<h3>Start</h3><div class="solrow"><b>' + ptLabel(B.start) + '</b><button class="btn" data-pick="start">Pick on the chart</button><button class="btn" id="solHere">Here (GPS)</button></div><div class="row"><label for="solStartCode">or mark code</label><input id="solStartCode" size="4" maxlength="3" placeholder="3G"></div>';
    if (B.type === 'wl') {
      h += '<h3>Windward mark</h3><div class="row"><span class="rowlbl" id="solWkL">Windward mark is</span><div class="seg" role="group" aria-labelledby="solWkL"><button type="button" data-wk="brg" aria-pressed="' + (w.wkind !== 'buoy') + '">A heading and distance</button><button type="button" data-wk="buoy" aria-pressed="' + (w.wkind === 'buoy') + '">A buoy</button></div></div>';
      if (w.wkind === 'buoy') h += '<div class="row"><label for="solWcode">Buoy code</label><input id="solWcode" size="4" maxlength="3" value="' + esc(w.wcode) + '" placeholder="3G"><span class="note">' + (mark(w.wcode) ? esc(mark(w.wcode).name) : '') + '</span></div>';
      else h += '<div class="row"><label for="solBrg">Heading from the start</label><input id="solBrg" type="number" min="0" max="360" step="1" value="' + (w.brg == null ? '' : w.brg) + '" style="width:70px"> °T <button class="btn" id="solFc">Use the forecast wind</button></div><div class="row"><label for="solDist">Distance</label><input id="solDist" type="number" min="0.2" max="10" step="0.1" value="' + w.dist + '" style="width:70px"> nm</div><p class="note" id="solFcNote"></p>';
      h += '<h3>Leeward mark and laps</h3><div class="row"><span class="rowlbl" id="solLkL">Leeward mark is</span><div class="seg" role="group" aria-labelledby="solLkL"><button type="button" data-lk="start" aria-pressed="' + (w.lkind !== 'buoy') + '">The start line</button><button type="button" data-lk="buoy" aria-pressed="' + (w.lkind === 'buoy') + '">A buoy</button></div></div>';
      if (w.lkind === 'buoy') h += '<div class="row"><label for="solLcode">Buoy code</label><input id="solLcode" size="4" maxlength="3" value="' + esc(w.lcode) + '"><span class="note">' + (mark(w.lcode) ? esc(mark(w.lcode).name) : '') + '</span></div>';
      h += '<div class="row"><label for="solLaps">Laps (beats)</label><input id="solLaps" type="number" min="1" max="6" step="1" value="' + w.laps + '" style="width:60px"></div>';
      h += '<div class="row"><label for="solSide">Leave the marks to</label><select id="solSide"><option value="port"' + (w.side !== 'starboard' ? ' selected' : '') + '>port</option><option value="starboard"' + (w.side === 'starboard' ? ' selected' : '') + '>starboard</option></select></div><p class="note">Finish at the leeward mark after the last beat and run.</p>';
    } else {
      h += '<h3>Marks</h3><label for="solBoard" class="note">From the course board: mark codes in order, each with p (port) or s (starboard). For example <b>3G p 4F s 2B p</b>.</label><textarea id="solBoard" class="soltxt" placeholder="3G p 4F s 2B p"></textarea><div class="xrow"><button class="btn" id="solBoardGo">Set the marks from the board</button><button class="btn" data-pick="mark">Add a mark on the chart</button></div><p class="note" id="solBoardNote"></p>'; h = h.replace('<h3>Marks</h3>', '<h3>Marks</h3><div class="xrow"><button class="btn primary" id="solChainGo">Build on the chart</button><button class="btn" id="solListGo">All the buoys</button></div><p class="note">Build on the chart: tap each buoy, choose Port or Starboard, and carry on to the next; the course grows on the chart. All the buoys: a list to search, adding each with Port or Starboard.</p>');
      (B.marks || []).forEach(function (m, i) { h += '<div class="solrow" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(m.name) + '</b><select data-side="' + i + '" aria-label="Leave ' + esc(m.name) + ' to"><option value="port"' + (m.side !== 'starboard' ? ' selected' : '') + '>to port</option><option value="starboard"' + (m.side === 'starboard' ? ' selected' : '') + '>to starboard</option></select><button class="btn" data-up="' + i + '" aria-label="Move up">↑</button><button class="btn" data-del="' + i + '" aria-label="Remove">×</button></div>'; });
      h += '<h3>Finish</h3><div class="row"><span class="rowlbl" id="solFinL">Finish at</span><div class="seg" role="group" aria-labelledby="solFinL"><button type="button" data-fin="start" aria-pressed="' + (B.fin !== 'mark') + '">The start line</button><button type="button" data-fin="mark" aria-pressed="' + (B.fin === 'mark') + '">A mark or point</button></div></div>';
      if (B.fin === 'mark') h += '<div class="solrow"><b>' + ptLabel(B.finish) + '</b><button class="btn" data-pick="finish">Pick on the chart</button></div><div class="row"><label for="solFinCode">or mark code</label><input id="solFinCode" size="4" maxlength="3"></div>';
    }
    var d = window.__fsDepth ? window.__fsDepth() : 3;
    h += '<h3>Depth</h3><div class="row"><label for="solDepth">Keep out of water shallower than</label><input id="solDepth" type="number" min="0" max="20" step="0.5" value="' + d + '" style="width:70px"> m</div><p class="note">The same safety depth as in the Course tab: the routes keep out of shallower water. In the Solent at low water this matters: depths are below lowest astronomical tide, with no tide height added.</p>';
    var c = build(), shl = c.err ? [] : shallowMarks(c);
    if (shl.length) h += '<p class="note" id="solShallow"><b>Inshore marks.</b> The depth data reads shallower than ' + d + ' m at ' + esc(shl.join(', ')) + '. So the boat can reach them, within 0.4 nm of these marks the routes may use any water below chart datum (and leave a start the data shows as shore). Check the depth on the day.</p>';
    h += '<p class="note ' + (c.err ? 'solerr' : '') + '" id="solMsg">' + (c.err ? esc(c.err) : 'Ready: ' + (c.marks.length) + ' marks, about ' + nm(c) + ' nm.') + '</p>';
    if (!c.err) { var pp = [c.start].concat(c.marks).concat([c.finish]), lt = '<table class="soltab"><thead><tr><th>Leg</th><th>To</th><th>°T</th><th>nm</th><th title="Tide strength on this leg, against the forecast">Tide</th><th title="Turn the tide on this leg, + clockwise">Tide °</th></tr></thead><tbody>', LT = B.legTide || [];
      for (var li = 1; li < pp.length; li++) { var a0 = pp[li - 1], q0 = pp[li], dx = (q0.lon - a0.lon) * Math.cos((a0.lat + q0.lat) / 2 * R) * 60, dy = (q0.lat - a0.lat) * 60; lt += '<tr><td>' + li + '</td><td>' + esc(q0.name.replace(/^Finish, /, 'Finish: ')) + (q0.side ? ' <small>(' + q0.side + ')</small>' : '') + '</td><td>' + ('00' + Math.round((Math.atan2(dx, dy) / R + 360) % 360)).slice(-3) + '</td><td>' + Math.hypot(dx, dy).toFixed(1) + '</td><td>' + legSel(li, 'p', LT[li - 1]) + '</td><td>' + legSel(li, 'd', LT[li - 1]) + '</td></tr>'; }
      h += '<h3>Legs</h3><div style="overflow-x:auto">' + lt + '</tbody></table></div>'; }
    h += '<div class="xrow"><button class="btn primary" id="solGo"' + (c.err ? ' disabled' : '') + '>Route this race</button><button class="btn" id="solClear">Start again</button></div>';
    b.innerHTML = h; wire();
  }
  /* tide by hand for each leg (Stuart 15 Nov 11:30): strength against the forecast, and a turn of its direction, kept with the race */
  function legSel(li, k, q) { var v = q && q[k] || 0, opts = k === 'p' ? [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50] : [-60, -45, -30, -15, 0, 15, 30, 45, 60]; return '<select class="soltide" data-leg="' + li + '" data-k="' + k + '" aria-label="Leg ' + li + (k === 'p' ? ' tide strength' : ' tide direction') + '">' + opts.map(function (o) { return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + (o > 0 ? '+' : '') + o + (k === 'p' ? '%' : '°') + '</option>'; }).join('') + '</select>'; }
  function shallowMarks(c) {
    var D = null; try { D = window.__navFc && window.__navFc() && window.__navFc().P.depth; } catch (e) {} if (!D) return [];
    var safe = window.__fsDepth ? window.__fsDepth() : 3, out = [];
    [c.start].concat(c.marks).forEach(function (q) { var k = /^(?:Start, )?(\d[0-9A-Z]) /.exec(q.name || ''); if (!k) return; var z = null; try { z = D.nearest('z', q.lat, q.lon); } catch (e) {} if (!(z <= -safe) && out.indexOf(k[1]) < 0) out.push(k[1]); });
    return out;
  }
  function nm(c) { var p = [c.start].concat(c.marks).concat([c.finish]), d = 0; for (var i = 1; i < p.length; i++) { var a = p[i - 1], q = p[i], dx = (q.lon - a.lon) * Math.cos((a.lat + q.lat) / 2 * R) * 60, dy = (q.lat - a.lat) * 60; d += Math.hypot(dx, dy); } return d < 10 ? d.toFixed(1) : Math.round(d); }
  function wire() {
    var b = $('solBody'), q = function (s) { return b.querySelectorAll(s); }, on = function (id, ev, fn) { var e = $(id); if (e) e[ev] = fn; };
    on('solHere', 'onclick', function () { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} if (!f || f.dr || Date.now() - f.at > 30000) { toast('No GPS fix yet: turn on Live GPS (GPS button), then tap Here again.'); try { if (window.__navLiveOn) window.__navLiveOn(); } catch (e) {} return; } B.start = { code: null, name: 'Start, GPS ' + new Date().toUTCString().slice(17, 22) + ' UTC', lat: f.la, lon: f.lo }; saveB(); render(); redraw(); });
    on('solName', 'onchange', function () { B.name = this.value.trim() || 'Solent race'; saveB(); });
    [].forEach.call(q('[data-t]'), function (e) { e.onclick = function () { B.type = e.dataset.t; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-wk]'), function (e) { e.onclick = function () { B.wl.wkind = e.dataset.wk; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-lk]'), function (e) { e.onclick = function () { B.wl.lkind = e.dataset.lk; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-fin]'), function (e) { e.onclick = function () { B.fin = e.dataset.fin; saveB(); render(); redraw(); }; });
    [].forEach.call(q('[data-pick]'), function (e) { e.onclick = function () { pickStart(e.dataset.pick); }; });
    [].forEach.call(q('[data-side]'), function (e) { e.onchange = function () { B.marks[+e.dataset.side].side = e.value; saveB(); }; });
    [].forEach.call(q('[data-up]'), function (e) { e.onclick = function () { var i = +e.dataset.up; if (i > 0) { var t = B.marks[i]; B.marks[i] = B.marks[i - 1]; B.marks[i - 1] = t; saveB(); render(); redraw(); } }; });
    [].forEach.call(q('[data-del]'), function (e) { e.onclick = function () { B.marks.splice(+e.dataset.del, 1); saveB(); render(); redraw(); }; });
    var code = function (id, set) { on(id, 'onchange', function () { var m = mark(this.value); if (!m) { this.setCustomValidity('No mark ' + this.value); this.reportValidity(); return; } set({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon }); saveB(); render(); redraw(); }); };
    code('solStartCode', function (p) { B.start = p; }); code('solFinCode', function (p) { B.finish = p; });
    on('solWcode', 'onchange', function () { B.wl.wcode = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    on('solLcode', 'onchange', function () { B.wl.lcode = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    on('solBrg', 'onchange', function () { var v = +this.value; B.wl.brg = this.value === '' ? null : ((v % 360) + 360) % 360; saveB(); render(); redraw(); });
    on('solDist', 'onchange', function () { B.wl.dist = Math.max(0.2, Math.min(10, +this.value || 1)); saveB(); render(); redraw(); });
    on('solLaps', 'onchange', function () { B.wl.laps = Math.max(1, Math.min(6, Math.round(+this.value || 1))); saveB(); render(); redraw(); });
    on('solSide', 'onchange', function () { B.wl.side = this.value; saveB(); });
    on('solDepth', 'onchange', function () { if (window.__fsDepth) window.__fsDepth(+this.value); });
    on('solFc', 'onclick', function () {
      var n = $('solFcNote'); if (!B.start) { n.textContent = 'Choose the start first.'; return; }
      var t = window.__fsStartAt ? window.__fsStartAt() : null, w = window.__fsWindAt ? window.__fsWindAt(B.start.lat, B.start.lon, t) : null;
      if (!w) { n.textContent = 'No forecast wind here at the start time: type the heading.'; return; }
      B.wl.brg = Math.round(w.twd) % 360; saveB(); render(); redraw();
      $('solFcNote').textContent = 'Forecast at the start' + (t ? ' (' + new Date(t * 1000).toUTCString().slice(17, 22) + ' UTC)' : '') + ': ' + w.tws.toFixed(0) + ' kn from ' + ('00' + Math.round(w.twd)).slice(-3) + '°T. Check the wind on the line before the start.';
    });
    on('solChainGo', 'onclick', function () { chain(true); });
    on('solListGo', 'onclick', function () { list(true); });
    on('solBoardGo', 'onclick', function () { var r = parseBoard($('solBoard').value), n = $('solBoardNote'); if (r.marks.length) { B.marks = r.marks; saveB(); render(); redraw(); n = $('solBoardNote'); } n.textContent = (r.marks.length ? r.marks.length + ' marks set.' : 'No mark codes found.') + (r.bad.length ? ' Not on the list: ' + r.bad.join(', ') + '.' : ''); });
    on('solClear', 'onclick', function () { B = { type: B.type, name: 'Solent race', start: null, marks: [], fin: 'start', finish: null, wl: { wkind: 'brg', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'start', lcode: '', side: 'port' } }; saveB(); render(); redraw(); });
    [].forEach.call(document.querySelectorAll('#solSheet select.soltide'), function (el) { el.onchange = function () { var L = B.legTide = B.legTide || []; var i = +el.dataset.leg - 1; L[i] = L[i] || {}; L[i][el.dataset.k] = +el.value; sv(BKEY, B); }; });
    on('solGo', 'onclick', function () { var c = build(); if (c.err) return; zoomMax(); if (B.legTide && B.legTide.some(function (q) { return q && (q.p || q.d); })) c.legTide = B.legTide.slice();
      var t = window.__fsStartAt ? window.__fsStartAt() : null, d = new Date(t ? t * 1000 : Date.now()), ds = d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
      if (c.name.indexOf(ds) < 0) c.name = (c.name + ' ' + ds).slice(0, 70);   /* Stuart 15 Nov J Q&A: the race date added to the name in My races */ $('solSheet').hidden = true; if (window.__fsUseCourse) window.__fsUseCourse(c); });
  }
  function pickStart(what) {
    pickStart.back = pick === 'chain'; if ($('solChain')) $('solChain').hidden = true; pick = what; if ($('solSheet')) $('solSheet').hidden = true; var bar = $('solPick');
    if (!bar) { bar = document.createElement('div'); bar.id = 'solPick'; bar.className = 'solpick'; document.body.appendChild(bar); }
    bar.innerHTML = '<span>Tap ' + (what === 'start' ? 'the start (a mark or a point on the line)' : what === 'finish' ? 'the finish' : 'the next mark') + ' on the chart</span><button id="solPickX">Cancel</button>';
    bar.hidden = false; $('solPickX').onclick = function () { pickDone(null); }; redraw();
  }
  function pickDone(p) {
    var w = pick; pick = null; if ($('solPick')) $('solPick').hidden = true;
    if (p) { if (w === 'start') B.start = p; else if (w === 'finish') B.finish = p; else { if (!p.code) { toast('Tap one of the Solent marks to add it to the course.'); } else B.marks.push(Object.assign(p, { side: 'port' })); } saveB(); }
    if (pickStart.back) { pickStart.back = false; chain(true); return; }
    $('solSheet').hidden = false; render(); redraw();
  }

  /* ---- J3 (Stuart 15 Nov 17:32): build the course on the map, without going back to the drop down after every buoy ----
     "On screen you click on the buoy choose port or starboard and then click on add another or finish." A bar at the foot of the
     chart shows the course so far as chips, with Undo, All the buoys and Finish; tapping a buoy offers Port or Starboard beside it.
     All the buoys: the whole list, searched by code or name, each with Port and Starboard, staying open while the course is typed in. */
  function chainBar() {
    var bar = $('solChain'); if (!bar) { bar = document.createElement('div'); bar.id = 'solChain'; bar.className = 'solchain'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Course being built'); document.body.appendChild(bar);
      bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.dataset.k;
        if (k === 'undo') { B.marks.pop(); saveB(); chainBar(); redraw(); } else if (k === 'list') list(true); else if (k === 'done') chain(false); else if (k === 'start') { pickStart('start'); }
        else if (b.dataset.i != null) { var i = +b.dataset.i, m = B.marks[i]; m.side = m.side === 'port' ? 'stbd' : 'port'; saveB(); chainBar(); redraw(); } }); }
    var n = B.marks.length, sd = function (m) { return m.side === 'stbd' ? 'S' : 'P'; };
    bar.innerHTML = '<div class="solcl"><b>' + (B.start ? (n ? 'Tap the next buoy' : 'Tap a buoy, then Port or Starboard') : 'Start: ') + '</b>' + (B.start ? '' : '<button class="btn" data-k="start">Pick the start</button>') + '<span class="solcn">' + n + ' mark' + (n === 1 ? '' : 's') + (n ? ', about ' + nm(build(true).err ? { start: B.start || B.marks[0], marks: B.marks, finish: B.start || B.marks[n - 1] } : build(true)) + ' nm' : '') + '</span></div>' +
      '<div class="solchips">' + (B.marks.length ? B.marks.map(function (m, i) { return '<button class="solchip ' + (m.side === 'stbd' ? 'stbd' : 'port') + '" data-i="' + i + '" title="Tap to swap Port and Starboard">' + (i + 1) + '. ' + esc(m.code || m.name) + ' ' + sd(m) + '</button>'; }).join('') : '<span class="note">No marks yet.</span>') + '</div>' +
      '<div class="xrow"><button class="btn" data-k="undo"' + (n ? '' : ' disabled') + '>Undo</button><button class="btn" data-k="list">All the buoys</button><button class="btn primary" data-k="done">Finish</button></div>';
    bar.hidden = !pick || pick !== 'chain';
  }
  function chain(on) {
    css(); if (on) { pick = 'chain'; B.type = 'marks'; saveB(); var s = $('solSheet'); if (s) s.hidden = true; load().then(function () { chainBar(); redraw(); }); chainBar(); redraw(); }
    else { pick = null; var bar = $('solChain'); if (bar) bar.hidden = true; var sp = $('solSide'); if (sp) sp.hidden = true; var L = $('solList'); if (L) L.hidden = true; openBuilder(); }
  }
  function sidePop(m, x, y) {
    var p = $('solSide'); if (!p) { p = document.createElement('div'); p.id = 'solSide'; p.className = 'solside'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    var inIdx = -1; B.marks.forEach(function (q, i) { if (q.code === m.id) inIdx = i; });
    p.innerHTML = '<b>' + esc(m.id) + ' ' + esc(m.name) + '</b><div class="xrow"><button class="btn primary" data-s="port">Port</button><button class="btn primary" data-s="stbd">Starboard</button>' + (inIdx >= 0 ? '<button class="btn" data-s="del">Remove</button>' : '') + '<button class="btn" data-s="x" aria-label="Close">×</button></div>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '');
    var W = innerWidth, H = innerHeight; p.style.left = Math.max(8, Math.min(W - 280, x - 130)) + 'px'; p.style.top = Math.max(60, Math.min(H - 150, y + 18)) + 'px'; p.hidden = false;
    p.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var s2 = b.dataset.s; p.hidden = true;
      if (s2 === 'port' || s2 === 'stbd') { B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: s2 }); saveB(); }
      else if (s2 === 'del') { B.marks.splice(inIdx, 1); saveB(); }
      chainBar(); redraw(); };
  }
  function list(on) {
    css(); var L = $('solList');
    if (!L) { L = document.createElement('div'); L.id = 'solList'; L.className = 'sheet'; L.hidden = true;
      L.innerHTML = '<div class="in" role="dialog" aria-label="All the Solent buoys"><div class="shead"><h2>All the buoys</h2><button class="close" id="solListX" aria-label="Close the list">×</button></div><div class="sbody"><input type="search" id="solListQ" placeholder="Code or name, for example 3G or Royal" aria-label="Find a buoy" class="sollq"><p class="note" id="solListN"></p><div id="solListB"></div></div></div>';
      document.body.appendChild(L); $('solListX').onclick = function () { L.hidden = true; if (pick === 'chain') chainBar(); };
      $('solListQ').addEventListener('input', fill);
      $('solListB').addEventListener('click', function (e) { var b = e.target.closest('[data-add]'); if (!b) return; var m = mark(b.dataset.add); if (!m) return; B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: b.dataset.side }); saveB(); fill(); chainBar(); redraw(); });   /* the list's own line says what was added: no message over the course bar */
    }
    function fill() {
      if (!MK) { $('solListB').innerHTML = '<p class="note">Loading the Solent mark list…</p>'; return; }
      var q = $('solListQ').value.trim().toLowerCase(), rows = MK.filter(function (m) { return !q || m.id.toLowerCase().indexOf(q) === 0 || m.name.toLowerCase().indexOf(q) >= 0; });
      var area = {}; rows.forEach(function (m) { var a = /^\d/.test(m.id) ? 'Area ' + m.id[0] : 'Other'; (area[a] = area[a] || []).push(m); });
      $('solListN').textContent = rows.length + ' of ' + MK.length + ' buoys. Course so far: ' + (B.marks.length ? B.marks.map(function (m) { return (m.code || m.name) + (m.side === 'stbd' ? ' S' : ' P'); }).join(', ') : 'none') + '.';
      $('solListB').innerHTML = Object.keys(area).sort().map(function (a) { return '<h4 class="solla">' + a + '</h4>' + area[a].sort(function (x, y) { return x.id < y.id ? -1 : 1; }).map(function (m) { return '<div class="sollr"><b>' + esc(m.id) + '</b><span>' + esc(m.name) + '<small>' + esc(COLN[m.col] || m.col || '') + '</small></span><button class="btn" data-add="' + esc(m.id) + '" data-side="port">Port</button><button class="btn" data-add="' + esc(m.id) + '" data-side="stbd">Stbd</button></div>'; }).join(''); }).join('');
    }
    if (on) { load().then(fill); fill(); L.hidden = false; setTimeout(function () { try { $('solListQ').focus(); } catch (e) {} }, 100); } else L.hidden = true;
  }
  /* from the race list: a two-button card, Round the cans or Windward-leeward (Stuart 15 Nov 17:32) */
  function startCard() {
    css(); var c = $('solCard'); if (!c) { c = document.createElement('div'); c.id = 'solCard'; c.className = 'sheet'; c.hidden = true;
      c.innerHTML = '<div class="in" role="dialog" aria-label="Solent race"><div class="shead"><h2>Solent race</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody"><p class="note">Marks from the JOG / SCRA Solent mark list 2026.</p><div class="solcards"><button class="btn primary" id="solCardM"><b>Round the cans</b><span>Tap the buoys on the chart, or pick them from the list</span></button><button class="btn" id="solCardW"><b>Windward-leeward</b><span>Start, windward mark, leeward mark or gate, laps</span></button></div>' + ((B.marks || []).length ? '<p class="note">Your last course: ' + B.marks.length + ' marks. <button class="linkbtn" id="solCardOld">Open it</button></p>' : '') + '</div></div>';
      document.body.appendChild(c); }
    c.hidden = false; $('solCardX').onclick = function () { c.hidden = true; };
    $('solCardM').onclick = function () { c.hidden = true; B.type = 'marks'; if (!B.start || (B.marks || []).length) { B.marks = []; B.legTide = []; } saveB(); chain(true); };
    $('solCardW').onclick = function () { c.hidden = true; B.type = 'wl'; saveB(); openBuilder(); };
    if ($('solCardOld')) $('solCardOld').onclick = function () { c.hidden = true; openBuilder(); };
  }
  /* ---- Settings, Charts: the switch and the button ---- */
  /* Stuart 15 Nov 11:26: "on solent race zoom should be set to allow the max": the Closest zoom slider (Settings, Chart) goes to 6 times */
  function zoomMax() { var z = $('zoomMax'); if (!z || +z.value >= +z.max) return; z.value = z.max; z.dispatchEvent(new Event('input', { bubbles: true })); z.dispatchEvent(new Event('change', { bubbles: true })); }
  function setOn(v) { C.on = !!v; sv(KEY, C); if (C.on) { load(); zoomMax(); } redraw(); var e = $('solentOn'); if (e) e.checked = C.on; }
  function hookSettings() {
    var e = $('solentOn'); if (e) { e.checked = !!C.on; e.onchange = function () { setOn(e.checked); }; }
    var bt = $('solentBuild'); if (bt) bt.onclick = function () { if (!C.on) setOn(true); openBuilder(); };
  }
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  window.__fsTapHook = tapHook;
  window.FSSolent = { start: startCard, chain: chain, list: list, on: setOn, isOn: function () { return !!C.on; }, open: openBuilder, marks: function () { return MK; }, load: load, board: parseBoard, build: build, state: function () { return B; }, set: function (o) { Object.assign(B, o); saveB(); render(); redraw(); }, tap: tapHook };
  if (C.on) load();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookSettings); else hookSettings();
})();
