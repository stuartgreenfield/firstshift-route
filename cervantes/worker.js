/* Routing runs here so the chart stays responsive. Layers arrive one by one as they are downloaded. */
importScripts('router.js', 'engine.js');
var P = FSRouter.emptyPack();
function polarFrom(o) { var pol = o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc || 1); return FSRouter.polarTable(pol, o.minTwa); }
function samplers(o) { var s = FSRouter.adjust({ wind: FSRouter.windSampler(P, o.models, o.blend), tide: FSRouter.tideSampler(P, o.tide), wave: o.wave ? FSRouter.waveSampler(P, o.wave) : null, speed: polarFrom(o), sea: o.sea }, o.adj); if (o.tideWind !== false && o.tide) s.wind = FSRouter.waterWind(s.wind, s.tide); if (o.polZ) s.wind = FSRouter.heightWind(s.wind, P, o.polZ, FSPolar.windRatio, o.stab); return s; }
onmessage = function (e) {
  var m = e.data;
  try {
    if (m.type === 'layer') { FSRouter.addLayer(P, m.L, m.buf); postMessage({ id: m.id, ok: true }); return; }
    if (m.type === 'drop') { if (m.kind === 'depth') P.depth = null; else delete P[m.kind][m.lid]; postMessage({ id: m.id, ok: true }); return; }
    if (m.type === 'route') {
      var s = samplers(m.o);
      var r = FSRouter.route({ start: m.o.start, legs: m.o.legs, wind: s.wind, tide: s.tide, wave: s.wave, speed: s.speed, sea: s.sea, depth: P.depth,
        safety: m.o.safety, nogo: m.o.nogo, tackS: m.o.tackS, gybeS: m.o.gybeS, dt: m.o.dt || 600, hstep: m.o.hstep || 5, sectors: m.o.sectors || 360, maxHours: m.o.maxHours || 46, partial: m.o.partial !== false, iso: !!m.o.iso });
      postMessage({ id: m.id, ok: true, r: r }); return;
    }
    if (m.type === 'sail') { var s2 = samplers(m.o); postMessage({ id: m.id, ok: true, r: m.paths.map(function (p) { return FSRouter.sailTrack(p, s2); }) }); return; }
    if (m.type === 'times') {
      var res = m.boats.map(function (b) {
        var s3 = samplers({ models: m.o.models, tide: m.o.tide, wave: m.o.wave, sea: m.o.sea, tcc: b.tcc, adj: m.o.adj, polZ: m.o.polZ, stab: m.o.stab }), path = m.path, t = b.start, ts = [t];
        for (var i = 1; i < path.length; i++) { t = FSRouter.sailTrack([{ t: t, la: path[i - 1].la, lo: path[i - 1].lo }, { la: path[i].la, lo: path[i].lo }], s3); ts.push(t); }
        return ts;
      });
      postMessage({ id: m.id, ok: true, r: res }); return;
    }
  } catch (err) { postMessage({ id: m.id, ok: false, error: err.message }); }
};
