const { chromium } = require("playwright");
(async () => { const b = await chromium.launch();
  for (const [nm, base, vp] of [["Route Mac", "http://127.0.0.1:8779", { width: 1440, height: 900 }], ["Route+ Mac", "http://127.0.0.1:8778", { width: 1440, height: 900 }]]) {
    const c = await b.newContext({ viewport: vp, serviceWorkers: "block" }); await c.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { const n = document.getElementById("spTourNo"); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem("x")) return; sessionStorage.setItem("x", "1"); localStorage.clear(); const d = new Date(); localStorage.setItem("fs-terms", d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()); ["fs-wizdone", "fs-boatset", "fs-autostart"].forEach(k => localStorage.setItem(k, "1")); });
    const p = await c.newPage(); await p.goto(base + "/fastnet/"); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(6000);
    const spot = await p.evaluate(() => { for (let la = 50.2; la < 50.6; la += 0.02) for (let lo = -3.5; lo < -1.5; lo += 0.05) { const q = window.__fsXY(la, lo); if (q[0] < 300 || q[0] > 1100 || q[1] < 200 || q[1] > 700) continue; if (window.__fsOnLand && window.__fsOnLand(la, lo)) continue; const el = document.elementFromPoint(q[0], q[1]); if (el && (el.id === "map" || el.tagName === "CANVAS")) return q; } return null; });
    const read = () => p.evaluate(() => { const t = document.getElementById("tip"); return t && !t.hidden ? t.innerText.replace(/\s+/g, " ").slice(0, 330) : null; });
    await p.mouse.move(spot[0], spot[1]); await p.waitForTimeout(700); console.log(nm, "| pointer over:", await read());
    await p.mouse.click(spot[0], spot[1]); await p.waitForTimeout(900); console.log(nm, "| click:", await read());
    console.log(nm, "| route selected:", await p.evaluate(() => { try { return !!(window.__navFc().S && window.__navFc().S.sel); } catch (e) { return String(e); } }));
    await c.close(); }
  await b.close(); })();
