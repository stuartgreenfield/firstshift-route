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
      var res = m.boats.map(function (b) {
        var s3 = samplers({ models: m.o.models, tide: m.o.tide, wave: m.o.wave, sea: m.o.sea, tcc: b.tcc, adj: m.o.adj, polZ: m.o.polZ, stab: m.o.stab }), path = m.path, t = b.start, ts = [t];
        /* 22 Nov (Stuart's photo: corrected 429h 49, +24822 min): a straight piece of your route that lies dead into the wind at the ghost's time
           made it crawl. A piece taking more than three times yours (or no answer) is sailed at yours, scaled by the ratings, as IRC's par boat would */
        var k = m.tccMe > 0 && b.tcc > 0 ? m.tccMe / b.tcc : 1;
        for (var i = 1; i < path.length; i++) { var mine = path[i].t != null && path[i - 1].t != null ? (path[i].t - path[i - 1].t) * k : null, t2 = FSRouter.sailTrack([{ t: t, la: path[i - 1].la, lo: path[i - 1].lo }, { la: path[i].la, lo: path[i].lo }], s3), dt = t2 - t;
          if (mine != null && mine >= 0 && !(dt >= 0 && dt <= 3 * mine + 0.05)) dt = mine; t += dt; ts.push(t); }
        return ts;
      });
      postMessage({ id: m.id, ok: true, r: res }); return;
    }
  } catch (err) { postMessage({ id: m.id, ok: false, error: err.message }); }
};
