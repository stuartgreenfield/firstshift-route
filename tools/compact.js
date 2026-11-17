/* F28 (Stuart 17 Nov 2026 17:45, "Compact the code"): compacts the tools' JavaScript for the live and test sites, so the
   published code is hard to read and reuse, and puts FirstShift's notice at the top of every file. The notices of the
   open-source parts we use (SunCalc, qrcode-generator) are kept. The readable code stays in the repository.
   Run: node tools/compact.js <folder> [<folder> ...]   (compacts every .js in each folder, in place) */
const fs = require('fs'), path = require('path');
const { minify } = require(process.env.TERSER || '/tmp/claude-0/jstools/node_modules/terser');
const NOTE = '/*! FirstShift Route, Route+, Mark and Mark+. Copyright (c) 2026 Stuart Greenfield, FirstShift (www.firstshiftsailing.com). All rights reserved. Not to be copied, changed or reused without written permission. */';
(async () => { let n = 0, before = 0, after = 0;
  for (const dir of process.argv.slice(2)) for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8'); if (src.startsWith('/*! FirstShift')) continue;
    const r = await minify(src, { compress: { passes: 1 }, mangle: true, format: { comments: /Copyright \(c\) (?:2009|2014)|licen[cs]e|@preserve/i, preamble: NOTE } });
    if (!r.code) throw new Error('no output for ' + p);
    fs.writeFileSync(p, r.code); n++; before += src.length; after += r.code.length; }
  console.log(n + ' files, ' + Math.round(before / 1024) + ' KB to ' + Math.round(after / 1024) + ' KB'); })().catch(e => { console.error(e.message); process.exit(1); });
