// Classroom display. Reads only getPublic: no decisions, no private state.
import * as D from '../engine/data.js';
import { h, icon, regionScene, timerMs, mmss, tween, hexEmblem, logo, ROUND_TITLES } from './ui.js';
import { makeNet } from './transport.js';

const net = makeNet(), root = document.getElementById('app');
const code = (new URLSearchParams(location.search).get('code') || '').toUpperCase();
let P = null;
const bars = new Map();   // team id -> {fill, pct, last}

function ask() {
  const inp = h('input', { class: 'code', maxlength: 4, placeholder: 'CODE', 'aria-label': 'Session code' });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') location.search = '?code=' + inp.value.toUpperCase(); });
  root.replaceChildren(h('div', { class: 'center', style: { position: 'fixed', inset: 0 } }, h('div', { class: 'glass joinbox' }, logo(420), inp)));
}
async function load() {
  try { P = await net.getPublic(code);
    if (!P || !P.teams) throw new Error('No such game. Check the code.'); } catch (e) { root.replaceChildren(h('div', { class: 'center', style: { position: 'fixed', inset: 0 } }, h('h2', {}, e.message))); return; }
  render();
}
const lastShare = t => (t.hist.length ? t.hist.at(-1).share : null);
const prevShare = t => (t.hist.length > 1 ? t.hist.at(-2).share : null);

function render() {
  const root0 = document.querySelector('.proj');
  if (!root0 || root0.dataset.status !== P.status + P.round) build();
  update();
}
function build() {
  const r = Math.min(P.round, 5), done = P.status === 'done', lobby = P.status === 'lobby';
  const grid = h('div', { class: 'grid' });
  for (const rid of D.REGION_IDS) {
    const reg = D.REGIONS[rid], teams = P.teams.filter(t => t.region === rid);
    const panel = h('div', { class: 'rp' }, regionScene(rid), h('div', { class: 'in' },
      h('div', { class: 'row hdband', style: { justifyContent: 'space-between' } }, h('div', {}, h('h2', {}, reg.name), h('div', { class: 'muted', style: { fontSize: '20px' } }, reg.tag)), h('div', { class: 'ev', 'data-ev': rid })),
      h('div', { class: 'teams', 'data-reg': rid, style: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' } })));
    grid.append(panel);
  }
  const head = h('div', { class: 'head' }, logo(300),
    h('div', { style: { flex: 1 } }, h('div', { class: 'rt', id: 'rt' }), h('div', { id: 'sub', style: { fontSize: '26px', color: 'var(--ink2)', marginTop: '4px' } })),
    h('div', { style: { textAlign: 'right' } }, h('div', { class: 'big', id: 'clock' }), h('div', { id: 'subs', style: { fontSize: '24px', color: 'var(--ink2)' } })));
  const foot = h('div', { class: 'foot', id: 'foot' });
  const proj = h('div', { class: 'proj', 'data-status': P.status + P.round }, head, grid, foot);
  root.replaceChildren(proj);
}
function update() {
  const proj = document.querySelector('.proj');
  const r = Math.min(P.round, 5), done = P.status === 'done';
  const $ = id => document.getElementById(id);
  $('rt').textContent = P.status === 'lobby' ? 'Join at the code ' + P.code : done ? 'Final results' : `Round ${r}: ${ROUND_TITLES[r - 1]}`;
  const humans = P.teams.filter(t => !t.bot), inCount = humans.filter(t => t.submitted).length;
  $('subs').textContent = P.status === 'open' ? `${inCount} of ${humans.length} teams in` : P.status === 'between' && r > 1 ? `Round ${r - 1} results are in` : P.status === 'lobby' ? `${P.teams.length} teams joined` : '';
  $('sub').textContent = P.reform && !done ? 'National reform: payment now follows patient outcomes' : P.status === 'between' ? 'Get ready' : '';
  const clock = $('clock');
  const ms = P.timer ? timerMs(P.timer) : null;
  clock.textContent = P.status === 'open' ? (ms != null ? mmss(ms) : 'Open') : P.status === 'locked' ? '...' : '';
  clock.style.color = ms != null && ms < 30000 && P.status === 'open' ? 'var(--red)' : '';
  for (const rid of D.REGION_IDS) {
    const ev = P.events?.[rid], evEl = document.querySelector(`[data-ev="${rid}"]`);
    evEl.replaceChildren(...(ev && !done ? [icon(ev.icon === 'snow' ? 'snow' : (ev.icon in { nurse: 1, clinic: 1, raid: 1, merge: 1, gavel: 1, houses: 1, crane: 1, badge: 1, grant: 1, strike: 1, boiler: 1 } ? ev.icon : 'warn'), 28), document.createTextNode(ev.title)] : []));
    const box = document.querySelector(`[data-reg="${rid}"]`);
    const teams = P.teams.filter(t => t.region === rid).sort((a, b) => (lastShare(b) ?? -1) - (lastShare(a) ?? -1) || a.name.localeCompare(b.name));
    const win = done ? P.final?.rankings?.filter(x => x.region === rid).sort((a, b) => a.regionRank - b.regionRank)[0]?.id : null;
    // keep rows stable so bars animate between rounds
    for (const t of teams) {
      let row = bars.get(t.id);
      if (!row) {
        const fill = h('i', { style: { width: '0%', background: D.REGIONS[rid].color === '#7a5a6b' ? '#c48ab0' : '#6fbf8e' } });
        const nm = h('span', { class: 'nm' }), pc = h('span', { class: 'pc' }), tick = h('span'), sub = h('span', { class: 'sub' });
        tick.append(hexEmblem(t.name, rid, 30));
        const el = h('div', { class: 'prow' }, tick, nm, h('span', { class: 'pcw' }, pc, sub), h('div', { class: 'bar' }, fill));
        row = { el, fill, nm, pc, tick, sub, last: 0 }; bars.set(t.id, row);
      }
      row.nm.textContent = t.name + (t.bot ? '' : '');
      const sh = lastShare(t), pv = prevShare(t);
      const target = sh == null ? 0 : sh * 100;
      requestAnimationFrame(() => (row.fill.style.width = Math.min(100, target * 2.2) + '%'));
      if (sh == null) { row.pc.textContent = ''; row.sub.textContent = P.status === 'open' && !t.bot && t.submitted ? ' ✓' : ''; row.sub.style.color = 'var(--green)'; }
      else { if (Math.abs(row.last - target) > 0.01) tween(row.pc, target, { from: row.last, fmt: v => Math.round(v) + '%', ms: 1400 }); else row.pc.textContent = Math.round(target) + '%'; row.last = target; }
      const d = sh != null && pv != null ? (sh - pv) * 100 : null;
      if (sh != null) { row.sub.textContent = d != null && P.status !== 'open' ? (d >= 0.5 ? ' ▲' : d <= -0.5 ? ' ▼' : '') : ''; row.sub.style.color = d != null && d < 0 ? 'var(--red)' : 'var(--green)'; }
      row.el.classList.toggle('winner', t.id === win);
      box.append(row.el);   // re-append in sorted order
    }
  }
  // highlights
  const foot = $('foot');
  const withOut = P.teams.filter(t => t.hist.length);
  if (withOut.length && !done) {
    const best = [...withOut].sort((a, b) => b.hist.at(-1).outcome - a.hist.at(-1).outcome)[0];
    const grow = [...withOut].filter(t => t.hist.length > 1).sort((a, b) => (lastShare(b) - prevShare(b)) - (lastShare(a) - prevShare(a)))[0];
    foot.replaceChildren(h('span', { class: 'chip warn', style: { fontSize: '22px', padding: '8px 16px' } }, icon('outcomes', 24), `Best patient outcomes: ${best.name} (${Math.round(best.hist.at(-1).outcome)})`),
      grow ? h('span', { class: 'chip good', style: { fontSize: '22px', padding: '8px 16px' } }, icon('share', 24), `Biggest gain: ${grow.name}`) : null);
  } else foot.replaceChildren();
  // champions
  let champ = document.querySelector('.champ');
  if (done && P.final?.rankings?.length) {
    if (!champ) {
      const rk = P.final.rankings, top = rk[0], nameOf = id => P.teams.find(t => t.id === id)?.name || id;
      document.querySelector('.proj').append(h('div', { class: 'champ' }, h('div', { class: 'champlab' }, 'Class champion'), h('div', { class: 'nm' }, nameOf(top.id)),
        h('div', { class: 'champscore' }, `${D.REGIONS[top.region].name} · score ${Math.round(top.total)}`),
        h('div', { class: 'row', style: { gap: '30px', marginTop: '24px', justifyContent: 'center' } }, D.REGION_IDS.map(rid => { const w = rk.filter(x => x.region === rid).sort((a, b) => a.regionRank - b.regionRank)[0]; return w ? h('div', { style: { textAlign: 'center' } }, h('div', { class: 'champreg' }, D.REGIONS[rid].name), h('div', { class: 'serif', style: { fontSize: '40px' } }, nameOf(w.id))) : null; })),
        h('button', { class: 'btn', style: { marginTop: '20px' }, onclick: e => e.target.closest('.champ').remove() }, 'Show regions')));
    }
  }
}

if (!code) ask();
else { net.subscribe(code, load); setInterval(() => { if (P && (P.status === 'open')) update(); }, 500); setInterval(load, 3000); load(); }
