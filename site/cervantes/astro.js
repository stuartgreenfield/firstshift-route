/* FirstShift Route and Route+: Astro (Stuart 15 Nov 11:45 and 11:47): "sunrise, sunset, moonrise, moonset and how much of the moon
   is lit (a full moon high in a clear sky is great for racing), as text and graphics on screen, shown or hidden; under a button
   called Astro, with room for other astronomical tools". Worked out on the phone with no internet by SunCalc (below, unchanged,
   BSD-2-Clause, Vladimir Agafonkin). Built overnight 15 to 16 Nov while Stuart was away: the questions that were to follow are in
   docs/ASTRO-2026-11-16.md, with the choices made.
   Where: the boat when Live GPS is on, else the race start. When: the day at the chart's time slider, and tonight from now. */
/* ---- SunCalc 1.9.0, https://github.com/mourner/suncalc ----
Copyright (c) 2014, Vladimir Agafonkin
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

(function () { 'use strict';

// shortcuts for easier to read formulas

var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180;

// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


// date/time constants and conversions

var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
function toDays(date)   { return toJulian(date) - J2000; }


// general calculations for position

var e = rad * 23.4397; // obliquity of the Earth

function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }

function astroRefraction(h) {
    if (h < 0) // the following formula works for positive altitudes only.
        h = 0; // if h = -0.08901179 a div/0 would occur.

    // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
    // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

// general sun calculations

function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

function eclipticLongitude(M) {

    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
        P = rad * 102.9372; // perihelion of the Earth

    return M + C + P + PI;
}

function sunCoords(d) {

    var M = solarMeanAnomaly(d),
        L = eclipticLongitude(M);

    return {
        dec: declination(L, 0),
        ra: rightAscension(L, 0)
    };
}


var SunCalc = {};


// calculates sun position for a given date and latitude/longitude

SunCalc.getPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c  = sunCoords(d),
        H  = siderealTime(d, lw) - c.ra;

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: altitude(H, phi, c.dec)
    };
};


// sun times configuration (angle, morning name, evening name)

var times = SunCalc.times = [
    [-0.833, 'sunrise',       'sunset'      ],
    [  -0.3, 'sunriseEnd',    'sunsetStart' ],
    [    -6, 'dawn',          'dusk'        ],
    [   -12, 'nauticalDawn',  'nauticalDusk'],
    [   -18, 'nightEnd',      'night'       ],
    [     6, 'goldenHourEnd', 'goldenHour'  ]
];

// adds a custom time to the times config

SunCalc.addTime = function (angle, riseName, setName) {
    times.push([angle, riseName, setName]);
};


// calculations for sun times

var J0 = 0.0009;

function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }
function observerAngle(height) { return -2.076 * Math.sqrt(height) / 60; }

// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {

    var w = hourAngle(h, phi, dec),
        a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
}


// calculates sun times for a given date, latitude/longitude, and, optionally,
// the observer height (in meters) relative to the horizon

SunCalc.getTimes = function (date, lat, lng, height) {

    height = height || 0;

    var lw = rad * -lng,
        phi = rad * lat,

        dh = observerAngle(height),

        d = toDays(date),
        n = julianCycle(d, lw),
        ds = approxTransit(0, lw, n),

        M = solarMeanAnomaly(ds),
        L = eclipticLongitude(M),
        dec = declination(L, 0),

        Jnoon = solarTransitJ(ds, M, L),

        i, len, time, h0, Jset, Jrise;


    var result = {
        solarNoon: fromJulian(Jnoon),
        nadir: fromJulian(Jnoon - 0.5)
    };

    for (i = 0, len = times.length; i < len; i += 1) {
        time = times[i];
        h0 = (time[0] + dh) * rad;

        Jset = getSetJ(h0, lw, phi, dec, n, M, L);
        Jrise = Jnoon - (Jset - Jnoon);

        result[time[1]] = fromJulian(Jrise);
        result[time[2]] = fromJulian(Jset);
    }

    return result;
};


// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

function moonCoords(d) { // geocentric ecliptic coordinates of the moon

    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * d), // mean anomaly
        F = rad * (93.272 + 13.229350 * d),  // mean distance

        l  = L + rad * 6.289 * sin(M), // longitude
        b  = rad * 5.128 * sin(F),     // latitude
        dt = 385001 - 20905 * cos(M);  // distance to the moon in km

    return {
        ra: rightAscension(l, b),
        dec: declination(l, b),
        dist: dt
    };
}

SunCalc.getMoonPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c = moonCoords(d),
        H = siderealTime(d, lw) - c.ra,
        h = altitude(H, phi, c.dec),
        // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
        pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

    h = h + astroRefraction(h); // altitude correction for refraction

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: h,
        distance: c.dist,
        parallacticAngle: pa
    };
};


// calculations for illumination parameters of the moon,
// based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
// Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

SunCalc.getMoonIllumination = function (date) {

    var d = toDays(date || new Date()),
        s = sunCoords(d),
        m = moonCoords(d),

        sdist = 149598000, // distance from Earth to Sun in km

        phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
        inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
        angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
                cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

    return {
        fraction: (1 + cos(inc)) / 2,
        phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
        angle: angle
    };
};


function hoursLater(date, h) {
    return new Date(date.valueOf() + h * dayMs / 24);
}

// calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article

SunCalc.getMoonTimes = function (date, lat, lng, inUTC) {
    var t = new Date(date);
    if (inUTC) t.setUTCHours(0, 0, 0, 0);
    else t.setHours(0, 0, 0, 0);

    var hc = 0.133 * rad,
        h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
        h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;

    // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
    for (var i = 1; i <= 24; i += 2) {
        h1 = SunCalc.getMoonPosition(hoursLater(t, i), lat, lng).altitude - hc;
        h2 = SunCalc.getMoonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;

        a = (h0 + h2) / 2 - h1;
        b = (h2 - h0) / 2;
        xe = -b / (2 * a);
        ye = (a * xe + b) * xe + h1;
        d = b * b - 4 * a * h1;
        roots = 0;

        if (d >= 0) {
            dx = Math.sqrt(d) / (Math.abs(a) * 2);
            x1 = xe - dx;
            x2 = xe + dx;
            if (Math.abs(x1) <= 1) roots++;
            if (Math.abs(x2) <= 1) roots++;
            if (x1 < -1) x1 = x2;
        }

        if (roots === 1) {
            if (h0 < 0) rise = i + x1;
            else set = i + x1;

        } else if (roots === 2) {
            rise = i + (ye < 0 ? x2 : x1);
            set = i + (ye < 0 ? x1 : x2);
        }

        if (rise && set) break;

        h0 = h2;
    }

    var result = {};

    if (rise) result.rise = hoursLater(t, rise);
    if (set) result.set = hoursLater(t, set);

    if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

    return result;
};


// export as Node module / AMD module / browser variable
if (typeof exports === 'object' && typeof module !== 'undefined') module.exports = SunCalc;
else if (typeof define === 'function' && define.amd) define(SunCalc);
else window.SunCalc = SunCalc;

}());

(function () {
  'use strict';
  var SC = window.SunCalc; if (!SC) return;
  var KEY = 'fs-astro-line';
  function $(id) { return document.getElementById(id); }
  function hm(d) { return d && !isNaN(d) ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '--'; }
  function ctxNow() { var c = window.__fsAstroCtx ? window.__fsAstroCtx() : null; if (!c || c.lat == null) { var v = window.__fsView && window.__fsView(); c = { at: Date.now(), lat: v ? v.la : 50.76, lon: v ? v.lo : -1.3, where: 'the chart' }; } return c; }
  function phaseName(p) { return p < 0.03 || p > 0.97 ? 'New moon' : p < 0.22 ? 'Waxing crescent' : p < 0.28 ? 'First quarter' : p < 0.47 ? 'Waxing gibbous' : p < 0.53 ? 'Full moon' : p < 0.72 ? 'Waning gibbous' : p < 0.78 ? 'Last quarter' : 'Waning crescent'; }
  function deg(r) { return r * 180 / Math.PI; }
  /* everything for one day at one place */
  function day(at, lat, lon) {
    var d = new Date(at); d.setHours(12, 0, 0, 0);
    var t = SC.getTimes(d, lat, lon), m = SC.getMoonTimes(d, lat, lon), il = SC.getMoonIllumination(new Date(at)), mp = SC.getMoonPosition(new Date(at), lat, lon);
    /* the highest the moon gets tonight, from dusk to dawn, and when */
    var best = null, s0 = t.dusk && !isNaN(t.dusk) ? t.dusk.getTime() : d.getTime() + 6 * 3600000, s1 = s0 + 14 * 3600000;
    for (var x = s0; x <= s1; x += 900000) { var p = SC.getMoonPosition(new Date(x), lat, lon); if (!best || p.altitude > best.alt) best = { alt: p.altitude, at: new Date(x) }; }
    return { t: t, m: m, il: il, now: mp, best: best, date: d };
  }
  function css() { if ($('astroCss')) return; var s = document.createElement('style'); s.id = 'astroCss';
    s.textContent = '.astrop{position:absolute;right:max(10px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 58px);z-index:8;width:min(calc(100% - 20px),380px);max-height:calc(100% - 120px);overflow:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:13px}.astrop[hidden]{display:none}.astrop h3{margin:0 0 2px;font-size:16px}.astrop .close{position:absolute;right:8px;top:6px}.astrop small{color:var(--muted)}.astrot{border-collapse:collapse;width:100%;margin:8px 0;font-variant-numeric:tabular-nums}.astrot th{text-align:left;font-weight:400;color:var(--muted);padding:2px 8px 2px 0}.astrot td{font-family:var(--f-data);text-align:right}.astrom{display:flex;gap:12px;align-items:center;margin:6px 0}@media (max-width:560px){#astroBtn{display:none!important}}.astrolay{display:flex;width:100%;justify-content:space-between;align-items:center;margin:0 0 8px;min-height:40px}.astroline{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);z-index:4;background:var(--glass,var(--panel));color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:3px 10px;font:600 11px var(--f-data);white-space:nowrap;pointer-events:auto;cursor:pointer}.astroline[hidden]{display:none}';
    document.head.appendChild(s); }
  /* the moon as it looks: lit fraction and which side, in a small drawing */
  function moonSvg(il, r) {
    var f = il.fraction, waxing = il.phase < 0.5, k = 2 * f - 1;   /* terminator ellipse: -1 new, 0 half, 1 full */
    var rx = Math.abs(k) * r, sweepOuter = waxing ? 1 : 0, sweepIn = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
    var path = 'M' + r + ' 0 A' + r + ' ' + r + ' 0 0 ' + sweepOuter + ' ' + r + ' ' + 2 * r + ' A' + rx + ' ' + r + ' 0 0 ' + sweepIn + ' ' + r + ' 0z';
    return '<svg width="' + 2 * r + '" height="' + 2 * r + '" viewBox="0 0 ' + 2 * r + ' ' + 2 * r + '" aria-hidden="true"><circle cx="' + r + '" cy="' + r + '" r="' + (r - 0.5) + '" fill="#1f2937" stroke="#64748b"/><path d="' + path + '" fill="#f4f1de"/></svg>';
  }
  /* 24 hours from noon to noon: night, twilight and day as bands, the moon above the horizon as a bar */
  function band(o, lat, lon) {
    var W = 340, H = 46, t0 = o.date.getTime(), x = function (ms) { return Math.max(0, Math.min(W, (ms - t0) / 86400000 * W)); }, out = '';
    for (var i = 0; i < 96; i++) { var tm = t0 + i * 900000, alt = deg(SC.getPosition(new Date(tm), lat, lon).altitude); var col = alt > 0 ? '#fcd34d' : alt > -6 ? '#f59e0b88' : alt > -12 ? '#3b82f655' : '#0f172a'; out += '<rect x="' + (i * W / 96).toFixed(1) + '" y="8" width="' + (W / 96 + 0.6).toFixed(1) + '" height="20" fill="' + col + '"/>'; }
    for (i = 0; i < 96; i++) { tm = t0 + i * 900000; if (SC.getMoonPosition(new Date(tm), lat, lon).altitude > 0) out += '<rect x="' + (i * W / 96).toFixed(1) + '" y="31" width="' + (W / 96 + 0.6).toFixed(1) + '" height="6" fill="#e2e8f0"/>'; }
    var nowX = x(Date.now()); if (nowX > 0 && nowX < W) out += '<line x1="' + nowX + '" x2="' + nowX + '" y1="4" y2="40" stroke="#ef4444" stroke-width="2"/>';
    [12, 18, 0, 6].forEach(function (h, j) { out += '<text x="' + (j * W / 4 + 2) + '" y="' + (H) + '" font-size="9" fill="currentColor" opacity=".7">' + ('0' + h).slice(-2) + ':00</text>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 2) + '" width="100%" role="img" aria-label="Day, twilight and night from midday to midday, and when the moon is up">' + out + '</svg>';
  }
  function render() {
    var c = ctxNow(), o = day(c.at, c.lat, c.lon), tonight = day(Date.now(), c.lat, c.lon), p = $('astroPop'); if (!p) return;
    var il = o.il, pct = Math.round(il.fraction * 100), hi = o.best ? Math.round(deg(o.best.alt)) : null;
    var good = il.fraction > 0.75 && hi != null && hi > 25;
    p.innerHTML = '<button class="close" type="button" aria-label="Close Astro" id="astroX">×</button><h3>Astro</h3><small>' + o.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' at ' + c.where + ' (' + c.lat.toFixed(2) + ', ' + c.lon.toFixed(2) + '), local time on this device</small>' +
      '<div class="astrom">' + moonSvg(il, 26) + '<div><b>' + phaseName(il.phase) + ', ' + pct + '% lit</b><br><small>' + (hi != null ? 'Highest tonight ' + hi + '° at ' + hm(o.best.at) : '') + (good ? '. A bright moon high in the sky: good for night racing, if the sky is clear.' : '') + '</small></div></div>' +
      band(o, c.lat, c.lon) +
      '<table class="astrot"><tr><th>Sunrise</th><td>' + hm(o.t.sunrise) + '</td><th>Sunset</th><td>' + hm(o.t.sunset) + '</td></tr>' +
      '<tr><th>First light</th><td>' + hm(o.t.nauticalDawn) + '</td><th>Last light</th><td>' + hm(o.t.nauticalDusk) + '</td></tr>' +
      '<tr><th>Civil dawn</th><td>' + hm(o.t.dawn) + '</td><th>Civil dusk</th><td>' + hm(o.t.dusk) + '</td></tr>' +
      '<tr><th>Moonrise</th><td>' + (o.m.alwaysUp ? 'Up all day' : o.m.alwaysDown ? 'Down all day' : hm(o.m.rise)) + '</td><th>Moonset</th><td>' + hm(o.m.set) + '</td></tr></table>' +
      '<small>First and last light are nautical twilight (sun 12° below the horizon, the horizon still visible); civil is 6°. The band runs midday to midday: yellow day, orange and blue twilight, dark night; the pale bar under it is the moon above the horizon, the red line now.</small>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="astroShow"' + (lineOn() ? ' checked' : '') + '> Show sun and moon times on the chart</label>' +
      (Math.abs(o.date - tonight.date) > 43200000 ? '<p style="margin:6px 0 0"><small>Tonight from here: sunset ' + hm(tonight.t.sunset) + ', moon ' + Math.round(tonight.il.fraction * 100) + '% lit, rises ' + hm(tonight.m.rise) + '.</small></p>' : '');
    $('astroX').onclick = function () { p.hidden = true; btn().setAttribute('aria-expanded', 'false'); };
    $('astroShow').onchange = function () { try { localStorage.setItem(KEY, this.checked ? '1' : '0'); } catch (e) {} line(); };
  }
  function lineOn() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function line() {
    var l = $('astroLine'); if (!lineOn()) { if (l) l.hidden = true; return; }
    if (!l) { l = document.createElement('div'); l.id = 'astroLine'; l.className = 'astroline'; l.setAttribute('role', 'button'); l.onclick = function () { open(true); }; (document.querySelector('.app>.chart') || document.body).appendChild(l); }
    var c = ctxNow(), o = day(c.at, c.lat, c.lon); l.hidden = false;
    l.textContent = '☀ ' + hm(o.t.sunrise) + ' to ' + hm(o.t.sunset) + '  ☾ ' + Math.round(o.il.fraction * 100) + '% ' + (o.m.rise ? 'up ' + hm(o.m.rise) : '') + (o.m.set ? ' down ' + hm(o.m.set) : '');
  }
  function btn() {
    var b = $('astroBtn'); if (b) return b; var tools = document.querySelector('.top .tools'), before = $('nightBtn'); if (!tools) return null;
    b = document.createElement('button'); b.className = 'ib'; b.id = 'astroBtn'; b.type = 'button'; b.title = 'Astro: sun and moon'; b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3.2"/><path d="M8 2.5v1.6M8 14v1.6M2.5 9h1.6M12 9h1.6M4.1 5.1l1.1 1.1M10.8 11.8l1.1 1.1M4.1 12.9l1.1-1.1M10.8 6.2l1.1-1.1"/><path d="M21 15.5A6 6 0 1 1 14.5 9a4.6 4.6 0 0 0 6.5 6.5z"/></svg><span class="lbl">Astro</span>';
    tools.insertBefore(b, before || null); b.onclick = function () { open(); }; return b;
  }
  function open(force) {
    css(); var p = $('astroPop'); if (!p) { p = document.createElement('div'); p.id = 'astroPop'; p.className = 'astrop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Astro: sun and moon'); (document.querySelector('.app>.chart') || document.body).appendChild(p); p.hidden = true; }
    var show = force || p.hidden; p.hidden = !show; btn().setAttribute('aria-expanded', String(show)); if (show) render();
  }
  /* on a phone the top bar is full: Astro sits at the top of Layers instead (16 Nov) */
  function inLayers() { var L = $('layers'); if (!L || L.hidden || $('astroLay')) return; var b = document.createElement('button'); b.type = 'button'; b.id = 'astroLay'; b.className = 'btn astrolay'; b.innerHTML = '<span>☀ ☾ Astro: sun and moon</span><span>›</span>'; b.onclick = function () { L.hidden = true; var lb = $('layersBtn'); if (lb) lb.setAttribute('aria-expanded', 'false'); open(true); }; L.insertBefore(b, L.firstChild); }
  function init() { css(); if (!btn()) return setTimeout(init, 800); line(); setInterval(line, 60000); var L = $('layers'); if (L) new MutationObserver(function () { setTimeout(inLayers, 0); }).observe(L, { attributes: true, childList: true, attributeFilter: ['hidden'] }); }
  window.FSAstro = { open: open, day: day, line: line, render: render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
