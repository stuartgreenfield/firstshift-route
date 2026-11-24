/* Routing runs here so the chart stays responsive. Layers arrive one by one as they are downloaded. */
importScripts('router.js', 'engine.js');
var P = FSRouter.emptyPack();
function polarFrom(o) { var pol = o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc || 1); return FSRouter.polarTable(pol, o.minTwa); }
function samplers(o) { var s = FSRouter.adjust({ wind: FSRouter.windSampler(P, o.models, o.blend), tide: FSRouter.tideSampler(P, o.tide), wave: o.wave ? FSRouter.waveSampler(P, o.wave) : null, speed: polarFrom(o), sea: o.sea }, o.adj); if (o.tideWind !== false && o.tide) s.wind = FSRouter.waterWind(s.wind, s.tide); if (o.polZ) s.wind = FSRouter.heightWind(s.wind, P, o.polZ, FSPolar.windRatio, o.stab); s.tackS = o.tackS; s.gybeS = o.gybeS; return s; }   /* the replay charges the same tacks and gybes as the route (E1) */
onmessage = function (e) {
  var m = e.data;
  try {
    if (m.type === 'ping') { postMessage({ id: m.id, ok: true }); return; }   /* the page checks each worker answers before it hands over forecasts (finding F2, 15 Nov 2026) */
    if (m.type === 'layer') { FSRouter.addLayer(P, m.L, m.buf); postMessage({ id: m.id, ok: true }); return; }
    if (m.type === 'drop') { if (m.kind === 'depth') P.depth = null; else delete P[m.kind][m.lid]; postMessage({ id: m.id, ok: true }); return; }
    if (m.type === 'route') {
      var s = samplers(m.o);
      var r = FSRouter.route({ start: m.o.start, legs: m.o.legs, wind: s.wind, tide: s.tide, wave: s.wave, speed: s.speed, sea: s.sea, depth: P.depth,
        safety: m.o.safety, margin: m.o.margin || 0, nogo: m.o.nogo, tackS: m.o.tackS, gybeS: m.o.gybeS, dt: m.o.dt || 600, hstep: m.o.hstep || 5, sectors: m.o.sectors || 360, fine: m.o.fine, secCap: m.o.secCap, maxHours: m.o.maxHours || 46, partial: m.o.partial !== false, iso: !!m.o.iso });
      postMessage({ id: m.id, ok: true, r: r }); return;
    }
    if (m.type === 'sail') { var s2 = samplers(m.o); postMessage({ id: m.id, ok: true, r: m.paths.map(function (p) { return FSRouter.sailTrack(p, s2); }) }); return; }
    if (m.type === 'times') {
      /* 24 Nov race test (Stuart 12:14): sailing each Fleet boat along our route on its own drifted from our route's times by up to 27 min at
         the first mark for a boat at our own TCC (the replay is not the isochrone router). Now each piece is timed as a ratio: our route's own
         time for the piece x (the boat's replay time / our replay time, at each boat's own time and TCC). A boat at our TCC and start gets our
         times exactly; a faster or slower boat meets the tide and wind at its own times. Tacks and gybes are charged as the route's */
      var path = m.path, side = function (i) { return i > 1 && path[i - 1].twa != null ? (path[i - 1].twa < 0 ? -1 : 1) : 0; };
      var base = { models: m.o.models, tide: m.o.tide, wave: m.o.wave, sea: m.o.sea, adj: m.o.adj, polZ: m.o.polZ, stab: m.o.stab, tackS: m.o.tackS, gybeS: m.o.gybeS };
      var sMe = samplers(Object.assign({ tcc: m.tccMe > 0 ? m.tccMe : 1 }, base)), mineRep = [null];
      for (var i0 = 1; i0 < path.length; i0++) { if (path[i0].t == null || path[i0 - 1].t == null) { mineRep.push(null); continue; } var r0 = FSRouter.sailTrack([{ t: path[i0 - 1].t, la: path[i0 - 1].la, lo: path[i0 - 1].lo, side: side(i0) }, { la: path[i0].la, lo: path[i0].lo }], sMe) - path[i0 - 1].t; mineRep.push(r0 > 0 ? r0 : null); }
      var res = m.boats.map(function (b) {
        var s3 = samplers(Object.assign({ tcc: b.tcc }, base)), t = b.start, ts = [t], k = m.tccMe > 0 && b.tcc > 0 ? m.tccMe / b.tcc : 1;
        for (var i = 1; i < path.length; i++) {
          var own = path[i].t != null && path[i - 1].t != null ? path[i].t - path[i - 1].t : null, par = own != null ? own * k : null, dt = par;
          if (own != null && own >= 0 && mineRep[i]) { var g = FSRouter.sailTrack([{ t: t, la: path[i - 1].la, lo: path[i - 1].lo, side: side(i) }, { la: path[i].la, lo: path[i].lo }], s3) - t, ratio = g / mineRep[i]; if (g >= 0 && ratio > 0 && ratio <= 3) dt = own * ratio; }   /* no answer, or more than three times ours (22 Nov: a piece dead into the wind at the ghost's time): IRC par */
          if (dt == null || !(dt >= 0)) dt = 0; t += dt; ts.push(t); }
        return ts;
      });
      postMessage({ id: m.id, ok: true, r: res }); return;
    }
  } catch (err) { postMessage({ id: m.id, ok: false, error: err.message }); }
};
