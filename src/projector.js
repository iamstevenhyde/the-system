// Classroom display v2. Reads only the public payload: no decisions, no private state.
// Cycles the four regions (scoreboard plus that region's news and showdowns), adds a class-wide strike map
// after round 4, and a "Who changed and survived" grid at the end.
import * as D from '../engine/data.js';
import { h, icon, regionScene, timerMs, mmss, tween, hexEmblem, logo, ROUND_TITLES } from './ui.js';
import { makeNet } from './transport.js';
import { REGION_PROBLEM } from '../engine/deck5data.js';

const net = makeNet(), root = document.getElementById('app');
const code = (new URLSearchParams(location.search).get('code') || '').toUpperCase();
let P = null, idx = 0, lastKey = '', champShown = false, champClosed = false;
const SLIDE_MS = 9000;

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

function build() {
  root.replaceChildren(h('div', { class: 'proj' },
    h('div', { class: 'head' }, logo(300), h('div', { style: { flex: 1 } }, h('div', { class: 'rt', id: 'rt' }), h('div', { id: 'sub', style: { fontSize: '26px', marginTop: '4px' } })),
      h('div', { style: { textAlign: 'right' } }, h('div', { class: 'big', id: 'clock' }), h('div', { id: 'subs', style: { fontSize: '24px', color: '#cfdcd2' } }))),
    h('div', { class: 'slidebox', id: 'slidebox' }), h('div', { class: 'foot', id: 'foot' })));
}

function slides() {
  if (P.status === 'lobby') return [{ kind: 'lobby' }];
  const s = D.REGION_IDS.map(rid => ({ kind: 'region', rid }));
  if (P.round === 1 && P.teams.some(t => t.region)) s.unshift({ kind: 'assign' });
  if (P.news?.strike && (P.round === 5 || P.status === 'done')) s.push({ kind: 'strike' });
  if (P.status === 'done' && P.final?.survivors) s.push({ kind: 'survivors' });
  return s;
}

function render() {
  const r = Math.min(P.round, 5), done = P.status === 'done';
  const $ = id => document.getElementById(id);
  $('rt').textContent = P.status === 'lobby' ? 'Join with the code' : done ? 'Final results' : `Round ${r}: ${ROUND_TITLES[r - 1]}`;
  const humans = P.teams.filter(t => !t.bot), inCount = humans.filter(t => t.submitted).length;
  $('subs').textContent = P.status === 'open' ? `${inCount} of ${humans.length} teams in` : P.status === 'locked' && r > 1 ? `Round ${r - 1} results are in` : P.status === 'lobby' ? `${P.teams.length} teams joined` : '';
  $('sub').textContent = P.reform && !done ? 'National reform: payment now follows patient outcomes' : '';
  $('sub').style.color = '#cfdcd2';
  tickClock();
  const sl = slides();
  const key = JSON.stringify([P.status, P.round, P.teams.map(t => [t.id, t.name, t.hist.length, t.submitted]), P.news ? 1 : 0]);
  if (idx >= sl.length) idx = 0;
  if (key !== lastKey || !$('slidebox').firstChild) { lastKey = key; showSlide(sl, idx); }
  champion();
}
function tickClock() {
  if (!P) return;
  const clock = document.getElementById('clock'); if (!clock) return;
  const ms = P.timer ? timerMs(P.timer) : null;
  clock.textContent = P.status === 'open' ? (ms != null ? mmss(ms) : 'Open') : P.status === 'locked' ? '' : '';
  clock.style.color = ms != null && ms < 30000 && P.status === 'open' ? '#ffb59e' : '';
}

function showSlide(sl, i) {
  const box = document.getElementById('slidebox'), s = sl[i];
  const dots = h('div', { class: 'dots' }, sl.map((_, k) => h('span', { class: 'sd' + (k === i ? ' on' : '') })));
  let body;
  if (s.kind === 'lobby') body = h('div', { class: 'lobbyslide' }, h('div', { class: 'serif', style: { fontSize: '150px', letterSpacing: '16px', color: '#fff8e6' } }, P.code), h('div', { style: { fontSize: '34px' } }, 'Open the game page and enter the code'));
  else if (s.kind === 'assign') body = assignSlide();
  else if (s.kind === 'region') body = regionSlide(s.rid);
  else if (s.kind === 'strike') body = strikeSlide();
  else body = survivorsSlide();
  box.replaceChildren(body, dots);
}

function regionSlide(rid) {
  const reg = D.REGIONS[rid], teams = P.teams.filter(t => t.region === rid).sort((a, b) => (last(b) ?? -1) - (last(a) ?? -1) || a.name.localeCompare(b.name));
  const done = P.status === 'done', win = done ? P.final?.rankings?.filter(x => x.region === rid).sort((a, b) => a.regionRank - b.regionRank)[0]?.id : null;
  const board = h('div', { class: 'rp' }, regionScene(rid), h('div', { class: 'in' }, h('h2', {}, reg.name), h('div', { class: 'tag' }, reg.tag)));
  const inner = board.querySelector('.in');
  const ev = P.events?.[rid];
  if (ev && !done) inner.append(h('div', { class: 'ev' }, icon('warn', 26), ev.title));
  teams.forEach(t => {
    const sh = last(t), fill = h('i', { style: { width: Math.min(100, (before(t)) * 100 * 2.2) + '%' } }), pc = h('span', { class: 'pc' }, sh == null ? '' : Math.round(before(t) * 100) + '%');
    const d = sh != null && t.hist.length > 1 ? (sh - before(t)) * 100 : null;
    const row = h('div', { class: 'prow' + (t.id === win ? ' winner' : '') }, hexEmblem(t.name, rid, 36, t.emblem), h('span', { class: 'nm' }, t.name),
      h('span', { class: 'pcw' }, pc, h('span', { class: 'sub', style: { color: d != null && d < 0 ? 'var(--bad)' : 'var(--good)' } }, d != null ? (d >= 0.5 ? ' ▲' : d <= -0.5 ? ' ▼' : '') : (P.status === 'open' && !t.bot && t.submitted ? ' ✓' : ''))),
      h('div', { class: 'bar' }, fill));
    inner.append(row);
    if (sh != null) setTimeout(() => { fill.style.width = Math.min(100, sh * 100 * 2.2) + '%'; tween(pc, sh * 100, { from: before(t) * 100, fmt: v => Math.round(v) + '%', ms: 1500 }); }, 350);
  });
  const lines = (P.news?.regions?.[rid] || []);
  const sd = (P.news?.showdowns || []).filter(x => x.region === rid);
  const news = h('div', { class: 'newspanel' }, h('h3', {}, P.news ? `What happened in ${reg.name}` : 'The region is open'));
  if (!lines.length) news.append(h('div', { class: 'nline muted' }, 'No moves yet.'));
  for (const n of lines) news.append(h('div', { class: 'nline' }, hexEmblem(n.name, rid, 40, n.emblem), h('span', {}, n.line)));
  for (const x of sd) {
    const a = P.teams.find(t => t.id === x.challenger), b = P.teams.find(t => t.id === x.leader);
    if (a && b) news.append(h('div', { class: 'nline showdown' }, icon('raid', 36), h('span', {}, `Showdown: ${a.name} challenged ${b.name}.`)));
  }
  return h('div', { class: 'pslide' }, board, news);
}

// Round 1: the host has assigned every team. Four regions, the teams in each, and each region's problem.
function assignSlide() {
  const cols = D.REGION_IDS.map(rid => {
    const reg = D.REGIONS[rid], teams = P.teams.filter(t => t.region === rid);
    return h('div', { class: 'acol' }, h('div', { class: 'ahead' }, regionScene(rid), h('div', { class: 'aname' }, h('h3', {}, reg.name), h('div', {}, reg.tag))),
      h('div', { class: 'aprob' }, REGION_PROBLEM[rid]?.problem ?? REGION_PROBLEM[rid] ?? reg.tag), teams.map(t => h('div', { class: 'ateam' }, hexEmblem(t.name, rid, 40, t.emblem), h('span', {}, t.name))));
  });
  return h('div', { class: 'assign' }, h('h2', {}, 'Your region'), h('div', { class: 'acols' }, cols));
}

function strikeSlide() {
  const st = P.news.strike.teams;
  const cols = D.REGION_IDS.map(rid => h('div', { class: 'scol' }, h('h3', {}, D.REGIONS[rid].name), st.filter(t => t.region === rid).map(t => h('div', { class: 'stile ' + (t.struck ? 'out' : 'held') }, hexEmblem(t.name, rid, 34, t.emblem), h('span', { class: 'nm' }, t.name),
    h('b', {}, t.struck ? 'Walked out' : 'Held'), h('small', {}, t.meter != null ? `meter ${Math.round(t.meter)}` : '')))));
  return h('div', { class: 'strikemap' }, h('h2', {}, 'Strike map: who held and who walked out'), h('div', { class: 'scols' }, cols));
}
function survivorsSlide() {
  const sv = P.final.survivors, rk = Object.fromEntries((P.final.rankings || []).map(x => [x.id, x]));
  const rows = sv.slice().sort((a, b) => (rk[a.id]?.classRank || 99) - (rk[b.id]?.classRank || 99));
  return h('div', { class: 'survivors' }, h('h2', {}, 'Who changed and survived'),
    h('table', { class: 'svt' }, h('tr', {}, ['Rank', 'Network', 'Region', 'Changes made', 'Finished', 'Strike vote'].map(x => h('th', {}, x))),
      rows.slice(0, 16).map(t => h('tr', {}, h('td', {}, rk[t.id]?.classRank ?? ''), h('td', {}, h('span', { class: 'row', style: { gap: '10px', flexWrap: 'nowrap' } }, hexEmblem(t.name, t.region, 30, t.emblem), t.name)), h('td', {}, D.REGIONS[t.region].name),
        h('td', {}, t.changes), h('td', {}, t.finished), h('td', {}, t.struck ? 'Walked out' : 'Held')))));
}

function champion() {
  const done = P.status === 'done';
  if (!done || !P.final?.rankings?.length || champClosed) return;
  if (document.querySelector('.champ')) return;
  const rk = P.final.rankings, top = rk[0], nameOf = id => P.teams.find(t => t.id === id)?.name || id;
  document.querySelector('.proj').append(h('div', { class: 'champ' }, h('div', { class: 'champlab' }, 'Class champion'), h('div', { class: 'nm' }, nameOf(top.id)),
    h('div', { class: 'champscore' }, `${D.REGIONS[top.region].name} · score ${Math.round(top.total)}`),
    h('div', { class: 'row', style: { gap: '30px', marginTop: '24px', justifyContent: 'center' } }, D.REGION_IDS.map(rid => { const w = rk.filter(x => x.region === rid).sort((a, b) => a.regionRank - b.regionRank)[0]; return w ? h('div', { style: { textAlign: 'center' } }, h('div', { class: 'champreg' }, D.REGIONS[rid].name), h('div', { class: 'serif', style: { fontSize: '40px' } }, nameOf(w.id))) : null; })),
    h('button', { class: 'btn', style: { marginTop: '20px' }, onclick: e => { champClosed = true; e.target.closest('.champ').remove(); } }, 'Show regions')));
}

if (!code) ask();
else {
  net.subscribe(code, load);
  setInterval(() => { if (P) tickClock(); }, 500);
  setInterval(load, 3000);
  setInterval(() => { if (!P) return; const sl = slides(); if (sl.length < 2) return; idx = (idx + 1) % sl.length; showSlide(sl, idx); }, SLIDE_MS);
  document.addEventListener('keydown', e => { if (!P) return; const sl = slides(); if (e.key === 'ArrowRight') { idx = (idx + 1) % sl.length; showSlide(sl, idx); } if (e.key === 'ArrowLeft') { idx = (idx + sl.length - 1) % sl.length; showSlide(sl, idx); } });
  load();
}
