// Classroom display v3: the room's stage. It shows what only the room can see (who is locked in, who is fighting
// whom, who got hit), one screen at a time, auto-advancing. Reads only the public payload.
//   open    : A  roll call, region scene with the warning, rival board
//   locked  : B  headlines, share race, round 3 reform and who can chase chronic, round 4 strike map
//   done    : C  regional champions, who changed and survived, the champion
import * as D from '../engine/data.js';
import { h, icon, regionScene, timerMs, mmss, tween, hexEmblem, logo, ROUND_TITLES } from './ui.js';
import { makeNet } from './transport.js';
import { REGION_PROBLEM } from '../engine/deck5data.js';

const net = makeNet(), root = document.getElementById('app');
const code = (new URLSearchParams(location.search).get('code') || '').toUpperCase();
let P = null, idx = 0, lastKey = '', timer = null;
const SLIDE_MS = { open: 8000, locked: 6000, done: 8000, lobby: 0 };
const problemOf = rid => REGION_PROBLEM[rid]?.problem ?? REGION_PROBLEM[rid] ?? D.REGIONS[rid].tag;

function ask() {
  const inp = h('input', { class: 'code', maxlength: 5, placeholder: 'CODE', 'aria-label': 'Game code' });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') location.search = '?code=' + inp.value.toUpperCase(); });
  root.replaceChildren(h('div', { class: 'center', style: { position: 'fixed', inset: 0 } }, h('div', { class: 'card joinbox' }, logo(420), inp)));
}
async function load() {
  try { P = await net.getPublic(code); if (!P || !P.teams) throw new Error('No such game. Check the code.'); }
  catch (e) { root.replaceChildren(h('div', { class: 'center', style: { position: 'fixed', inset: 0 } }, h('h2', {}, e.message))); return; }
  if (!document.querySelector('.proj')) build();
  render();
}
const last = t => (t.hist.length ? t.hist.at(-1).share : null);
const before = t => (t.hist.length > 1 ? t.hist.at(-2).share : 0);
const humansIn = rid => P.teams.filter(t => t.region === rid && !t.bot);
const inRegion = rid => P.teams.filter(t => t.region === rid);

function build() {
  root.replaceChildren(h('div', { class: 'proj' },
    h('div', { class: 'head' }, logo(260), h('div', { style: { flex: 1 } }, h('div', { class: 'rt', id: 'rt' }), h('div', { id: 'sub', class: 'psub' })),
      h('div', { style: { textAlign: 'right' } }, h('div', { class: 'big', id: 'clock' }), h('div', { id: 'subs', class: 'psub' }))),
    h('div', { class: 'slidebox', id: 'slidebox' }), h('div', { class: 'foot', id: 'foot' })));
}

// ---------- which screens, by status ----------
function slides() {
  const st = P.status, r = P.round;
  if (st === 'lobby') return [{ kind: 'lobby' }];
  if (st === 'open') {
    const s = [];
    if (r === 1 && P.teams.some(t => t.region)) s.push({ kind: 'assign' });
    s.push({ kind: 'roll' });
    for (const rid of D.REGION_IDS) s.push({ kind: 'scene', rid }, { kind: 'rivals', rid });
    return s;
  }
  if (st === 'locked') {
    if (r === 1) return [{ kind: 'assign' }];
    const s = [{ kind: 'headlines' }, { kind: 'race' }];
    if (r === 3) s.push({ kind: 'reform' }, { kind: 'chase' });
    if (r === 5 && P.news?.strike) s.push({ kind: 'strike' });
    return s;
  }
  const s = D.REGION_IDS.filter(rid => P.final?.rankings?.some(x => x.region === rid)).map(rid => ({ kind: 'champ', rid }));
  if (P.final?.survivors) s.push({ kind: 'survivors' });
  if (P.final?.rankings?.length) s.push({ kind: 'champion' });
  return s;
}

function render() {
  const r = Math.min(P.round, 5), done = P.status === 'done';
  const $ = id => document.getElementById(id);
  $('rt').textContent = P.status === 'lobby' ? 'Join with the code' : done ? 'Final results' : `Round ${r}: ${ROUND_TITLES[r - 1]}`;
  const humans = P.teams.filter(t => !t.bot), inCount = humans.filter(t => t.submitted).length;
  $('subs').textContent = P.status === 'open' ? `${inCount} of ${humans.length} teams locked in` : P.status === 'locked' && r > 1 ? `Round ${r - 1} results` : P.status === 'lobby' ? `${P.teams.length} teams joined` : '';
  $('sub').textContent = P.reform && !done ? 'National reform: payment follows patient outcomes' : '';
  tickClock();
  const sl = slides();
  const key = JSON.stringify([P.status, P.round, sl.length, P.news ? 1 : 0, P.status === 'lobby' ? P.teams.length : 0]);
  if (key !== lastKey || !$('slidebox').firstChild) { lastKey = key; idx = 0; showSlide(sl, idx); schedule(); }
  else if (sl[idx]?.kind === 'roll') showSlide(sl, idx, true);   // lights up emblems as teams lock in
}
function tickClock() {
  if (!P) return;
  const clock = document.getElementById('clock'); if (!clock) return;
  const ms = P.timer ? timerMs(P.timer) : null;
  const nx = P.status === 'locked' && P.nextAt && P.nextAt > Date.now() ? P.nextAt - Date.now() : null;
  clock.textContent = P.status === 'open' ? (ms != null ? mmss(ms) : 'Open') : nx != null ? 'Next ' + mmss(nx) : '';
  clock.style.color = ms != null && ms < 30000 && P.status === 'open' ? '#ffb59e' : '';
}
function schedule() {
  clearTimeout(timer);
  const ms = SLIDE_MS[P?.status] || 0;
  if (ms) timer = setTimeout(() => { const sl = slides(); if (sl.length > 1) { idx = (idx + 1) % sl.length; showSlide(sl, idx); } schedule(); }, ms);
}

function showSlide(sl, i, quiet) {
  const box = document.getElementById('slidebox'), s = sl[i];
  const dots = h('div', { class: 'dots' }, sl.map((_, k) => h('span', { class: 'sd' + (k === i ? ' on' : '') })));
  const B = { lobby: lobbySlide, assign: assignSlide, roll: rollSlide, scene: () => sceneSlide(s.rid), rivals: () => rivalsSlide(s.rid), headlines: headlinesSlide, race: raceSlide, reform: reformSlide, chase: chaseSlide, strike: strikeSlide, champ: () => champSlide(s.rid), survivors: survivorsSlide, champion: championSlide };
  box.replaceChildren(B[s.kind](), dots);
}

// ---------- A: decision window ----------
function lobbySlide() {
  return h('div', { class: 'lobbyslide' }, h('div', { style: { fontSize: '40px' } }, 'Go to ' + location.origin + location.pathname.replace('projector.html', 'team.html').replace(/\/+$/, '')),
    h('div', { class: 'serif', style: { fontSize: '170px', letterSpacing: '18px', color: '#fff8e6', lineHeight: 1 } }, P.code || code), h('div', { style: { fontSize: '36px' } }, 'Type this code and a name for your team'),
    h('div', { class: 'joined' }, P.teams.filter(t => !t.bot).map(t => h('span', { class: 'jchip' }, hexEmblem(t.name, null, 34, t.emblem), t.name))));
}
function assignSlide() {
  const cols = D.REGION_IDS.map(rid => {
    const reg = D.REGIONS[rid];
    return h('div', { class: 'acol' }, h('div', { class: 'ahead' }, regionScene(rid), h('div', { class: 'aname' }, h('h3', {}, reg.name), h('div', {}, reg.tag))),
      h('div', { class: 'aprob' }, problemOf(rid)), humansIn(rid).map(t => h('div', { class: 'ateam' }, hexEmblem(t.name, rid, 44, t.emblem), h('span', {}, t.name))));
  });
  return h('div', { class: 'assign' }, h('h2', {}, 'Your region'), h('div', { class: 'acols' }, cols));
}
function rollSlide() {
  const cols = D.REGION_IDS.map(rid => h('div', { class: 'rollcol' }, h('h3', {}, D.REGIONS[rid].name),
    humansIn(rid).length ? humansIn(rid).map(t => h('div', { class: 'rollrow' + (t.submitted ? ' lit' : '') }, h('span', { class: 'emb' }, hexEmblem(t.name, rid, 52, t.emblem)), h('span', { class: 'nm' }, t.name), t.submitted ? icon('check', 38) : null)) : h('div', { class: 'muted rollnone' }, 'Bots only')));
  const hum = P.teams.filter(t => !t.bot), n = hum.filter(t => t.submitted).length;
  return h('div', { class: 'roll' }, h('h2', {}, n === hum.length && hum.length ? 'Everyone is locked in' : `${n} of ${hum.length} locked in`), h('div', { class: 'rollcols' }, cols));
}
function sceneSlide(rid) {
  const reg = D.REGIONS[rid], ev = P.events?.[rid], warn = P.warnings?.[rid];
  return h('div', { class: 'sceneslide' }, h('div', { class: 'bigscene' }, regionScene(rid)),
    h('div', { class: 'scenetext' }, h('div', { class: 'role' }, 'REGION'), h('h2', {}, reg.name), h('div', { class: 'problem' }, problemOf(rid)),
      ev ? h('div', { class: 'thisround' }, icon('warn', 40), h('span', {}, 'This round: ' + ev.title)) : null),
    warn ? h('div', { class: 'ticker' }, h('b', {}, 'Coming next: '), warn) : null);
}
function rivalsSlide(rid) {
  const lines = Object.fromEntries((P.news?.regions?.[rid] || []).map(n => [n.teamId, n.line]));
  const rows = inRegion(rid).map(t => h('div', { class: 'rivalrow' }, hexEmblem(t.name, rid, 64, t.emblem), h('div', {}, h('div', { class: 'rn' }, t.name), h('div', { class: 'rmove' }, lines[t.id] || (P.round === 1 ? 'No move yet. Round 1 is the first.' : 'No public move last round.')))));
  return h('div', { class: 'rivals' }, h('h2', {}, D.REGIONS[rid].name + ': who did what'), h('div', { class: 'rivalrows' }, rows));
}

// ---------- B: reveal ----------
function headlinesSlide() {
  const pr = x => (x.kind === 'raid' && !/held/.test(x.line) ? 0 : x.kind === 'raid' ? 1 : 2);
  const per = D.REGION_IDS.map(rid => ({ rid, lines: (P.news?.regions?.[rid] || []).slice().sort((a, b) => pr(a) - pr(b)).slice(0, 2) })).sort((a, b) => (a.lines[0] ? pr(a.lines[0]) : 9) - (b.lines[0] ? pr(b.lines[0]) : 9));
  return h('div', { class: 'headslide' }, h('h2', {}, 'Headlines'), per.map(({ rid, lines }) => h('div', { class: 'hrow' }, h('div', { class: 'hreg' }, D.REGIONS[rid].name),
    h('div', { class: 'hlines' }, lines.length ? lines.map(n => h('div', { class: 'hline' + (n.kind === 'raid' ? ' hot' : '') }, hexEmblem(n.name, rid, 48, n.emblem), h('span', {}, n.line))) : h('div', { class: 'hline muted' }, 'A quiet round.')))));
}
function raceSlide() {
  const cols = D.REGION_IDS.map(rid => h('div', { class: 'racecol' }, h('h3', {}, D.REGIONS[rid].name), inRegion(rid).slice().sort((a, b) => (last(b) ?? 0) - (last(a) ?? 0)).map(t => {
    const a = last(t) ?? 0, b0 = before(t), fill = h('i', { style: { width: Math.min(100, b0 * 100 * 2.2) + '%' } }), pc = h('b', {}, Math.round(b0 * 100) + '%');
    setTimeout(() => { fill.style.width = Math.min(100, a * 100 * 2.2) + '%'; tween(pc, a * 100, { from: b0 * 100, fmt: v => Math.round(v) + '%', ms: 1600 }); }, 400);
    const d = (a - b0) * 100;
    return h('div', { class: 'racerow' }, hexEmblem(t.name, rid, 46, t.emblem), h('span', { class: 'nm' }, t.name), pc, h('span', { class: 'arrow ' + (d >= 0.5 ? 'up' : d <= -0.5 ? 'down' : '') }, d >= 0.5 ? '▲' : d <= -0.5 ? '▼' : ''), h('div', { class: 'bar' }, fill));
  })));
  return h('div', { class: 'race' }, h('h2', {}, 'The share race'), h('div', { class: 'racecols' }, cols));
}
function reformSlide() {
  const img = h('img', { src: 'assets/scenes/reform.jpg', alt: '', class: 'reformimg' }); img.onerror = () => img.remove();
  return h('div', { class: 'reformslide' }, img, h('div', { class: 'reformtext' }, h('div', { class: 'role' }, 'NATIONAL REFORM'), h('h2', {}, 'Pay follows outcomes'), h('p', {}, 'Washington now pays for results, not visits. Chronic care pays more. Specialty pays less.')));
}
function chaseSlide() {
  const need = P.chaseNeed;
  const cols = D.REGION_IDS.map(rid => h('div', { class: 'chasecol' }, h('h3', {}, D.REGIONS[rid].name), inRegion(rid).slice().sort((a, b) => (b.coord ?? 0) - (a.coord ?? 0)).map(t => {
    const lock = need != null && (t.coord ?? 0) < need;
    return h('div', { class: 'chaserow' + (lock ? ' locked' : '') }, hexEmblem(t.name, rid, 46, t.emblem), h('span', { class: 'nm' }, t.name), lock ? h('span', { class: 'lockbadge' }, icon('lock', 36), 'Locked') : h('span', { class: 'openbadge' }, icon('check', 36), 'Ready'));
  })));
  return h('div', { class: 'chase' }, h('h2', {}, 'Who can chase chronic care'), h('div', { class: 'chasenote' }, `Chronic care needs coordination ${need ?? ''}. A lock means the push runs at reduced strength.`), h('div', { class: 'chasecols' }, cols));
}
function strikeSlide() {
  const st = P.news.strike.teams, th = P.strikeThreshold ?? 50;
  const tiles = [];
  const cols = D.REGION_IDS.map(rid => h('div', { class: 'scol' }, h('h3', {}, D.REGIONS[rid].name), st.filter(t => t.region === rid).map(t => {
    const m = t.meter ?? 0, el = h('div', { class: 'stile held' }, hexEmblem(t.name, rid, 40, t.emblem), h('span', { class: 'nm' }, t.name), h('b', {}, 'Held'),
      h('div', { class: 'bar sbar' }, h('i', { style: { width: Math.min(100, m) + '%' } }), h('em', { style: { left: th + '%' } })));
    if (t.struck) tiles.push([el, t]);
    return el;
  })));
  setTimeout(() => { for (const [el] of tiles) { el.classList.remove('held'); el.classList.add('out'); el.querySelector('b').textContent = 'Walked out'; } }, 900);   // every walkout goes red together
  return h('div', { class: 'strikemap' }, h('h2', {}, 'Strike vote: who held and who walked out'), h('div', { class: 'scols' }, cols));
}

// ---------- C: final ----------
function champSlide(rid) {
  const w = P.final.rankings.filter(x => x.region === rid).sort((a, b) => a.regionRank - b.regionRank)[0], t = P.teams.find(x => x.id === w.id);
  return h('div', { class: 'champslide' }, h('div', { class: 'bigscene' }, regionScene(rid)), h('div', { class: 'scenetext' }, h('div', { class: 'role' }, 'REGIONAL CHAMPION'), h('h2', {}, D.REGIONS[rid].name),
    h('div', { class: 'champname' }, hexEmblem(t?.name || '', rid, 96, t?.emblem), h('span', {}, t?.name || w.id)), h('div', { class: 'problem' }, `Score ${Math.round(w.total)}`)));
}
function survivorsSlide() {
  const sv = P.final.survivors, rk = Object.fromEntries((P.final.rankings || []).map(x => [x.id, x]));
  const rows = sv.slice().sort((a, b) => (rk[a.id]?.classRank || 99) - (rk[b.id]?.classRank || 99)).slice(0, 8);
  return h('div', { class: 'survivors' }, h('h2', {}, 'Who changed and survived'),
    h('table', { class: 'svt' }, h('tr', {}, ['Rank', 'Network', 'Changes', 'Finished', 'Strike vote'].map(x => h('th', {}, x))),
      rows.map(t => h('tr', {}, h('td', {}, rk[t.id]?.classRank ?? ''), h('td', {}, h('span', { class: 'row', style: { gap: '12px', flexWrap: 'nowrap' } }, hexEmblem(t.name, t.region, 44, t.emblem), t.name)), h('td', {}, t.changes), h('td', {}, t.finished), h('td', {}, t.struck ? 'Walked out' : 'Held')))));
}
function championSlide() {
  const rk = P.final.rankings, top = rk[0], t = P.teams.find(x => x.id === top.id);
  return h('div', { class: 'champbig' }, h('div', { class: 'champlab' }, 'Class champion'), hexEmblem(t?.name || '', top.region, 150, t?.emblem), h('div', { class: 'nm' }, t?.name || top.id), h('div', { class: 'champscore' }, `${D.REGIONS[top.region].name} · score ${Math.round(top.total)}`));
}

if (!code) ask();
else {
  net.subscribe(code, load);
  setInterval(() => { if (P) tickClock(); }, 500);
  setInterval(load, 3000);
  document.addEventListener('keydown', e => { if (!P) return; const sl = slides(); if (e.key === 'ArrowRight') { idx = (idx + 1) % sl.length; showSlide(sl, idx); schedule(); } if (e.key === 'ArrowLeft') { idx = (idx + sl.length - 1) % sl.length; showSlide(sl, idx); schedule(); } });
  load();
}
