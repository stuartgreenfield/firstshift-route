/* FirstShift boat simulator (F37 and P11, Stuart 18 Nov 2026: "Two boat simulators to test everything virtually: one sends a complete
   NMEA 0183 stream as a boat's router does, one an NMEA 2000 stream; normal sailing, every sentence, and faults (dropouts, bad data).
   All four tools"). Earlier (16 Nov 11:35): "A software that creates a virtual router we can pretend to log that creates a stream of
   made up data in NMEA 0183 format and 2000 so we can test everything".

   One simulated boat sails a windward-leeward course off Cowes: beats on the tacks, tacks with a speed loss and a recovery, rounds the
   windward mark, runs with gybes, rounds the leeward mark and beats again. The wind shifts and gusts, the tide sets the boat, the depth
   changes with position, two AIS targets move about. Every value is worked out once a tick (the "truth") and then written out as:
     - NMEA 0183 sentences, as a router or plotter sends them (talkers GP, II, WI, HC, SD, YX, AI)
     - NMEA 2000 in the two text forms Route+ reads: Yacht Devices RAW and Actisense "NMEA 2000 ASCII"
   Faults can be switched on at any time, for a set number of seconds or until switched off (see FAULTS below).

   Used three ways: by server.js (a virtual router on TCP and UDP, with a control page), by the automated tests (in-process, fed straight
   into the app), and in a browser page (the same file, as window.FSBoatSim). No packages needed. The same seed gives the same sail. */
(function (root) {
  'use strict';
  var R = Math.PI / 180, KN = 1852 / 3600;   /* m/s in a knot */

  /* ---------- small helpers ---------- */
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function n360(a) { a %= 360; return a < 0 ? a + 360 : a; }
  function n180(a) { a = n360(a); return a > 180 ? a - 360 : a; }
  function fx(v, d) { return v == null || !isFinite(v) ? '' : v.toFixed(d); }
  function ck(body) { var x = 0; for (var i = 0; i < body.length; i++) x ^= body.charCodeAt(i); return ('0' + x.toString(16).toUpperCase()).slice(-2); }
  function sentence(body, start) { return (start || '$') + body + '*' + ck(body); }
  function llTxt(v, isLat) { var h = isLat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E'), a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; if (m >= 59.99995) { d++; m = 0; } return [(isLat ? ('0' + d).slice(-2) : ('00' + d).slice(-3)) + ('0' + m.toFixed(4)).slice(-7), h]; }
  function hms(t) { var d = new Date(t); return ('0' + d.getUTCHours()).slice(-2) + ('0' + d.getUTCMinutes()).slice(-2) + ('0' + d.getUTCSeconds()).slice(-2) + '.' + ('00' + d.getUTCMilliseconds()).slice(-3).slice(0, 2); }
  function dmy(t) { var d = new Date(t); return ('0' + d.getUTCDate()).slice(-2) + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCFullYear() % 100).slice(-2); }
  function dest(la, lo, brg, nm) { var k = Math.cos(la * R); return [la + nm * Math.cos(brg * R) / 60, lo + nm * Math.sin(brg * R) / (60 * k)]; }
  function rhumb(a, b) { var k = Math.cos((a[0] + b[0]) / 2 * R), dy = (b[0] - a[0]) * 60, dx = (b[1] - a[1]) * 60 * k; return { nm: Math.hypot(dx, dy), brg: n360(Math.atan2(dx, dy) / R) }; }

  /* ---------- the boat ---------- */
  /* a simple, smooth polar for a 36 ft racing yacht: speed rises with the wind (levelling off near 8.5 kn upwind of the hull speed),
     nothing below 25 degrees, best upwind VMG near 42 degrees, fastest on a broad reach. Only for testing: never used for routing. */
  function polar(tws, twa) {
    var a = Math.abs(twa); if (a < 25) return 0;
    var base = 9.0 * (1 - Math.exp(-tws / 6.5)), g;   /* about 6 kn at 42 degrees and 7.6 kn on a beam reach in 12 kn of wind */
    if (a <= 90) g = Math.pow(Math.sin((a - 25) / 65 * 90 * R), 0.3); else g = 1 - 0.2 * Math.pow((a - 90) / 90, 1.4);
    return Math.max(0, base * g);
  }
  var FEEDS = ['gps', 'log', 'wind', 'heading', 'depth', 'env', 'attitude', 'tide', 'ais'];

  function Sim(opt) {
    opt = opt || {};
    var self = this, rnd = rng(opt.seed || 20261118), t0 = opt.start || Date.UTC(2026, 10, 18, 10, 0, 0);
    this.opt = opt; this.rnd = rnd;
    this.cfg = {
      twd: opt.twd != null ? opt.twd : 225, tws: opt.tws != null ? opt.tws : 12,   /* mean wind: south-westerly 12 kn */
      shift: opt.shift != null ? opt.shift : 8, shiftMin: 7,                      /* oscillating shifts: +/- 8 degrees every 7 minutes */
      gust: opt.gust != null ? opt.gust : 0.18,                                   /* gusts: +/- 18% */
      set: opt.set != null ? opt.set : 95, drift: opt.drift != null ? opt.drift : 1.1,   /* tide: east-going 1.1 kn */
      variation: opt.variation != null ? opt.variation : -1.2,                   /* magnetic variation, west negative (Solent 2026 about 1 W) */
      upTwa: 42, downTwa: 148, leg: opt.leg || 1.2,                              /* windward-leeward legs of 1.2 nm */
      tackSecs: opt.tackSecs || 9, accelSecs: opt.accelSecs || 22,              /* a tack turns in 9 s; full speed back in about 22 s */
      keel: 2.2, transducer: 0.5                                                 /* draught and depth transducer depth below the surface (m) */
    };
    var start = opt.pos || [50.7840, -1.2950];   /* off Cowes, clear water */
    this.b = { t: t0, la: start[0], lo: start[1], hdg: n360(this.cfg.twd + this.cfg.upTwa), bsp: 6, tack: -1, mode: 'beat', turnTo: null, turnFrom: null, turnAt: 0, slow: 1, legStart: start.slice(), pitchPh: 0, pressure: 1013.4, air: 14.5, sea: 13.2 };
    /* windward mark straight upwind of the start, leeward mark at the start */
    this.marks = { lw: start.slice(), ww: dest(start[0], start[1], this.cfg.twd, this.cfg.leg) };
    this.target = 'ww';
    this.ais = [
      { mmsi: 235012345, name: 'TEST YACHT', cls: 'B', shiptype: 36, len: 11, la: start[0] + 0.01, lo: start[1] - 0.02, sog: 6.2, cog: 300 },
      { mmsi: 232004567, name: 'TEST FERRY', cls: 'A', shiptype: 60, len: 140, callsign: 'MTST1', dest: 'SOUTHAMPTON', la: start[0] - 0.015, lo: start[1] + 0.03, sog: 13.5, cog: 315 }
    ];
    this.faults = {};   /* name -> { until: ms or 0 for until switched off, feed, rate } */
    this.frozen = {};
    this.n = 0; this.truth = null;
    this.step(0);
  }

  Sim.prototype.wind = function (t) {
    var c = this.cfg, s = (t - this.opt.start0 || t) / 1000, m = t / 60000;
    var twd = c.twd + c.shift * Math.sin(2 * Math.PI * m / c.shiftMin) + 2.5 * Math.sin(2 * Math.PI * m / 2.3 + 1);
    var tws = c.tws * (1 + c.gust * (0.6 * Math.sin(2 * Math.PI * m / 1.6) + 0.4 * Math.sin(2 * Math.PI * m / 0.55 + 2)));
    return { twd: n360(twd), tws: Math.max(0.5, tws) };
  };
  Sim.prototype.tide = function (t) { var c = this.cfg, h = (t / 3600000) % 12.42; return { set: n360(c.set + 15 * Math.sin(2 * Math.PI * h / 12.42)), drift: Math.max(0, c.drift * (0.75 + 0.25 * Math.cos(2 * Math.PI * h / 6.21))) }; };
  Sim.prototype.depth = function (la, lo) { var x = (lo + 1.2950) * 60 * Math.cos(la * R), y = (la - 50.7840) * 60; return Math.max(3.2, 14 + 5 * Math.sin(x * 2.1) * Math.cos(y * 1.7) - 4 * Math.exp(-((x - 0.4) * (x - 0.4) + (y - 0.6) * (y - 0.6)) / 0.05)); };   /* a shoal patch NE of the start */

  /* one step of dt seconds */
  Sim.prototype.step = function (dt) {
    var b = this.b, c = this.cfg; b.t += dt * 1000; var W = this.wind(b.t), T = this.tide(b.t), mk = this.marks[this.target], to = rhumb([b.la, b.lo], mk);
    /* steering: round each mark within 40 m. The point of sail comes from where the mark lies against the wind: closer than the
       upwind angle, beat (tack on the layline); further off than the downwind angle, run (gybe on the layline); between, sail straight at it */
    if (to.nm < 0.022) { this.target = this.target === 'ww' ? 'lw' : 'ww'; b.legStart = [b.la, b.lo]; mk = this.marks[this.target]; to = rhumb([b.la, b.lo], mk); }
    var offWind = Math.abs(n180(W.twd - to.brg)), want = offWind < c.upTwa + 2 ? 'beat' : offWind > c.downTwa - 2 ? 'run' : 'reach', ang = want === 'beat' ? c.upTwa : c.downTwa;
    if (b.mode !== want && b.t - b.turnAt < 15000) want = b.mode;   /* no flicking between modes */
    if (want === 'reach') { if (b.turnTo) b.turnTo = null; if (b.mode !== 'reach') { b.mode = 'reach'; b.turnAt = b.t; } }
    var curTwa = n180(W.twd - b.hdg);
    if (want !== 'reach' && !b.turnTo) {
      var side = curTwa >= 0 ? 1 : -1;   /* +1: wind from starboard, starboard tack */
      if (want !== b.mode) { b.mode = want; side = n180(W.twd - to.brg) >= 0 ? 1 : -1; b.turnFrom = b.hdg; b.turnTo = side; b.turnAt = b.t; }
      else if (b.t - b.turnAt > 20000) {
        /* the mark lies between the two tack (or gybe) headings; turn when it reaches the other tack's heading (the layline) */
        var hs = n360(W.twd - side * ang), ho = n360(W.twd + side * ang), offS = Math.abs(n180(to.brg - hs)), offO = Math.abs(n180(to.brg - ho)), dO = Math.abs(n180(ho - hs));
        if (offS >= dO - 1 && offO < offS) { b.turnFrom = b.hdg; b.turnTo = -side; b.turnAt = b.t; }   /* also when the mark has been overstood or passed */
      }
    }
    var tgtHdg;
    if (b.turnTo) {
      var goal = n360(W.twd - b.turnTo * ang), f = Math.min(1, (b.t - b.turnAt) / 1000 / c.tackSecs);
      tgtHdg = n360(b.turnFrom + n180(goal - b.turnFrom) * f); if (f >= 1) { b.turnTo = null; b.slow = 0.55; }
    } else if (want === 'reach') tgtHdg = to.brg;
    else { var sd = curTwa >= 0 ? 1 : -1; tgtHdg = n360(W.twd - sd * ang); }
    b.hdg = tgtHdg;
    var twa = n180(W.twd - b.hdg), vp = polar(W.tws, twa);
    if (b.turnTo) b.slow = Math.max(0.5, b.slow - dt * 0.05);
    else b.slow = Math.min(1, b.slow + dt / c.accelSecs * 0.9);
    var tgt = vp * b.slow; b.bsp += (tgt - b.bsp) * Math.min(1, dt / 3);
    if (!isFinite(b.bsp) || b.bsp < 0) b.bsp = 0;
    /* heel and leeway: heel grows with the wind across the boat; leeway grows as the boat slows (the keel needs speed to lift) */
    var heel = Math.min(28, Math.pow(W.tws, 1.25) * 0.75 * Math.max(0, Math.sin(Math.min(Math.abs(twa), 110) * R)) * (Math.abs(twa) > 120 ? 0.35 : 1));
    var lee = Math.abs(twa) < 100 && b.bsp > 0.3 ? Math.min(12, 3.2 * heel / 20 * Math.pow(6 / Math.max(1.5, b.bsp), 1.2)) : 0;
    var sgn = twa >= 0 ? 1 : -1;   /* wind from starboard: heel to port (negative roll), leeway to port */
    b.heel = -sgn * heel; b.lee = lee;
    var ctw = n360(b.hdg - sgn * lee), vx = b.bsp * Math.sin(ctw * R) + T.drift * Math.sin(T.set * R), vy = b.bsp * Math.cos(ctw * R) + T.drift * Math.cos(T.set * R);
    b.sog = Math.hypot(vx, vy); b.cog = n360(Math.atan2(vx, vy) / R);
    var k = Math.cos(b.la * R); b.la += vy * dt / 3600 / 60; b.lo += vx * dt / 3600 / (60 * k);
    b.pitchPh += dt * 2 * Math.PI / 4.5; b.pitch = 1.5 + 2.5 * Math.sin(b.pitchPh) * Math.min(1, W.tws / 15);
    b.pressure -= dt * 0.6 / 3600; b.air = 14.5 + 0.5 * Math.sin(b.t / 3600000); b.sea = 13.2;
    /* apparent wind from true wind and boat speed, the exact inverse of how Route+ works out true wind (so the test can compare) */
    var xt = W.tws * Math.cos(twa * R), yt = W.tws * Math.sin(twa * R), xa = xt + b.bsp;
    var aws = Math.hypot(xa, yt), awa = Math.atan2(yt, xa) / R;
    this.ais.forEach(function (a) { var kk = Math.cos(a.la * R); a.la += a.sog * Math.cos(a.cog * R) * dt / 3600 / 60; a.lo += a.sog * Math.sin(a.cog * R) * dt / 3600 / (60 * kk); });
    var dep = this.depth(b.la, b.lo);
    this.truth = { t: b.t, lat: b.la, lon: b.lo, sog: b.sog, cog: b.cog, hdg: b.hdg, hdgM: n360(b.hdg - c.variation), variation: c.variation, bsp: b.bsp,
      twd: W.twd, tws: W.tws, twa: twa, awa: awa, aws: aws, heel: b.heel, pitch: b.pitch, leeway: b.lee, set: T.set, drift: T.drift,
      depthSurface: dep, depthTransducer: dep - c.transducer, dptOffset: c.transducer, pressure: b.pressure, air: b.air, sea: b.sea,
      mode: b.turnTo ? (b.mode === 'beat' ? 'tacking' : 'gybing') : b.mode, target: this.target };
    this.n++;
    return this.truth;
  };

  /* ---------- faults ---------- */
  var FAULTS = {
    silence:   'Nothing sent at all: the router has gone quiet (link lost)',
    drop:      'One feed stops (gps, log, wind, heading, depth, env, attitude, tide, ais): its sentences and PGNs are left out',
    freeze:    'One feed sticks at its last values while the rest go on (a sensor hung)',
    spike:     'One feed sends a wild value now and then (depth 0.0 m or 999 m, 45 kn boat speed, 199 kn wind)',
    badck:     'One line in five has a wrong checksum',
    garbage:   'Junk lines in the stream: half lines, binary noise, unknown sentences',
    empty:     'Sentences with their value fields left empty',
    gpsinvalid:'The GPS has no fix: RMC and GLL status V, GGA quality 0',
    jump:      'The position jumps 5 nm for a few seconds, then comes back',
    twogps:    'A second GPS (talker GN) 40 m away and 0.3 kn different sends too',
    magonly:   'Heading only as magnetic (HDM) with no variation sent anywhere',
    twbad:     'The instruments send a true wind 20 degrees off what the apparent wind and boat speed say',
    n2kna:     'NMEA 2000 fields set to "not available" (0xFFFF and the like)',
    nocksum:   'Sentences without a checksum (allowed by NMEA 0183, sent by some older kit)',
    slow:      'Everything at a fifth of the normal rate',
    burst:     'Everything at ten times the normal rate',
    split:     'Lines cut in two across network packets (the server only)',
    endings:   'Lines ending in CR only or LF only instead of CR LF (the server only)',
    disconnect:'The server drops every connected client (the server only)',
    shallow:   'The depth falls to 2.0 m below the surface (a shoal under the boat)',
    collision: 'The ferry turns onto a collision course: it heads straight for the boat at 15 kn from 2 nm away'
  };
  Sim.FAULTS = FAULTS; Sim.FEEDS = FEEDS;
  Sim.prototype.fault = function (name, on, o) {
    if (!FAULTS[name]) throw new Error('Unknown fault: ' + name);
    var key = name + (o && o.feed ? ':' + o.feed : '');
    if (on === false) { delete this.faults[key]; if (name === 'freeze' && o && o.feed) delete this.frozen[o.feed]; return; }
    if ((name === 'drop' || name === 'freeze' || name === 'spike') && !(o && FEEDS.indexOf(o.feed) >= 0)) throw new Error('Say which feed: ' + FEEDS.join(', '));
    this.faults[key] = { name: name, feed: o && o.feed, until: o && o.secs ? this.b.t + o.secs * 1000 : 0, since: this.b.t };
    if (name === 'collision') {   /* the ferry 2 nm ahead of the boat's track, steering to meet it: aimed at where the boat will be when they meet */
      var T = this.truth, F = this.ais[1], p = dest(T.lat, T.lon, T.cog, 2), v = 15, tt = 2 / (v + T.sog);   /* roughly head-on, hours to meet */
      var meet = dest(T.lat, T.lon, T.cog, T.sog * tt); F.la = p[0]; F.lo = p[1]; F.sog = v; F.cog = rhumb([F.la, F.lo], meet).brg;
    }
  };
  Sim.prototype.clearFaults = function () { this.faults = {}; this.frozen = {}; };
  Sim.prototype.has = function (name, feed) { var k = name + (feed ? ':' + feed : ''), f = this.faults[k]; if (!f) return false; if (f.until && this.b.t > f.until) { delete this.faults[k]; if (name === 'freeze') delete this.frozen[feed]; return false; } return true; };
  Sim.prototype.active = function () { var self = this; return Object.keys(this.faults).filter(function (k) { var f = self.faults[k]; return self.has(f.name, f.feed); }); };

  /* the values a feed sends, after freeze and spike faults */
  Sim.prototype.view = function () {
    var T = Object.assign({}, this.truth), self = this, r = this.rnd;
    var groups = { gps: ['lat', 'lon', 'sog', 'cog'], log: ['bsp'], wind: ['awa', 'aws', 'twa', 'tws', 'twd'], heading: ['hdg', 'hdgM'], depth: ['depthSurface', 'depthTransducer'], env: ['pressure', 'air', 'sea'], attitude: ['heel', 'pitch'], tide: ['set', 'drift'] };
    Object.keys(groups).forEach(function (g) {
      if (self.has('freeze', g)) { if (!self.frozen[g]) { self.frozen[g] = {}; groups[g].forEach(function (k) { self.frozen[g][k] = T[k]; }); } groups[g].forEach(function (k) { T[k] = self.frozen[g][k]; }); }
      if (self.has('spike', g) && r() < 0.15) { if (g === 'depth') { var v = r() < 0.5 ? 0 : 999; T.depthSurface = v; T.depthTransducer = v; } else if (g === 'log') T.bsp = 45; else if (g === 'wind') { T.aws = 199; T.tws = 199; } else if (g === 'gps') { T.sog = 99; } else if (g === 'heading') { T.hdg = n360(T.hdg + 180); T.hdgM = n360(T.hdgM + 180); } else if (g === 'attitude') { T.heel = 85; } else if (g === 'env') { T.pressure = 1400; } else if (g === 'tide') { T.drift = 25; } }
    });
    if (this.has('jump')) { var j = dest(T.lat, T.lon, 45, 5); T.lat = j[0]; T.lon = j[1]; }
    if (this.has('shallow')) { T.depthSurface = 2.0; T.depthTransducer = 2.0 - this.cfg.transducer; }
    if (this.has('twbad')) { T.twa = n180(T.twa + 20); T.twd = n360(T.twd + 20); }
    return T;
  };

  /* ---------- NMEA 0183 ---------- */
  /* rates in ticks of 0.25 s: heading and apparent wind four times a second, the rest once a second, AIS and statics slower */
  Sim.prototype.nmea0183 = function (tick) {
    var T = this.view(), out = [], self = this, t = T.t, q = tick % 4 === 0, emp = this.has('empty');
    function on(feed) { return !self.has('drop', feed); }
    function put(body, start) { if (emp && /,\d/.test(body) && self.rnd() < 0.5) body = body.replace(/,(-?\d+(\.\d+)?)/g, ','); var s = self.has('nocksum') ? (start || '$') + body : sentence(body, start); if (self.has('badck') && self.rnd() < 0.2) s = s.slice(0, -2) + (s.slice(-2) === '00' ? '01' : '00'); out.push(s); }
    if (on('heading')) {
      if (this.has('magonly')) put('HCHDM,' + fx(T.hdgM, 1) + ',M');
      else { put('IIHDT,' + fx(T.hdg, 1) + ',T'); if (q) put('HCHDG,' + fx(T.hdgM, 1) + ',0.0,E,' + fx(Math.abs(T.variation), 1) + ',' + (T.variation < 0 ? 'W' : 'E')); }
    }
    if (on('wind')) { put('IIMWV,' + fx(n360(T.awa), 1) + ',R,' + fx(T.aws, 1) + ',N,A'); if (q) { put('IIVWR,' + fx(Math.abs(T.awa), 1) + ',' + (T.awa < 0 ? 'L' : 'R') + ',' + fx(T.aws, 1) + ',N,' + fx(T.aws * KN, 1) + ',M,' + fx(T.aws * 1.852, 1) + ',K'); put('IIMWV,' + fx(n360(T.twa), 1) + ',T,' + fx(T.tws, 1) + ',N,A'); put('WIMWD,' + fx(T.twd, 1) + ',T,' + fx(n360(T.twd - T.variation), 1) + ',M,' + fx(T.tws, 1) + ',N,' + fx(T.tws * KN, 1) + ',M'); } }
    if (!q) return out;
    if (on('gps')) {
      var bad = this.has('gpsinvalid'), la = llTxt(T.lat, true), lo = llTxt(T.lon, false);
      put('GPRMC,' + hms(t) + ',' + (bad ? 'V' : 'A') + ',' + la[0] + ',' + la[1] + ',' + lo[0] + ',' + lo[1] + ',' + fx(T.sog, 1) + ',' + fx(T.cog, 1) + ',' + dmy(t) + ',' + fx(Math.abs(T.variation), 1) + ',' + (T.variation < 0 ? 'W' : 'E') + ',' + (bad ? 'N' : 'A'));
      put('GPGGA,' + hms(t) + ',' + la[0] + ',' + la[1] + ',' + lo[0] + ',' + lo[1] + ',' + (bad ? 0 : 1) + ',' + (bad ? '00' : '10') + ',' + (bad ? '' : '0.9') + ',' + (bad ? '' : '4.0,M,47.0,M') + (bad ? ',,,' : '') + ',,');
      put('GPGLL,' + la[0] + ',' + la[1] + ',' + lo[0] + ',' + lo[1] + ',' + hms(t) + ',' + (bad ? 'V' : 'A') + ',' + (bad ? 'N' : 'A'));
      put('GPVTG,' + fx(T.cog, 1) + ',T,' + fx(n360(T.cog - T.variation), 1) + ',M,' + fx(T.sog, 1) + ',N,' + fx(T.sog * 1.852, 1) + ',K,' + (bad ? 'N' : 'A'));
      if (this.has('twogps')) { var g2 = dest(T.lat, T.lon, 90, 40 / 1852), la2 = llTxt(g2[0], true), lo2 = llTxt(g2[1], false); put('GNRMC,' + hms(t) + ',A,' + la2[0] + ',' + la2[1] + ',' + lo2[0] + ',' + lo2[1] + ',' + fx(T.sog + 0.3, 1) + ',' + fx(T.cog, 1) + ',' + dmy(t) + ',,,A'); }
    }
    if (on('log')) put('IIVHW,' + (on('heading') && !this.has('magonly') ? fx(T.hdg, 1) : '') + ',T,' + (on('heading') ? fx(T.hdgM, 1) : '') + ',M,' + fx(T.bsp, 2) + ',N,' + fx(T.bsp * 1.852, 2) + ',K');
    if (on('depth')) { put('SDDPT,' + fx(T.depthTransducer, 1) + ',' + fx(this.cfg.transducer, 1)); put('SDDBT,' + fx(T.depthTransducer / 0.3048, 1) + ',f,' + fx(T.depthTransducer, 1) + ',M,' + fx(T.depthTransducer / 1.8288, 1) + ',F'); }
    if (on('tide')) put('IIVDR,' + fx(T.set, 1) + ',T,' + fx(n360(T.set - T.variation), 1) + ',M,' + fx(T.drift, 2) + ',N');
    if (on('attitude') || on('env')) {
      var x = []; if (on('attitude')) x.push('A,' + fx(T.heel, 1) + ',D,ROLL', 'A,' + fx(T.pitch, 1) + ',D,PTCH'); if (on('env')) x.push('P,' + fx(T.pressure / 1000, 4) + ',B,BARO', 'C,' + fx(T.air, 1) + ',C,AIR');
      put('IIXDR,' + x.join(','));
    }
    if (on('env') && tick % 20 === 0) { put('YXMTW,' + fx(T.sea, 1) + ',C'); put('WIMDA,' + fx(T.pressure * 0.02953, 3) + ',I,' + fx(T.pressure / 1000, 4) + ',B,' + fx(T.air, 1) + ',C,' + fx(T.sea, 1) + ',C,,,,,' + fx(T.twd, 1) + ',T,' + fx(n360(T.twd - T.variation), 1) + ',M,' + fx(T.tws, 1) + ',N,' + fx(T.tws * KN, 1) + ',M'); }
    if (on('ais') && tick % 8 === 0) {
      var A = this.ais[(tick / 8) % this.ais.length], api = this.aisApi();
      if (api) { api.encodePosition({ mmsi: A.mmsi, cls: A.cls, lat: A.la, lon: A.lo, sog: A.sog, cog: A.cog, hdg: A.cog }).forEach(function (l) { out.push(l); }); if (tick % 120 === 0) api.encodeStatic(A, tick / 120).forEach(function (l) { out.push(l); }); }
    }
    if (this.has('garbage') && this.rnd() < 0.5) { var junk = ['$IIMW', '\u0001ÿ$$$', '$PSMDST,1,2,3*7A', 'hello from the router', '$GPRMC,,,,,,,,,,,,', '$IIXXX,1,2,3*00']; out.splice(Math.floor(this.rnd() * out.length), 0, junk[Math.floor(this.rnd() * junk.length)]); }
    return out;
  };
  Sim.prototype.aisApi = function () {
    if (this._ais !== undefined) return this._ais;
    try { this._ais = typeof module !== 'undefined' && module.exports ? require(this.opt.aisPath || '../../web/ais.js') : (root.FSAIS || null); } catch (e) { this._ais = null; }
    return this._ais;
  };

  /* ---------- NMEA 2000 ---------- */
  function le(v, n) { var o = [], x = v < 0 ? v + Math.pow(2, 8 * n) : v; for (var i = 0; i < n; i++) { o.push(x % 256); x = Math.floor(x / 256); } return o; }
  function u16(v, s) { return v == null ? [0xFF, 0xFF] : le(Math.round(v / s), 2); }
  function s16(v, s) { return v == null ? [0xFF, 0x7F] : le(Math.round(v / s), 2); }
  function rad(deg) { return deg * R; }
  /* the messages a racing boat's bus carries, single-frame, field layouts from the NMEA 2000 PGN definitions (as published in the open
     canboat database), the same layouts Route+ decodes. src: the sending device's address on the bus */
  Sim.prototype.pgns = function (tick) {
    var T = this.view(), out = [], self = this, sid = this.n % 253, na = this.has('n2kna') && this.rnd() < 0.3, q = tick % 4 === 0;
    function on(feed) { return !self.has('drop', feed); }
    function add(pgn, src, bytes) { while (bytes.length < 8) bytes.push(0xFF); out.push({ pgn: pgn, src: src, prio: pgn === 129025 || pgn === 127250 || pgn === 127257 ? 2 : pgn === 130306 ? 2 : 3, data: bytes.slice(0, 8) }); }
    if (on('heading')) { if (this.has('magonly')) add(127250, 0x0B, [sid].concat(u16(na ? null : rad(T.hdgM), 1e-4), s16(null), s16(null), [0xFD])); else add(127250, 0x0B, [sid].concat(u16(na ? null : rad(T.hdg), 1e-4), s16(0, 1e-4), s16(rad(T.variation), 1e-4), [0xFC])); }
    if (on('attitude')) add(127257, 0x0B, [sid].concat(s16(null), s16(na ? null : rad(T.pitch), 1e-4), s16(na ? null : rad(T.heel), 1e-4), [0xFF]));
    if (on('wind')) { add(130306, 0x12, [sid].concat(u16(na ? null : T.aws * KN, 0.01), u16(rad(n360(T.awa)), 1e-4), [0xFA])); if (q) add(130306, 0x12, [sid].concat(u16(T.tws * KN, 0.01), u16(rad(n360(T.twa)), 1e-4), [0xFB])); }
    if (on('gps')) { var bad = this.has('gpsinvalid'); add(129025, 0x05, bad || na ? le(0x7FFFFFFF, 4).concat(le(0x7FFFFFFF, 4)) : le(Math.round(T.lat * 1e7), 4).concat(le(Math.round(T.lon * 1e7), 4))); if (q) add(129026, 0x05, [sid, 0xFC].concat(u16(bad ? null : rad(T.cog), 1e-4), u16(bad ? null : T.sog * KN, 0.01), [0xFF, 0xFF])); }
    if (!q) return out;
    if (on('heading') && !this.has('magonly')) add(127258, 0x05, [sid, 0xF1].concat(le(0xFFFF, 2), s16(rad(T.variation), 1e-4), [0xFF, 0xFF]));
    if (on('log')) add(128259, 0x15, [sid].concat(u16(na ? null : T.bsp * KN, 0.01), u16(null), [0x00, 0xFF, 0xFF]));
    if (on('depth')) add(128267, 0x16, [sid].concat(na ? le(0xFFFFFFFF, 4) : le(Math.round(T.depthTransducer / 0.01), 4), le(Math.round(this.cfg.transducer / 0.001), 2), [0xFF]));
    if (on('env') && tick % 20 === 0) {
      add(130312, 0x17, [sid, 0, 1].concat(u16(T.air + 273.15, 0.01), u16(null), [0xFF]));
      add(130316, 0x17, [sid, 0, 0].concat(le(Math.round((T.sea + 273.15) / 0.001), 3), u16(null)));
      add(130314, 0x17, [sid, 0, 0].concat(le(Math.round(T.pressure * 100 / 0.1), 4), [0xFF]));
    }
    return out;
  };
  function hex2(b) { return ('0' + b.toString(16).toUpperCase()).slice(-2); }
  /* Yacht Devices RAW: "hh:mm:ss.sss R 09F80105 01 02 03 04 05 06 07 08" (YDWG-02 manual, RAW protocol) */
  function ydRaw(m, t) {
    var dp = (m.pgn >> 16) & 1, pf = (m.pgn >> 8) & 0xFF, ps = pf < 240 ? 0xFF : m.pgn & 0xFF, id = ((m.prio & 7) << 26) | (dp << 24) | (pf << 16) | (ps << 8) | (m.src & 0xFF);
    var d = new Date(t); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2) + ':' + ('0' + d.getUTCSeconds()).slice(-2) + '.' + ('00' + d.getUTCMilliseconds()).slice(-3) + ' R ' + ('0000000' + (id >>> 0).toString(16).toUpperCase()).slice(-8) + ' ' + m.data.map(hex2).join(' ');
  }
  /* Actisense NMEA 2000 ASCII: "Ahhmmss.ddd SSDDP PPPPP b0b1...bn" (Actisense knowledge base) */
  function actAscii(m, t) {
    var d = new Date(t); return 'A' + ('0' + d.getUTCHours()).slice(-2) + ('0' + d.getUTCMinutes()).slice(-2) + ('0' + d.getUTCSeconds()).slice(-2) + '.' + ('00' + d.getUTCMilliseconds()).slice(-3) + ' ' + hex2(m.src) + 'FF' + (m.prio & 7).toString(16).toUpperCase() + ' ' + ('0000' + m.pgn.toString(16).toUpperCase()).slice(-5) + ' ' + m.data.map(hex2).join('');
  }
  Sim.ydRaw = ydRaw; Sim.actAscii = actAscii;
  Sim.prototype.n2k = function (tick, form) { var t = this.b.t, self = this; var out = this.pgns(tick).map(function (m) { return form === 'actisense' ? actAscii(m, t) : ydRaw(m, t); }); if (this.has('garbage') && this.rnd() < 0.5) out.push(form === 'actisense' ? 'A000000.000 ZZ' : '12:00:00.000 R 1234'); return out; };

  /* ---------- running it ---------- */
  /* advance by one tick (0.25 s, or slower or faster under the slow and burst faults) and give the lines each output sends.
     silence: nothing at all. Returns { truth, n0183: [...], yd: [...], act: [...] } */
  Sim.prototype.tick = function () {
    var dt = 0.25; this._tick = (this._tick || 0) + 1; var tk = this._tick;
    this.step(dt);
    if (this.has('silence')) return { truth: this.truth, n0183: [], yd: [], act: [] };
    if (this.has('slow') && tk % 5 !== 0) return { truth: this.truth, n0183: [], yd: [], act: [] };
    var reps = this.has('burst') ? 10 : 1, a = [], y = [], c = [];
    for (var i = 0; i < reps; i++) { a = a.concat(this.nmea0183(tk)); y = y.concat(this.n2k(tk, 'yd')); c = c.concat(this.n2k(tk, 'actisense')); }
    return { truth: this.truth, n0183: a, yd: y, act: c };
  };
  /* a whole run, for a log file or a test: secs of sailing, every tick's lines with a time stamp */
  Sim.prototype.run = function (secs, which) { var o = [], n = Math.round(secs * 4); for (var i = 0; i < n; i++) { var r = this.tick(); (r[which || 'n0183'] || []).forEach(function (l) { o.push([r.truth.t, l]); }); } return o; };

  Sim.polar = polar; Sim.rhumb = rhumb; Sim.dest = dest; Sim.ck = ck;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim; else root.FSBoatSim = Sim;
})(typeof self !== 'undefined' ? self : this);
