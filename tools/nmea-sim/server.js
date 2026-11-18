/* FirstShift virtual boat router (F37). Runs the boat simulator (sim.js) and sends its data the way a boat's Wi-Fi gateway does, so
   Route+, Mark+ and Polar Live connect to it exactly as they would on the boat:
     NMEA 0183 over TCP   port 10110   (B&G Zeus, Signal K, the Route+ default)
     NMEA 0183 over UDP   port 2000    (Digital Yacht WLN10 style, sent to the whole Wi-Fi)
     NMEA 2000 YD RAW     TCP 1456     (Yacht Devices YDWG-02 / YDWN-02 with a server set to RAW)
     NMEA 2000 ASCII      TCP 60001    (Actisense W2K-1 data server set to NMEA 2000 ASCII)
   and a control page on http://<this computer>:8899 to watch the boat and switch faults on and off.

   Run:  node server.js                 (all of the above)
         node server.js --tws 18 --drift 2 --seed 7
         node server.js --log run.nmea  (also writes every NMEA 0183 line to a file, for replay)
   Needs only Node.js (version 16 or later). On the boat or at home: the phone or tablet joins the same Wi-Fi as this computer, and in
   Route+ (Settings, Instruments, Boat link) the gateway is "Something else" with this computer's address and the port above. */
'use strict';
const net = require('net'), dgram = require('dgram'), http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const Sim = require('./sim.js');

const A = {}; process.argv.slice(2).forEach((a, i, all) => { if (a.startsWith('--')) A[a.slice(2)] = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true; });
const num = k => (A[k] != null && A[k] !== true ? +A[k] : undefined);
const PORTS = { tcp0183: num('tcp') || 10110, udp0183: num('udp') || 2000, yd: num('yd') || 1456, act: num('act') || 60001, web: num('web') || 8899 };
const sim = new Sim({ seed: num('seed'), tws: num('tws'), twd: num('twd'), drift: num('drift'), set: num('set'), start: Date.now(), aisPath: path.join(__dirname, '..', '..', 'web', 'ais.js') });
const log = A.log && A.log !== true ? fs.createWriteStream(A.log, { flags: 'a' }) : null;

/* each kind of output keeps its own list of connected clients */
const clients = { tcp0183: new Set(), yd: new Set(), act: new Set() };
const stats = { lines: 0, started: Date.now() };
function serve(kind, port) {
  const s = net.createServer(sock => {
    sock.setNoDelay(true); clients[kind].add(sock); const who = sock.remoteAddress + ':' + sock.remotePort; console.log(`${kind}: ${who} connected`);
    sock.on('close', () => { clients[kind].delete(sock); console.log(`${kind}: ${who} left`); }); sock.on('error', () => {});
    sock.on('data', () => {});   /* anything the app sends back (two-way data, later) is read and dropped for now */
  });
  s.on('error', e => console.log(`${kind} port ${port}: ${e.message}`)); s.listen(port, () => console.log(`${kind} on TCP port ${port}`));
}
serve('tcp0183', PORTS.tcp0183); serve('yd', PORTS.yd); serve('act', PORTS.act);
const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true }); udp.bind(() => { try { udp.setBroadcast(true); } catch (e) {} console.log(`NMEA 0183 broadcast on UDP port ${PORTS.udp0183}`); });
function bcast() { const out = []; Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) { const ip = i.address.split('.').map(Number), m = i.netmask.split('.').map(Number); out.push(ip.map((x, k) => (x & m[k]) | (~m[k] & 255)).join('.')); } })); return out.length ? out : ['255.255.255.255']; }
const BC = bcast();

function ending() { if (!sim.has('endings')) return '\r\n'; return Math.random() < 0.5 ? '\r' : '\n'; }
function send(set, lines) {
  if (!lines.length) return;
  set.forEach(sock => {
    if (sim.has('split')) { lines.forEach(l => { const cut = 1 + Math.floor(Math.random() * (l.length - 1)); sock.write(l.slice(0, cut)); setTimeout(() => { if (!sock.destroyed) sock.write(l.slice(cut) + ending()); }, 30); }); }
    else sock.write(lines.map(l => l + ending()).join(''));
  });
}
setInterval(() => {
  const r = sim.tick();
  if (sim.has('disconnect')) { Object.values(clients).forEach(set => set.forEach(s => s.destroy())); sim.fault('disconnect', false); }
  send(clients.tcp0183, r.n0183); send(clients.yd, r.yd); send(clients.act, r.act);
  if (r.n0183.length) { const buf = Buffer.from(r.n0183.map(l => l + '\r\n').join('')); BC.forEach(a => udp.send(buf, PORTS.udp0183, a, () => {})); }
  stats.lines += r.n0183.length + r.yd.length + r.act.length;
  if (log) r.n0183.forEach(l => log.write((r.truth.t / 1000).toFixed(2) + '\t' + l + '\n'));
}, 250);

/* ---------- the control page ---------- */
function addrs() { const o = []; Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) o.push(i.address); })); return o; }
function state() {
  const T = sim.truth, f = x => x == null ? null : Math.round(x * 100) / 100;
  return { truth: { lat: +T.lat.toFixed(6), lon: +T.lon.toFixed(6), sog: f(T.sog), cog: f(T.cog), hdg: f(T.hdg), bsp: f(T.bsp), twd: f(T.twd), tws: f(T.tws), twa: f(T.twa), awa: f(T.awa), aws: f(T.aws), heel: f(T.heel), leeway: f(T.leeway), depth: f(T.depthSurface), set: f(T.set), drift: f(T.drift), pressure: f(T.pressure), mode: T.mode, target: T.target },
    faults: sim.active(), list: Sim.FAULTS, feeds: Sim.FEEDS, ports: PORTS, addresses: addrs(), clients: { tcp0183: clients.tcp0183.size, yd: clients.yd.size, act: clients.act.size }, lines: stats.lines };
}
const PAGE = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FirstShift boat simulator</title>
<style>body{font:15px system-ui,sans-serif;background:#0B1B30;color:#e8eef6;margin:0;padding:16px;max-width:760px}h1{font-size:20px;margin:0 0 4px}small,.m{color:#9fb3c8}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin:12px 0}.g div{background:#132a45;border-radius:8px;padding:6px 8px}.g b{display:block;font:600 20px ui-monospace,monospace}
.f{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0;padding:6px 0;border-top:1px solid #1d3a5c}.f span{flex:1 1 260px}button,select{font:inherit;border-radius:8px;border:1px solid #3574BA;background:#132a45;color:#fff;padding:6px 10px}button.on{background:#c2410c;border-color:#ea580c}
code{background:#132a45;padding:1px 5px;border-radius:4px}</style></head><body><h1>FirstShift boat simulator</h1><div class="m" id="conn"></div><div class="g" id="vals"></div>
<h2 style="font-size:16px">Faults</h2><div class="m">Switch one on for 30 seconds or until switched off. Drop, freeze and spike need a feed.</div><div id="faults"></div>
<script>
let S=null;const $=id=>document.getElementById(id);
async function get(){S=await (await fetch('/state')).json();draw();}
async function act(name,on,feed,secs){await fetch('/fault',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,on,feed,secs})});get();}
function draw(){const T=S.truth;$('conn').innerHTML='Connect to '+S.addresses.map(a=>'<code>'+a+'</code>').join(' or ')+': NMEA 0183 TCP <code>'+S.ports.tcp0183+'</code> ('+S.clients.tcp0183+' connected), UDP <code>'+S.ports.udp0183+'</code>, NMEA 2000 YD RAW TCP <code>'+S.ports.yd+'</code> ('+S.clients.yd+'), Actisense ASCII TCP <code>'+S.ports.act+'</code> ('+S.clients.act+'). Lines sent: '+S.lines;
$('vals').innerHTML=[['Mode',T.mode+' to '+(T.target==='ww'?'windward':'leeward')],['BSP',T.bsp+' kn'],['SOG',T.sog+' kn'],['HDG',T.hdg+'°'],['COG',T.cog+'°'],['TWD',T.twd+'°'],['TWS',T.tws+' kn'],['TWA',T.twa+'°'],['AWA',T.awa+'°'],['AWS',T.aws+' kn'],['Heel',T.heel+'°'],['Leeway',T.leeway+'°'],['Depth',T.depth+' m'],['Tide',T.set+'° '+T.drift+' kn'],['Pressure',T.pressure+' hPa'],['Position',T.lat.toFixed(4)+', '+T.lon.toFixed(4)]].map(x=>'<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');
const feedOpts=S.feeds.map(f=>'<option>'+f+'</option>').join('');
$('faults').innerHTML=Object.keys(S.list).map(k=>{const needs=['drop','freeze','spike'].includes(k);const act=S.faults.filter(x=>x===k||x.startsWith(k+':'));
return '<div class="f"><span><b>'+k+'</b> '+S.list[k]+(act.length?' <b style="color:#fb923c">ON '+act.map(a=>a.split(':')[1]||'').join(' ')+'</b>':'')+'</span>'+(needs?'<select id="fd_'+k+'">'+feedOpts+'</select>':'')+'<button data-k="'+k+'" data-s="30">30 s</button><button data-k="'+k+'">On</button>'+(act.length?'<button class="on" data-off="'+k+'">Off</button>':'')+'</div>';}).join('')+'<div class="f"><span>All faults off</span><button data-all="1">Clear all</button></div>';}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.all){fetch('/clear',{method:'POST'}).then(get);return;}
if(b.dataset.off){const k=b.dataset.off;S.faults.filter(x=>x===k||x.startsWith(k+':')).forEach(x=>act(k,false,x.split(':')[1]));return;}
const k=b.dataset.k,fd=$('fd_'+k);act(k,true,fd?fd.value:undefined,b.dataset.s?+b.dataset.s:0);});
get();setInterval(get,1000);
</script></body></html>`;
http.createServer((req, res) => {
  const json = (o, c) => { res.writeHead(c || 200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return; }
  if (req.method === 'GET' && req.url === '/state') return json(state());
  if (req.method === 'POST' && (req.url === '/fault' || req.url === '/clear')) {
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      try { if (req.url === '/clear') sim.clearFaults(); else { const q = JSON.parse(body || '{}'); sim.fault(q.name, q.on !== false, { feed: q.feed, secs: q.secs }); } json(state()); }
      catch (e) { json({ error: e.message }, 400); }
    }); return;
  }
  res.writeHead(404); res.end();
}).listen(PORTS.web, () => console.log(`Control page: http://localhost:${PORTS.web}  (${addrs().map(a => 'http://' + a + ':' + PORTS.web).join(', ')})`));
