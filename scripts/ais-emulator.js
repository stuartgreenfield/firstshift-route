/* AIS emulator: a pretend B&G Zeus 3 on the boat's Wi-Fi. Serves NMEA 0183 over TCP on port 10110 (the Zeus port):
   your own position (GPRMC) plus AIS targets (!AIVDM) for race boats and ships moving round a point, using the same
   encoder and decoder as Route (site/cervantes/ais.js). Lets the FirstShift app's boat connection be tested at a desk.
   Usage: node scripts/ais-emulator.js [lat] [lon] [port]      e.g. node scripts/ais-emulator.js 50.70 -1.40 10110
   Test:  nc localhost 10110 */
const net = require('net'), path = require('path');
const A = require(path.join(__dirname, '..', 'site', 'cervantes', 'ais.js'));
const LAT = +(process.argv[2] || 50.70), LON = +(process.argv[3] || -1.40), PORT = +(process.argv[4] || 10110), R = Math.PI / 180;
const own = { lat: LAT, lon: LON, sog: 6.5, cog: 225 };
const fleet = [
  ['SUNRISE', 235100200, 'B', 36, 12, 0.4, 230, 7.0], ['JOLLY JACK', 235100201, 'B', 36, 11, -0.6, 220, 6.6], ['TIGER', 235100202, 'B', 36, 10, 1.2, 235, 6.2],
  ['NOIR', 235100203, 'B', 36, 13, -1.5, 225, 7.4], ['ATLANTIC STAR', 636000201, 'A', 71, 300, 3, 70, 16], ['CELTIC FERRY', 636000202, 'A', 60, 170, -2, 160, 20],
].map(([name, mmsi, cls, shiptype, len, off, cog, sog], i) => ({ name, mmsi, cls, shiptype, len, cog, sog, hdg: cog, callsign: 'FS' + i, lat: LAT + off / 60, lon: LON + (i - 2) / 60 }));
function step(x, dtH) { const k = Math.cos(x.lat * R); x.lat += Math.cos(x.cog * R) * x.sog * dtH / 60; x.lon += Math.sin(x.cog * R) * x.sog * dtH / 60 / k; }
function nmea(body) { let x = 0; for (const c of body) x ^= c.charCodeAt(0); return '$' + body + '*' + x.toString(16).toUpperCase().padStart(2, '0'); }
function rmc() {
  const d = new Date(), hh = d.toISOString().slice(11, 19).replace(/:/g, ''), dd = d.toISOString().slice(8, 10) + d.toISOString().slice(5, 7) + d.toISOString().slice(2, 4);
  const la = Math.abs(own.lat), lo = Math.abs(own.lon), lat = String(Math.floor(la)).padStart(2, '0') + ((la % 1) * 60).toFixed(4).padStart(7, '0'), lon = String(Math.floor(lo)).padStart(3, '0') + ((lo % 1) * 60).toFixed(4).padStart(7, '0');
  return nmea(`GPRMC,${hh},A,${lat},${own.lat < 0 ? 'S' : 'N'},${lon},${own.lon < 0 ? 'W' : 'E'},${own.sog.toFixed(1)},${own.cog.toFixed(1)},${dd},,`);
}
const clients = new Set(); let tick = 0;
setInterval(() => {
  step(own, 1 / 3600); fleet.forEach(f => step(f, 1 / 3600));
  let out = [rmc()];
  fleet.forEach((f, i) => { out = out.concat(A.encodePosition(f)); if (tick % 30 === i) out = out.concat(A.encodeStatic(f, i)); });
  const text = out.join('\r\n') + '\r\n'; clients.forEach(c => c.write(text)); tick++;
}, 1000);
net.createServer(c => { clients.add(c); c.on('close', () => clients.delete(c)); c.on('error', () => clients.delete(c)); }).listen(PORT, () => console.log(`AIS emulator: NMEA 0183 on TCP ${PORT}, own boat at ${LAT}, ${LON}, ${fleet.length} targets`));
