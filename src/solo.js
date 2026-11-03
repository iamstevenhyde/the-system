// Solo mode: one network against bots, no timer, instant rounds.
import * as D from '../engine/data.js';
import { createGame, resolveRound, rankings } from '../engine/engine.js';
import { botDecision, PROFILES, BOT_NAMES } from '../engine/bots.js';
import { scopeState, eventInfo } from './publish.js';
import { mountTeamApp } from './teamapp.js';
import { h, regionScene, logo } from './ui.js';

const root = document.getElementById('app');

function setup() {
  const name = h('input', { class: 'field', value: 'Your Network', maxlength: 28, 'aria-label': 'Network name' });
  const cards = D.REGION_IDS.map(rid => {
    const sc = regionScene(rid); sc.style.cssText = 'position:absolute;inset:0;filter:brightness(.6)';
    return h('button', { class: 'glass', 'data-region': rid, style: { position: 'relative', height: '220px', overflow: 'hidden', textAlign: 'left', padding: 0 }, onclick: () => play(rid, name.value || 'Your Network') },
      sc, h('div', { class: 'regplate' }, h('h2', { style: { fontSize: '32px' } }, D.REGIONS[rid].name), h('div', { style: { fontSize: '17px', color: 'var(--ink2)' } }, D.REGIONS[rid].tag)));
  });
  root.replaceChildren(h('div', { class: 'center', style: { position: 'fixed', inset: 0, overflow: 'auto' } }, h('div', { style: { width: 'min(900px,100%)', display: 'flex', flexDirection: 'column', gap: '16px' } },
    logo(420), h('div', { class: 'muted', style: { textAlign: 'center' } }, 'Solo: you against the bots. Pick a region.'), name,
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } }, cards))));
}

function play(rid, name) {
  const seed = Math.floor(Math.random() * 100000) + 1;
  const teams = [{ id: 'you', name, region: rid }];
  let k = 0;
  for (const r of D.REGION_IDS) for (let i = r === rid ? 1 : 0; i < 4; i++) { teams.push({ id: 'bot' + (k + 1), name: BOT_NAMES[k % BOT_NAMES.length], region: r, bot: PROFILES[(k + seed) % PROFILES.length] }); k++; }
  let state = createGame({ seed, teams });
  const subs = new Set();
  const driver = {
    load: async () => {
      const done = state.phase === 'done';
      return {
        code: 'SOLO', key: 'solo-' + seed, teamId: 'you', name, region: rid, status: done ? 'done' : 'open', round: state.round, timer: null,
        state: scopeState(state, 'you'), submitted: false, decision: null,
        publicTeams: Object.values(state.teams).map(t => ({ id: t.id, name: t.name, region: t.region, bot: !!t.bot, hist: t.history.map(x => ({ round: x.round, share: x.marketShare, outcome: x.outcome })) })),
        events: Object.fromEntries(D.REGION_IDS.map(r => [r, eventInfo(state, r)])), final: done ? { rankings: rankings(state) } : null,
      };
    },
    submit: async d => {
      const dec = {};
      for (const [id, t] of Object.entries(state.teams)) dec[id] = t.bot ? botDecision(state, id, t.bot, state.seed) : d;
      state = resolveRound(state, dec);
      setTimeout(() => subs.forEach(cb => cb()), 0);
    },
    subscribe: cb => { subs.add(cb); return () => subs.delete(cb); },
  };
  
  mountTeamApp(root, driver);
  document.body.append(h('button', { class: 'btn', style: { position: 'fixed', left: '10px', bottom: '8px', zIndex: 60, minHeight: '30px', padding: '2px 10px', fontSize: '12px', opacity: 0.6 }, onclick: () => location.reload() }, 'New solo game'));
}
setup();
