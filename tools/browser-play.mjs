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
const VP = { width: 1280, height: 768 };
// A control counts as visible without scrolling when its box sits fully inside the window.
const inView = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; });
async function mustSee(p, sel, what) { assert.ok(await inView(p, sel), `${what} (${sel}) visible without scrolling at 768px tall`); }
// The projector cycles slides; step through them with the arrow keys until the wanted text shows.
async function projFind(page, text, maxSteps = 8) {
  for (let k = 0; k < maxSteps; k++) {
    if ((await page.textContent('body')).includes(text)) return true;
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  }
  return false;
}
// LIVE=1 runs the multi-device part against live Supabase (no ?local=1); test teams are prefixed zz-test-.
const LIVE = process.env.LIVE === '1', Q = LIVE ? 'local=0' : 'local=1', PRE = LIVE ? 'zz-test-' : '';
const tab = (p, name) => p.click(`.tab:has-text("${name}")`);

// Clears any open overlay: the three-tap reveal, results, or the final screen.
async function clearOverlay(p) {
  for (let k = 0; k < 6 && await p.$('.overlay'); k++) {
    if (await p.$('#rvnext')) await p.click('#rvnext');
    else if (await p.$('#rvdone')) await p.click('#rvdone');
    else if (await p.$('#finalclose')) await p.click('#finalclose');
    else break;
    await p.waitForTimeout(250);
  }
}
// A scripted team: reads the brief, then picks one option on each of the three cards.
async function playRound(p, round, tag, extra = {}) {
  await p.waitForSelector('.tab');
  if (await p.$('.wiz')) {
    if (extra.rename) { await p.fill('#netname', extra.rename); await p.click('[aria-label="Emblem 3"]'); }
    if (extra.shots) await snap(p, `${tag}-wizard-0-name`);
    if (extra.short) await mustSee(p, '#wiznext', 'wizard button');
    await p.click('#wiznext');
    await p.click('.arch >> nth=2');
    if (extra.shots) await snap(p, `${tag}-wizard-1-archetype`);
    await p.click('#wiznext');
    if (extra.shots) await snap(p, `${tag}-wizard-2-region`);
    await p.click('#wiznext'); await p.click('#wiznext');
  }
  await tab(p, 'This round');
  await p.waitForSelector('#seedecisions');
  await p.waitForTimeout(500);
  if (extra.shots) await snap(p, `${tag}-r${round}-brief`);
  if (extra.short) await mustSee(p, '#seedecisions', 'brief button');
  await p.click('#seedecisions');
  let custom = false;
  const choose = async fallback => {
    for (let slot = 0; slot < 3; slot++) {
      await p.waitForSelector('.otile');
      const open = await p.$$('.otile:not(.locked)');
      const pick = fallback ? 0 : (round + (extra.salt || 0) + slot) % open.length;
      if (extra.shots && !fallback) await snap(p, `${tag}-r${round}-card${slot + 1}`);
      await open[pick].click();
      if (slot === 0 && await p.$('.dials')) {   // market card: set the dial, as a team would
        await p.click(`[data-dial="${['light', 'steady', 'all'][(extra.salt || 0) % 3]}"]`);
        if (extra.shots && !fallback) await snap(p, `${tag}-r${round}-dial`);
      }
      if (slot === 1 && await p.$('.pointspanel')) {   // org option that changes Star points: choose custom points
        assert.equal((await p.$$('.prow3')).length, 5, 'chooser lists the five Star points');
        const had = await p.$$('.prow3.on');
        await p.click('.prow3:not(.on) .pbtn >> nth=0');
        assert.equal((await p.$$('.prow3.on')).length, had.length, 'the number of chosen points stays enforced');
        if (await p.$('.prow3.on .ptile:not(.on)')) await p.click('.prow3.on .ptile:not(.on) >> nth=0');
        if (extra.shots && !fallback) await snap(p, `${tag}-r${round}-points`);
        custom = true;
      }
      if (await p.$('.targets .tile')) await p.click('.targets .tile >> nth=0');
      if (extra.short) await mustSee(p, '#nextcard', 'card nav button');
      await p.click('#nextcard');
    }
    // review step: picks and collision lines, then submit
    await p.waitForSelector('#submitbtn');
    assert.ok(!(await p.$('.forecast')), 'there is no forecast question');
    if (custom) assert.ok((await p.$$('.sumrow .chip.warn')).length >= 1, 'review shows the chosen Star points');
  };
  await choose(false);
  if (await p.$('#submitbtn[disabled]') && (await p.textContent('.subnote')).includes('Over budget')) {   // fall back to the first open option everywhere
    await p.click('.cstep >> nth=0'); await choose(true);
  }
  if (extra.short) await mustSee(p, '#submitbtn', 'submit button');
  if (extra.shots) await snap(p, `${tag}-r${round}-submit`);
  await p.click('#submitbtn');
}

// ---------- solo ----------
log('solo...');
const solo = await open('solo.html?local=1', VP);
await solo.waitForSelector('[data-region="metro"]');
await snap(solo, 'solo-0-setup');
await solo.click('[data-region="metro"]');
await solo.waitForSelector('.pillnav, .wiz');
await solo.waitForTimeout(600);
for (let r = 1; r <= 5; r++) {
  await playRound(solo, r, 'solo', { shots: r === 1 || r === 3, short: true, rename: r === 1 ? 'Solo Test Co' : null });
  await solo.waitForSelector('.reveal');
  await solo.waitForTimeout(1600);
  if (r === 2 || r === 5) await snap(solo, `solo-r${r}-reveal-1-tug`);
  await mustSee(solo, '#rvnext', 'reveal next');
  await solo.click('#rvnext'); await solo.waitForTimeout(300);
  if (r === 2) await snap(solo, 'solo-r2-reveal-2-headlines');
  await mustSee(solo, '#rvnext', 'reveal next');
  await solo.click('#rvnext'); await solo.waitForTimeout(1300);
  await mustSee(solo, '#rvdone', 'reveal done');
  if (r === 2) await snap(solo, 'solo-r2-reveal-3-meters');
  await solo.click('#rvdone');
  if (r < 5) await solo.waitForFunction(n => document.querySelector('.roundbox .t')?.textContent.includes('Round ' + n), r + 1);
}
await solo.waitForSelector('#finalclose');
await solo.waitForTimeout(600);
await snap(solo, 'solo-final-diagnosis');
assert.ok((await solo.textContent('.teamtag')).includes('Solo Test Co'), 'solo network renamed in engine state');
assert.match(await solo.textContent('.overlay .res'), /Final results/, 'solo final diagnosis');
await solo.click('#finalclose');
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
  const p = await open('index.html?' + Q + '&code=' + code + '&name=' + encodeURIComponent(n), teams.length === 0 ? VP : undefined);
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
    assert.ok(await projFind(proj, evTitle), 'projector shows overridden event: ' + evTitle);
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
    await clearOverlay(p);
    await playRound(p, r, 'team' + (i + 1), { shots: i === 0 && r <= 3, short: i === 0, salt: i, rename: i === 0 && r === 1 ? PRE + 'Renamed Alder' : null });
    await p.waitForFunction(() => document.querySelector('#submitbtn')?.textContent.includes('Submitted'), null, { timeout: 15000 });
  }
  await host.waitForTimeout(600);
  if (r <= 2) await snap(host, `host-r${r}-submitted`);
  await host.click('#resolve');
  if (r < 5) await host.waitForSelector('#openround', { timeout: 20000 });
  else await proj.waitForSelector('.champ', { timeout: 20000 });
  await proj.waitForTimeout(2200);
  if (r === 1) assert.ok(await projFind(proj, PRE + 'Renamed Alder'), 'projector shows the display name');
  if (r === 4) { assert.ok(await projFind(proj, 'Strike map'), 'projector shows the strike map after round 4'); await snap(proj, 'projector-r4-strike-map'); }
  await snap(proj, `projector-r${r}-results`);
  await teams[0].waitForSelector('.reveal', { timeout: 10000 });
  await teams[0].waitForTimeout(1600);
  if (r <= 3 || r === 5) await snap(teams[0], `team1-r${r}-reveal-1-tug`);
  await mustSee(teams[0], '#rvnext', 'team reveal next');
  await teams[0].click('#rvnext'); await teams[0].waitForTimeout(300);
  if (r <= 3) await snap(teams[0], `team1-r${r}-reveal-2-headlines`);
  await teams[0].click('#rvnext'); await teams[0].waitForTimeout(1200);
  if (r <= 3) await snap(teams[0], `team1-r${r}-reveal-3-meters`);
  await teams[0].click('#rvdone');
}
// final screens
await teams[0].waitForSelector('#finalclose');
await snap(teams[0], 'team1-final');
await teams[0].click('#finalclose');
await snap(proj, 'projector-champion');
await proj.click('.champ .btn');
assert.ok(await projFind(proj, 'Who changed and survived'), 'projector shows the survivors grid');
await snap(proj, 'projector-survivors');
await snap(host, 'host-final-standings');

// tablet width on a team page and the host
await teams[0].setViewportSize({ width: 1024, height: 768 });
await teams[0].waitForTimeout(400);
await snap(teams[0], 'tablet-done');
await tab(teams[0], 'Organization'); await teams[0].waitForTimeout(300); await snap(teams[0], 'tablet-organization');
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
