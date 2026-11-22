/* Real-data side-by-side check for the untangled routing engine (Stuart 22 Nov 19:46). A capture of what the app sent its routing worker
   on real races (the forecast layers, the depth chart and every route request) is replayed through the worker's own code twice:
   once with the frozen old engine (tools/router_old.js), once with the new one. Every route must come out the same, number for number.
   Run: node tools/router_real.js capture.json [capture2.json ...]   (exit 1 on any difference) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const CER = path.join(__dirname, '../site/cervantes'), WORKER = fs.readFileSync(path.join(CER, 'worker.js'), 'utf8');
function workerWith(routerFile) {
  const ctx = { self: {}, console, Math, Date, JSON, Error, Float64Array, Float32Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Array, Object, isNaN, Infinity, NaN, Number, String };
  ctx.self = ctx; ctx.out = null; ctx.postMessage = m => { ctx.out = m; };
  ctx.importScripts = (...fs2) => fs2.forEach(f => vm.runInContext(fs.readFileSync(f === 'router.js' ? routerFile : path.join(CER, f), 'utf8'), ctx));
  vm.createContext(ctx); vm.runInContext(WORKER, ctx);
  return m => { ctx.out = null; ctx.onmessage({ data: m }); return ctx.out; };
}
let same = 0, diff = 0, n = 0;
for (const file of process.argv.slice(2)) {
  const cap = JSON.parse(fs.readFileSync(file, 'utf8')), A = workerWith(path.join(__dirname, 'router_old.js')), B = workerWith(path.join(CER, 'router.js'));
  cap.layers.forEach((l, i) => { const buf = Uint8Array.from(l.buf).buffer; A({ type: 'layer', id: i, L: l.L, buf: buf.slice(0) }); B({ type: 'layer', id: i, L: l.L, buf: buf.slice(0) }); });
  cap.routes.forEach((o, i) => { n++; const a = JSON.stringify(A({ type: 'route', id: i, o })), b = JSON.stringify(B({ type: 'route', id: i, o }));
    if (a === b) same++; else { diff++; console.log('DIFFER ' + path.basename(file) + ' route ' + i + '\n old ' + a.slice(0, 200) + '\n new ' + b.slice(0, 200)); }
    const r = JSON.parse(a); console.log(path.basename(file) + ' route ' + i + ': ' + (r.ok ? (r.r.partial ? 'partial, ' : '') + r.r.path.length + ' points, finish ' + (r.r.finish != null ? r.r.finish.toFixed(3) : '-') : 'error: ' + r.error.slice(0, 60)) + (a === b ? ' (same)' : ' (DIFFERS)')); });
}
console.log(n + ' real routes, ' + same + ' identical, ' + diff + ' differ'); process.exit(diff ? 1 : 0);
