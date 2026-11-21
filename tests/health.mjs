/* The forecast health page's judgement (functions/api/health.js), on the packs as published. Run: node tests/health.mjs [site copy] */
import { judge } from '../site/functions/api/health.js'; import fs from 'fs';
const SITE = process.argv[2] || '/tmp/claude-0/sitebr'; let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const packs = {}; for (const a of ['channel-area', 'solent-area', 'cervantes', 'fastnet', 'northsea-area', 'irishsea-area', 'biscay-area', 'celtic-area']) { try { packs[a] = JSON.parse(fs.readFileSync(`${SITE}/${a}/pack/pack.json`)); } catch (e) { packs[a] = null; } }
const built = Math.max(...Object.values(packs).filter(Boolean).map(p => p.built));
const fresh = judge(packs, built + 3600); ok(fresh.ok, 'an hour after a build, every model is within its limit', fresh.bad.join('; ') || 'none stale');
const old = judge(packs, built + 10 * 3600); ok(!old.ok && old.bad.some(b => /built/.test(b)), 'ten hours on with no new build, it says STALE and why', old.bad[0]);
const p2 = JSON.parse(JSON.stringify(packs)); const ch = p2['channel-area']; const L = ch.layers.find(l => l.id === 'ukv'); L.run_t0 = built - 19 * 3600;
const one = judge(p2, built + 3600); ok(!one.ok && one.bad.some(b => /channel-area ukv/.test(b)), 'one model whose newest run failed for long enough is named', one.bad.join('; '));
const miss = judge({ ...packs, 'channel-area': null }, built + 3600); ok(!miss.ok && miss.bad.includes('channel-area pack missing'), 'a missing pack is STALE');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
