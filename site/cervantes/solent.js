/* FirstShift Route and Route+: Solent race marks and the Solent race builder (Stuart 15 Nov 2026, job J).
   Stuart, 08:24: "add this to both tools route and navigate with an on off button in settings under charts so when racing in Solent it
   can be used. Have a racing in Solent button in charts which creates a Solent racing drop down that gives a build a Solent race tool
   that allows you to pick a start line point of mark on the chart then build the course using the marks inc port and starboard also give
   option for a windward leeward course with a windward mark either a buoy or a compass heading and distance. Once built the course can be
   routed as normal giving all relevant data as the normal routing software a box allowing min depth should also be relevant."
   08:26: "the Solent race took can use mark downloads or build on screen of course once the Solent marks have been switched on".
   The marks: JOG / SCRA "Solent Area Mark Codes 2026" (list dated 23 February 2026), in ../courses/solent-marks.json. */
(function () {
  /* FirstShift Solent only (Stuart 16 Nov 19:35): Route and Route+ have no Solent screens, marks or settings */
  if (!window.FS_SOLENT) { window.FSSolent = { isOn: function () { return false; }, stepState: function () { return { on: false }; }, marks: function () { return null; }, on: function () {}, step: function () {}, start: function () {}, windRef: function () { return null; } }; return; }
  'use strict';
  var R = Math.PI / 180, KEY = 'fs-solent', BKEY = 'fs-solent-b';
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function INK() { var r = document.documentElement, cs = getComputedStyle(r); var v = (cs.getPropertyValue('--ink') || '').trim(); return v || '#0f172a'; }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var C = ld(KEY, { on: false }), MK = null, BY = {}, SRC = null, NOTE = null, last = null, pick = null;
  var B = ld(BKEY, null) || { type: 'marks', name: 'Solent race', start: null, marks: [], fin: 'start', finish: null, wl: { wkind: 'brg', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'start', lcode: '', side: 'port' } };
  var QUIET = false, PT = null;
  function saveB() { if (!QUIET) B.at = Date.now(); sv(BKEY, B); if (!QUIET && window.__fsBcPush) { clearTimeout(PT); PT = setTimeout(function () { try { window.__fsBcPush(); } catch (e) {} }, 1500); } }   /* M3: every change goes to the crew on the boat code */
  function share() { var l = window.__fsLine ? window.__fsLine() : {}; return { at: B.at || 0, b: B, line: { boat: l.boat || null, pin: l.pin || null, transit: !!l.transit } }; }
  function applyRemote(o) { if (!o || !o.b || !(o.at > (B.at || 0))) return false; var prevShown = B.shown; QUIET = true; try { B = o.b; B.at = o.at; sv(BKEY, B);
      var L = o.line || {}; if (window.__fsSetLine) ['boat', 'pin'].forEach(function (k) { var q = L[k], cur = (window.__fsLine() || {})[k]; if (q && (!cur || cur[0] !== q[0] || cur[1] !== q[1])) window.__fsSetLine(k, q[0], q[1]); else if (!q && cur) window.__fsSetLine(k, null); });
      if (window.__fsLineKind) window.__fsLineKind(!!L.transit); if (o.b.shown && o.b.shown !== prevShown) { var keep = B.plan; B.plan = 'list'; go(true); B.plan = keep; sv(BKEY, B); }   /* the course the crew mate showed is shown here too (as a list; Route it stays one tap away) */
      if (WZ.on) wzRender(); if ($('solSheet') && !$('solSheet').hidden) render(); redraw(); } finally { QUIET = false; } toast('Updated by the crew on the boat code.'); return true; }
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
    ctx.font = '400 10px system-ui, sans-serif'; ctx.textBaseline = 'middle';   /* Stuart 16 Nov 07:47: "Very faded buoy number and name very faint as you touch them": faint, small; the buoy touched, and the course's own, in full */
    var oncourse = {}; try { var cc = window.__navCourse && window.__navCourse(); if (cc) [cc.start].concat(cc.marks || []).concat([cc.finish]).forEach(function (q) { var k = /^(?:Start, |Finish, )?(\d[0-9A-Z]) /.exec((q && q.name) || ''); if (k) oncourse[k[1]] = 1; }); } catch (e) {}
    var dim = !!window.FS_MARK && Object.keys(oncourse).length > 0 && !pick && !builderOpen() && !window.__fsMarkPicking;   /* Mark (16 Nov 23:50): with a course on the chart, the other buoys step back */
    MK.forEach(function (m) {
      var x = X(m.lon), y = Y(m.lat), back = dim && !oncourse[m.id] && !used[m.id]; if (back) ctx.globalAlpha = 0.3; dot(ctx, x, y, used[m.id] ? r + 2 : back ? r * 0.7 : r, m.col); if (back) { ctx.globalAlpha = 1; return; }
      if (oncourse[m.id] && !used[m.id]) return;   /* the course already labels its own marks */
      if (used[m.id]) { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); }
      if (!code) return; var osm = !!(window.__fsChartOn && window.__fsChartOn('cmarks')), t = m.id + (name && (!osm || used[m.id] || m.id === HOT) ? ' ' + m.name : '');   /* M22 (Stuart 17 Nov 06:14 photo): with the OpenSeaMap buoys on, their names are already on the chart, so the Solent code sits on the left and the name only shows when tapped */
      ctx.fillStyle = INK(); ctx.globalAlpha = used[m.id] || m.id === HOT ? 1 : osm ? 0.75 : 0.3; if (osm && !(used[m.id] || m.id === HOT)) { ctx.textAlign = 'right'; ctx.fillText(t, x - r - 3, y); ctx.textAlign = 'left'; } else ctx.fillText(t, x + r + 3, y); ctx.globalAlpha = 1;   /* plain text, no halo (Stuart 15 Nov 17:52): white on the dark screen, dark on the light one, red at night */
    });
    if (HOT && BY[HOT]) { var hm = BY[HOT], hx = X(hm.lon), hy = Y(hm.lat); ctx.save(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r + 7, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, r + 13, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }   /* M21 (Stuart 17 Nov 06:14): a picked buoy has a halo round it */
    if (builderOpen() || pick) drawPlan(ctx, X, Y);
    try { extras(ctx, X, Y); } catch (e) {}
  }
  function usedCodes() { var u = {}; if (!builderOpen() && !pick) return u; (B.marks || []).forEach(function (m) { if (m.code) u[m.code] = 1; }); if (B.start && B.start.code) u[B.start.code] = 1; if (B.wl.wcode) u[B.wl.wcode.toUpperCase()] = 1; return u; }
  function drawPlan(ctx, X, Y) {
    var c = build(true); if (!c || !c.start) return; var p = [c.start].concat(c.marks).concat(c.finish ? [c.finish] : []);
    ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke(); ctx.setLineDash([]);
    if (pick === 'chain' || (WZ.on && B.type !== 'wl')) { ctx.font = '700 12px system-ui, sans-serif'; ctx.textBaseline = 'middle'; c.marks.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x - 12, y - 12, 9, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x - 12, y - 12); ctx.textAlign = 'left'; }); }   /* numbered while building on the map */
    var s = c.start; ctx.beginPath(); ctx.moveTo(X(s.lon) - 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon) + 7, Y(s.lat) - 7); ctx.lineTo(X(s.lon), Y(s.lat) + 6); ctx.closePath(); ctx.fillStyle = '#2563eb'; ctx.fill();
  }
  function hit(x, y) {
    if (!MK || !last) return null; var best = null, bd = 22;
    MK.forEach(function (m) { var d = Math.hypot(last.X(m.lon) - x, last.Y(m.lat) - y); if (d < bd) { bd = d; best = m; } });
    return best;
  }
  var HOT = null;   /* the buoy last touched: its label shown in full until its card closes */
  function hot(id) { HOT = id; redraw(); }
  function showMark(m, tx, ty) {
    css(); hot(m.id);   /* css(): the card had no styles until the builder had been opened, so on a phone it sat below the screen */
    var p = $('solPop'); if (!p) { p = document.createElement('div'); p.id = 'solPop'; p.className = 'solpop'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    p.innerHTML = '<button class="close" aria-label="Close">×</button><b><span class="solsym" style="background:' + (COLS[m.col] || ['#facc15'])[0] + '"></span>' + esc(m.id) + ' ' + esc(m.name) + '</b><span>' + esc(COLN[m.col] || m.col) + ' · ' + m.zone + '</span><span>' + ddm(m.lat, 'N', 'S') + ' ' + ddm(m.lon, 'E', 'W') + '</span>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '') + '<span class="soln">JOG / SCRA Solent mark list 2026</span>';
    p.hidden = false; p.querySelector('.close').onclick = function () { p.hidden = true; hot(null); };
    if (tx != null) { p.classList.add('solnear'); var pw = p.offsetWidth || 260, ph = p.offsetHeight || 100, W = innerWidth, H = innerHeight, top = ty + 22; if (top + ph > H - 8) top = ty - 22 - ph; p.style.left = Math.max(8, Math.min(W - pw - 8, tx - pw / 2)) + 'px'; p.style.top = Math.max(60, top) + 'px'; } else { p.classList.remove('solnear'); p.style.left = ''; p.style.top = ''; }   /* M21: the name drops down beside the buoy tapped */
    clearTimeout(showMark.t); showMark.t = setTimeout(function () { p.hidden = true; hot(null); }, 9000);
  }
  function ddm(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), mn = (a - d) * 60; return (d < 10 && pos === 'E' ? '00' : d < 100 && pos === 'E' ? '0' : '') + d + '° ' + mn.toFixed(2) + "' " + (v >= 0 ? pos : neg); }
  function tapHook(la, lo, x, y, editing) {
    if (BV.on) { BV.on = false; if (BV.box) { BV.box = false; wzRender(); } redraw(); return true; }   /* the bias picture: a tap on the chart puts it away and brings the step box back */
    if (WZ.on && !editing) { var wr = wzTap(la, lo, x, y); if (wr) return true; }
    if (pick === 'chain') { var mc = hit(x, y); if (mc) sidePop(mc, x, y); else toast('Tap one of the Solent buoys.'); return true; }
    if (pick) { var m = hit(x, y); pickDone(m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }); return true; }
    if (editing || !C.on) return false;
    var m2 = hit(x, y); if (m2) { showMark(m2, x, y); return true; }
    return false;
  }

  /* ---- building the course ---- */
  function toPt(m, side) { if (side === 'stbd') side = 'starboard'; var o = { name: m.code ? m.code + ' ' + (BY[m.code] ? BY[m.code].name : '') : m.name, lat: m.lat, lon: m.lon }; if (side) o.side = side; if (m.gate) { o.gate = m.gate; o.name = m.name; } return o; }
  function fromCode(code, side) { var m = mark(code); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side || 'port' } : null; }
  function offset(p, brg, nm) { return { lat: p.lat + nm * Math.cos(brg * R) / 60, lon: p.lon + nm * Math.sin(brg * R) / (60 * Math.cos(p.lat * R)) }; }
  function windward() {
    var w = B.wl; if (w.wkind === 'buoy') { var m = mark(w.wcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; }
    if (w.wkind === 'pt') return w.wpt ? { code: w.wpt.code || null, name: w.wpt.name || 'Windward mark', lat: w.wpt.lat, lon: w.wpt.lon } : null;   /* a tapped or pinged point (18:40) */
    if (!B.start || !(w.brg >= 0 && w.brg <= 360) || !(w.dist > 0)) return null; var q = offset(B.start, w.brg, w.dist); return { code: null, name: 'Windward mark', lat: q.lat, lon: q.lon };   /* 21:33: the bearing and distance are in the course list, not in the name */
  }
  function gpt(i) { var w = B.wl, p = w['g' + i], m = mark(i === 1 ? w.lcode : w.lcode2); if (p) return { lat: p.lat, lon: p.lon, short: p.code || p.short || (i === 1 ? 'A' : 'B') }; return m ? { lat: m.lat, lon: m.lon, short: m.id } : null; }
  function leeward() { var w = B.wl;
    if (w.lkind === 'gate') { var g1 = gpt(1), g2 = gpt(2); if (!g1 || !g2) return null; return { code: null, name: 'Leeward gate ' + g1.short + ' and ' + g2.short, lat: (g1.lat + g2.lat) / 2, lon: (g1.lon + g2.lon) / 2, gate: { a: [g1.lat, g1.lon], b: [g2.lat, g2.lon] } }; }   /* J3: a gate of two buoys; round either. 18:40: or any two points, tapped or pinged */
    if (w.lkind === 'pt') return w.lpt ? { code: null, name: w.lpt.name || 'Leeward mark', lat: w.lpt.lat, lon: w.lpt.lon } : null;
    if (w.lkind === 'buoy') { var m = mark(w.lcode); return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : null; } return B.start ? { code: B.start.code, name: 'Leeward mark (start line)', lat: B.start.lat, lon: B.start.lon } : null; }
  function build(soft) {
    if (!B.start) return soft ? null : { err: 'Choose the start: tap Start, then a mark or a point on the chart.' };
    var marks = [], fin;
    if (B.type === 'wl') {
      var W = windward(), L = leeward(); if (!W) return soft ? { start: B.start, marks: [] } : { err: B.wl.wkind === 'buoy' ? 'Type the code of the windward buoy (for example 3G).' : 'Give the windward mark a compass heading (0 to 360°T) and a distance in nm, or use the forecast wind.' };
      if (!L) return soft ? null : { err: B.wl.lkind === 'gate' ? 'Type the codes of both gate buoys.' : 'Type the code of the leeward buoy.' };
      var n = Math.max(1, Math.min(6, Math.round(B.wl.laps || 1)));
      var fk = B.wl.fin || 'lee';   /* J3: finish at the leeward mark or gate, at the start line, or at the windward mark */
      if (fk === 'wind') { for (var i = 0; i < n; i++) { if (i) marks.push(toPt(L, B.wl.side)); if (i < n - 1) marks.push(toPt(W, B.wl.side)); } fin = toPt(W); fin.name = 'Finish, ' + W.name; }
      else { for (var j = 0; j < n; j++) { marks.push(toPt(W, B.wl.side)); if (j < n - 1 || fk === 'start') marks.push(toPt(L, B.wl.side)); } if (fk === 'start') { fin = toPt(B.start); fin.name = 'Finish, start line'; } else { fin = toPt(L); fin.name = 'Finish, ' + L.name; delete fin.gate; } }
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
  function builderOpen() { var s = $('solSheet'), w = $('solStep'); return !!(s && !s.hidden) || !!(w && !w.hidden); }
  function css() {
    if ($('solCss')) return; var st = document.createElement('style'); st.id = 'solCss';
    st.textContent = '.solpop{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:60;max-width:min(92vw,360px);background:var(--bg,#fff);color:var(--ink,#0f172a);border:1px solid var(--line,#cbd5e1);border-radius:12px;padding:10px 34px 10px 12px;box-shadow:0 4px 18px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:2px;font-size:13px}.solpop[hidden]{display:none}.solpop .close{position:absolute;right:6px;top:4px}.solpop .soln{color:var(--muted,#64748b);font-size:12px}.solpop.solnear{transform:none;bottom:auto}.solpop .solsym{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.6);vertical-align:-1px;margin-right:6px}' +
      '.solpick{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);z-index:61;background:#1d4ed8;color:#fff;border-radius:22px;padding:8px 8px 8px 16px;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:94vw}.solpick button{background:#fff;color:#1d4ed8;border:0;border-radius:16px;padding:6px 12px;font-weight:600}' +
      '.solrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.solrow b{min-width:0;flex:1 1 140px}.solrow select{max-width:130px}.solrow .btn{padding:4px 9px}.soltxt{width:100%;min-height:44px;font:inherit;box-sizing:border-box}.solerr{color:#b91c1c;font-weight:600}.soltab{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.soltab th,.soltab td{text-align:left;padding:3px 6px;border-bottom:1px solid var(--line,#e2e8f0)}.soltab td:nth-child(3),.soltab td:nth-child(4){text-align:right}';
    st.textContent += '.solchain{position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:62;background:var(--panel,#fff);color:var(--ink,#000);border:2px solid #1d4ed8;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:720px;margin:0 auto}.solchain[hidden]{display:none}.solcl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.solcn{margin-left:auto;font-size:12px;color:var(--muted,#667)}' +
      '.solchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}.solchip{flex:none;min-height:34px;padding:0 10px;border-radius:17px;border:1px solid var(--line,#ccc);background:none;color:var(--ink,#000);font:700 13px var(--f-data,monospace)}.solchip.port{border-color:#dc2626;color:#dc2626}.solchip.stbd{border-color:#16a34a;color:#16a34a}' +
      '.solside{position:fixed;z-index:66;width:270px;background:var(--panel,#fff);color:var(--ink,#000);border:1px solid var(--line,#ccc);border-radius:12px;padding:8px 10px;box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:6px}.solside[hidden]{display:none}.solside .btn{min-height:42px}' +
      '.sollq{width:100%;min-height:44px;font-size:16px;padding:0 10px;border-radius:9px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:var(--ink,#000)}.solla{margin:10px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#667)}.sollr{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--line,#e2e8f0)}.sollr b{width:34px;font-family:var(--f-data,monospace)}.sollr span{flex:1;min-width:0;display:flex;flex-direction:column}.sollr small{color:var(--muted,#667)}.sollr .btn{min-height:38px}' +
      '.solstep{position:fixed;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 10px);margin:0 auto;max-width:440px;z-index:64;background:var(--panel,#fff);color:var(--ink,#000);border:2px solid #1d4ed8;border-radius:14px;padding:0 12px 10px;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:8px;font-size:14px;max-height:60vh;overflow-y:auto;box-sizing:border-box}.solstep[hidden]{display:none}.solgrip{height:20px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;margin:0 -12px}.solgrip span{width:44px;height:5px;border-radius:3px;background:var(--muted,#889);opacity:.7}.solhd{display:flex;align-items:center;gap:8px}.solhd b{flex:1;font-size:16px}.solhd .close{font-size:22px;background:none;border:0;color:inherit;min-width:40px;min-height:40px}.solstepn{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667);white-space:nowrap}.solgot{margin:0;font-size:13px;color:var(--muted,#667)}.solgot b{color:var(--ink,#000)}.solnav{display:flex;gap:8px;justify-content:space-between}.solnav .btn{min-height:42px;flex:1}.solnav .btn:disabled{opacity:.4;cursor:default}.solstep input{width:62px;min-height:34px;font-size:16px}.solstep .solname{flex:1;width:auto}.solstep .seg button{min-height:34px;white-space:nowrap}.solk{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667)}' +
      '@media (min-width:1000px) and (min-height:600px){.solstep{right:16px;left:auto;bottom:auto;top:128px;margin:0;width:380px;max-height:calc(100vh - 210px)}}' +
      '.solmsg{margin:0;padding:6px 8px;border-radius:8px;background:rgba(245,158,11,.15);color:var(--ink,#000);font-size:13px}.solstep .solcode{width:120px;text-transform:uppercase}.solstep input[type=datetime-local]{width:auto;min-height:34px;font-size:15px}#solAfter{z-index:65}' +
      '.solcards{display:flex;flex-direction:column;gap:10px}.solcards .btn{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:12px;min-height:64px;gap:2px}.solcards span{font-size:12px;opacity:.85;font-weight:400}';
    st.textContent += '.solpop.sollegs{left:max(12px,env(safe-area-inset-left,0px));right:auto;transform:none;top:calc(env(safe-area-inset-top,0px) + 112px);bottom:auto;max-width:min(calc(100vw - 16px),460px);max-height:calc(100vh - 200px);overflow:auto;gap:6px;background:var(--panel,#fff)}.sollt{overflow-x:auto}.sollt table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}.sollt td{padding:4px 6px;border-bottom:1px solid var(--line,#e2e8f0);vertical-align:top}.sollt td:nth-child(3),.sollt td:nth-child(4){white-space:nowrap;text-align:right}.sollt td:nth-child(2){min-width:0}.sollty{color:var(--muted,#667);font-size:12px}.sollegs .xrow{display:flex;gap:8px;flex-wrap:wrap}.sollegs .xrow .btn{min-height:44px}@media (max-width:600px),(max-height:500px){.solpop.sollegs{top:auto;left:calc(58px + env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));width:auto;max-width:none;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);max-height:55vh}}.sollegs .solgrip{margin:-6px -34px 0 -12px}.sollegs.dragged{right:auto;bottom:auto;max-width:min(calc(100vw - 16px),460px)}';
    st.textContent += '.solseq{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);z-index:12;width:min(calc(100vw - 20px),420px);box-sizing:border-box;background:var(--panel,#0B1B30);color:var(--ink,#fff);border:2px solid #f59e0b;border-radius:14px;padding:6px 10px 8px;box-shadow:0 6px 18px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:6px}.solseq[hidden]{display:none}.solseq.sqlast{border-color:#ef4444}.sqhd{display:flex;align-items:center;gap:10px}.sqt{font:700 28px/1 var(--f-data,monospace);flex:1;text-align:center}.sqg{font-size:12px;color:var(--muted,#9aa)}.sqflag{min-width:44px;min-height:36px;border-radius:8px;border:1px solid var(--line,#456);background:#1d4ed8;color:#fff;font-weight:700}.sqx{background:none;border:0;color:inherit;font-size:22px;min-width:36px;min-height:36px}.sqrow{display:flex;gap:5px;flex-wrap:wrap}.sqrow .btn{min-height:36px;padding:0 7px;font-size:14px;flex:1 1 auto}.sqover{margin:0;padding:6px 8px;border-radius:8px;background:#7f1d1d;color:#fff;font-weight:600;font-size:13px}' +
      '.soltest{background:#b45309;padding:4px 4px 4px 12px;font-size:12px;gap:8px}.soltest button{color:#b45309;padding:4px 10px}.solmulti{flex-wrap:wrap}.solstep .solll{flex:1;width:auto;min-width:0;font-family:var(--f-data,monospace)}.solbias{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:8px 10px;border-radius:10px;border:2px solid #22c55e;background:rgba(34,197,94,.12);color:var(--ink,#000);font:inherit;cursor:pointer}.solbias b{font-size:16px}.solbias span:last-child{font-size:12px;color:var(--muted,#667)}';
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
      h += '<h3>Leeward mark and laps</h3><div class="row"><span class="rowlbl" id="solLkL">Leeward mark is</span><div class="seg" role="group" aria-labelledby="solLkL"><button type="button" data-lk="start" aria-pressed="' + (w.lkind !== 'buoy') + '">The start line</button><button type="button" data-lk="buoy" aria-pressed="' + (w.lkind === 'buoy') + '">A buoy</button><button type="button" data-lk="gate" aria-pressed="' + (w.lkind === 'gate') + '">A gate</button></div></div>';
      if (w.lkind === 'gate') h += '<div class="row"><label for="solLcode">Gate buoys</label><input id="solLcode" size="4" maxlength="3" value="' + esc(w.lcode) + '" placeholder="2C"> and <input id="solLcode2" size="4" maxlength="3" value="' + esc(w.lcode2 || '') + '" placeholder="2D"></div><p class="note">Round either buoy of the gate; the routes cross the line between them.</p>';
      if (w.lkind === 'buoy') h += '<div class="row"><label for="solLcode">Buoy code</label><input id="solLcode" size="4" maxlength="3" value="' + esc(w.lcode) + '"><span class="note">' + (mark(w.lcode) ? esc(mark(w.lcode).name) : '') + '</span></div>';
      h += '<div class="row"><span class="rowlbl" id="solWfL">Finish at</span><div class="seg" role="group" aria-labelledby="solWfL"><button type="button" data-wf="lee" aria-pressed="' + ((w.fin || 'lee') === 'lee') + '">Leeward</button><button type="button" data-wf="start" aria-pressed="' + (w.fin === 'start') + '">Start line</button><button type="button" data-wf="wind" aria-pressed="' + (w.fin === 'wind') + '">Windward</button></div></div>';
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
    on('solLcode2', 'onchange', function () { B.wl.lcode2 = this.value.trim().toUpperCase(); saveB(); render(); redraw(); });
    [].forEach.call(q('[data-wf]'), function (e) { e.onclick = function () { B.wl.fin = e.dataset.wf; saveB(); render(); redraw(); }; });
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
    on('solGo', 'onclick', function () { B.plan = 'route'; saveB(); go(); });   /* the full Solent sheet's button says Route this race, so it routes */
  }
  function go(remote) { var c = build(); if (c.err) { toast(c.err); return false; } if (WZ.on && B.startAt) window.__fsPendingStart = B.startAt; zoomMax(); if (B.legTide && B.legTide.some(function (q) { return q && (q.p || q.d); })) c.legTide = B.legTide.slice();
    /* the date and time added to the name in Saved routes (Stuart 15 Nov J Q&A; 16 Nov "Solent race with date time stamp so it can be rerun after the event") */
    var t = WZ.on && B.startAt ? B.startAt : window.__fsStartAt ? window.__fsStartAt() : null, d = new Date(t ? t * 1000 : Date.now()), ds = d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    c.name = (c.name.replace(/ \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( \d\d:\d\d)?$/, '') + ' ' + ds).slice(0, 70); c.solent = true; c.solPlan = { route: B.plan === 'route', model: B.model || 'ukv', models: (B.models && B.models.length ? B.models : [B.model || 'ukv']) };
    if (remote !== true) { B.shown = Date.now(); B.raced = null; saveB(); } if ($('solSheet')) $('solSheet').hidden = true; if (window.__fsUseCourse) window.__fsUseCourse(c); if (B.plan === 'route') setTimeout(startCardAfter, 600); return true; }
  /* After routing (Stuart 16 Nov 12:46): "a connection to the usual start sequence with count down distance from line": the GPS window has Gun in, Ping boat and Ping pin, distance to the line and time to burn */
  function startCardAfter() {
    css(); var c = $('solAfter'); if (!c) { c = document.createElement('div'); c.id = 'solAfter'; c.className = 'solpop'; c.setAttribute('role', 'dialog'); document.body.appendChild(c); }
    c.innerHTML = '<button class="close" aria-label="Close">×</button><b>Routed. Next, the start</b><span>The GPS window counts down to the gun and shows your distance to the line and time to burn. Ping the committee boat and the pin there.</span><div class="xrow"><button class="btn primary" data-k="gps">Open the start sequence</button></div>';
    c.hidden = false; c.querySelector('.close').onclick = function () { c.hidden = true; };
    c.querySelector('[data-k="gps"]').onclick = function () { c.hidden = true; if (window.__fsLiveOpen) window.__fsLiveOpen(); };
    clearTimeout(startCardAfter.t); startCardAfter.t = setTimeout(function () { c.hidden = true; }, 20000);
  }
  /* the course as a list (Stuart 16 Nov 18:30, decided 18:40): bearing, distance and leg type for each leg; Route it; New course */
  function legType(brg, twd) { var twa = Math.abs(((brg - twd + 540) % 360) - 180), t;
    if (twa < 50) { var s1 = Math.abs(((brg - (twd - 45) + 540) % 360) - 180), p1 = Math.abs(((brg - (twd + 45) + 540) % 360) - 180); t = 'beat, ' + (Math.abs(s1 - p1) < 6 ? 'square' : (s1 < p1 ? 'starboard' : 'port') + ' tack favoured'); }
    else if (twa < 80) t = 'close reach'; else if (twa < 110) t = 'beam reach'; else if (twa < 150) t = 'broad reach';
    else { var sg = Math.abs(((brg - (twd + 180 - 30) + 540) % 360) - 180), pg = Math.abs(((brg - (twd + 180 + 30) + 540) % 360) - 180); t = 'run, ' + (Math.abs(sg - pg) < 6 ? 'dead downwind' : (sg < pg ? 'starboard' : 'port') + ' gybe favoured'); }
    return t; }
  function showList() {
    css(); var cc = window.__navCourse && window.__navCourse(); if (!cc) return; var pts = [cc.start].concat(cc.marks || [], [cc.finish]), w = windRef(), tot = 0, rows = [];
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], q = pts[i], k = Math.cos(a.lat * R), dx = (q.lon - a.lon) * k * 60, dy = (q.lat - a.lat) * 60, d = Math.hypot(dx, dy), br = (Math.atan2(dx, dy) / R + 360) % 360; tot += d;
      rows.push('<tr><td>' + i + '</td><td>' + esc(String(q.name || '').replace(/^(Start|Finish), /, '')) + (q.side ? ' <small>' + (q.side === 'starboard' || q.side === 'stbd' ? 'S' : 'P') + '</small>' : '') + (w && w.twd != null ? '<br><small class="sollty">' + legType(br, w.twd) + '</small>' : '') + '</td><td><b>' + ('00' + Math.round(br)).slice(-3) + '°T</b></td><td>' + d.toFixed(1) + ' nm</td></tr>'); }
    var c = $('solLegs'); if (!c) { c = document.createElement('div'); c.id = 'solLegs'; c.className = 'solpop sollegs'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'The course, leg by leg'); document.body.appendChild(c); }
    c.innerHTML = '<div class="solgrip" title="Drag to move"><span></span></div><button class="close" aria-label="Close">×</button><b>' + esc(cc.name) + '</b><span class="soln">' + (pts.length - 1) + ' legs, ' + tot.toFixed(1) + ' nm' + (w && w.twd != null ? ' · wind from ' + ('00' + Math.round(w.twd)).slice(-3) + '°' : ' · give the wind for leg types') + (lineInfo() ? ' · ' + esc(lineInfo()) : '') + '</span><div class="sollt"><table><tbody>' + rows.join('') + '</tbody></table></div><div class="xrow"><button class="btn" data-k="gps">GPS</button><button class="btn" data-k="route">Route it</button><button class="btn primary" data-k="new">New course</button></div>';
    c.hidden = false; c.querySelector('.close').onclick = function () { c.hidden = true; }; legsDrag(c); legsPlace();
    c.onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var k = b.dataset.k;
      if (k === 'gps') { c.hidden = true; if (window.__fsLiveOpen) window.__fsLiveOpen(); }
      else if (k === 'route') { c.hidden = true; B.plan = 'route'; saveB(); if (window.__fsSolPlan) window.__fsSolPlan({ route: true, model: B.model || 'ukv', models: (B.models && B.models.length ? B.models : [B.model || 'ukv']) }); }
      else if (k === 'new') newCourse(); };
  }
  /* 21:35 (Stuart, iPhone): the list fits the screen, sits above the GPS window, and drags by its grip (remembered), with no hidden menu */
  function legsPlace() { var c = $('solLegs'); if (!c || c.hidden) return; var pos = ld('fs-sollegs-pos', null);
    if (pos) { c.classList.add('dragged'); var w = c.offsetWidth || 300, h = c.offsetHeight || 200; c.style.left = Math.max(4, Math.min(innerWidth - w - 4, pos.x)) + 'px'; c.style.top = Math.max(4, Math.min(innerHeight - 60, pos.y)) + 'px'; c.style.bottom = 'auto'; return; }
    c.classList.remove('dragged'); c.style.left = ''; c.style.top = ''; var lb = $('liveBox'), phone = innerWidth <= 600 || innerHeight <= 500;
    if (phone && lb && !lb.hidden && !lb.classList.contains('mini') && lb.getClientRects().length) { var r = lb.getBoundingClientRect(); c.style.bottom = Math.round(innerHeight - r.top + 8) + 'px'; } else c.style.bottom = ''; }
  function legsDrag(c) { if (c.dataset.dg) return; c.dataset.dg = '1'; var d = null;
    c.addEventListener('pointerdown', function (e) { if (!e.target.closest('.solgrip')) return; var r = c.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId }; try { c.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    c.addEventListener('pointermove', function (e) { if (!d || e.pointerId !== d.id) return; c.classList.add('dragged'); c.style.left = (e.clientX - d.dx) + 'px'; c.style.top = (e.clientY - d.dy) + 'px'; c.style.bottom = 'auto'; });
    var end = function (e) { if (!d || e.pointerId !== d.id) return; d = null; var r = c.getBoundingClientRect(); sv('fs-sollegs-pos', { x: r.left, y: r.top }); legsPlace(); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('dblclick', function (e) { if (e.target.closest('.solgrip')) { try { localStorage.removeItem('fs-sollegs-pos'); } catch (x) {} legsPlace(); } }); }
  setInterval(legsPlace, 700); window.addEventListener('resize', legsPlace);
  /* clear down for the next race (18:40): the course stays in Saved races, the track is filed if one was sailed; the marks go, the start line and the wind stay */
  function newCourse() { ['solLegs', 'solAfter'].forEach(function (id) { var e = $(id); if (e) e.hidden = true; });
    var sailed = false; try { var f = window.__fsLiveFix && window.__fsLiveFix(); sailed = !!f; } catch (e) {}
    if (sailed && window.__fsEndRace) window.__fsEndRace(); else if (window.__fsClearCourse) window.__fsClearCourse();
    B.marks = []; B.finish = null; B.fin = 'start'; B.legTide = []; B.startAt = null; B.wl.wcode = ''; B.wl.wpt = null; B.wl.lcode = ''; B.wl.lcode2 = ''; B.wl.lpt = null; B.wl.g1 = null; B.wl.g2 = null; B.wl.brg = null;
    B.start = B.sk === 'line' ? lineStart() : null; saveB(); startCard(); }
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
    hot(m.id);
    var p = $('solSide'); if (!p) { p = document.createElement('div'); p.id = 'solSide'; p.className = 'solside'; p.setAttribute('role', 'dialog'); document.body.appendChild(p); }
    var inIdx = -1; B.marks.forEach(function (q, i) { if (q.code === m.id) inIdx = i; });
    p.innerHTML = '<b>' + esc(m.id) + ' ' + esc(m.name) + '</b><div class="xrow"><button class="btn primary" data-s="port">Port</button><button class="btn primary" data-s="stbd">Starboard</button>' + (inIdx >= 0 ? '<button class="btn" data-s="del">Remove</button>' : '') + '<button class="btn" data-s="x" aria-label="Close">×</button></div>' + (m.flag ? '<span class="soln">' + esc(flagText(m.flag)) + '</span>' : '');
    var W = innerWidth, H = innerHeight; p.style.left = Math.max(8, Math.min(W - 280, x - 130)) + 'px'; p.hidden = false; var ph = p.offsetHeight || 96, sb = $('solStep'), lim = H - 8; if (sb && !sb.hidden) { var sr = sb.getBoundingClientRect(); if (sr.left < x + 140 && sr.right > x - 140 && sr.top > y) lim = sr.top - 6; } var tp = y + 18; if (tp + ph > lim) tp = y - 18 - ph; p.style.top = Math.max(60, Math.min(H - ph - 8, tp)) + 'px';
    p.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; var s2 = b.dataset.s; p.hidden = true; HOT = null;
      if (s2 === 'port' || s2 === 'stbd') { B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: s2 }); saveB(); }
      else if (s2 === 'del') { B.marks.splice(inIdx, 1); saveB(); }
      chainBar(); wzRender(); redraw(); };
  }
  function list(on) {
    css(); var L = $('solList');
    if (!L) { L = document.createElement('div'); L.id = 'solList'; L.className = 'sheet'; L.hidden = true;
      L.innerHTML = '<div class="in" role="dialog" aria-label="All the Solent buoys"><div class="shead"><h2>All the buoys</h2><button class="close" id="solListX" aria-label="Close the list">×</button></div><div class="sbody"><input type="search" id="solListQ" placeholder="Code or name, for example 3G or Royal" aria-label="Find a buoy" class="sollq"><p class="note" id="solListN"></p><div id="solListB"></div></div></div>';
      document.body.appendChild(L); $('solListX').onclick = function () { L.hidden = true; if (pick === 'chain') chainBar(); };
      $('solListQ').addEventListener('input', fill);
      $('solListB').addEventListener('click', function (e) { var o = e.target.closest('[data-one]'); if (o) { var mo = mark(o.dataset.one); if (mo) { L.hidden = true; wzUse(mo, mo.lat, mo.lon, null, innerWidth / 2, innerHeight / 3); hot(mo.id); } return; } var b = e.target.closest('[data-add]'); if (!b) return; var m = mark(b.dataset.add); if (!m) return; B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: b.dataset.side }); saveB(); fill(); chainBar(); wzRender(); redraw(); });   /* the list's own line says what was added: no message over the course bar */
    }
    function one() { return WZ.on && wzKey() !== 'marks'; }   /* M14 (Stuart 17 Nov 05:36): wherever it says tap a buoy, the list: one buoy for the step in hand */
    function fill() {
      if (!MK) { $('solListB').innerHTML = '<p class="note">Loading the Solent mark list…</p>'; return; }
      var q = $('solListQ').value.trim().toLowerCase(), rows = MK.filter(function (m) { return !q || m.id.toLowerCase().indexOf(q) === 0 || m.name.toLowerCase().indexOf(q) >= 0; });
      var area = {}; rows.forEach(function (m) { var a = /^\d/.test(m.id) ? 'Area ' + m.id[0] : 'Other'; (area[a] = area[a] || []).push(m); });
      $('solListN').textContent = one() ? rows.length + ' of ' + MK.length + ' buoys. Choose one for: ' + ({ start: 'the start', wind: 'the windward mark', lee: 'the leeward mark', fin: 'the finish' }[wzKey()] || 'this step') + '.' : rows.length + ' of ' + MK.length + ' buoys. Course so far: ' + (B.marks.length ? B.marks.map(function (m) { return (m.code || m.name) + (m.side === 'stbd' ? ' S' : ' P'); }).join(', ') : 'none') + '.';
      $('solListB').innerHTML = Object.keys(area).sort().map(function (a) { return '<h4 class="solla">' + a + '</h4>' + area[a].sort(function (x, y) { return x.id < y.id ? -1 : 1; }).map(function (m) { return '<div class="sollr"><b>' + esc(m.id) + '</b><span>' + esc(m.name) + '<small>' + esc(COLN[m.col] || m.col || '') + '</small></span>' + (one() ? '<button class="btn" data-one="' + esc(m.id) + '">Choose</button>' : '<button class="btn" data-add="' + esc(m.id) + '" data-side="port">Port</button><button class="btn" data-add="' + esc(m.id) + '" data-side="stbd">Stbd</button>') + '</div>'; }).join(''); }).join('');
    }
    if (on) { load().then(fill); fill(); L.hidden = false; setTimeout(function () { try { $('solListQ').focus(); } catch (e) {} }, 100); } else L.hidden = true;
  }
  /* from the race list: a two-button card, Round the cans or Windward-leeward (Stuart 15 Nov 17:32) */
  function startCard() {
    css(); var c = $('solCard'); if (!c) { c = document.createElement('div'); c.id = 'solCard'; c.className = 'sheet'; c.hidden = true; document.body.appendChild(c); }
    var prev = null, has = !!B.start && (B.type === 'wl' || (B.marks || []).length);
    c.innerHTML = '<div class="in" role="dialog" aria-label="Solent race"><div class="shead"><h2>Solent race</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody"><p class="note">Marks from the JOG / SCRA Solent mark list 2026. The chart prompts you one step at a time.</p><div class="solcards"><button class="btn primary" id="solCardM"><b>Round the cans</b><span>Start, then tap each buoy with Port or Starboard, then the finish</span></button><button class="btn" id="solCardW"><b>Windward-leeward</b><span>Start, windward mark, leeward mark or gate, laps</span></button></div>' +
      (window.FS_MARK ? '<p class="note"><button class="linkbtn" id="solCardT">Test mode</button>: a practice boat sails a course on the chart, so you can watch the start, the line, the racing window and the finish ashore. Nothing goes to the crew.</p>' : '') +
      (has ? '<p class="note">Your last course: ' + esc(B.type === 'wl' ? 'windward-leeward' : B.marks.length + ' marks') + '. <button class="linkbtn" id="solCardOld">Open it</button></p>' : '') +
      (prev ? '<p class="note">' + esc(prev.name) + ' is kept with its routes. <button class="linkbtn" id="solCardOff">Back to ' + esc(prev.short || prev.name) + '</button></p>' : '') + '</div></div>';
    var now0 = Date.now() / 1000, run = window.FS_MARK && B.shown && B.startAt && now0 >= B.startAt && now0 < B.startAt + 10 * 3600 && !(B.ended > B.startAt * 1000);
    if (run) { var gd = new Date(B.startAt * 1000); c.innerHTML = '<div class="in" role="dialog" aria-label="Race under way"><div class="shead"><h2>Race under way</h2><button class="close" id="solCardX" aria-label="Close">×</button></div><div class="sbody"><p class="note">The gun went at ' + ('0' + gd.getHours()).slice(-2) + ':' + ('0' + gd.getMinutes()).slice(-2) + '. The course is locked: a tap on the chart cannot change it.</p><div class="solcards"><button class="btn" id="solCardE"><b>Edit course</b><span>Change the marks of this race (the committee shortened or changed the course)</span></button><button class="btn" id="solCardN"><b>New course</b><span>The race is over: file the track, keep the line and the wind</span></button></div></div></div>';
      c.hidden = false; $('solCardX').onclick = function () { c.hidden = true; }; $('solCardE').onclick = function () { c.hidden = true; wzOpen(wzSteps().length); toast('Editing the course of the race under way.'); }; $('solCardN').onclick = function () { c.hidden = true; B.ended = Date.now(); saveB(); newCourse(); }; return; }   /* M15 (Stuart 17 Nov 05:41): after the start, the course changes only through Edit course */
    c.hidden = false; $('solCardX').onclick = function () { c.hidden = true; };
    if (!B.plan) B.plan = 'list';
    $('solCardM').onclick = function () { c.hidden = true; B.type = 'marks'; B.marks = []; B.legTide = []; B.fin = 'start'; B.finish = null; saveB(); wzOpen(1); };
    $('solCardW').onclick = function () { c.hidden = true; B.type = 'wl'; B.legTide = []; if (window.FS_MARK && !B.wl.wset) { B.wl.wkind = 'buoy'; B.wl.lkind = 'pt'; B.wl.wset = 1; } if (window.FS_MARK) B.sk = 'line'; saveB(); wzOpen(1); };   /* Mark (Stuart 05:49): tap a buoy, then a point anywhere, then the start line */
    if ($('solCardT')) $('solCardT').onclick = function () { c.hidden = true; testStart(); };
    if ($('solCardOld')) $('solCardOld').onclick = function () { c.hidden = true; wzOpen(wzSteps().length); };
    if ($('solCardOff')) $('solCardOff').onclick = function () { c.hidden = true; wzOpen(0); if (window.__fsInshore) window.__fsInshore(false); };
  }

  /* ---- the course, one prompt at a time (Stuart 16 Nov 07:48 "Yes the first in the list maybe the box can be dragged around simply to
     put clear of phone windows"; 08:00 "Yes very good logic please build"). One small box: what to do now, what has been chosen, Back,
     Next and Cancel. Taps on the chart answer the step. It never sends you to the big Solent sheet. Drag it by its grip anywhere on the
     screen; it remembers where. Windward-leeward: 1 start, 2 windward mark, 3 leeward mark or gate, 4 laps and finish, 5 check and route.
     Round the cans: 1 start, 2 the buoys, 3 finish, 4 check and route. ---- */
  var WZ = { on: false, n: 1 };
  /* Simpler Solent racing (Stuart 16 Nov 18:30, decided 18:40): the first step asks Route or not (No routing first) and the wind;
     the start can be a line of two ends, tapped or pinged and kept for the next course; windward and leeward marks can be any point,
     tapped or pinged, and a gate any two points. Not routed, the course shows as a list of bearings, distances and leg types. */
  function wzSteps() { var rt = B.plan === 'route'; return B.type === 'wl' ? ['plan', 'wind', 'lee', 'start', 'laps'].concat(rt ? ['wt'] : [], ['check']) : ['plan', 'start', 'marks', 'fin'].concat(rt ? ['wt'] : [], ['check']); }
  function P(m, la, lo, label) { return m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: label === 'A' || label === 'B' ? 'Gate ' + label : label + ' mark', short: label, lat: la, lon: lo }; }
  function lineNow() { var l = window.__fsLine ? window.__fsLine() : {}; return l && l.boat && l.pin ? l : null; }
  function lineStart() { var l = lineNow(); if (!l) return null; return { code: null, name: 'Start line', lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2, line: true }; }
  function lineInfo() { var l = lineNow(); if (!l) return ''; var a = { lat: l.boat[0], lon: l.boat[1] }, b = { lat: l.pin[0], lon: l.pin[1] }, k = Math.cos(a.lat * R), dx = (b.lon - a.lon) * k * 60, dy = (b.lat - a.lat) * 60, len = Math.hypot(dx, dy) * 1852, t = 'Line ' + Math.round(len) + ' m';
    var w = windRef(); if (w && w.twd != null) { var ux = Math.sin(w.twd * R), uy = Math.cos(w.twd * R), up = (dx * ux + dy * uy) * 1852; t += Math.abs(up) < 2 ? ', square to the wind' : ', ' + (up > 0 ? 'pin' : 'committee boat') + ' end favoured by ' + Math.round(Math.abs(up)) + ' m'; } return t + '.'; }
  function ping(fn) { var f = null; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} if (!f || f.dr || Date.now() - f.at > 30000) { if (window.__fsLiveOpen) window.__fsLiveOpen(); WZ.msg = 'No GPS fix yet: the GPS is starting. Tap Ping again in a moment.'; wzRender(); return; } if (window.__fsOnLand && window.__fsOnLand(f.la, f.lo)) { WZ.msg = 'The GPS puts you on land, so nothing was pinged. Ping from the boat, or tap the point on the chart.'; wzRender(); return; } fn(f.la, f.lo); }
  /* the race's wind: typed, head to wind, or the boat's instruments (Route+); used for the leg list, line bias and header or lift */
  function windRef() { if (B.wind && B.wind.twd != null) return B.wind; var nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} if (nw && nw[1] != null) { B.wind = { twd: Math.round(nw[1]), src: 'boat', at: Date.now() }; saveB(); return B.wind; } return null; }
  function headToWind() { var done = false, fin = function (h, src) { if (done) return; done = true; window.removeEventListener('deviceorientationabsolute', onO, true); window.removeEventListener('deviceorientation', onO, true); B.wind = { twd: Math.round(((h % 360) + 360) % 360), src: src, at: Date.now() }; saveB(); WZ.msg = 'Wind set from ' + src + ': ' + ('00' + B.wind.twd).slice(-3) + '°.'; wzRender(); };
    var dr = null; try { dr = window.__navDR && window.__navDR(); } catch (e) {} if (dr && dr.hdg != null) return fin(dr.hdg, 'the boat\'s heading');
    function onO(e) { var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h != null) fin(h, 'the phone\'s compass (magnetic, within a degree in the Solent)'); }
    var go2 = function () { window.addEventListener('deviceorientationabsolute', onO, true); window.addEventListener('deviceorientation', onO, true); setTimeout(function () { if (!done) { done = true; window.removeEventListener('deviceorientationabsolute', onO, true); window.removeEventListener('deviceorientation', onO, true); WZ.msg = 'No compass on this device: type the wind direction instead.'; wzRender(); } }, 3000); };
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') go2(); else { WZ.msg = 'Compass not allowed: type the wind direction instead.'; wzRender(); } }, function () { go2(); }); else go2(); } catch (e) { go2(); } }
  /* the wind from the two tacks (as Vakaros and Velocitek, research 16 Nov): close-hauled on each tack, tap; the wind is midway between the two headings and half the angle is the boat's own angle to the wind */
  function tackRef(side) { var h = null, src = ''; try { var dr = window.__navDR && window.__navDR(); if (dr && dr.hdg != null) { h = dr.hdg; src = 'heading'; } } catch (e) {} if (h == null) { try { h = window.__fsCog ? window.__fsCog() : null; src = 'course made good'; } catch (e) {} }
    if (h == null) { if (window.__fsLiveOpen) window.__fsLiveOpen(); WZ.msg = 'Needs the boat moving with GPS on (or the boat\'s compass): sail close-hauled for half a minute, then tap again.'; wzRender(); return; }
    B.tref = B.tref || {}; B.tref[side] = Math.round(h); var s1 = B.tref.stbd, p1 = B.tref.port;
    if (s1 != null && p1 != null) { var d = ((p1 - s1 + 540) % 360) - 180, mid = (s1 + d / 2 + 360) % 360, ba = Math.abs(d) / 2; if (ba < 25 || ba > 65) { WZ.msg = 'The two headings are ' + Math.round(Math.abs(d)) + '° apart, not a tack: record each tack again.'; B.tref = {}; } else { B.wind = { twd: Math.round(mid), ba: Math.round(ba), src: 'your two tacks (' + src + ')', at: Date.now() }; WZ.msg = 'Wind from ' + ('00' + B.wind.twd).slice(-3) + '°, tacking through ' + Math.round(Math.abs(d)) + '°.'; } }
    else WZ.msg = (side === 'stbd' ? 'Starboard' : 'Port') + ' tack recorded: ' + ('00' + Math.round(h)).slice(-3) + '°. Now the other tack.';
    saveB(); wzRender(); }
  function models() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return !c.disabled; }).map(function (c) { var l = c.closest('label'), t = l ? l.textContent.trim().split(/\s{2,}|\n|·|\(/)[0].trim() : c.getAttribute('data-m'); return { id: c.getAttribute('data-m'), name: t.slice(0, 18) }; }); }
  function wzKey() { return wzSteps()[WZ.n - 1]; }
  function wzOk(k) { var w = B.wl;
    if (k === 'start') return B.sk === 'line' ? !!lineNow() : !!B.start; if (k === 'wind') return w.wkind === 'brg' || !w.wkind ? (w.brg >= 0 && w.brg <= 360 && w.dist > 0) : !!windward(); if (k === 'lee') return w.lkind === 'start' || !w.lkind || !!leeward(); if (k === 'marks') return (B.marks || []).length > 0;
    if (k === 'fin') return B.fin !== 'mark' || !!B.finish; return true; }
  function wzOpen(n) {
    css(); if (!n) { WZ.on = false; var b0 = $('solStep'); if (b0) b0.hidden = true; pick = null; redraw(); return; }
    pick = null; ['solChain', 'solSheet', 'solPick'].forEach(function (id) { var e = $(id); if (e) e.hidden = true; });
    if (window.__fsPanelClose) window.__fsPanelClose();   /* the most chart to tap on: the results panel folds away while building */
    if (!C.on) setOn(true); zoomMax(); WZ.on = true; WZ.n = Math.max(1, Math.min(n, wzSteps().length));
    load().then(function () { wzRender(); redraw(); }); wzBox(); wzRender(); redraw();
  }
  function wzBox() {
    var b = $('solStep'); if (b) return b;
    b = document.createElement('div'); b.id = 'solStep'; b.className = 'solstep'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Solent race, step by step'); document.body.appendChild(b);
    var pos = ld('fs-solstep-pos', null); if (pos) place(b, pos.x, pos.y);
    b.addEventListener('click', function (e) { var t = e.target.closest('button'); if (!t || !b.contains(t)) return; var k = t.dataset.k, v = t.dataset.v, w = B.wl;
      if (k === 'x') { wzOpen(0); return; } if (k === 'back' || k === 'next') WZ.msg = '';
      if (k === 'back') { WZ.n = Math.max(1, WZ.n - 1); } else if (k === 'next') { if (wzOk(wzKey())) WZ.n = Math.min(wzSteps().length, WZ.n + 1); }
      else if (k === 'go') { if (go()) wzOpen(0); return; }
      else if (k === 'wk') w.wkind = v; else if (k === 'lk') { w.lkind = v; if (v === 'gate') { w.lcode = ''; w.lcode2 = ''; w.g1 = null; w.g2 = null; } }
      else if (k === 'fc') { b.dataset.msg = fcWind(); } else if (k === 'lap') w.laps = Math.max(1, Math.min(6, (w.laps || 1) + (+v))); else if (k === 'wf') w.fin = v; else if (k === 'sd') w.side = v;
      else if (k === 'fin') { B.fin = v; if (v === 'start') B.finish = null; } else if (k === 'undo') B.marks.pop(); else if (k === 'list') { list(true); return; }
      else if (k === 'code') { wzCode(v); return; }
      else if (k === 'plan') { B.plan = v; } else if (k === 'model') { B.model = v; }
      else if (k === 'models') { var cur = (B.models && B.models.length ? B.models : [B.model || 'ukv']).slice(), ix = cur.indexOf(v); if (ix >= 0) { if (cur.length > 1) cur.splice(ix, 1); } else cur.push(v); B.models = cur; B.model = cur[0]; }
      else if (k === 'tref') { tackRef(v); return; } else if (k === 'htw') { headToWind(); return; }
      else if (k === 'bw') { var nw = null; try { nw = window.__navWind && window.__navWind(); } catch (x) {} if (nw) { B.wind = { twd: Math.round(nw[1]), src: 'boat', at: Date.now() }; WZ.msg = ''; } else WZ.msg = 'No wind from the boat yet.'; }
      else if (k === 'lt') { if (window.__fsLineKind) window.__fsLineKind(v === 'tr'); }
      else if (k === 'lm') { B.lm = v; WZ.end = null; }
      else if (k === 'llset') { llSet(); return; }
      else if (k === 'bias') { biasView(); return; }
      else if (k === 'sk') { B.sk = v; WZ.end = null; B.start = v === 'line' ? lineStart() : (B.start && B.start.line ? null : B.start); }
      else if (k === 'lping') { ping(function (la, lo) { var lo0 = window.__fsLine ? window.__fsLine() : {}, other = lo0[v === 'boat' ? 'pin' : 'boat']; if (other && Math.hypot(la - other[0], (lo - other[1]) * Math.cos(la * R)) * 60 < 0.011) { WZ.msg = 'Both ends would be the same place (under 20 m apart): ping the other end as you pass it.'; wzRender(); return; } if (window.__fsSetLine) window.__fsSetLine(v, la, lo); B.start = lineStart(); saveB(); wzRender(); redraw(); }); return; }
      else if (k === 'lclr') { if (window.__fsSetLine) { window.__fsSetLine('boat', null); window.__fsSetLine('pin', null); } B.start = null; WZ.end = 'boat'; }
      else if (k === 'pping') { ping(function (la, lo) { if (v === 'w') w.wpt = P(null, la, lo, 'Windward'); else if (v === 'l') w.lpt = P(null, la, lo, 'Leeward'); else { var gp = P(null, la, lo, w.g1 && !w.g2 ? 'B' : 'A'); if (!w.g1 || w.g2) { w.g1 = gp; w.g2 = null; } else w.g2 = gp; } saveB(); wzRender(); redraw(); }); return; }
      else if (k === 'side') { var m = B.marks[+v]; m.side = m.side === 'stbd' || m.side === 'starboard' ? 'port' : 'stbd'; }
      saveB(); wzRender(); redraw(); });
    b.addEventListener('change', function (e) { var t = e.target, w = B.wl;
      if (t.id === 'solTwd') { var tv = +t.value; B.wind = t.value === '' ? null : { twd: ((tv % 360) + 360) % 360, src: 'typed', at: Date.now() }; } else if (t.id === 'solSbrg') { var v = +t.value; w.brg = t.value === '' ? null : ((v % 360) + 360) % 360; } else if (t.id === 'solSdist') w.dist = Math.round(Math.max(0.2, Math.min(10, +t.value || 1)) * 10) / 10; else if (t.id === 'solSname') B.name = t.value.trim() || 'Solent race'; else if (t.id === 'solStartT') { var tp = Date.parse(t.value); if (tp === tp) B.startAt = Math.round(tp / 1000); } else if (t.id === 'solCode' || t.id === 'solLLb' || t.id === 'solLLp') return; else if (t.id === 'solLen') { B.llen = Math.max(20, Math.min(3000, Math.round(+t.value || 300))); var lq = window.__fsLine ? window.__fsLine() : {}; if (B.lm === 'square' && lq.boat) squareFrom(lq.boat[0], lq.boat[1]); }
      saveB(); wzRender(); redraw(); });
    b.addEventListener('keydown', function (e) { if (e.target.id === 'solCode' && e.key === 'Enter') { e.preventDefault(); wzCode(wzKey() === 'marks' ? 'port' : null); } });
    /* drag by the grip */
    var drag = null;
    b.addEventListener('pointerdown', function (e) { if (!e.target.closest('.solgrip')) return; var r = b.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId }; try { b.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    b.addEventListener('pointermove', function (e) { if (!drag || e.pointerId !== drag.id) return; place(b, e.clientX - drag.dx, e.clientY - drag.dy); });
    var end = function (e) { if (!drag || e.pointerId !== drag.id) return; drag = null; var r = b.getBoundingClientRect(); sv('fs-solstep-pos', { x: r.left, y: r.top }); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    window.addEventListener('resize', function () { var r = b.getBoundingClientRect(); if (b.style.top) place(b, r.left, r.top); });
    return b;
  }
  /* Issue 1 (Stuart 16 Nov 21:29, iPhone photo): typing in the box, the keyboard and its bar covered it. While a field in the box has
     the keyboard, the box sits at the top of the visible screen, above the keyboard, and goes back when the keyboard closes. */
  function kbFit() { var b = $('solStep'), vv = window.visualViewport; if (!b || !vv) return; var f = document.activeElement, typing = !!(f && b.contains(f) && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)), kb = innerHeight - vv.height > 120;
    if (typing && kb) { if (!b.dataset.kb) b.dataset.kb = JSON.stringify({ t: b.style.top, l: b.style.left, r: b.style.right, bo: b.style.bottom, m: b.style.maxHeight, mg: b.style.margin }); b.style.top = Math.round(vv.offsetTop + 8) + 'px'; b.style.bottom = 'auto'; b.style.maxHeight = Math.round(vv.height - 16) + 'px'; b.style.margin = '0 auto'; b.style.left = ''; b.style.right = ''; try { f.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    else if (b.dataset.kb) { var o = JSON.parse(b.dataset.kb); delete b.dataset.kb; b.style.top = o.t; b.style.left = o.l; b.style.right = o.r; b.style.bottom = o.bo; b.style.maxHeight = o.m; b.style.margin = o.mg; } }
  if (window.visualViewport) { visualViewport.addEventListener('resize', kbFit); visualViewport.addEventListener('scroll', kbFit); }
  document.addEventListener('focusin', function () { setTimeout(kbFit, 300); }); document.addEventListener('focusout', function () { setTimeout(kbFit, 300); });
  function place(b, x, y) { var w = b.offsetWidth || 300, h = b.offsetHeight || 160; x = Math.max(4, Math.min(innerWidth - w - 4, x)); y = Math.max(4, Math.min(innerHeight - Math.min(h, 120), y)); b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto'; b.style.margin = '0'; }
  /* F17 (Stuart 16 Nov 12:46): a click that misses says so in the box, naming the nearest buoy; a buoy can also be typed by its code */
  function nearest(la, lo) { var best = null, bd = 1e9; (MK || []).forEach(function (m) { var dx = (m.lon - lo) * Math.cos(la * R) * 60, dy = (m.lat - la) * 60, d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = m; } }); return best ? { m: best, nm: bd } : null; }
  function miss(la, lo) { var n = nearest(la, lo); WZ.msg = 'No buoy there.' + (n ? ' Nearest: ' + n.m.id + ' ' + n.m.name + ', ' + (n.nm < 0.1 ? Math.round(n.nm * 1852) + ' m' : n.nm.toFixed(1) + ' nm') + ' away. Click on its dot, or type its code below.' : ''); wzRender(); return true; }
  function wzUse(m, la, lo, side, x, y) {   /* one buoy (or point) for the step in hand; m null = a point on the chart */
    var k = wzKey(), w = B.wl; WZ.msg = '';
    if (!m && window.__fsOnLand && window.__fsOnLand(la, lo) && ['start', 'wind', 'lee', 'fin'].indexOf(k) >= 0) { WZ.msg = 'That point is on land: tap in the water.'; wzRender(); return true; }   /* 21:33: no marks or line ends on land */
    if (k === 'start' && B.sk === 'line' && B.lm === 'square') { var q1 = m || { lat: la, lon: lo }; if (!squareFrom(q1.lat, q1.lon)) return true; }
    else if (k === 'start' && B.sk === 'line' && (B.lm === 'll' || B.lm === 'ping')) { WZ.msg = B.lm === 'll' ? 'Type the two ends above, or choose Tap the ends.' : 'Ping each end as you pass it, or choose Tap the ends.'; wzRender(); return true; }
    else if (k === 'start' && B.sk === 'line') { var l0 = window.__fsLine ? window.__fsLine() : {}, end = WZ.end || (l0.boat && !l0.pin ? 'pin' : 'boat'), q0 = m || { lat: la, lon: lo }; if (end === 'pin' && l0.boat && Math.hypot(q0.lat - l0.boat[0], (q0.lon - l0.boat[1]) * Math.cos(q0.lat * R)) * 60 < 0.011) { WZ.msg = 'That is the committee boat end: tap the pin end.'; wzRender(); return true; } if (window.__fsSetLine) window.__fsSetLine(end, q0.lat, q0.lon); WZ.end = end === 'boat' ? 'pin' : 'boat'; B.start = lineStart(); }
    else if (k === 'start') { B.start = m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }; }
    else if (k === 'wind' && w.wkind === 'buoy') { if (!m) return miss(la, lo); w.wcode = m.id; }
    else if (k === 'wind' && w.wkind === 'pt') { w.wpt = P(m, la, lo, 'Windward'); }
    else if (k === 'lee' && w.lkind === 'buoy') { if (!m) return miss(la, lo); w.lcode = m.id; }
    else if (k === 'lee' && w.lkind === 'pt') { w.lpt = P(m, la, lo, 'Leeward'); }
    else if (k === 'lee' && w.lkind === 'gate') { var gp = P(m, la, lo, w.g1 && !w.g2 ? 'B' : 'A'); if (!w.g1 || w.g2) { w.g1 = gp; w.g2 = null; } else if (Math.hypot(gp.lat - w.g1.lat, (gp.lon - w.g1.lon) * Math.cos(gp.lat * R)) * 60 < 0.01) { WZ.msg = 'That is the same mark as the first: tap the other end of the gate.'; wzRender(); return true; } else w.g2 = gp; w.lcode = ''; w.lcode2 = ''; }
    else if (k === 'marks') { if (!m) return miss(la, lo); if (side) { B.marks.push({ code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side: side }); } else { sidePop(m, x, y); wzRender(); return true; } }
    else if (k === 'fin' && B.fin === 'mark') { B.finish = m ? { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon } : { code: null, name: 'Point ' + la.toFixed(4) + ', ' + lo.toFixed(4), lat: la, lon: lo }; }
    else return false;
    saveB(); wzRender(); redraw(); return true;
  }
  function wzTap(la, lo, x, y) { return wzUse(hit(x, y), la, lo, null, x, y); }
  function wzCode(side) { var e = $('solCode'), v = e ? e.value.trim().toUpperCase() : '', m = mark(v); if (!v) return; if (!m) { WZ.msg = 'No Solent mark ' + v + ' in the 2026 list. Check the code on the course board.'; wzRender(); return; } wzUse(m, m.lat, m.lon, side || null, innerWidth / 2, innerHeight / 3); }
  function codeRow(k) { var w = B.wl, need = (k === 'start' && B.sk !== 'line') || (k === 'wind' && w.wkind === 'buoy') || (k === 'lee' && (w.lkind === 'buoy' || w.lkind === 'gate')) || k === 'marks' || (k === 'fin' && B.fin === 'mark'); if (!need) return '';
    return '<div class="solcl"><input id="solCode" class="solcode" maxlength="3" autocomplete="off" autocapitalize="characters" placeholder="Code, e.g. 3G" aria-label="Mark code">' + (k === 'marks' ? '<button class="btn" data-k="code" data-v="port">Add, Port</button><button class="btn" data-k="code" data-v="stbd">Add, Starboard</button>' : '<button class="btn" data-k="code" data-v="">Use</button><button class="btn" data-k="list">List of buoys</button>') + '</div>'; }
  function wzRender() {
    var b = $('solStep'); if (!b || !WZ.on) return; var k = wzKey(), w = B.wl, N = wzSteps().length, ok = wzOk(k);
    var seg = function (key, cur, opts) { return '<span class="seg">' + opts.map(function (o) { return '<button type="button" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</span>'; };
    var got = function (t) { return '<p class="solgot">' + t + '</p>'; }, h = '', ask = '';
    if (k === 'plan') { ask = 'Route this race, or not?'; var mm = models(); if (B.plan === 'route' && (!B.model || !mm.some(function (q) { return q.id === B.model; }))) B.model = (mm.filter(function (q) { return q.id === 'ukv'; })[0] || mm[0] || {}).id;
      h = '<div class="solcl">' + seg('plan', B.plan === 'route' ? 'route' : 'list', [['list', 'No routing'], ['route', 'Route it']]) + '</div>' + got(B.plan === 'route' ? 'Routes on one forecast model, plus a Fixed wind route if you give the wind on the water.' : 'The course as a list: bearing, distance and leg type for each leg. Route is one tap away later.');
      if (B.plan === 'route' && mm.length) { var sel = (B.models && B.models.length ? B.models : [B.model || 'ukv']); h += '<div class="solcl"><span class="solk">Models</span><span class="seg solmulti">' + mm.map(function (q) { return '<button type="button" data-k="models" data-v="' + q.id + '" aria-pressed="' + (sel.indexOf(q.id) >= 0) + '">' + esc(q.name) + '</button>'; }).join('') + '</span></div>' + got('Tick 1 to ' + mm.length + ' models; each gives its own route. Finer models (UKV, AROME) see more of the Solent.'); }
      var wr = B.wind; h += '<div class="solcl"><label class="solk" for="solTwd">Wind from</label><input id="solTwd" type="number" inputmode="numeric" min="0" max="360" value="' + (wr && wr.twd != null ? wr.twd : '') + '" placeholder="°T" aria-label="Wind direction, degrees true">°T <button class="btn" data-k="htw" title="Point the bow into the wind, then tap">Head to wind</button><button class="btn" data-k="tref" data-v="stbd" title="Sailing close-hauled on starboard, tap to record the heading">Starboard tack' + (B.tref && B.tref.stbd != null ? ' ✓' : '') + '</button><button class="btn" data-k="tref" data-v="port" title="Sailing close-hauled on port, tap to record the heading">Port tack' + (B.tref && B.tref.port != null ? ' ✓' : '') + '</button>' + (window.__navWind ? '<button class="btn" data-k="bw">From the boat</button>' : '') + '</div>' + got(wr && wr.twd != null ? 'For leg types, line bias and header or lift' + (wr.src && wr.src !== 'typed' ? ' (from ' + esc(wr.src) + ')' : '') + '.' : 'Optional: for leg types, line bias and header or lift.'); }
    else if (k === 'start') { var ln = B.sk === 'line', lm = B.lm || 'tap', l1 = window.__fsLine ? window.__fsLine() : {}, tr = !!l1.transit;
      ask = !ln ? 'Tap the start on the chart' : lm === 'square' ? (l1.boat && l1.pin ? 'Start line set' : 'Tap the committee boat') : lm === 'll' ? 'Type the two ends' : lm === 'ping' ? (lineNow() ? 'Start line set' : 'Ping each end as you pass it') : (WZ.end === 'pin' || (l1.boat && !l1.pin) ? 'Tap the pin end' : lineNow() ? 'Start line set' : 'Tap the committee boat end');
      h = '<div class="solcl">' + seg('sk', ln ? 'line' : 'buoy', [['line', 'A start line'], ['buoy', 'A buoy or point']]) + '</div>';
      if (ln) {
        h += '<div class="solcl solmulti">' + seg('lm', lm, [['tap', 'Tap the ends'], ['square', 'Square to the wind'], ['ll', 'Lat and long'], ['ping', 'Ping']]) + '</div>';
        if (lm === 'square') { var wq = windRef(); h += '<div class="solcl"><label class="solk" for="solLen">Length</label><input id="solLen" type="number" inputmode="numeric" min="20" max="3000" step="10" value="' + (B.llen || 300) + '"> m</div>' + got(wq && wq.twd != null ? 'Tap the committee boat: the pin is laid ' + (B.llen || 300) + ' m to port of it, square to the wind from ' + ('00' + Math.round(wq.twd)).slice(-3) + '°T.' : '<b>Give the wind first</b> (step 1, Wind from), so the line can be laid square to it.'); }
        else if (lm === 'll') h += '<div class="solcl"><label class="solk" for="solLLb">' + (tr ? 'Inshore' : 'Committee boat') + '</label><input id="solLLb" class="solll" autocomplete="off" placeholder="50 46.20N 1 17.70W" value="' + esc(l1.boat ? llTxt(l1.boat) : '') + '"></div><div class="solcl"><label class="solk" for="solLLp">' + (tr ? 'Outer mark' : 'Pin') + '</label><input id="solLLp" class="solll" autocomplete="off" placeholder="50.7700, -1.2900" value="' + esc(l1.pin ? llTxt(l1.pin) : '') + '"><button class="btn" data-k="llset">Set the line</button></div>' + got('Degrees and minutes (50 46.20N 1 17.70W) or decimal degrees (50.77, -1.295).');
        else if (lm === 'ping') h += '<div class="solcl">' + seg('lt', tr ? 'tr' : 'cb', [['cb', 'Committee boat and pin'], ['tr', 'Shore transit']]) + '</div><div class="solcl"><button class="btn" data-k="lping" data-v="boat">' + (tr ? 'Ping inshore' : 'Ping boat end') + '</button><button class="btn" data-k="lping" data-v="pin">' + (tr ? 'Ping outer mark' : 'Ping pin end') + '</button></div>' + got(tr ? 'Ping on the transit as close inshore as is safe, then at the outer distance mark.' : 'Ping each end as you pass it, with this phone\'s GPS. Re-ping if the committee moves the line.');
        else h += got('Tap the committee boat end on the chart, then the pin end.');
        h += got((tr ? 'Inshore: <b>' : 'Committee boat: <b>') + (l1.boat ? 'set' : '?') + '</b> · ' + (tr ? 'Outer mark: <b>' : 'Pin: <b>') + (l1.pin ? 'set' : '?') + '</b>.');
        var bi = biasNow(); if (bi) h += '<button class="solbias" data-k="bias" title="Zoom in to the line and draw the bias"><span class="solk">Bias · tap to see it</span><b>' + (bi.m < 2 ? 'Square to the wind: no bias' : esc(bi.end) + ' end favoured by ' + bi.m + ' m') + '</b><span>' + bi.deg + '° off square · line ' + bi.len + ' m</span></button>';
        else if (lineNow()) h += got('Line ' + Math.round(lineLen()) + ' m. Give the wind (step 1) to see the bias.');
        if (l1.boat || l1.pin) h += '<div class="solcl"><button class="btn" data-k="lclr">Clear line</button></div>'; }
      else h += got(B.start ? 'Start: <b>' + esc(B.start.name) + '</b>. Tap again to change it.' : 'A buoy, or a point on the start line.'); }
    else if (k === 'wind') { var wk = w.wkind === 'buoy' || w.wkind === 'pt' ? w.wkind : 'brg'; ask = wk === 'buoy' ? 'Tap the windward buoy' : wk === 'pt' ? 'Tap or ping the windward mark' : 'Windward mark: heading and distance'; h = '<div class="solcl">' + seg('wk', wk, [['buoy', 'A buoy'], ['pt', 'A point'], ['brg', 'Heading']]) + '</div>';
      h += wk === 'buoy' ? got(mark(w.wcode) ? 'Windward: <b>' + esc(w.wcode + ' ' + mark(w.wcode).name) + '</b>' : 'Tap it on the chart.') : wk === 'pt' ? got(w.wpt ? 'Windward: <b>' + esc(w.wpt.name) + '</b>' : 'Tap it on the chart, or ping it as you pass.') + '<div class="solcl"><button class="btn" data-k="pping" data-v="w">Ping here</button></div>' : '<div class="solcl"><input id="solSbrg" type="number" inputmode="numeric" min="0" max="360" value="' + (w.brg == null ? (B.wind && B.wind.twd != null ? B.wind.twd : '') : w.brg) + '" aria-label="Heading from the start, degrees true" placeholder="°T">°T <input id="solSdist" type="number" inputmode="decimal" min="0.2" max="10" step="0.1" value="' + w.dist + '" aria-label="Distance, nautical miles"> nm <button class="btn" data-k="fc">Forecast wind</button></div>' + (b.dataset.msg ? got(esc(b.dataset.msg)) : ''); }
    else if (k === 'lee') { var lk = w.lkind || 'start', g1 = gpt(1), g2 = gpt(2); ask = lk === 'buoy' ? 'Tap the leeward buoy' : lk === 'pt' ? 'Tap or ping the leeward mark' : lk === 'gate' ? (g1 && g2 ? 'Leeward gate set' : g1 ? 'Tap or ping the second gate mark' : 'Tap or ping the two gate marks') : 'Leeward mark: the start line'; h = '<div class="solcl">' + seg('lk', lk, [['start', 'Start line'], ['buoy', 'A buoy'], ['pt', 'A point'], ['gate', 'A gate']]) + '</div>';
      h += got(lk === 'buoy' ? (mark(w.lcode) ? 'Leeward: <b>' + esc(w.lcode + ' ' + mark(w.lcode).name) + '</b>' : 'Tap it on the chart.') : lk === 'pt' ? (w.lpt ? 'Leeward: <b>' + esc(w.lpt.name) + '</b>' : 'Tap it on the chart, or ping it.') : lk === 'gate' ? 'Gate: <b>' + (g1 ? esc(g1.short) : '?') + '</b> and <b>' + (g2 ? esc(g2.short) : '?') + '</b>. Two buoys or any two points. Round either.' : 'The boats round the start line.') + (lk === 'pt' || lk === 'gate' ? '<div class="solcl"><button class="btn" data-k="pping" data-v="' + (lk === 'pt' ? 'l' : 'g') + '">Ping here</button></div>' : ''); }
    else if (k === 'laps') { ask = 'Laps and finish'; h = '<div class="solcl"><span class="solk">Laps</span><span class="seg"><button type="button" data-k="lap" data-v="-1" aria-label="One lap fewer">−</button><button type="button" aria-pressed="true" disabled>' + (w.laps || 1) + '</button><button type="button" data-k="lap" data-v="1" aria-label="One lap more">+</button></span></div><div class="solcl"><span class="solk">Finish at</span>' + seg('wf', w.fin || 'lee', [['lee', 'Leeward'], ['start', 'Start line'], ['wind', 'Windward']]) + '</div><div class="solcl"><span class="solk">Leave marks to</span>' + seg('sd', w.side === 'starboard' ? 'starboard' : 'port', [['port', 'Port'], ['starboard', 'Starboard']]) + '</div>'; }
    else if (k === 'marks') { var n = B.marks.length; ask = n ? 'Tap the next buoy' : 'Tap the first buoy'; h = got('Then choose Port or Starboard. Tap a chip below to swap sides.') + '<div class="solchips">' + (n ? B.marks.map(function (m, i) { var st = m.side === 'stbd' || m.side === 'starboard'; return '<button class="solchip ' + (st ? 'stbd' : 'port') + '" data-k="side" data-v="' + i + '">' + (i + 1) + '. ' + esc(m.code || m.name) + ' ' + (st ? 'S' : 'P') + '</button>'; }).join('') : '<span class="soln">No buoys yet.</span>') + '</div><div class="solcl"><button class="btn" data-k="undo"' + (n ? '' : ' disabled') + '>Undo</button><button class="btn" data-k="list">All the buoys</button></div>'; }
    else if (k === 'fin') { ask = B.fin === 'mark' ? 'Tap the finish on the chart' : 'Finish at the start line'; h = '<div class="solcl">' + seg('fin', B.fin === 'mark' ? 'mark' : 'start', [['start', 'Start line'], ['mark', 'A buoy or point']]) + '</div>' + (B.fin === 'mark' ? got(B.finish ? 'Finish: <b>' + esc(B.finish.name) + '</b>' : 'Tap it on the chart.') : ''); }
    else if (k === 'wt') { ask = 'Wind and tide on the water'; h = got('Optional. Give the wind you see and Route adds a Fixed wind route beside the forecast routes. Leave it off to use the forecasts only.') + '<div class="fixbox" id="solFix">' + (window.__fsFix ? window.__fsFix.html() : '') + '</div>'; }
    else { var c = build(); ask = c.err ? 'Something is missing' : 'Check the course'; h = c.err ? got(esc(c.err)) : got('<b>' + c.marks.length + ' marks, about ' + nm(c) + ' nm.</b> ' + esc([c.start].concat(c.marks).concat([c.finish]).map(function (q) { return (q.gate ? 'Gate' : (q.name || '').replace(/^(Start|Finish), /, '').split(' ')[0]) + (q.side ? (q.side === 'starboard' ? ' S' : ' P') : ''); }).join(' → '))) + '<div class="solcl"><label class="solk" for="solSname">Name</label><input id="solSname" class="solname" maxlength="60" value="' + esc(B.name || 'Solent race') + '"></div>'; ok = !c.err; }
    h += codeRow(k);
    if (WZ.msg) h = '<p class="solmsg" role="status">' + esc(WZ.msg) + '</p>' + h;
    if (k === 'check') { var sn = window.__fsStartNow ? window.__fsStartNow() : null, now = Date.now() / 1000, ep = B.startAt && B.startAt > now - 600 ? B.startAt : (sn && sn.chosen && sn.ep > now ? sn.ep : Math.ceil((now + 1800) / 300) * 300);
      B.startAt = ep; var d = new Date(ep * 1000), pad = function (v) { return ('0' + v).slice(-2); }, loc = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      var rg = sn && sn.range, outR = rg && (ep < rg[0] - 3600 || ep > rg[1]);
      h += '<div class="solcl"><label class="solk" for="solStartT">Start</label><input id="solStartT" type="datetime-local" step="60" value="' + loc + '"><span class="soln">' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC</span></div>' + (outR ? '<p class="solmsg">That start is outside the forecasts on board. Choose a time within the next few days.</p>' : '');
      if (outR) ok = false; }
    var last = WZ.n === N;
    b.innerHTML = '<div class="solgrip" title="Drag to move"><span></span></div><div class="solhd"><span class="solstepn">Step ' + WZ.n + ' of ' + N + '</span><b>' + ask + '</b><button class="close" data-k="x" aria-label="Cancel">×</button></div>' + h +
      '<div class="solnav"><button class="btn" data-k="back"' + (WZ.n > 1 ? '' : ' disabled') + '>Back</button>' + (last ? '<button class="btn primary" data-k="go"' + (ok ? '' : ' disabled') + '>' + (B.plan === 'route' ? 'Route this race' : 'Show the course') + '</button>' : '<button class="btn primary" data-k="next"' + (ok ? '' : ' disabled') + '>Next</button>') + '</div>';
    b.hidden = false; if (b.style.top) { var r = b.getBoundingClientRect(); place(b, r.left, r.top); }
    if (k === 'wt' && window.__fsFix) window.__fsFix.bind($('solFix'));
  }
  /* ---- Mark (Stuart 17 Nov 05:49): the start line laid square to the wind, or typed in lat and long; the bias at once, without GPS,
     from the line and the wind given; tap it and the chart zooms into the line and draws the bias ---- */
  function llTxt(a) { var f = function (v, p, n) { var A = Math.abs(v), d = Math.floor(A), mm = (A - d) * 60; return d + ' ' + mm.toFixed(2) + (v >= 0 ? p : n); }; return f(a[0], 'N', 'S') + ' ' + f(a[1], 'E', 'W'); }
  function llParse(t) { t = String(t || '').trim().toUpperCase().replace(/[°'′]/g, ' ');
    var m = t.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/); if (m) { var a = +m[1], b = +m[2]; return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null; }
    m = t.match(/^(\d+)\s+(\d+(?:\.\d+)?)\s*([NS])[\s,]+(\d+)\s+(\d+(?:\.\d+)?)\s*([EW])$/); if (m) { var la = (+m[1] + m[2] / 60) * (m[3] === 'S' ? -1 : 1), lo = (+m[4] + m[5] / 60) * (m[6] === 'W' ? -1 : 1); return Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? [la, lo] : null; }
    return null; }
  function llSet() { var a = llParse(($('solLLb') || {}).value), b = llParse(($('solLLp') || {}).value);
    if (!a || !b) { WZ.msg = 'Could not read ' + (!a ? 'the committee boat' : 'the pin') + ': type 50 46.20N 1 17.70W or 50.77, -1.295.'; wzRender(); return; }
    if (Math.hypot(a[0] - b[0], (a[1] - b[1]) * Math.cos(a[0] * R)) * 60 < 0.005) { WZ.msg = 'The two ends are the same place.'; wzRender(); return; }
    if (window.__fsSetLine) { window.__fsSetLine('boat', a[0], a[1]); window.__fsSetLine('pin', b[0], b[1]); } B.start = lineStart(); WZ.msg = ''; saveB(); wzRender(); redraw(); }
  function squareFrom(la, lo) { var w = windRef(); if (!w || w.twd == null) { WZ.msg = 'Give the wind first (step 1, Wind from): the line is laid square to it.'; wzRender(); return false; }
    var L = (B.llen || 300) / 1852, b = ((w.twd - 90) % 360 + 360) % 360, q = offset({ lat: la, lon: lo }, b, L);   /* the pin to port of the committee boat, looking up the wind */
    if (window.__fsSetLine) { window.__fsSetLine('boat', la, lo); window.__fsSetLine('pin', q.lat, q.lon); } B.start = lineStart(); WZ.msg = ''; saveB(); return true; }
  function lineLen() { var l = lineNow(); if (!l) return 0; return Math.hypot((l.pin[1] - l.boat[1]) * Math.cos(l.boat[0] * R) * 60, (l.pin[0] - l.boat[0]) * 60) * 1852; }
  function biasNow() { var l = lineNow(), w = windRef(); if (!l || !w || w.twd == null) return null; var k = Math.cos(l.boat[0] * R) * 60, P = [(l.pin[1] - l.boat[1]) * k, (l.pin[0] - l.boat[0]) * 60], wx = Math.sin(w.twd * R), wy = Math.cos(w.twd * R), up = P[0] * wx + P[1] * wy, ang = Math.atan2(P[0], P[1]) / R, d = Math.abs(90 - Math.abs(((ang - w.twd + 540) % 360) - 180));
    return { end: up > 0 ? (l.transit ? 'Outer' : 'Pin') : (l.transit ? 'Inshore' : 'Committee boat'), m: Math.round(Math.abs(up) * 1852), deg: Math.round(d), len: Math.round(lineLen()), twd: w.twd }; }
  var BV = { on: false };
  function biasView() { var l = lineNow(); if (!l) return; BV.on = true; var s0 = Math.min(l.boat[0], l.pin[0]), n0 = Math.max(l.boat[0], l.pin[0]), w0 = Math.min(l.boat[1], l.pin[1]), e0 = Math.max(l.boat[1], l.pin[1]), pad = Math.max(n0 - s0, (e0 - w0) * Math.cos(n0 * R), 0.002) * 0.6;
    var sb = $('solStep'); if (sb && !sb.hidden) { sb.hidden = true; BV.box = true; }   /* the whole screen for the picture; the step box comes back with the next tap */
    if (window.__fsFitBox) window.__fsFitBox(s0 - pad, n0 + pad, w0 - pad / Math.cos(n0 * R), e0 + pad / Math.cos(n0 * R)); redraw(); toast('The line and its bias. Tap the chart to carry on.'); }
  function biasDraw(ctx, X, Y) {
    var l = lineNow(), bi = biasNow(); if (!l || !bi) return; var tw = bi.twd;
    var A = [X(l.boat[1]), Y(l.boat[0])], P = [X(l.pin[1]), Y(l.pin[0])], mla = (l.boat[0] + l.pin[0]) / 2, mlo = (l.boat[1] + l.pin[1]) / 2, ula = mla + 0.2 / 60 * Math.cos(tw * R), ulo = mlo + 0.2 / 60 * Math.sin(tw * R) / Math.cos(mla * R);
    var ux = X(ulo) - X(mlo), uy = Y(ula) - Y(mla), un = Math.hypot(ux, uy) || 1, wx = ux / un, wy = uy / un;   /* up the wind on the screen, whichever way the chart is turned */
    var up = function (q) { return q[0] * wx + q[1] * wy; }, F = up(P) > up(A) ? P : A, U = F === P ? A : P, px = -wy, py = wx, Lpx = Math.hypot(P[0] - A[0], P[1] - A[1]) || 1;
    var t = (F[0] - U[0]) * px + (F[1] - U[1]) * py, S = [U[0] + t * px, U[1] + t * py], sl = Math.hypot(S[0] - U[0], S[1] - U[1]) || 1;   /* the square line through the end further down the wind, and the gap to the favoured end */
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(34,197,94,.22)'; ctx.beginPath(); ctx.moveTo(U[0], U[1]); ctx.lineTo(F[0], F[1]); ctx.lineTo(S[0], S[1]); ctx.closePath(); ctx.fill();
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#F2B233'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(U[0] - (S[0] - U[0]) / sl * 20, U[1] - (S[1] - U[1]) / sl * 20); ctx.lineTo(S[0] + (S[0] - U[0]) / sl * 20, S[1] + (S[1] - U[1]) / sl * 20); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(F[0], F[1]); ctx.stroke();
    var M0 = [(A[0] + P[0]) / 2, (A[1] + P[1]) / 2], aw = Math.max(40, Lpx * 0.35); ctx.strokeStyle = '#6FA9E0'; ctx.fillStyle = '#6FA9E0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M0[0] + wx * aw * 1.6, M0[1] + wy * aw * 1.6); ctx.lineTo(M0[0] + wx * aw * 0.5, M0[1] + wy * aw * 0.5); ctx.stroke();
    var tip = [M0[0] + wx * aw * 0.5, M0[1] + wy * aw * 0.5]; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + wx * 12 + px * 7, tip[1] + wy * 12 + py * 7); ctx.lineTo(tip[0] + wx * 12 - px * 7, tip[1] + wy * 12 - py * 7); ctx.closePath(); ctx.fill();
    ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#fff';
    var lab = bi.m < 2 ? 'Square to the wind: no bias' : bi.end + ' end favoured · ' + bi.m + ' m · ' + bi.deg + '°'; ctx.strokeText(lab, F[0], F[1] - 26); ctx.fillText(lab, F[0], F[1] - 26);
    var wl = 'Wind ' + ('00' + Math.round(tw)).slice(-3) + '°'; ctx.strokeText(wl, M0[0] + wx * aw * 1.7, M0[1] + wy * aw * 1.7); ctx.fillText(wl, M0[0] + wx * aw * 1.7, M0[1] + wy * aw * 1.7); ctx.restore(); }
  /* M8 (Stuart 17 Nov 05:13): test mode. A practice boat sails the course (or a sample course off Cowes) on the chart, eight times
     quicker than life after a two-and-a-half-minute start sequence; nothing goes to the crew; Stop puts your own race back. */
  var SIM = { on: false };
  function rh(a, b) { var k = Math.cos(a.lat * R), dx = (b.lon - a.lon) * k * 60, dy = (b.lat - a.lat) * 60; return { nm: Math.hypot(dx, dy), brg: (Math.atan2(dx, dy) / R + 360) % 360 }; }
  function testBar(on) { var b = $('solTestBar'); if (!on) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'solTestBar'; b.className = 'solpick soltest'; document.body.appendChild(b); } b.innerHTML = '<span title="A practice boat sails the course. Nothing goes to the crew."><b>TEST MODE</b></span><button id="solTestX">Stop</button>'; $('solTestX').onclick = testStop; }
  function testStart() {
    if (SIM.on || !window.__fsSim) return; css(); var lq = window.__fsLine ? window.__fsLine() : {};
    SIM.saved = { B: JSON.parse(JSON.stringify(B)), line: JSON.parse(JSON.stringify(lq)) }; SIM.push = window.__fsBcPush; window.__fsBcPush = function () {};
    QUIET = true; try {
      var c = build(); if (!c || c.err) { B.type = 'marks'; B.marks = parseBoard('3F P, 2C S').marks; B.fin = 'start'; B.finish = null; }
      if (!windRef()) B.wind = { twd: 230, src: 'typed', at: Date.now() };
      var l = window.__fsLine(); if (!(l.boat && l.pin)) { window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); }
      B.sk = 'line'; B.start = lineStart(); B.plan = 'list'; B.startAt = Math.round(Date.now() / 1000 + 150); saveB(); go(true); B.shown = Date.now(); B.raced = null; saveB();
    } finally { QUIET = false; }
    try { if (window.__fsGun) window.__fsGun(B.startAt); } catch (e) {}
    var lg = $('solLegs'); if (lg) lg.hidden = true; window.__fsSim(true); SIM.on = true; SIM.i = 0; SIM.pos = null; testBar(true); SIM.t = setInterval(simStep, 1000); simStep(); toast('Test mode: the gun is in two and a half minutes.');
  }
  function simStep() {
    if (!SIM.on) return; var l = lineNow(), c = window.__navCourse && window.__navCourse(); if (!l || !c) return;
    var now = Date.now() / 1000, g = B.startAt || now, mid = { lat: (l.boat[0] + l.pin[0]) / 2, lon: (l.boat[1] + l.pin[1]) / 2 }, pts = (c.marks || []).concat(c.finish ? [c.finish] : []), first = pts[0]; if (!first) return;
    var k = Math.cos(mid.lat * R), up = rh(mid, first).brg, at = function (p, b, m) { return { lat: p.lat + m / 1852 * Math.cos(b * R) / 60, lon: p.lon + m / 1852 * Math.sin(b * R) / (60 * k) }; }, kn = 6, cog, p;
    if (now < g) { p = at(mid, (up + 180) % 360, Math.max(0, (g - now) * 2.2 - 15)); cog = up; kn = 4.3; }   /* closing the line at about 4 knots, crossing just after the gun */
    else { if (!SIM.pos) SIM.pos = at(mid, up, 10); var tgt = pts[SIM.i]; if (!tgt) return; var r = rh(SIM.pos, tgt), step = 6 * 0.514 * 8; cog = (r.brg + Math.sin(now / 25) * 7 + 360) % 360;
      if (r.nm * 1852 <= step) { SIM.pos = { lat: tgt.lat, lon: tgt.lon }; SIM.i++; try { var PL2 = window.__fsPlot || window.__navPlot; if (PL2 && PL2.setMark) PL2.setMark(Math.min(SIM.i, pts.length - 1)); } catch (e) {} if (SIM.i >= pts.length) { clearInterval(SIM.t); toast('Test mode: finished. Stop test mode puts your own race back.'); } }
      else SIM.pos = at(SIM.pos, cog, step); p = SIM.pos; }
    window.__fsSimFix(p.lat, p.lon, kn, cog);
  }
  function testStop() {
    if (!SIM.on) return; clearInterval(SIM.t); SIM.on = false; window.__fsSim(false); testBar(false); var sv0 = SIM.saved || {};
    QUIET = true; try { if (sv0.B) { B = sv0.B; sv(BKEY, B); } ['boat', 'pin'].forEach(function (e) { var a = sv0.line && sv0.line[e]; window.__fsSetLine(e, a ? a[0] : null, a ? a[1] : null); }); if (window.__fsClearCourse) window.__fsClearCourse(); var c0 = build(); if (B.shown && c0 && !c0.err) go(true); } catch (e) {} finally { QUIET = false; }
    if (SIM.push) window.__fsBcPush = SIM.push; try { var PL3 = window.__fsPlot || window.__navPlot; if (PL3 && PL3.C.on) PL3.toggle(false); } catch (e) {} redraw(); toast('Test mode stopped: your own race is back.'); }
  /* ---- The start sequence (Stuart 16 Nov 12:46 "the usual start sequence with count down"; 17 Nov 05:04 sounds and vibration on).
     A box under the top bar from 15 minutes before the gun: the countdown, Sync at a signal (to the whole minute), one minute more or
     less, 5-4-1-0 or 3-2-1-0, the flag (P, I, Z, U, black), Postpone (AP) and General recall. A long sound at each signal and short
     ones in the last ten seconds; the phone vibrates with them. The gun goes to Route's start and to the crew on the boat code. ---- */
  var SQ = { shown: false, last: null, ac: null, hide: 0 };
  var FLAGS = { P: 'P: the ordinary start.', I: 'I: in the last minute, a boat on the course side must sail round an end to start.', Z: 'Z: in the last minute, a boat in the triangle (the line ends and the first mark) takes a 20% penalty.', U: 'U: in the last minute, a boat in the triangle is disqualified.', B: 'Black flag: in the last minute, a boat in the triangle is disqualified.' };
  function sqSignals() { return (B.seq === 3 ? [180, 120, 60, 0] : [300, 240, 60, 0]); }
  function sqTone(long) { try { SQ.ac = SQ.ac || new (window.AudioContext || window.webkitAudioContext)(); var a = SQ.ac, o = a.createOscillator(), g = a.createGain(); o.frequency.value = long ? 880 : 1200; g.gain.value = 0.25; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (long ? 0.9 : 0.15)); } catch (e) {} try { if (navigator.vibrate) navigator.vibrate(long ? [500] : [80]); } catch (e) {} }
  function sqGun(t) { B.startAt = Math.round(t); B.raced = null; saveB(); try { if (window.__fsGun) window.__fsGun(B.startAt); } catch (e) {} sqRender(); }
  function sqOn() { var now = Date.now() / 1000; if (SQ.hide && SQ.hide === B.startAt) return false; if (B.pp) return true; return !!(B.startAt && now > B.startAt - 900 && now < B.startAt + 60); }
  function sqRender() {
    var b = $('solSeq'), on = window.FS_MARK && sqOn(); if (!on) { if (b) b.hidden = true; return; } css();
    if (!b) { b = document.createElement('div'); b.id = 'solSeq'; b.className = 'solseq'; b.setAttribute('role', 'timer'); document.body.appendChild(b);
      b.addEventListener('click', function (e) { var t = e.target.closest('[data-q]'); if (!t) return; var q = t.dataset.q, now = Date.now() / 1000; try { SQ.ac = SQ.ac || new (window.AudioContext || window.webkitAudioContext)(); if (SQ.ac.resume) SQ.ac.resume(); } catch (x) {}
        if (q === 'sync') { var rem = B.startAt - now; sqGun(now + Math.round(rem / 60) * 60); toast('Synced: gun at ' + clk(B.startAt) + '.'); }
        else if (q === 'm1') sqGun(B.startAt - 60); else if (q === 'p1') sqGun(B.startAt + 60);
        else if (q === 'seq') { B.seq = B.seq === 3 ? 5 : 3; saveB(); sqRender(); }
        else if (q === 'flag') { var o = ['P', 'I', 'Z', 'U', 'B'], i = o.indexOf(B.flag || 'P'); B.flag = o[(i + 1) % o.length]; saveB(); sqRender(); toast(FLAGS[B.flag]); }
        else if (q === 'ap') { B.pp = true; saveB(); sqRender(); toast('Postponed. Tap Warning when the warning signal goes.'); }
        else if (q === 'warn') { B.pp = false; sqGun(now + (B.seq === 3 ? 3 : 5) * 60); }
        else if (q === 'recall') { sqGun(now + (B.seq === 3 ? 3 : 5) * 60); toast('General recall: a new sequence, gun at ' + clk(B.startAt) + '. Sync at the next signal.'); }
        else if (q === 'x') { SQ.hide = B.startAt; b.hidden = true; } }); }
    var now = Date.now() / 1000, rem = B.startAt ? B.startAt - now : null, mm = function (v) { var a = Math.max(0, Math.round(Math.abs(v))); return (v < 0 ? '+' : '') + Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2); };
    var over = ''; try { var lc = window.__fsLineCalc ? window.__fsLineCalc(B.startAt) : null; if (lc && lc.over && rem != null && rem <= 60 && rem > -5) over = (B.flag && B.flag !== 'P' ? FLAGS[B.flag].replace(/^[^:]*: /, '') : 'On the course side: go back before the gun.'); } catch (e) {}
    b.innerHTML = '<div class="sqhd"><button class="sqflag" data-q="flag" title="The preparatory flag. Tap to change">' + (B.flag === 'B' ? 'BLACK' : (B.flag || 'P')) + '</button><b class="sqt">' + (B.pp ? 'AP' : rem > 0 ? mm(rem) : 'GUN ' + mm(rem)) + '</b><span class="sqg">' + (B.pp ? 'Postponed' : 'Gun ' + clk(B.startAt)) + '</span><button class="sqx" data-q="x" aria-label="Hide the start sequence">×</button></div>' +
      (over ? '<p class="sqover">' + esc(over) + '</p>' : '') +
      '<div class="sqrow">' + (B.pp ? '<button class="btn primary" data-q="warn">Warning signal now</button>' : '<button class="btn primary" data-q="sync">Sync</button><button class="btn" data-q="m1">−1 min</button><button class="btn" data-q="p1">+1 min</button><button class="btn" data-q="seq">' + (B.seq === 3 ? '3-2-1-0' : '5-4-1-0') + '</button><button class="btn" data-q="ap">AP</button><button class="btn" data-q="recall">Recall</button>') + '</div>';
    b.hidden = false; b.classList.toggle('sqlast', rem != null && rem <= 60 && rem > 0); }
  function clk(t) { var d = new Date(t * 1000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + (d.getSeconds() ? ':' + ('0' + d.getSeconds()).slice(-2) : ''); }
  if (window.FS_MARK) setInterval(function () { sqRender(); if (!B.startAt || B.pp) return; var rem = Math.round(B.startAt - Date.now() / 1000); if (rem === SQ.last) return; SQ.last = rem; if (sqSignals().indexOf(rem) >= 0) sqTone(true); else if (rem > 0 && rem <= 10) sqTone(false); }, 250);
  /* M2 (Stuart 17 Nov 05:04): laylines to the next mark when it is upwind, from the typed wind (Mark) or the boat's wind (Mark+) */
  function laylines(ctx, X, Y) {
    var w = windRef(), nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {} var twd = nw && nw[1] != null ? nw[1] : w && w.twd != null ? w.twd : null; if (twd == null) return;
    var pc = null; try { pc = window.__fsPlot && window.__fsPlot.C && window.__fsPlot.C.on && window.__fsPlot.calc ? window.__fsPlot.calc() : null; } catch (e) {}
    var m = null, from = null; if (pc && pc.ok && !pc.m.route) { m = pc.m; from = pc.f ? { lat: pc.f.la, lon: pc.f.lo } : null; }
    else { var cc = window.__navCourse && window.__navCourse(); if (!cc || !cc.marks || !cc.marks.length) return; var pts = [cc.start].concat(cc.marks); for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], q = pts[i], br = (Math.atan2((q.lon - a.lon) * Math.cos(a.lat * R), q.lat - a.lat) / R + 360) % 360; if (Math.abs(((br - twd + 540) % 360) - 180) < 50) { m = q; from = a; break; } } }
    if (!m) return; if (from) { var b2 = (Math.atan2((m.lon - from.lon) * Math.cos(from.lat * R), m.lat - from.lat) / R + 360) % 360; if (Math.abs(((b2 - twd + 540) % 360) - 180) >= 60) return; }
    var ba = (w && w.ba) || 42, Lnm = from ? Math.max(0.3, Math.hypot((m.lon - from.lon) * Math.cos(m.lat * R), m.lat - from.lat) * 60 * 1.1) : 1;
    ctx.save(); ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.font = '700 10px Inter, sans-serif'; ctx.fillStyle = '#ff8a1f';
    [[twd + 180 - ba, 'PORT LAYLINE'], [twd + 180 + ba, 'STBD LAYLINE']].forEach(function (q) { var b = q[0], la = m.lat + Lnm * Math.cos(b * R) / 60, lo = m.lon + Lnm * Math.sin(b * R) / (60 * Math.cos(m.lat * R)); ctx.beginPath(); ctx.moveTo(X(m.lon), Y(m.lat)); ctx.lineTo(X(lo), Y(la)); ctx.stroke(); ctx.fillText(q[1], X(lo) + 4, Y(la)); });
    ctx.restore(); }
  /* M21 (Stuart 17 Nov 06:14): the start line is a committee boat and a yellow buoy with a flag on top; a point that is not a buoy is a target in a colour */
  function boatSym(ctx, x, y) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(11, -2); ctx.lineTo(7, 5); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-5, -7, 8, 5); ctx.strokeRect(-5, -7, 8, 5); ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(2, -19); ctx.stroke(); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(2, -19); ctx.lineTo(11, -16); ctx.lineTo(2, -13); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function pinSym(ctx, x, y) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -18); ctx.stroke(); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(9, -15); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function target(ctx, x, y, col) { ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 2 * Math.PI); ctx.fill(); [[0, -14, 0, -10], [0, 10, 0, 14], [-14, 0, -10, 0], [10, 0, 14, 0]].forEach(function (q) { ctx.beginPath(); ctx.moveTo(x + q[0], y + q[1]); ctx.lineTo(x + q[2], y + q[3]); ctx.stroke(); }); ctx.restore(); }
  function extras(ctx, X, Y) {
    var l = window.__fsLine ? window.__fsLine() : {};
    if (window.FS_MARK && BV.on) biasDraw(ctx, X, Y);
    if (window.FS_MARK && l.boat && l.pin) { ctx.save(); ctx.strokeStyle = '#4CC38A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(l.boat[1]), Y(l.boat[0])); ctx.lineTo(X(l.pin[1]), Y(l.pin[0])); ctx.stroke(); var bi = biasNow(); if (bi && !BV.on && bi.m >= 2) { var fe = /Pin|Outer/.test(bi.end) ? l.pin : l.boat; ctx.font = '700 10px Inter, sans-serif'; ctx.fillStyle = '#4CC38A'; ctx.fillText('FAVOURED ' + bi.m + ' m', X(fe[1]) + 12, Y(fe[0]) + 12); } ctx.restore(); }
    if (window.FS_MARK) { if (l.boat) boatSym(ctx, X(l.boat[1]), Y(l.boat[0])); if (l.pin) pinSym(ctx, X(l.pin[1]), Y(l.pin[0])); }
    if (window.FS_MARK && !window.__navPlot) laylines(ctx, X, Y);   /* Mark+ draws its own laylines, with the tide, in Route+'s plotter */
    if (!window.FS_MARK) return; var w = B.wl, pts = [];
    if (B.type === 'wl') { if (w.wkind === 'pt' && w.wpt && !w.wpt.code) pts.push([w.wpt, '#d946ef']); if (w.lkind === 'pt' && w.lpt && !w.lpt.code) pts.push([w.lpt, '#f97316']); if (w.lkind === 'gate') [w.g1, w.g2].forEach(function (g) { if (g && !g.code) pts.push([g, '#f97316']); }); if (w.wkind === 'brg') { var W0 = windward(); if (W0) pts.push([W0, '#d946ef']); } }
    if (B.start && !B.start.code && !B.start.line) pts.push([B.start, '#22c55e']); if (B.fin === 'mark' && B.finish && !B.finish.code) pts.push([B.finish, '#ef4444']);
    pts.forEach(function (q) { target(ctx, X(q[0].lon), Y(q[0].lat), q[1]); });
  }
  /* ---- Settings, Charts: the switch and the button ---- */
  /* Stuart 15 Nov 11:26: "on solent race zoom should be set to allow the max": the Closest zoom slider (Settings, Chart) goes to 6 times */
  function zoomMax() { var z = $('zoomMax'); if (!z || +z.value >= +z.max) return; z.value = z.max; z.dispatchEvent(new Event('input', { bubbles: true })); z.dispatchEvent(new Event('change', { bubbles: true })); }
  function setOn(v) { C.on = !!v; sv(KEY, C); if (C.on) { load(); zoomMax(); } redraw(); var e = $('solentOn'); if (e) e.checked = C.on; }
  function hookSettings() {
    var e = $('solentOn'); if (e) { e.checked = !!C.on; e.onchange = function () { setOn(e.checked); }; }
    var bt = $('solentBuild'); if (bt) bt.onclick = function () { if (!C.on) setOn(true); openBuilder(); };
  }
  /* M12 (Stuart 17 Nov 05:30): at the gun the racing window opens by itself: the plotter, steering to the next mark (rhumb line) or along the route */
  if (window.FS_MARK) setInterval(function () { var now = Date.now() / 1000; if (!B.shown || !B.startAt || B.raced === B.startAt || now < B.startAt || now > B.startAt + 600) return; B.raced = B.startAt; saveB(); try { var PL = window.__fsPlot || window.__navPlot; if (PL && !PL.C.on) PL.toggle(true); toast('The gun: the racing window is open. Tap MARK or ROUTE in it to steer to the next mark or along the route.'); } catch (e) {} }, 1000);
  (window.__fsOverlays = window.__fsOverlays || []).push(overlay);
  window.__fsTapHook = tapHook;
  window.FSSolent = { test: function (on) { if (on === false) testStop(); else testStart(); }, testing: function () { return SIM.on; }, share: share, applyRemote: applyRemote, showList: showList, newCourse: newCourse, windRef: windRef, legType: legType, start: startCard, chain: chain, step: wzOpen, stepState: function () { return { on: WZ.on, n: WZ.n, key: WZ.on ? wzKey() : null }; }, go: go, list: list, on: setOn, isOn: function () { return !!C.on; }, open: openBuilder, marks: function () { return MK; }, load: load, board: parseBoard, build: build, state: function () { return B; }, set: function (o) { Object.assign(B, o); saveB(); render(); redraw(); }, tap: tapHook };
  if (C.on) load();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookSettings); else hookSettings();
})();
