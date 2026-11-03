// Real-browser run (local transport): solo for 5 rounds; then host + 2 teams + projector for a full 5-round game
// including pause/extend, event override, restart and the champion screen; then tablet-width checks.
//   node tools/browser-play.mjs   (starts its own server on 8096 unless one answers)
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots'); mkdirSync(shots, { recursive: true });
const require = createRequire(join(execSync('npm root -g').toString().trim(), 'x.js'));
const { chromium } = require('playwright');
const port = Number(process.env.PORT) || 8096, base = `http://localhost:${port}/`;
let srv = null;
try { await fetch(base); } catch { srv = spawn(process.execPath, [join(here, '..', 'serve.mjs'), String(port)], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800)); }
let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
const errors = [];
const open = async (url, vp) => {
  const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp);
  p.on('pageerror', e => errors.push(url + ' PAGEERROR ' + e.message));
  p.on('dialog', d => d.accept());
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon|assets\/|Failed to load resource/.test(m.text() + (m.location()?.url || ''))) errors.push(url + ' ' + m.text()); });
  await p.goto(base + url); return p;
};
const snap = (p, n) => p.screenshot({ path: join(shots, n + '.png') });
const setRange = (p, sel, val) => p.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, val);
const log = m => console.log(m);
// LIVE=1 runs the multi-device part against live Supabase (no ?local=1); test teams are prefixed zz-test-.
const LIVE = process.env.LIVE === '1', Q = LIVE ? 'local=0' : 'local=1', PRE = LIVE ? 'zz-test-' : '';
const tab = (p, name) => p.click(`.tab:has-text("${name}")`);

// A scripted team that changes settings a little each round.
async function playRound(p, round, tag, extra = {}) {
  await p.waitForSelector('.tab');
  if (await p.$('.wiz')) {
    if (extra.shots) await snap(p, `${tag}-wizard-0-name`);
    await p.click('#wiznext');
    await p.click('.arch >> nth=2');
    if (extra.shots) await snap(p, `${tag}-wizard-1-archetype`);
    await p.click('#wiznext');
    if (extra.shots) await snap(p, `${tag}-wizard-2-region`);
    await p.click('#wiznext'); await p.click('#wiznext');
  }
  await tab(p, 'Compete');
  await p.waitForSelector(".pillnav");
  await p.waitForTimeout(500);
  if (extra.shots) await snap(p, `${tag}-r${round}-market`);
  if (round === 1) {
    await tab(p, 'Organize');
    await p.waitForSelector('.seg-hit');
    await p.click('.seg-hit >> nth=3');
    await p.click('.prow2.sel .tile >> nth=2');
    if (extra.shots) await snap(p, `${tag}-r1-organize`);
    await tab(p, 'Compete');
  }
  await p.click('#allocate');
  await p.waitForSelector('.drawer');
  await setRange(p, '.drawer input[data-f="primary"]', 60);
  await setRange(p, '.drawer input[type=range] >> nth=3', 3);
  await setRange(p, '.drawer input[type=range] >> nth=4', 1.5);
  await p.click('.sw3 button >> nth=2');
  if (round >= 4) await p.click('.toggle');
  await p.waitForTimeout(500);
  if (extra.shots) await snap(p, `${tag}-r${round}-compete`);
  await p.click('.drawer .btn');
  if (round === 3) {
    await tab(p, 'Organize');
    await p.click('.seg-hit >> nth=0'); await p.click('.prow2.sel .tile >> nth=1');
    await p.click('.seg-hit >> nth=2'); await p.click('.prow2.sel .tile >> nth=2');
    if (extra.shots) await snap(p, `${tag}-r3-organize`);
  }
  await tab(p, 'Lead');
  if (round === 3) await p.click('.radio >> nth=2');
  if (await p.$('.resp button')) await p.click('.resp button >> nth=2');
  await p.waitForTimeout(400);
  if (extra.shots) await snap(p, `${tag}-r${round}-lead`);
  await p.click('#submitbtn');
}

// ---------- solo ----------
log('solo...');
const solo = await open('solo.html?local=1');
await solo.waitForSelector('[data-region="metro"]');
await snap(solo, 'solo-0-setup');
await solo.click('[data-region="metro"]');
await solo.waitForSelector('.pillnav, .wiz');
await solo.waitForTimeout(600);
for (let r = 1; r <= 5; r++) {
  await playRound(solo, r, 'solo', { shots: r === 1 || r === 3 });
  await solo.waitForSelector('.overlay .res');
  await solo.waitForTimeout(1400);
  if (r === 2 || r === 5) await snap(solo, `solo-r${r}-results`);
  await solo.click('.overlay .btn');
  if (r < 5) await solo.waitForFunction(n => document.querySelector('.roundbox .t')?.textContent.includes('Round ' + n), r + 1);
}
await solo.waitForSelector('.overlay .res');
await solo.waitForTimeout(600);
await snap(solo, 'solo-final-diagnosis');
assert.match(await solo.textContent('.overlay .res'), /Final results/, 'solo final diagnosis');
await solo.click('.overlay .btn');
await solo.close();

// ---------- host + teams + projector, full game ----------
log('multi...');
const host = await open('host.html?' + Q);
await host.fill('.field', '1234');
await host.click('#create');
await host.waitForSelector('#joincode');
const code = await host.textContent('#joincode');
const proj = await open('projector.html?' + Q + '&code=' + code, { width: 1920, height: 1080 });
const names = [PRE + 'Alder Health', PRE + 'Birch Care', PRE + 'Cedar Team'];
const teams = [];
for (const n of names) {
  const p = await open('index.html?' + Q + '&code=' + code + '&name=' + encodeURIComponent(n));
  if (!teams.length) await snap(p, 'title-screen');
  await p.click('#join'); await p.waitForURL(/team\.html/);
  teams.push(p);
}
await host.waitForSelector('text=' + names[0]);
await host.fill('#addname', PRE + 'Late Team'); await host.click('#addteam');
await host.waitForSelector('#addedinfo');
const lateUrl = await host.getAttribute('#addedinfo a', 'href');
assert.match(lateUrl, /t=/, 'late team rejoin link');
await host.waitForSelector('text=' + PRE + 'Late Team');
const lateP = await open(lateUrl.replace(base, ''));
await lateP.waitForSelector('text=Waiting for the instructor');
await lateP.close();
await host.click('#dist');
await host.waitForTimeout(300);
await host.selectOption('#fill', '3'); await host.click('#fillbtn');
await host.waitForTimeout(500);
await snap(host, 'host-1-lobby');
await host.click('#startgame');
await host.waitForSelector('#openround');
await snap(proj, 'projector-0-ready');
await snap(teams[0], 'team-waiting-for-open');

// event override: set a Mountain West event for round 1 and look for it on the projector
const evSel = host.locator('select[aria-label="Event mountain"]');
await evSel.selectOption({ index: 1 });
const evTitle = (await evSel.locator('option:checked').textContent()).trim();
await host.waitForTimeout(500);

for (let r = 1; r <= 5; r++) {
  if (r === 3) {   // rejoin after closing a tab: same name, saved token
    await teams[2].close();
    const rp = await open('index.html?' + Q + '&code=' + code + '&name=' + encodeURIComponent(names[2]));
    await rp.click('#join'); await rp.waitForURL(/team\.html/);
    teams[2] = rp; log('rejoined ' + names[2]);
  }
  await host.selectOption('#dur', '60');
  await host.click('#openround');
  await host.waitForSelector('#resolve');
  await proj.waitForTimeout(800);
  await snap(proj, `projector-r${r}-open`);
  if (r === 1) {
    assert.ok((await proj.textContent('body')).includes(evTitle), 'projector shows overridden event: ' + evTitle);
    // pause and extend
    const clock = async () => (await host.textContent('#hostclock')).trim();
    await host.click('button:has-text("Extend +1 min")'); await host.waitForTimeout(700);
    const t1 = await clock(); assert.match(t1, /^1:\d\d$/, 'extended clock ' + t1);
    await host.click('button:has-text("Pause")'); await host.waitForSelector('button:has-text("Resume")');
    const p1 = await clock(); await host.waitForTimeout(1500); await host.waitForTimeout(600);
    const p2 = await clock(); assert.equal(p1, p2, 'timer holds while paused');
    await snap(host, 'host-r1-paused');
    await host.click('button:has-text("Resume")'); await host.waitForSelector('button:has-text("Pause")');
  }
  for (const [i, p] of teams.entries()) {
    if (r === 2 && i === 1) continue;   // second team misses round 2: defaults
    await p.reload();
    await p.waitForSelector('.tab');
    await p.waitForTimeout(300);
    if (await p.$('.overlay .res')) await p.click('.overlay .btn');
    await playRound(p, r, 'team' + (i + 1), { shots: i === 0 && r <= 3 });
    await p.waitForFunction(() => document.querySelector('#submitbtn')?.textContent.includes('Submitted'));
  }
  await host.waitForTimeout(600);
  if (r <= 2) await snap(host, `host-r${r}-submitted`);
  await host.click('#resolve');
  if (r < 5) await host.waitForSelector('#openround', { timeout: 20000 });
  else await proj.waitForSelector('.champ', { timeout: 20000 });
  await proj.waitForTimeout(2200);
  await snap(proj, `projector-r${r}-results`);
  await teams[0].waitForSelector('.overlay .res', { timeout: 10000 });
  await teams[0].waitForTimeout(1300);
  if (r <= 3 || r === 5) await snap(teams[0], `team1-r${r}-results`);
  await teams[0].click('.overlay .btn');
}
// final screens
await teams[0].waitForSelector('.overlay .res');
await snap(teams[0], 'team1-final');
await teams[0].click('.overlay .btn');
await snap(proj, 'projector-champion');
await snap(host, 'host-final-standings');

// tablet width on a team page and the host
await teams[0].setViewportSize({ width: 1024, height: 768 });
await teams[0].waitForTimeout(400);
await snap(teams[0], 'tablet-market');
await tab(teams[0], 'Organize'); await teams[0].waitForTimeout(300); await snap(teams[0], 'tablet-organize');
await tab(teams[0], 'Lead'); await teams[0].waitForTimeout(300); await snap(teams[0], 'tablet-lead');
await host.setViewportSize({ width: 1024, height: 768 }); await host.waitForTimeout(300); await snap(host, 'tablet-host');
await proj.setViewportSize({ width: 1024, height: 768 }); await proj.waitForTimeout(300); await snap(proj, 'tablet-projector');

// restart returns everyone to the lobby
await host.click('button:has-text("Reset")');
await host.waitForSelector('#startgame', { timeout: 10000 });
assert.ok(!(await host.$('#openround')), 'host back in lobby after reset');
await teams[1].reload();
await teams[1].waitForSelector('text=Waiting for the instructor');

log('errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
await browser.close(); srv?.kill();
process.exit(errors.length ? 1 : 0);
