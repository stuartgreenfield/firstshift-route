/* Release gate for code health (22 Nov 2026, navigator review "Control" step; NASA SWE-134 asks safety-critical components to have a
   cyclomatic complexity of 15 or lower). For each shipped script: the number of functions over 15 and the highest score must not rise
   above the saved baseline. A new file starts with none over 15. Run: node tools/complexity_check.js   (save a new baseline after a
   deliberate improvement: node tools/complexity_check.js --save). Complexity = 1 + each if, loop, case, catch, ?: and && || ??. */
const fs = require('fs'), path = require('path');
const NM = process.env.CX_MODULES || path.join(__dirname, 'node_modules');
const acorn = require(path.join(NM, 'acorn'));
const DIR = path.join(__dirname, '../site/cervantes'), BASE = path.join(__dirname, 'complexity_baseline.json');
const DEC = /^(IfStatement|ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement|ConditionalExpression|CatchClause)$/;
function scores(src) {
  const out = []; const ast = acorn.parse(src, { ecmaVersion: 2022 });
  (function walk(n) { if (!n || typeof n.type !== 'string') return;
    if (/Function/.test(n.type)) { let c = 1; (function rec(m, top) { if (!m || typeof m.type !== 'string') return; if (!top && /Function/.test(m.type)) return;
        if (DEC.test(m.type) || (m.type === 'SwitchCase' && m.test) || (m.type === 'LogicalExpression' && /&&|\|\||\?\?/.test(m.operator))) c++;
        for (const k in m) { const v = m[k]; if (Array.isArray(v)) v.forEach(x => rec(x)); else if (v && typeof v.type === 'string') rec(v); } })(n.body, true); out.push(c); }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } })(ast);
  return out;
}
const now = {}; fs.readdirSync(DIR).filter(f => f.endsWith('.js') && f !== 'sw.js').forEach(f => { try { const s = scores(fs.readFileSync(path.join(DIR, f), 'utf8')); now[f] = { over: s.filter(x => x > 15).length, max: s.length ? Math.max(...s) : 0, n: s.length }; } catch (e) { now[f] = { err: e.message }; } });
if (process.argv.includes('--save')) { fs.writeFileSync(BASE, JSON.stringify(now, null, 1)); console.log('Baseline saved for ' + Object.keys(now).length + ' files'); process.exit(0); }
const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : {}; let fail = 0;
Object.keys(now).sort().forEach(f => { const a = now[f], b = base[f] || { over: 0, max: 15 };
  if (a.err) { console.log('FAIL ' + f + ' does not parse: ' + a.err); fail++; return; }
  const bad = a.over > b.over || a.max > Math.max(b.max, 15); if (bad) fail++;
  if (bad || process.argv.includes('-v')) console.log((bad ? 'FAIL ' : 'ok   ') + f + ': over 15 ' + a.over + ' (was ' + b.over + '), highest ' + a.max + ' (was ' + b.max + ')'); });
console.log(fail ? fail + ' file(s) got more complex: break the new code up before release' : 'Complexity: no file got more complex (' + Object.keys(now).length + ' files)'); process.exit(fail ? 1 : 0);
