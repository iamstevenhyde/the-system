// Readability audit in a real browser. Walks every visible text node on the team screens (1280x768) and the
// projector slides (1920x1080), then checks font size and WCAG contrast. Exits 1 on any violation.
//   node tools/contrast-check.mjs [--list]
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(execSync('npm root -g').toString().trim(), 'x.js'));
const { chromium } = require('playwright');
const port = Number(process.env.PORT) || 8098, base = `http://localhost:${port}/`;
let srv = null;
try { await fetch(base); } catch { srv = spawn(process.execPath, [join(here, '..', 'serve.mjs'), String(port)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800)); }
let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const ctx = await browser.newContext({ viewport: { width: 1280, height: 768 } });

// ---- the audit, run inside the page ----
const AUDIT = ({ team }) => {
  const MIN = team ? { hard: 13, text: 14, body: 16 } : { hard: 20, text: 20, body: 24 };
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const txt = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    if (el.closest('[disabled],[aria-disabled="true"]')) continue;      // inactive controls are exempt
    const range = document.createRange(); range.selectNodeContents(n);
    const rect = range.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const inView = rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
    if (inView) {   // skip text hidden underneath an overlay or a fixed bar
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (hit && !(el.contains(hit) || hit.contains(el))) continue;
    }
    const cs = getComputedStyle(el);
    const isSvg = el instanceof SVGElement;
    let size = parseFloat(cs.fontSize);
    if (isSvg) { const ctm = el.getScreenCTM(); size *= ctm ? ctm.a : 1; }
    const fgRaw = parse(isSvg ? cs.fill : cs.color) || { r: 0, g: 0, b: 0, a: 1 };
    let opacity = 1;
    for (let e = el; e; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
    // background: stack translucent layers upward until opaque
    let bg = null, art = false, gradient = [];
    let acc = { r: 0, g: 0, b: 0, a: 0 }, solid = false;
    for (let e = el; e && !solid; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        if (/url\(/.test(s.backgroundImage)) art = true;
        else for (const m of s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) { const c = parse(m[0]); if (c && c.a >= 0.5) gradient.push(c); }
      }
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) {
        // layer c under what we have so far
        acc = { r: acc.r * acc.a + c.r * (1 - acc.a), g: acc.g * acc.a + c.g * (1 - acc.a), b: acc.b * acc.a + c.b * (1 - acc.a), a: acc.a + c.a * (1 - acc.a) };
        if (acc.a >= 0.97) solid = true;
      }
      if (e.classList?.contains('stage') && !solid) { if (!e.classList.contains('dim') && e.querySelector(':scope > .scene')) art = true; break; }
    }
    let svgBg = null;
    if (isSvg) {   // the last shape drawn before this label whose box contains it supplies the background
      const root = el.ownerSVGElement || el, cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const shapes = [...root.querySelectorAll('circle,polygon,rect,path,ellipse')].filter(u => el.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_PRECEDING);
      for (let k = shapes.length - 1; k >= 0; k--) {
        const r2 = shapes[k].getBoundingClientRect();
        if (cx >= r2.left && cx <= r2.right && cy >= r2.top && cy <= r2.bottom) { const f = parse(getComputedStyle(shapes[k]).fill); if (f && f.a > 0) { svgBg = f; break; } }
      }
    }
    const page = svgBg ? blend(svgBg, { r: 255, g: 253, b: 247, a: 1 }) : { r: 246, g: 243, b: 233, a: 1 };
    const base = svgBg ? { ...blend(svgBg, { r: 255, g: 253, b: 247, a: 1 }), a: 1 } : solid ? { ...acc, a: 1 } : acc.a > 0 ? blend(acc, page) : page;
    const backed = solid || acc.a >= 0.85;
    const cands = gradient.length ? gradient.map(g => blend(g, base)) : [base];
    const fg = c => blend({ ...fgRaw, a: fgRaw.a * opacity }, c);
    const big = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
    const need = big ? 3 : 4.5;
    const worst = Math.min(...cands.map(c => ratio(fg(c), c)));
    const problems = [];
    if (size < MIN.hard) problems.push(`font ${size.toFixed(1)}px under ${MIN.hard}`);
    else if (size < MIN.text) problems.push(`font ${size.toFixed(1)}px under ${MIN.text}`);
    else if (txt.length > 40 && size < MIN.body) problems.push(`body text ${size.toFixed(1)}px under ${MIN.body}`);
    if (worst < need) problems.push(`contrast ${worst.toFixed(2)} under ${need}`);
    if (art && !backed) problems.push('text over art without a backing');
    if (!problems.length) continue;
    const key = txt.slice(0, 40) + problems.join();
    if (seen.has(key)) continue; seen.add(key);
    out.push({ text: txt.slice(0, 50), problems, tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') });
  }
  return out;
};

const violations = [];
let audits = 0;
async function audit(page, screen, team) {
  const list = await page.evaluate(AUDIT, { team });
  audits++;
  for (const v of list) violations.push({ screen, ...v });
}
const errors = [];
const open = async (url, vp) => {
  const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp);
  p.on('pageerror', e => errors.push(url + ' ' + e.message));
  await p.goto(base + url); return p;
};

// ---- team screens: solo, five rounds ----
const solo = await open('solo.html?local=1', { width: 1280, height: 768 });
await solo.waitForSelector('[data-region="metro"]');
await audit(solo, 'solo picker', true);
await solo.click('[data-region="metro"]');
await solo.waitForSelector('.wiz');
for (let step = 0; step < 4; step++) {
  await solo.waitForTimeout(250);
  await audit(solo, `wizard ${step + 1}`, true);
  if (step === 1) await solo.click('.arch >> nth=0');
  await solo.click('#wiznext');
}
for (let r = 1; r <= 5; r++) {
  await solo.waitForSelector('#seedecisions');
  await solo.waitForTimeout(500);
  await audit(solo, `r${r} brief`, true);
  await solo.click('.tab:has-text("Organization")'); await solo.waitForTimeout(250);
  await audit(solo, `r${r} organization`, true);
  await solo.click('.tab:has-text("This round")'); await solo.waitForSelector('#seedecisions');
  await solo.click('#seedecisions');
  for (let slot = 0; slot < 3; slot++) {
    await solo.waitForSelector('.otile');
    const count = (await solo.$$('.otile:not(.locked)')).length;
    await solo.click(`.otile:not(.locked) >> nth=${(r + slot) % count}`);
    if (slot === 1 && !(await solo.$('.pointspanel'))) {   // org card: look for an option with point choices so the chooser is audited
      for (let k = 0; k < count; k++) { await solo.click(`.otile:not(.locked) >> nth=${k}`); if (await solo.$('.pointspanel')) break; }
    }
    await solo.waitForTimeout(250);
    await audit(solo, `r${r} card ${slot + 1}`, true);
    await solo.click('#nextcard');
  }
  await solo.waitForSelector('#submitbtn');
  await audit(solo, `r${r} review`, true);
  if (await solo.$('#submitbtn[disabled]') && (await solo.textContent('.subnote')).includes('Over budget')) { await solo.click('.cstep >> nth=0'); for (let s2 = 0; s2 < 3; s2++) { await solo.click('.otile:not(.locked) >> nth=0'); await solo.click('#nextcard'); } }
  await solo.click('#submitbtn');
  await solo.waitForSelector('.reveal');
  await solo.waitForTimeout(1700);
  for (let step = 0; step < 3; step++) { await audit(solo, `r${r} reveal ${step + 1}`, true); if (step < 2) { await solo.click('#rvnext'); await solo.waitForTimeout(1300); } }
  await solo.click('#rvdone');
  if (r < 5) await solo.waitForFunction(n => document.querySelector('.roundbox .t')?.textContent.includes('Round ' + n), r + 1);
}
await solo.waitForSelector('#finalclose');
await solo.waitForTimeout(300);
await audit(solo, 'final results', true);
await solo.close();

// ---- projector: build a 16-team game straight in LocalNet, then audit every slide at 1920x1080 ----
const host = await open('index.html?local=1');
const code = await host.evaluate(async () => {
  const { LocalNet } = await import('/src/net.js');
  const E = await import('/engine/engine.js'), K = await import('/engine/deck.js'), P = await import('/src/publish.js'), D = await import('/engine/data.js'), B = await import('/engine/bots.js');
  const net = new LocalNet();
  const { code, hostToken } = await net.createSession('1234');
  const regs = D.REGION_IDS, teams = [];
  for (let i = 0; i < 16; i++) teams.push({ id: 'b' + (i + 1), name: B.BOT_NAMES[i % B.BOT_NAMES.length], region: regs[i % 4], bot: B.PROFILES[i % B.PROFILES.length] });
  let state = E.createGame({ seed: 4, teams });
  window.__g = { net, code, hostToken, state, E, K, P, D };
  await net.hostPublish(code, hostToken, 'locked', P.buildPublic({ status: 'locked', round: 1, state }), state, {});
  return code;
});
const advance = n => host.evaluate(async n => {
  const g = window.__g;
  for (let k = 0; k < n; k++) {
    const s = g.state, dec = {};
    for (const [id, t] of Object.entries(s.teams)) dec[id] = g.K.picksToDecision(s, id, g.K.botPicks(s, id, t.bot, s.seed));
    const ns = g.E.resolveRound(s, dec), done = ns.phase === 'done';
    await g.net.commitRound(g.code, g.hostToken, s.round, ns, g.P.buildPublic({ status: done ? 'done' : 'locked', round: ns.round, state: ns, rankings: done ? g.E.rankings(ns) : null, news: g.P.roundNews(s, ns) }), {}, done);
    g.state = ns;
  }
}, n);
const proj = await open(`projector.html?local=1&code=${code}`, { width: 1920, height: 1080 });
async function auditProjector(label) {
  await proj.reload(); await proj.waitForSelector('.proj'); await proj.waitForTimeout(2200);
  const n = await proj.evaluate(() => document.querySelectorAll('.dots .sd').length);
  for (let k = 0; k < n; k++) {
    await audit(proj, `projector ${label} slide ${k + 1}`, false);
    await proj.keyboard.press('ArrowRight'); await proj.waitForTimeout(350);
  }
  if (await proj.$('.champ')) { await audit(proj, `projector ${label} champion`, false); await proj.click('.champ .btn'); await proj.waitForTimeout(300); }
}
await auditProjector('round 1');
await advance(2); await auditProjector('after round 2');
await advance(2); await auditProjector('after round 4 (strike map)');
await advance(1); await auditProjector('final');

await browser.close(); srv?.kill();
writeFileSync(join(here, 'contrast-report.json'), JSON.stringify(violations, null, 1));
const byScreen = {};
for (const v of violations) (byScreen[v.screen] ||= []).push(v);
console.log(`audits: ${audits}, violations: ${violations.length}`);
if (process.argv.includes('--list') || violations.length) for (const [s, l] of Object.entries(byScreen)) { console.log(`\n${s} (${l.length})`); for (const v of l.slice(0, 12)) console.log(`  [${v.tag}] "${v.text}" : ${v.problems.join('; ')}`); }
if (errors.length) console.log('page errors:', errors);
process.exit(violations.length || errors.length ? 1 : 0);
