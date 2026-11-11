/* FirstShift Route AIS engine. Decodes NMEA 0183 AIS sentences (!AIVDM / !AIVDO), keeps a list of targets, works out
   CPA and TCPA against your own boat, and can make AIS sentences for testing (the emulator encodes real !AIVDM lines
   that go through exactly the same decoder as a feed from the boat or from a shore server).
   Message types: 1, 2, 3 (Class A position), 5 (Class A static and voyage), 18 (Class B position), 19 (Class B extended),
   24 (Class B static, parts A and B). No dependencies; runs in a browser, a phone app shell or Node. */
(function (root) {
  var R = Math.PI / 180;

  /* ---------- 6-bit payload ---------- */
  function bitsOf(payload, fill) {
    var b = [];
    for (var i = 0; i < payload.length; i++) {
      var c = payload.charCodeAt(i) - 48; if (c > 40) c -= 8;
      for (var k = 5; k >= 0; k--) b.push((c >> k) & 1);
    }
    if (fill) b.length -= fill;
    return b;
  }
  function uint(b, s, n) { var v = 0; for (var i = s; i < s + n && i < b.length; i++) v = v * 2 + b[i]; return v; }
  function sint(b, s, n) { var v = uint(b, s, n); return v >= Math.pow(2, n - 1) ? v - Math.pow(2, n) : v; }
  var SIXCHR = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_ !"#$%&\'()*+,-./0123456789:;<=>?';
  function text(b, s, n) { var t = ''; for (var i = 0; i < n; i += 6) t += SIXCHR[uint(b, s + i, 6)]; return t.replace(/@+$/, '').replace(/\s+$/, ''); }

  /* ---------- sentences, with multi-part messages put back together ---------- */
  var parts = {};
  function checksumOk(line) {
    var m = /^[!$]([^*]*)\*([0-9A-F]{2})\s*$/i.exec(line); if (!m) return true;   // no checksum: accept
    var x = 0; for (var i = 0; i < m[1].length; i++) x ^= m[1].charCodeAt(i);
    return x === parseInt(m[2], 16);
  }
  function decodeLine(line) {
    line = String(line).trim(); var i = line.indexOf('!AIVD'); if (i < 0) return null; line = line.slice(i);
    if (!checksumOk(line)) return null;
    var f = line.split('*')[0].split(','); if (f.length < 7) return null;
    var total = +f[1], num = +f[2], seq = f[3], payload = f[5], fill = +f[6] || 0, own = f[0] === '!AIVDO';
    if (total > 1) {
      var key = seq + ':' + f[4]; parts[key] = parts[key] || [];
      parts[key][num - 1] = { p: payload, f: fill };
      var got = parts[key]; for (var k = 0; k < total; k++) if (!got[k]) return null;
      payload = got.map(function (x) { return x.p; }).join(''); fill = got[total - 1].f; delete parts[key];
    }
    var m = decodePayload(bitsOf(payload, fill)); if (m) m.own = own;
    return m;
  }
  function decodePayload(b) {
    var type = uint(b, 0, 6), m = { type: type, mmsi: uint(b, 8, 30) };
    if (type >= 1 && type <= 3) {
      m.status = uint(b, 38, 4); m.sog = uint(b, 50, 10); m.lon = sint(b, 61, 28) / 600000; m.lat = sint(b, 89, 27) / 600000;
      m.cog = uint(b, 116, 12) / 10; m.hdg = uint(b, 128, 9); m.cls = 'A';
    } else if (type === 18 || type === 19) {
      m.sog = uint(b, 46, 10); m.lon = sint(b, 57, 28) / 600000; m.lat = sint(b, 85, 27) / 600000; m.cog = uint(b, 112, 12) / 10; m.hdg = uint(b, 124, 9); m.cls = 'B';
      if (type === 19) { m.name = text(b, 143, 120); m.shiptype = uint(b, 263, 8); m.len = uint(b, 271, 9) + uint(b, 280, 9); }
    } else if (type === 5) {
      m.callsign = text(b, 70, 42); m.name = text(b, 112, 120); m.shiptype = uint(b, 232, 8); m.len = uint(b, 240, 9) + uint(b, 249, 9); m.dest = text(b, 302, 120); m.cls = 'A';
    } else if (type === 24) {
      var part = uint(b, 38, 2);
      if (part === 0) m.name = text(b, 40, 120); else { m.shiptype = uint(b, 40, 8); m.callsign = text(b, 90, 42); m.len = uint(b, 132, 9) + uint(b, 141, 9); }
      m.cls = 'B';
    } else return m;
    if (m.sog != null) m.sog = m.sog === 1023 ? null : m.sog / 10;
    if (m.cog === 360) m.cog = null;
    if (m.hdg === 511) m.hdg = null;
    if (m.lat != null && (Math.abs(m.lat) > 90 || Math.abs(m.lon) > 180)) { m.lat = m.lon = null; }
    return m;
  }

  /* ---------- targets ---------- */
  function Targets() { this.t = {}; }
  Targets.prototype.add = function (m, now) {
    if (!m || !m.mmsi || m.own) return null;
    var x = this.t[m.mmsi] || (this.t[m.mmsi] = { mmsi: m.mmsi, track: [] });
    ['name', 'callsign', 'shiptype', 'len', 'dest', 'cls', 'status'].forEach(function (k) { if (m[k] != null && m[k] !== '') x[k] = m[k]; });
    if (m.lat != null) {
      x.lat = m.lat; x.lon = m.lon; x.sog = m.sog; x.cog = m.cog; x.hdg = m.hdg; x.at = now || Date.now();
      var tr = x.track, last = tr[tr.length - 1]; if (!last || x.at - last[2] > 30000) { tr.push([m.lat, m.lon, x.at]); if (tr.length > 240) tr.shift(); }
    }
    return x;
  };
  Targets.prototype.list = function (maxAgeMs, now) { var o = [], n = now || Date.now(), t = this.t; Object.keys(t).forEach(function (k) { var x = t[k]; if (x.lat != null && n - x.at <= (maxAgeMs || 6 * 60000)) o.push(x); }); return o; };

  /* ---------- CPA and TCPA: straight-line motion of both boats from now ---------- */
  function cpa(own, tg) {
    var k = Math.cos(own.lat * R);
    var px = (tg.lon - own.lon) * 60 * k, py = (tg.lat - own.lat) * 60;   // nm, target relative to you
    var vo = own.sog || 0, vt = tg.sog || 0, co = (own.cog || 0) * R, ct = (tg.cog == null ? tg.hdg || 0 : tg.cog) * R;
    var vx = vt * Math.sin(ct) - vo * Math.sin(co), vy = vt * Math.cos(ct) - vo * Math.cos(co);   // kn, relative velocity
    var v2 = vx * vx + vy * vy, t = v2 > 1e-6 ? -(px * vx + py * vy) / v2 : 0;   // hours
    var tc = Math.max(0, t), dx = px + vx * tc, dy = py + vy * tc;
    return { cpa: Math.hypot(dx, dy), tcpa: t * 60, range: Math.hypot(px, py), brg: (Math.atan2(px, py) / R + 360) % 360 };
  }

  /* ---------- making sentences (the emulator) ---------- */
  function putU(b, v, n) { for (var k = n - 1; k >= 0; k--) b.push(Math.floor(v / Math.pow(2, k)) % 2); }
  function putS(b, v, n) { putU(b, v < 0 ? Math.pow(2, n) + v : v, n); }
  function putT(b, s, n) { s = String(s || '').toUpperCase(); for (var i = 0; i < n / 6; i++) { var c = SIXCHR.indexOf(s[i] || '@'); putU(b, c < 0 ? 0 : c, 6); } }
  function armour(b) {
    var fill = (6 - b.length % 6) % 6; for (var i = 0; i < fill; i++) b.push(0);
    var s = ''; for (var j = 0; j < b.length; j += 6) { var v = uint(b, j, 6); s += String.fromCharCode(v < 40 ? v + 48 : v + 56); }
    return { p: s, fill: fill };
  }
  function wrap(p, fill, total, num, seq) {
    var body = 'AIVDM,' + (total || 1) + ',' + (num || 1) + ',' + (seq == null ? '' : seq) + ',A,' + p + ',' + fill, x = 0;
    for (var i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    return '!' + body + '*' + ('0' + x.toString(16).toUpperCase()).slice(-2);
  }
  function encodePosition(t) {   // type 1 for Class A, 18 for Class B
    var b = [], A = t.cls !== 'B', sog = t.sog == null ? 1023 : Math.round(t.sog * 10), cog = t.cog == null ? 3600 : Math.round(t.cog * 10) % 3600, hdg = t.hdg == null ? 511 : Math.round(t.hdg) % 360;
    putU(b, A ? 1 : 18, 6); putU(b, 0, 2); putU(b, t.mmsi, 30);
    if (A) { putU(b, t.status || 0, 4); putS(b, -128, 8); putU(b, sog, 10); putU(b, 0, 1); putS(b, Math.round(t.lon * 600000), 28); putS(b, Math.round(t.lat * 600000), 27); putU(b, cog, 12); putU(b, hdg, 9); putU(b, 60, 6); putU(b, 0, 2); putU(b, 0, 3); putU(b, 0, 1); putU(b, 0, 19); }
    else { putU(b, 0, 8); putU(b, sog, 10); putU(b, 0, 1); putS(b, Math.round(t.lon * 600000), 28); putS(b, Math.round(t.lat * 600000), 27); putU(b, cog, 12); putU(b, hdg, 9); putU(b, 60, 6); putU(b, 0, 2); putU(b, 1, 1); putU(b, 0, 1); putU(b, 1, 1); putU(b, 1, 1); putU(b, 1, 1); putU(b, 0, 1); putU(b, 0, 1); putU(b, 1, 1); putU(b, 0, 20); }
    var a = armour(b); return [wrap(a.p, a.fill)];
  }
  function encodeStatic(t, seq) {   // type 5 (two sentences) for Class A, type 24 parts A and B for Class B
    var b = [], a, out = [];
    if (t.cls !== 'B') {
      putU(b, 5, 6); putU(b, 0, 2); putU(b, t.mmsi, 30); putU(b, 0, 2); putU(b, 0, 30); putT(b, t.callsign || '', 42); putT(b, t.name || '', 120); putU(b, t.shiptype || 70, 8);
      var L = t.len || 100; putU(b, Math.round(L / 2), 9); putU(b, L - Math.round(L / 2), 9); putU(b, 8, 6); putU(b, 8, 6); putU(b, 1, 4); putU(b, 0, 20); putU(b, 60, 8); putT(b, t.dest || '', 120); putU(b, 0, 1); putU(b, 0, 1);
      a = armour(b); var p1 = a.p.slice(0, 60), p2 = a.p.slice(60);
      out.push(wrap(p1, 0, 2, 1, seq % 10), wrap(p2, a.fill, 2, 2, seq % 10));
    } else {
      putU(b, 24, 6); putU(b, 0, 2); putU(b, t.mmsi, 30); putU(b, 0, 2); putT(b, t.name || '', 120); putU(b, 0, 8); a = armour(b); out.push(wrap(a.p, a.fill));
      b = []; putU(b, 24, 6); putU(b, 0, 2); putU(b, t.mmsi, 30); putU(b, 1, 2); putU(b, t.shiptype || 36, 8); putT(b, 'FS', 18); putU(b, 0, 4); putU(b, 0, 20); putT(b, t.callsign || '', 42);
      var L2 = t.len || 11; putU(b, Math.round(L2 / 2), 9); putU(b, L2 - Math.round(L2 / 2), 9); putU(b, 2, 6); putU(b, 2, 6); putU(b, 0, 6); a = armour(b); out.push(wrap(a.p, a.fill));
    }
    return out;
  }

  function shipKind(t) { var s = t.shiptype || 0; return s === 36 || s === 37 ? 'yacht' : s >= 70 && s <= 89 ? 'ship' : s >= 60 && s <= 69 ? 'passenger' : s === 30 ? 'fishing' : s ? 'other' : (t.cls === 'B' ? 'yacht' : 'ship'); }

  var api = { decodeLine: decodeLine, Targets: Targets, cpa: cpa, encodePosition: encodePosition, encodeStatic: encodeStatic, shipKind: shipKind };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FSAIS = api;
})(this);
