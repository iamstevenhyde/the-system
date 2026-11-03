// The team screen v2 (card-deck round loop), shared by team.html (networked) and solo.html (local driver).
// Round = Brief -> three cards (Market, Organization, People) -> Reveal (three taps).
// driver.load() -> view {name, teamId, region, status, round, timer, state(scoped), submitted, decision, publicTeams, events, final, reveal, key}
// driver.submit(decision) -> Promise; driver.subscribe(cb) -> unsubscribe
// status: lobby | open | locked | done. Teams may pick any time; only 'open' accepts a submission.
import * as D from '../engine/data.js';
import { capabilities, weightedTrust, interactionsActive, diagnosis, influence, changeCost } from '../engine/engine.js';
import { roundDeck, picksToDecision, collisionsFor } from '../engine/deck.js';
import { OPTION_FX, PERSON } from '../engine/deckdata.js';
import { h, icon, money, tween, clamp, regionScene, portrait, emblem, hexEmblem, building, logo, stepper, timerMs, mmss, EMBLEM_COUNT, ROUND_TITLES, MARKET_NAMES, MARKET_BUILDING, CAP_NAMES, POINT_NAMES, GROUP_NAMES, FIT_LABELS } from './ui.js';

const onehot = i => [0, 1, 2].map(j => (j === i ? 1 : 0));
const STAR_ORDER = ['strategy', 'structure', 'people', 'process', 'rewards'];   // clockwise from the top
const OPT_ICON = { strategy: ['s0', 's1', 's2'], structure: ['t0', 't1', 't2'], people: ['p0', 'p1', 'p2'], process: ['q0', 'q1', 'q2'], rewards: ['r0', 'r1', 'r2'] };
const ARCH_TAG = { access: 'Scale / Access / Efficiency', excellence: 'Specialty / Quality / Expertise', integrated: 'Coordinated / Chronic / Continuity' };
const SLOT_NAMES = { market: 'Market', org: 'Organization', people: 'People' };
const SLOT_ICON = { market: 'primary', org: 'trust', people: 'mandate' };
const GROUP_OF = Object.fromEntries(Object.entries(PERSON).map(([g, p]) => [p.name, g]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const artImg = (name, cls = '') => { const i = h('img', { src: `assets/scenes/${name}.jpg`, alt: '', class: 'art ' + cls }); i.onerror = () => i.remove(); return i; };
const BRIEF_ART = { reform: 'reform', strike: 'resistance', gavel: 'resistance', raid: 'resistance', houses: 'expansion', crane: 'expansion', badge: 'expansion', grant: 'expansion', merge: 'reform' };

// The same adjustment the deck makes when a round-1 team picks an archetype in the wizard.
function withArch(state, id, arch) {
  const s = JSON.parse(JSON.stringify(state));
  const t = s.teams[id], a = D.ARCHETYPES[arch];
  t.archetype = arch; t.target = { ...a.star };
  for (const p of D.POINTS) t.w[p] = onehot(a.star[p]);
  t.capacity = { ...a.capacity }; t.trust = { ...a.trust };
  return s;
}

export function mountTeamApp(root, driver) {
  const S = { view: null, draft: null, picks: {}, tab: 'play', step: 'brief', round: 0, msg: '', dirty: false, overlay: null, busy: false, wiz: 0, rv: 0, deck: null };

  // ---------- data helpers ----------
  const st = () => S.view.state;
  const me = () => st().teams[S.view.teamId];
  const regionId = () => me().region;
  const roundNo = () => S.view.round;
  const key = () => S.view.key || S.view.code;
  const picksKey = () => `sys:picks:${key()}:${S.view.teamId}:${roundNo()}`;
  const draftKey = () => `sys:draft:${key()}:${S.view.teamId}:${roundNo()}`;
  const wizKey = () => `sys:wiz:${key()}:${S.view.teamId}`;
  const firstPlay = () => roundNo() === 1 && S.view.status !== 'done' && !store.get(wizKey());
  const canSubmit = () => S.view.status === 'open';
  // State the deck is built from: round 1 reflects the archetype chosen in the wizard.
  const deckState = () => (roundNo() === 1 && S.draft?.archetype && S.draft.archetype !== me().archetype ? withArch(st(), S.view.teamId, S.draft.archetype) : st());
  const deck = () => (S.deck = roundDeck(deckState(), S.view.teamId, S.picks));
  function previewTeam() {
    const t = me();
    if (roundNo() !== 1) return t;
    const a = D.ARCHETYPES[S.draft.archetype];
    return { ...t, archetype: S.draft.archetype, capacity: { ...a.capacity }, trust: { ...a.trust }, target: { ...a.star }, w: Object.fromEntries(D.POINTS.map(p => [p, onehot(a.star[p])])), transitions: {} };
  }
  const card = slot => deck().cards.find(c => c.slot === slot);
  const optionOf = slot => card(slot)?.options.find(o => o.id === S.picks[slot]);
  const dialOf = () => S.picks.dial || 'steady';
  // roundDeck prices an org option at its default points; a custom choice shifts only the change cost.
  function pointsDelta(o) {
    if (!o?.pointChoices || !S.picks.points) return 0;
    try {
      const base = { ...S.picks, archetype: S.draft?.archetype }, ds = deckState(), id = S.view.teamId;
      const withPts = picksToDecision(ds, id, base), dflt = picksToDecision(ds, id, { ...base, points: undefined });
      return changeCost(ds, withPts, id) - changeCost(ds, dflt, id);
    } catch { return 0; }
  }
  const costOf = (slot, o) => (slot === 'market' && o?.dials ? (o.dials[dialOf()]?.cost ?? o.cost) : slot === 'org' ? (o?.cost || 0) + pointsDelta(o) : (o?.cost || 0));
  const spent = () => ['market', 'org', 'people'].reduce((a, s) => a + costOf(s, optionOf(s)), 0);
  const allPicked = () => ['market', 'org', 'people'].every(s => optionOf(s) && !optionOf(s).locked);
  function buildDecision() {
    const picks = { ...S.picks };
    if (roundNo() === 1) { picks.archetype = S.draft.archetype; picks.displayName = (S.draft.displayName || '').trim().slice(0, 28) || undefined; picks.emblem = S.draft.emblem; }
    return picksToDecision(deckState(), S.view.teamId, picks);
  }

  function loadRound() {
    const saved = S.view.decision?.moves;
    S.draft = store.get(draftKey()) || { archetype: me().archetype };
    if (roundNo() === 1) S.draft.archetype ||= me().archetype;
    S.picks = { ...(store.get(picksKey()) || {}), ...(saved || {}) };
    S.dirty = false; S.step = 'brief'; S.tab = 'play';
  }
  function onPick() { store.set(picksKey(), S.picks); store.set(draftKey(), S.draft); S.dirty = true; }

  // ---------- load ----------
  async function refresh() {
    let v;
    try { v = await driver.load(); } catch (e) { if (S.view) return;   // keep the screen when a poll fails on a slow network
      root.replaceChildren(h('div', { class: 'center' }, h('div', { class: 'card joinbox' }, h('h2', {}, 'Cannot reach the game'), h('p', { class: 'err' }, e.message), h('a', { class: 'btn', href: 'index.html' }, 'Back to join')))); return; }
    if (v.state?.teams?.[v.teamId]) v.name = v.state.teams[v.teamId].name;
    const newRound = !S.view || S.round !== v.round || (!S.view.state && v.state);
    const sig = JSON.stringify([v.status, v.round, v.submitted, v.decision?.moves, v.timer && [v.timer.endsAt, v.timer.paused], v.state?.version, !!v.reveal, !!v.final, v.publicTeams.map(t => [t.id, t.name, t.hist.length]), v.state?.regions?.[v.region]?.events, v.nextAt]);
    const unchanged = S.view && sig === S.sig && !S.forceRender;
    S.sig = sig; S.forceRender = false;
    S.view = v;
    if (v.state) {
      if (newRound || !S.draft) { S.round = v.round; loadRound(); }
      else if (v.decision?.moves && !S.dirty) S.picks = { ...S.picks, ...v.decision.moves };
      const seen = store.get(`sys:seen:${key()}:${v.teamId}`) || 0;
      const len = me().history.length;
      if (len > seen && !S.overlay) { S.overlay = v.reveal && v.reveal.round === len ? { type: 'reveal', len } : { type: 'results', len }; S.rv = 0; }
      else if (!S.overlay && v.status === 'done' && len <= seen && !S.finalSeen) S.overlay = { type: 'final', len };
    }
    if (S.view.state && (S.overlay?.type || '') === S.lastOverlay && (unchanged || S.overlay)) return;   // never rebuild the page under an open overlay: a slow network would detach the buttons mid-click
    S.lastOverlay = S.overlay?.type || '';
    render();
  }
  driver.subscribe?.(() => refresh());
  setInterval(() => { if (S.view && !S.overlay && !document.hidden && driver.poll) refresh(); }, 2500);
  setInterval(() => { if (S.view) updateTimer(); }, 400);

  // ---------- render ----------
  function render() {
    const v = S.view, keep = root.querySelector('#view')?.scrollTop || 0;
    root.replaceChildren();
    if (!v.state) { root.append(waitScreen()); return; }
    const reg = D.REGIONS[regionId()];
    const stage = h('div', { class: 'stage' + (S.tab === 'play' && S.step === 'brief' ? '' : ' dim') });
    stage.append(regionScene(regionId()));
    const view = h('div', { class: 'view', id: 'view' });
    stage.append(view);
    root.append(topbar(reg), stage);
    if (v.status === 'done' && !S.overlay) doneView(view);
    else if (S.tab === 'org') orgView(view);
    else if (S.step === 'brief') briefView(view, stage);
    else cardsView(view);
    if (firstPlay()) root.append(wizard());
    else if (S.overlay) root.append(S.overlay.type === 'reveal' ? revealOverlay() : S.overlay.type === 'results' ? resultsOverlay() : finalOverlay());
    updateTimer();
    const nv = root.querySelector('#view'); if (nv && keep) nv.scrollTop = keep;
  }

  function waitScreen() {
    const v = S.view;
    const bg = regionScene('mountain'); bg.style.cssText = 'position:absolute;inset:0;filter:brightness(.5)';
    return h('div', { class: 'center', style: { position: 'absolute', inset: 0 } }, bg, h('div', { class: 'card joinbox', style: { textAlign: 'center' } },
      logo(320), h('h2', {}, v.name), icon('clock', 48), h('h2', {}, 'Waiting for the instructor to start'), h('p', { class: 'muted' }, 'Game ' + v.code)));
  }

  function topbar(reg) {
    const v = S.view, r = clamp(v.round, 1, 5);
    const tb = h('div', { class: 'tabs', role: 'tablist' }, [['play', 'This round', 'primary'], ['org', 'Organization', 'trust']].map(([k, l, ic]) =>
      h('button', { class: 'tab' + (S.tab === k ? ' on' : ''), role: 'tab', 'aria-selected': S.tab === k, onclick: () => { S.tab = k; render(); } }, icon(ic, 20), l)));
    const timer = h('div', { class: 'timerbox', id: 'timer' }, h('div', { class: 'n' }, '--'), h('div', { class: 's', style: { fontSize: '14px' } }, ''));
    const title = v.status === 'done' ? 'Game over' : `Round ${r} of 5: ${ROUND_TITLES[r - 1]}`;
    return h('div', { class: 'topbar' }, h('div', { class: 'brand' }, logo(190)), tb,
      h('div', { class: 'roundbox' }, h('div', { class: 't' }, title), h('div', { class: 's' }, reg.name), stepper(v.status === 'done' ? 6 : r)),
      timer, h('div', { class: 'teamtag' }, h('div', {}, h('b', {}, v.name), reg.name), hexEmblem(v.name, regionId(), 40, S.draft?.emblem ?? me().emblem)));
  }
  function updateTimer() {
    const tb = root.querySelector('#timer'); if (!tb || !S.view) return;
    const ms = timerMs(S.view.timer), n = tb.querySelector('.n'), s0 = S.view.status;
    if (s0 === 'open' && ms != null) { n.textContent = mmss(ms); tb.classList.toggle('low', ms < 30000 && !S.view.timer.paused); tb.lastChild.textContent = S.view.timer.paused ? 'paused' : ''; }
    else if (s0 === 'locked' && S.view.nextAt && S.view.nextAt > Date.now()) { n.textContent = mmss(S.view.nextAt - Date.now()); tb.classList.remove('low'); tb.lastChild.textContent = 'next round'; }
    else { n.textContent = s0 === 'open' ? 'Open' : s0 === 'locked' ? 'Ready' : s0 === 'done' ? 'End' : '--'; tb.classList.remove('low'); tb.lastChild.textContent = ''; }
  }

  // ---------- Quality floor ----------
  // Green when comfortably above the line, amber when getting close, red when within 3 points or below.
  function floorState() {
    const o = (S.deck || deck()).brief.meters.outcomes, f = D.QUALITY_FLOOR;
    if (o == null) return { level: 'none', o, f, label: 'Not measured yet' };
    const margin = o - f;
    return margin <= 3 ? { level: 'red', o, f, margin, label: margin < 0 ? 'Below the line' : 'At risk' } : margin <= 10 ? { level: 'amber', o, f, margin, label: 'Close to the line' } : { level: 'green', o, f, margin, label: 'Safe' };
  }
  function floorMeter(compact) {
    const fs = floorState();
    const bar = h('div', { class: 'bar floorbar ' + fs.level }, h('i', { style: { width: clamp(fs.o ?? 0, 0, 100) + '%' } }), h('b', { class: 'floortick', style: { left: fs.f + '%' }, title: `Score cap line at ${fs.f}` }));
    if (compact) return h('div', { class: 'floorstrip ' + fs.level }, icon(fs.level === 'green' ? 'check' : fs.level === 'none' ? 'clock' : 'warn', 18), h('b', {}, 'Quality floor'), h('span', {}, fs.o == null ? fs.label : `${Math.round(fs.o)} · line at ${fs.f} · ${fs.label}`), bar);
    return h('div', { class: 'meter floormeter ' + fs.level }, h('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, h('span', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, icon(fs.level === 'green' ? 'check' : fs.level === 'none' ? 'clock' : 'warn', 18), 'Quality floor'), h('b', {}, fs.o == null ? fs.label : `${Math.round(fs.o)} · ${fs.label}`)),
      bar, h('div', { class: 'muted' }, `Below the line (${fs.f}) your score is capped.`));
  }

  // ---------- Brief star: five points, current settings, mismatched pairs in red ----------
  // Uses brief.star ({points, mismatches}) from the deck when present; otherwise derives the same view from the engine's conflicts.
  function starBrief() {
    const t = previewTeam(), cur = {};
    for (const p of STAR_ORDER) cur[p] = t.target?.[p] ?? t.w[p].indexOf(Math.max(...t.w[p]));
    const bs = (S.deck || deck()).brief.star;
    // Same filter the deck uses for a mismatch; gives the pair of points each named mismatch connects.
    const mmIds = new Set(D.INTERACTIONS.filter(ix => ix.friction || ix.fx.coordination <= -6).map(x => x.id));
    const active = interactionsActive({ w: Object.fromEntries(D.POINTS.map(p => [p, onehot(bs?.points?.[p]?.current ?? cur[p])])) }).filter(f => mmIds.has(f.id) && f.strength > 0.5);
    if (bs?.points) {
      const pts = {};
      for (const p of STAR_ORDER) pts[p] = bs.points[p]?.current ?? cur[p];
      const mm = (bs.mismatches || []).map((name, k) => ({ name, pair: active[k] ? Object.keys(D.INTERACTIONS.find(x => x.id === active[k].id).need) : [], why: '' }));
      return { points: pts, mismatches: mm, fromDeck: true };
    }
    return { points: cur, mismatches: active.map(f => ({ name: FIT_LABELS[f.id][0], pair: Object.keys(D.INTERACTIONS.find(x => x.id === f.id).need), why: '' })) };
  }
  function starCard() {
    const sb = starBrief(), cx = 240, cy = 168, R = 80;
    const pos = i => { const a = (-90 + 72 * i) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
    const idx = Object.fromEntries(STAR_ORDER.map((p, i) => [p, i]));
    const wrap = t => { const out = []; let cur = ''; for (const w of t.split(' ')) { if (cur && (cur + ' ' + w).length > 11) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } out.push(cur); return out; };
    const svg = h('svg', { viewBox: '0 0 480 330', class: 'ministar', role: 'img', 'aria-label': 'Your star: ' + STAR_ORDER.map(p => `${POINT_NAMES[p]} ${D.OPTIONS[p][sb.points[p]]}`).join(', ') + (sb.mismatches.length ? '. Mismatches: ' + sb.mismatches.map(m => m.name).join(', ') : '. No mismatches.') });
    STAR_ORDER.forEach((p, i) => { const [x1, y1] = pos(i), [x2, y2] = pos((i + 1) % 5); svg.append(h('line', { x1, y1, x2, y2, stroke: '#cfc7ac', 'stroke-width': 3 })); });
    for (const m of sb.mismatches) {
      const ps = (m.pair || []).filter(p => idx[p] != null);
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) { const [x1, y1] = pos(idx[ps[a]]), [x2, y2] = pos(idx[ps[b]]); svg.append(h('line', { x1, y1, x2, y2, stroke: '#A3513A', 'stroke-width': 5, 'stroke-linecap': 'round' })); }
    }
    STAR_ORDER.forEach((p, i) => {
      const [x, y] = pos(i), red = sb.mismatches.some(m => (m.pair || []).includes(p));
      svg.append(h('circle', { cx: x, cy: y, r: 11, fill: red ? '#A3513A' : '#44704B', stroke: '#183B35', 'stroke-width': 2 }));
      const c = Math.cos((-90 + 72 * i) * Math.PI / 180), top = i === 0;
      const anchor = top ? 'middle' : c > 0 ? 'start' : 'end', tx = x + (top ? 0 : c > 0 ? 17 : -17);
      const lines = wrap(D.OPTIONS[p][sb.points[p]]);
      const first = top ? y - 20 - 22 * (lines.length - 1) : y + 22;
      svg.append(h('text', { x: tx, y: top ? first - 26 : y, 'text-anchor': anchor, 'font-size': 22, 'font-weight': 700, fill: '#183B35', 'font-family': 'Georgia, serif' }, p === 'process' ? 'Processes' : POINT_NAMES[p]));
      lines.forEach((ln, k) => svg.append(h('text', { x: tx, y: first + 22 * k, 'text-anchor': anchor, 'font-size': 20, fill: '#233630' }, ln)));
    });
    return h('div', { class: 'card starbrief' }, h('h3', {}, 'Your star'), svg,
      sb.mismatches.length ? h('div', { class: 'mmlist' }, sb.mismatches.map(m => h('div', { class: 'mm' }, icon('warn', 16), h('b', {}, m.name), m.why ? h('span', { class: 'muted' }, ' ' + m.why) : null))) : h('div', { class: 'muted' }, 'No mismatched pairs.'));
  }

  // ---------- Brief ----------
  function meterBar(label, ic, val, text, pct, extra) {
    return h('div', { class: 'meter' }, h('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, h('span', { class: 'row', style: { gap: '6px', flexWrap: 'nowrap' } }, icon(ic, 18), label), h('b', {}, text)),
      h('div', { class: 'bar' }, h('i', { style: { width: clamp(pct, 0, 100) + '%' } })), extra || null);
  }
  function briefView(view, stage) {
    const dk = deck(), b = dk.brief, m = b.meters, reg = D.REGIONS[regionId()];
    stage.append(h('div', { class: 'regionhead' }, h('small', {}, 'YOUR REGION'), h('h2', {}, reg.name), h('div', {}, reg.tag)));
    const art = b.headline.art === 'founding' || b.headline.art === 'calm' ? null : BRIEF_ART[b.headline.art] || null;
    const head = h('div', { class: 'card brief-head' }, art ? artImg(art, 'bgart') : null,
      h('div', { class: 'role' }, `ROUND ${dk.round}: ${dk.title.toUpperCase()}`), h('h2', {}, b.headline.title), h('p', {}, b.headline.line),
      b.headline.means ? h('p', { class: 'means' }, h('b', {}, 'What it means for you: '), b.headline.means) : null,
      b.region?.problem ? h('p', { class: 'regionline' }, h('b', {}, b.region.name + ': '), b.region.problem) : null);
    const news = h('div', { class: 'card intel' }, h('h3', {}, 'Rival intel'));
    if (!b.rivals.length) news.append(h('div', { class: 'muted' }, 'No rivals in your region yet.'));
    for (const r of b.rivals) {
      const mv = r.shareMove;
      news.append(h('div', { class: 'intelrow' }, hexEmblem(r.name, regionId(), 36, r.emblem),
        h('div', { class: 'ibody' }, h('div', { class: 'iname' }, r.name, r.profileWord ? h('span', { class: 'chip warn' }, r.profileWord) : null),
          h('div', { class: 'muted' }, r.lastCard ? 'Last card: ' + r.lastCard : 'No moves yet'), r.line ? h('div', { class: 'iline' }, r.line) : null),
        mv == null ? h('span', { class: 'muted' }, '') : h('b', { class: 'delta ' + (mv > 0 ? 'up' : mv < 0 ? 'down' : 'flat') }, mv === 0 ? 'flat' : (mv > 0 ? '▲ +' : '▼ ') + Math.round(mv) + ' pts')));
    }
    const side = h('div', { class: 'col' });
    if (b.warnings.length) side.append(h('div', { class: 'card warncard' }, h('h3', {}, 'Heads up'), b.warnings.map(w => h('div', { class: 'newsline' }, icon('warn', 22), h('span', {}, w.line)))));
    side.append(starCard());
    const cbCard = b.callbacks.length ? (h('div', { class: 'card' }, h('h3', {}, 'People remember'), b.callbacks.map(c => {
      const g = GROUP_OF[c.person] || 'nurses';
      return h('div', { class: 'newsline cb' }, h('div', { class: 'tinyport' }, portrait(g)), h('span', {}, h('b', {}, c.person), h('br'), c.line));
    }))) : null;
    const meters = h('div', { class: 'card meters' }, h('h3', {}, 'Where you stand'),
      meterBar('Cash', 'financial', m.cash, `${money(m.cash)} of ${money(dk.budget.spendable, 0)} to spend`, m.cash / Math.max(1, dk.budget.spendable) * 100),
      meterBar('Outcomes', 'outcomes', m.outcomes, m.outcomes == null ? 'not measured yet' : Math.round(m.outcomes) + '/100', m.outcomes || 0),
      meterBar('Workforce trust', 'trust', m.trust, Math.round(m.trust) + '/100', m.trust),
      meterBar('Market share', 'share', m.share, m.share == null ? 'none yet' : Math.round(m.share * 100) + '%', (m.share || 0) * 250), floorMeter(false));
    if (m.outcomes != null && m.outcomes - D.QUALITY_FLOOR <= 3) meters.append(h('div', { class: 'floorwarn', role: 'alert' }, icon('warn', 20), h('span', {}, m.outcomes < D.QUALITY_FLOOR ? `Outcomes are below the floor. Below ${D.QUALITY_FLOOR}, your final score is capped.` : `Outcomes near the floor. Below ${D.QUALITY_FLOOR}, your final score is capped.`)));
    if (m.strike) meters.append(h('div', { class: 'strikemeter' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'row', style: { gap: '6px' } }, icon('strike', 18), 'Strike vote meter'), h('b', {}, `${Math.round(m.strike.meter)} needed ${m.strike.threshold}`)),
      h('div', { class: 'bar strikebar' }, h('i', { class: m.strike.meter >= m.strike.threshold ? '' : 'bad', style: { width: clamp(m.strike.meter, 0, 100) + '%' } }), h('b', { style: { left: m.strike.threshold + '%' } })),
      h('div', { class: 'muted' }, m.strike.meter >= m.strike.threshold ? 'Staff are with you.' : 'Staff may walk out this round.')));
    view.append(h('div', { class: 'brief' }, h('div', { class: 'col' }, head, news), side, h('div', { class: 'col' }, meters, cbCard)),
      h('div', { class: 'row briefgo', style: { justifyContent: 'center' } }, h('button', { class: 'btn gold big', id: 'seedecisions', onclick: () => { S.step = 'cards'; S.cardIdx = 0; render(); } }, 'See your three decisions →')));
  }

  // ---------- Cards ----------
  function budgetBar() {
    const dk = deck(), cash = dk.budget.cash, total = Math.max(dk.budget.spendable, 1), sp = spent();
    const over = sp > dk.budget.spendable + 1e-9;
    const usedCash = Math.min(sp, Math.max(0, cash)), usedCredit = Math.max(0, sp - Math.max(0, cash));
    return h('div', { class: 'budget' }, h('div', { class: 'row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } },
      h('span', {}, h('b', {}, 'Budget'), ` ${money(cash)} cash + ${money(D.CREDIT_LINE, 0)} credit`), h('span', { class: over ? 'bad' : '' }, over ? `Over by ${money(sp - dk.budget.spendable)}` : `Spending ${money(sp)}`)),
      h('div', { class: 'bar budgetbar' }, h('i', { class: 'cashpart', style: { width: usedCash / total * 100 + '%' } }), h('i', { class: 'creditpart', style: { left: usedCash / total * 100 + '%', width: usedCredit / total * 100 + '%' } }),
        h('b', { class: 'creditmark', style: { left: Math.max(0, cash) / total * 100 + '%' }, title: 'credit starts here' })));
  }
  function optionTile(c, o) {
    const sel = S.picks[c.slot] === o.id, locked = !!o.locked;
    const kids = [h('div', { class: 'otitle' }, o.label, h('span', { class: 'ocost' }, o.cost ? money(o.cost) : 'free')), h('div', { class: 'oline' }, o.line)];
    if (floorState().level === 'red' && (o.hurts || []).some(x => /outcome|quality/i.test(x))) kids.push(h('div', { class: 'floortickchip', role: 'note' }, icon('warn', 16), 'Lowers outcomes while you are near the floor'));
    if (o.gains?.length || o.hurts?.length) kids.push(h('div', { class: 'chips' }, o.gains.map(g => h('span', { class: 'chip good' }, '+ ' + g)), o.hurts.map(g => h('span', { class: 'chip bad' }, '- ' + g))));
    if (o.fit) {
      const pct = Math.round(o.fit.strength * 100), weak = o.fit.strength < 1;
      kids.push(h('div', { class: 'fit' + (weak ? ' weak' : '') }, h('div', { class: 'fitrow' }, icon(weak ? 'warn' : 'check', 16), h('b', {}, `Works at ${pct}%`), h('span', { class: 'muted' }, ` needs ${CAP_NAMES[o.fit.cap]} ${o.fit.need}, you have ${Math.round(o.fit.have)}`)), h('div', { class: 'fitwhy' }, o.fit.why)));
    }
    if (locked) kids.push(h('div', { class: 'lockwhy' }, icon('warn', 16), o.locked.reason));
    return h('button', { class: 'otile' + (sel ? ' sel' : '') + (locked ? ' locked' : ''), role: 'radio', 'aria-checked': sel, 'aria-disabled': locked, disabled: locked,
      onclick: () => { S.picks[c.slot] = o.id; if (c.slot === 'market' && S.picks.dial == null) S.picks.dial = 'steady'; if (!OPTION_FX[o.id]?.raid) delete S.picks.target; if (c.slot === 'org') { if (o.defaultPoints) S.picks.points = o.defaultPoints.map(x => ({ ...x })); else delete S.picks.points; } onPick(); render(); } }, ...kids);
  }
  function dialPanel(o) {
    const NAMES = { light: 'Light', steady: 'Steady', all: 'All in' };
    return h('div', { class: 'card dialcard' }, h('h3', {}, 'How hard?'), h('div', { class: 'muted', style: { marginBottom: '8px' } }, 'Sets how much money and pull you put behind this card.'),
      h('div', { class: 'dials', role: 'radiogroup', 'aria-label': 'How hard' }, ['light', 'steady', 'all'].map(k => h('button', { class: 'dial' + (dialOf() === k ? ' on' : ''), role: 'radio', 'aria-checked': dialOf() === k, 'data-dial': k,
        onclick: () => { S.picks.dial = k; onPick(); render(); } }, h('b', {}, NAMES[k]), h('span', {}, money(o.dials[k]?.cost ?? o.cost))))));
  }
  // The five Star points for an org option that changes some of them: current setting, then "to" the new one.
  function chosenPoints(o) {
    const sel = (S.picks.points && S.picks.points.length === o.defaultPoints.length ? S.picks.points : o.defaultPoints);
    return sel.map(x => { const pc = o.pointChoices.find(p => p.point === x.point); const ch = pc.choices.find(c => c.to === x.to) || { to: pc.to, toLabel: pc.toLabel }; return { point: x.point, label: pc.label === 'Process' ? 'Processes' : pc.label, currentLabel: pc.currentLabel, toLabel: ch.toLabel, to: ch.to }; });
  }
  function pointsPanel(o) {
    const n = o.defaultPoints.length, sel = (S.picks.points && S.picks.points.length === n ? S.picks.points : (S.picks.points = o.defaultPoints.map(x => ({ ...x }))));
    const toggle = pc => {
      if (sel.some(x => x.point === pc.point)) return;                     // exactly n stay chosen; pick another to swap
      sel.push({ point: pc.point, to: pc.to }); if (sel.length > n) sel.shift();
      S.picks.points = sel; onPick(); render();
    };
    const setTo = (pc, to) => { const x = sel.find(y => y.point === pc.point); if (x) x.to = to; onPick(); render(); };
    return h('div', { class: 'card pointspanel' }, h('h3', {}, 'Which part of the organization?'),
      h('div', { class: 'muted', style: { marginBottom: '8px' } }, `Pick ${n === 1 ? 'one point' : n + ' points'} of the Star to change. ${sel.length} of ${n} chosen.`),
      h('div', { class: 'prows' }, o.pointChoices.map(pc => {
        const mine = sel.find(x => x.point === pc.point), on = !!mine, to = on ? mine.to : pc.to;
        const ch = pc.choices.find(c => c.to === to) || pc.choices[0];
        const row = h('div', { class: 'prow3' + (on ? ' on' : '') },
          h('button', { class: 'pbtn', role: 'checkbox', 'aria-checked': on, 'aria-label': `${pc.label}: ${pc.currentLabel} to ${ch.toLabel}`, onclick: () => toggle(pc) },
            h('span', { class: 'pick' + (on ? ' on' : '') }, on ? '\u2713' : ''), h('b', {}, pc.label === 'Process' ? 'Processes' : pc.label),
            h('span', { class: 'pfrom' }, pc.currentLabel), h('span', { class: 'pto' }, 'to'), h('span', { class: 'pnew' }, ch.toLabel)),
          ch.fitHint ? h('div', { class: 'phint' }, ch.fitHint) : null);
        if (on && pc.choices.length > 1) row.append(h('div', { class: 'ptos' }, pc.choices.map(c => h('button', { class: 'ptile' + (c.to === to ? ' on' : ''), 'data-point': pc.point, 'data-to': c.to, onclick: () => setTo(pc, c.to) }, c.toLabel))));
        return row;
      })));
  }
  function stepsBar(slots) {
    const names = { ...SLOT_NAMES, review: 'Review' };
    return h('div', { class: 'cardsteps four' }, slots.map((s, i) => {
      const o = s === 'review' ? (allPicked() ? { label: 'ready to submit' } : null) : optionOf(s);
      return h('button', { class: 'cstep' + (i === S.cardIdx ? ' on' : '') + (o ? ' done' : ''), onclick: () => { S.cardIdx = i; render(); } }, h('span', { class: 'no' }, o ? '✓' : i + 1), h('span', {}, h('b', {}, names[s]), h('small', {}, o ? o.label : s === 'review' ? 'pick all three first' : 'not chosen')));
    }));
  }
  function reviewBody() {
    const body = h('div', { class: 'cardbody' }, floorMeter(true), h('div', { class: 'cardhead' }, icon('check', 40), h('div', {}, h('div', { class: 'role' }, 'REVIEW'), h('h2', {}, 'Check your three picks'), h('div', { class: 'muted' }, 'Read all three together, then submit.'))));
    body.append(h('div', { class: 'card' }, ['market', 'org', 'people'].map(sl => {
      const o = optionOf(sl);
      return h('div', { class: 'sumrow' }, icon(SLOT_ICON[sl], 24), h('b', {}, SLOT_NAMES[sl] + ': '), h('span', {}, o ? o.label : 'not chosen'), sl === 'market' && o?.dials ? h('span', { class: 'chip' }, { light: 'Light', steady: 'Steady', all: 'All in' }[dialOf()]) : null,
        sl === 'org' && o?.pointChoices ? chosenPoints(o).map(x => h('span', { class: 'chip warn' }, `${x.label}: ${x.currentLabel} to ${x.toLabel}`)) : null, h('span', { class: 'muted' }, o ? money(costOf(sl, o)) : ''));
    })));
    const col = allPicked() ? collisionsFor({ market: S.picks.market, org: S.picks.org, people: S.picks.people }) : [];
    if (col.length) body.append(h('div', { class: 'card collide', role: 'note' }, col.map(t => h('div', { class: 'newsline' }, icon('warn', 22), h('span', {}, t)))));
    return body;
  }
  function cardsView(view) {
    const dk = deck(), slots = ['market', 'org', 'people', 'review'];
    S.cardIdx = clamp(S.cardIdx ?? 0, 0, 3);
    const slot = slots[S.cardIdx];
    const steps = stepsBar(slots);
    let body;
    if (slot === 'review') body = reviewBody();
    else {
      const c = dk.cards.find(x => x.slot === slot);
      const head = h('div', { class: 'cardhead' }, c.person ? h('div', { class: 'tinyport big' }, portrait(c.person.group)) : icon(SLOT_ICON[slot], 40), h('div', {},
        c.person ? h('div', { class: 'role' }, `${c.person.name.toUpperCase()}, ${c.person.role.toUpperCase()}`) : h('div', { class: 'role' }, `${SLOT_NAMES[slot].toUpperCase()} DECISION`), h('h2', {}, c.title), h('div', { class: 'muted' }, c.line)));
      const tiles = h('div', { class: 'otiles', role: 'radiogroup', 'aria-label': c.title }, c.options.map(o => optionTile(c, o)));
      body = h('div', { class: 'cardbody' }, floorMeter(true), head, tiles);
      if (slot === 'market') { const o = optionOf('market'); if (o?.dials) body.append(dialPanel(o)); }
      if (slot === 'org') { const o = optionOf('org'); if (o?.pointChoices) body.append(pointsPanel(o)); }
      // raid target picker
      if (slot === 'market' && OPTION_FX[S.picks.market]?.raid) {
        const rivals = Object.values(st().teams).filter(t => t.region === regionId() && t.id !== S.view.teamId);
        body.append(h('div', { class: 'card targets' }, h('h3', {}, 'Whose specialists?'), h('div', { class: 'row' }, rivals.map(t => h('button', { class: 'tile' + (S.picks.target === t.id ? ' plan' : ''), onclick: () => { S.picks.target = t.id; onPick(); render(); } }, hexEmblem(t.name, t.region, 34, t.emblem), t.name)))));
      }
    }
    const last = S.cardIdx === 3, over = spent() > dk.budget.spendable + 1e-9;
    const nav = h('div', { class: 'cardnav' }, budgetBar(),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } },
        h('button', { class: 'btn', onclick: () => { if (S.cardIdx === 0) S.step = 'brief'; else S.cardIdx--; render(); } }, '← Back'),
        last ? h('button', { class: 'btn gold big', id: 'submitbtn', disabled: !canSubmit() || !allPicked() || over || S.busy, onclick: doSubmit }, S.view.submitted && !S.dirty ? [icon('check', 22), ' Submitted'] : S.view.submitted ? 'Update submission' : 'Submit round')
          : h('button', { class: 'btn gold big', id: 'nextcard', onclick: () => { S.cardIdx++; render(); } }, S.cardIdx === 2 ? 'Review →' : 'Next card →')),
      h('small', { class: 'subnote' }, last ? (S.view.status !== 'open' ? 'Waiting for the instructor to open the round.' : !allPicked() ? 'Choose one option on every card.' : over ? 'Over budget. Pick a cheaper option.' : S.view.submitted ? 'You can still change your picks until time is up.' : '') : ''));
    view.append(steps, body, nav);
  }
  async function doSubmit() {
    S.busy = true; render();
    try { await driver.submit(buildDecision()); S.view.submitted = true; S.dirty = false; S.msg = ''; }
    catch (e) { S.msg = e.message; alert(e.message); }
    S.busy = false;
    await refresh();
  }

  function doneView(view) {
    view.append(h('div', { class: 'card', style: { maxWidth: '520px', margin: '60px auto', textAlign: 'center' } }, h('h2', {}, 'The game is over'), h('p', { class: 'muted' }, 'Thanks for playing. See the final results again any time.'),
      h('button', { class: 'btn gold big', onclick: () => { S.overlay = { type: 'final', len: me().history.length }; render(); } }, 'Final results')));
  }

  // ---------- Organization (a view, not an editor) ----------
  function orgView(view) {
    view.append(h('div', { class: 'pagehead' }, h('small', {}, 'YOUR ORGANIZATION'), h('h2', {}, 'How your network is built')));
    view.append(h('div', { class: 'org' }, h('div', { class: 'col' }, h('div', { class: 'card starwrap' }, starSVG(), h('div', { class: 'muted', style: { textAlign: 'center', marginTop: '6px' } }, 'You change the star through the Organization card each round.'))),
      h('div', { class: 'col' }, capsCard(), starList()), h('div', { class: 'col' }, workforceCard())));
  }
  const STAR_FILL = { strategy: '#EBCB88', structure: '#B5CCDA', people: '#E6BBA9', process: '#BBD0BC', rewards: '#CDBFD7' };
  function starSVG() {
    const t = previewTeam(), cx = 320, cy = 330, R = 285, r = 150;
    const pt = (rad, deg) => [cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180)];
    const svg = h('svg', { viewBox: '0 0 640 650', class: 'star', role: 'img', 'aria-label': 'Star model: strategy, structure, people, processes, rewards' });
    STAR_ORDER.forEach((p, i) => {
      const a = -90 + 72 * i, tip = pt(R, a), l = pt(r, a - 36), rr = pt(r, a + 36);
      const w = t.w[p], cur = w.indexOf(Math.max(...w)), tr = t.transitions[p], prog = tr ? tr.progress : 1;
      const g = h('g', {});
      g.append(h('polygon', { points: [tip, l, [cx, cy], rr].map(q => q.join(',')).join(' '), fill: STAR_FILL[p], stroke: '#CF9A49', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      const [lx, ly] = pt(R * 0.55 + 6, a);
      g.append(h('text', { x: lx, y: ly - 22, 'text-anchor': 'middle', fill: '#183B35', 'font-size': 36, 'font-family': 'Georgia, serif', 'font-weight': 700 }, POINT_NAMES[p]));
      const full = D.OPTIONS[p][t.target?.[p] ?? cur], words = full.split(' ');
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && full.length > 14 ? words : [full];
      lines.forEach((ln, k) => g.append(h('text', { x: lx, y: ly + 10 + k * 27, 'text-anchor': 'middle', fill: '#233630', 'font-size': 25, 'font-weight': 600 }, ln)));
      if (tr) {
        const [bx, by] = pt(R * 0.82, a), C = 2 * Math.PI * 26;
        g.append(h('circle', { cx: bx, cy: by, r: 30, fill: '#FFFDF7', stroke: '#e0d9c4', 'stroke-width': 2 }), h('circle', { cx: bx, cy: by, r: 26, fill: 'none', stroke: '#3d6b4a', 'stroke-width': 5, 'stroke-dasharray': `${C * prog} ${C}`, transform: `rotate(-90 ${bx} ${by})` }),
          h('text', { x: bx, y: by + 8, 'text-anchor': 'middle', 'font-size': 24, fill: '#183B35', 'font-weight': 700 }, Math.round(prog * 100) + '%'));
      }
      svg.append(g);
    });
    svg.append(h('circle', { cx, cy, r: 82, fill: '#183B35', stroke: '#CF9A49', 'stroke-width': 4 }),
      h('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#fff8e6', 'font-size': 26, 'font-family': 'Georgia, serif', 'font-weight': 700 }, 'THE'),
      h('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', fill: '#fff8e6', 'font-size': 26, 'font-family': 'Georgia, serif', 'font-weight': 700 }, 'SYSTEM'));
    return svg;
  }
  function starList() {
    const t = previewTeam();
    return h('div', { class: 'card' }, h('h3', {}, 'Your five choices'), STAR_ORDER.map(p => {
      const w = t.w[p], cur = w.indexOf(Math.max(...w)), tgt = t.target?.[p] ?? cur;
      return h('div', { class: 'starrow' }, icon(OPT_ICON[p][tgt], 24), h('span', {}, h('b', {}, p === 'process' ? 'Processes' : POINT_NAMES[p]), h('br'), D.OPTIONS[p][tgt]), t.transitions[p] ? h('span', { class: 'chip warn' }, 'changing') : null);
    }));
  }
  function capsCard() {
    const t = previewTeam(), cur = capabilities(t, regionId());
    const c = h('div', { class: 'card' }, h('h3', {}, 'Capabilities'));
    const bars = h('div', { class: 'capbars' });
    for (const k of D.CAPS) bars.append(h('div', {}, h('div', { class: 'l' }, h('span', {}, CAP_NAMES[k]), h('b', {}, Math.round(cur[k]))), h('div', { class: 'bar' }, h('i', { style: { width: cur[k] + '%' } }))));
    c.append(bars);
    const fit = interactionsActive({ w: Object.fromEntries(D.POINTS.map(p => [p, onehot(t.target?.[p] ?? t.w[p].indexOf(Math.max(...t.w[p])))])) });
    const bad = fit.filter(f => FIT_LABELS[f.id][1] < 0);
    c.append(h('div', { class: 'chips', style: { marginTop: '8px' } }, fit.map(f => { const [lbl, kind] = FIT_LABELS[f.id]; return h('span', { class: 'chip ' + (kind > 0 ? 'good' : kind < 0 ? 'bad' : 'warn') }, icon(kind < 0 ? 'warn' : 'check', 14), lbl); })));
    c.append(h('div', { class: 'friction' }, h('b', {}, 'Potential friction'), h('p', {}, bad.length ? bad.map(f => f.note).join(' ') : 'Nothing in this design is working against itself.')));
    return c;
  }
  function workforceCard() {
    const t = previewTeam(), inf = influence(t);
    return h('div', { class: 'card' }, h('h3', {}, 'Workforce'), h('div', { class: 'wf' }, D.GROUPS.map(g => {
      const tr = t.trust[g];
      return h('div', { class: 'p' }, portrait(g), h('div', { class: 'gname' }, GROUP_NAMES[g]),
        h('div', { class: 'gline' }, h('span', {}, 'Trust'), h('b', {}, Math.round(tr))),
        h('div', { class: 'gauge', title: 'Trust' }, h('i', { style: { width: tr + '%', background: tr < 40 ? 'var(--terra)' : tr < 60 ? 'var(--gold)' : 'var(--sage)' } })),
        h('div', { class: 'gline' }, h('span', {}, 'Influence'), h('b', {}, Math.round(inf[g] * 100) + '%')));
    })));
  }

  // ---------- Create Your Network wizard (round 1) ----------
  function wizard() {
    const steps = ['Network name', 'Archetype', 'Region', 'Confirm'];
    const d = S.draft, back = S.wiz > 0 ? h('button', { class: 'btn', onclick: () => { S.wiz--; render(); } }, 'Back') : null;
    const body = h('div', { class: 'wizbody' });
    if (S.wiz === 0) {
      const nm = d.displayName ?? S.view.name;
      const inp = h('input', { class: 'field', id: 'netname', maxlength: 28, value: nm, 'aria-label': 'Network name', style: { fontFamily: 'var(--serif)', fontSize: '34px', fontWeight: 700 },
        oninput: e => { d.displayName = e.target.value.slice(0, 28); store.set(draftKey(), d); } });
      const pick = h('div', { class: 'row', role: 'radiogroup', 'aria-label': 'Emblem', style: { gap: '10px', marginTop: '14px' } }, Array.from({ length: EMBLEM_COUNT }, (_, i) => h('button', { class: 'emb' + (d.emblem === 'e' + i ? ' on' : ''), role: 'radio', 'aria-checked': d.emblem === 'e' + i, 'aria-label': 'Emblem ' + (i + 1),
        onclick: () => { d.emblem = 'e' + i; store.set(draftKey(), d); render(); setTimeout(() => root.querySelector('#netname')?.focus(), 0); } }, hexEmblem(nm, regionId(), 52, i))));
      body.append(h('div', { class: 'muted', style: { margin: '14px 0 6px' } }, 'Network name'), inp, h('div', { class: 'muted', style: { margin: '14px 0 0' } }, 'Choose an emblem'), pick);
      setTimeout(() => { const el = root.querySelector('#netname'); if (el && document.activeElement !== el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    } else if (S.wiz === 1) {
      const row = h('div', { class: 'archs' });
      for (const [k, a] of Object.entries(D.ARCHETYPES)) {
        const mx = Math.max(...Object.values(a.capacity));
        row.append(h('button', { class: 'arch' + (d.archetype === k ? ' on' : ''), onclick: () => { d.archetype = k; store.set(draftKey(), d); S.picks = {}; render(); } },
          emblem(k, 52), h('b', {}, a.name), h('small', { class: 'muted' }, ARCH_TAG[k]), h('div', { class: 'minibars' }, D.MARKETS.map(m => h('i', { style: { height: a.capacity[m] / mx * 100 + '%' }, title: MARKET_NAMES[m] }))), h('small', { class: 'muted' }, 'Primary · Specialty · Chronic')));
      }
      body.append(row);
    } else if (S.wiz === 2) {
      const reg = D.REGIONS[regionId()], sc = regionScene(regionId(), 'wizscene');
      body.append(h('div', { class: 'wizregion' }, sc, h('div', { class: 'chip', style: { position: 'absolute', right: '12px', bottom: '12px', fontSize: '16px' } }, icon('pin', 16), 'Assigned by your instructor: ' + reg.name)));
    } else {
      const a = D.ARCHETYPES[d.archetype];
      body.append(h('div', { class: 'row', style: { gap: '18px', margin: '16px 0' } }, hexEmblem(d.displayName || S.view.name, regionId(), 80, d.emblem), h('div', {}, h('div', { class: 'serif', style: { fontSize: '40px' } }, d.displayName || S.view.name), h('div', {}, a.name + ' in ' + D.REGIONS[regionId()].name), h('div', { class: 'muted' }, 'Your round brief comes next.'))));
    }
    const last = S.wiz === 3;
    const next = h('button', { class: 'btn gold big', id: 'wiznext', onclick: () => { if (last) { store.set(wizKey(), true); S.step = 'brief'; S.tab = 'play'; render(); } else { S.wiz++; render(); } } }, last ? 'Create Network' : 'Next');
    return h('div', { class: 'overlay' }, h('div', { class: 'wiz' }, h('div', { class: 'wizhead' }, h('h2', {}, 'Create Your Network'),
      h('div', { class: 'wsteps' }, steps.map((s, i) => h('span', { class: 'ws' + (i === S.wiz ? ' now' : i < S.wiz ? ' done' : '') }, h('i', {}, i < S.wiz ? '✓' : i + 1), s)))), body, h('div', { class: 'row rvfoot', style: { justifyContent: 'space-between', marginTop: '16px' } }, back || h('span'), next)));
  }

  const oneSentence = c => { const t = String(c || '').split(/(?<=[.!?])\s/)[0]; return t.length > 90 ? t.slice(0, 87).trimEnd() + '...' : t; };
  // ---------- Reveal: three taps ----------
  function finishReveal() {
    store.set(`sys:seen:${key()}:${S.view.teamId}`, S.overlay.len); S.overlay = null; refresh();
  }
  function revealOverlay() {
    const rv = S.view.reveal, t = me(), hh = t.history.at(-1), prev = t.history.at(-2);
    const box = h('div', { class: 'res reveal' }, h('div', { class: 'reshead' }, regionScene(regionId(), 'resscene'), h('h2', {}, `Round ${hh.round} results`)),
      h('div', { class: 'rvsteps' }, ['Market tug-of-war', 'Headlines', 'Your meters'].map((s, i) => h('span', { class: 'rvs' + (i === S.rv ? ' now' : i < S.rv ? ' done' : '') }, h('i', {}, i + 1), s))));
    if (S.rv === 0) {
      const COLS = ['#46718C', '#735A88', '#A3513A', '#44704B'];
      const tug = h('div', { class: 'tug' });
      for (const m of D.MARKETS) {
        const rows = (rv.tug[m] || []).slice();
        let ri = 0;
        const segs = rows.map(e => ({ e, col: e.mine ? '#183B35' : COLS[ri++ % COLS.length] }));
        const bar = h('div', { class: 'stack' }, segs.map(({ e, col }) => {
          const seg = h('i', { class: 'tseg' + (e.mine ? ' mine' : ''), title: `${e.name}: ${Math.round(e.shareAfter * 100)}%`, style: { width: e.shareBefore * 100 + '%', background: col } }, h('span', {}, Math.round(e.shareBefore * 100) + '%'));
          setTimeout(() => { seg.style.width = e.shareAfter * 100 + '%'; const sp = seg.firstChild; tween(sp, e.shareAfter * 100, { from: e.shareBefore * 100, fmt: v => Math.round(v) + '%', ms: 1400 }); }, 250);
          return seg;
        }), h('i', { class: 'tseg outside', title: 'Other providers' }));
        const legend = h('div', { class: 'legend' }, segs.map(({ e, col }) => {
          const dpt = Math.round((e.shareAfter - e.shareBefore) * 100);
          return h('span', { class: 'lg' + (e.mine ? ' mine' : '') }, h('i', { class: 'sw', style: { background: col } }), e.mine ? e.name + ' (You)' : e.name, h('b', { class: 'delta ' + (dpt > 0 ? 'up' : dpt < 0 ? 'down' : 'flat') }, dpt === 0 ? 'held' : (dpt > 0 ? '▲ +' : '▼ ') + dpt));
        }));
        tug.append(h('div', { class: 'tugmkt' }, h('div', { class: 'tugname' }, building(MARKET_BUILDING[m], 40), h('b', {}, MARKET_NAMES[m])), h('div', {}, bar, legend)));
      }
      box.append(tug);
    } else if (S.rv === 1) {
      const hl = rv.headlines, rv2 = rv.rival;
      const rEmb = rv2?.emblem, rName = rv2?.name;
      box.append(h('div', { class: 'headlines' }, h('div', { class: 'card hl mine' }, h('div', { class: 'role' }, 'ABOUT YOU'), hexEmblem(S.view.name, regionId(), 56, t.emblem), h('p', {}, hl[0])),
        h('div', { class: 'card hl rival' }, h('div', { class: 'role' }, rName ? 'ABOUT ' + rName.toUpperCase() : 'YOUR RIVALS'), rName ? hexEmblem(rName, regionId(), 56, rEmb) : icon('raid', 40), h('p', {}, hl[1]))));
    } else {
      const items = [['Cash', 'financial', hh.cash, v => money(v), prev?.cash, rv.causes.cash], ['Outcomes', 'outcomes', hh.outcome, v => Math.round(v) + '/100', prev?.outcome, rv.causes.outcomes],
        ['Workforce trust', 'trust', hh.workforceTrust, v => Math.round(v) + '/100', prev?.workforceTrust, rv.causes.trust], ['Market share', 'share', hh.marketShare * 100, v => v.toFixed(0) + '%', prev ? prev.marketShare * 100 : null, rv.causes.share]];
      const grid = h('div', { class: 'meters4' });
      for (const [k, ic, to, fmt, pv, cause] of items) {
        const n = h('div', { class: 'n' }, fmt(0));
        grid.append(h('div', { class: 'rbox' }, h('div', { class: 'k row' }, icon(ic, 18), k), n, pv != null ? h('div', { class: 'delta ' + (to > pv + 0.05 ? 'up' : to < pv - 0.05 ? 'down' : 'flat'), style: { fontSize: '14px' } }, (to >= pv ? '▲ ' : '▼ ') + fmt(Math.abs(to - pv)).replace('/100', '')) : h('div', { class: 'muted', style: { fontSize: '14px' } }, 'First round'), h('div', { class: 'cause' }, oneSentence(cause))));
        setTimeout(() => tween(n, to, { fmt, ms: 1000 }), 50);
      }
      box.append(grid);
    }
    box.append(h('div', { class: 'row rvfoot', style: { justifyContent: 'flex-end', marginTop: '14px' } },
      S.rv > 0 ? h('button', { class: 'btn', onclick: () => { S.rv--; render(); } }, '← Back') : null,
      S.rv < 2 ? h('button', { class: 'btn gold big', id: 'rvnext', onclick: () => { S.rv++; render(); } }, 'Next →') : h('button', { class: 'btn gold big', id: 'rvdone', onclick: finishReveal }, S.view.status === 'done' ? 'See final results' : 'Next round')));
    return h('div', { class: 'overlay' }, box);
  }
  // Fallback when no reveal was published (for example after a host edit).
  function resultsOverlay() {
    const hh = me().history.at(-1);
    return h('div', { class: 'overlay' }, h('div', { class: 'res' }, h('h2', {}, `Round ${hh.round} results`),
      h('div', { class: 'meters4' }, [['Cash', money(hh.cash)], ['Outcomes', Math.round(hh.outcome) + '/100'], ['Workforce trust', Math.round(hh.workforceTrust) + '/100'], ['Market share', Math.round(hh.marketShare * 100) + '%']].map(([k, v]) => h('div', { class: 'rbox' }, h('div', { class: 'k' }, k), h('div', { class: 'n' }, v)))),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn gold big', id: 'rvdone', onclick: finishReveal }, S.view.status === 'done' ? 'See final results' : 'Next round'))));
  }

  function finalOverlay() {
    const dg = diagnosis(st(), S.view.teamId);
    const rk = S.view.final?.rankings?.find(x => x.id === S.view.teamId);
    const s = dg.score;
    const box = h('div', { class: 'res' }, h('h2', {}, 'Final results'));
    if (rk) box.append(h('div', { class: 'row', style: { margin: '8px 0 14px' } }, h('span', { class: 'chip good', style: { fontSize: '18px' } }, `#${rk.regionRank} in ${D.REGIONS[rk.region].name}`), h('span', { class: 'chip warn', style: { fontSize: '18px' } }, `#${rk.classRank} in class`)));
    for (const [k, v] of [['Financial', s.financial], ['Outcomes', s.outcomes], ['Resilience', s.resilience]]) box.append(h('div', { class: 'scorebar' }, h('span', {}, k), h('div', { class: 'bar' }, h('i', { style: { width: v + '%' } })), h('b', {}, Math.round(v))));
    box.append(h('div', { class: 'row', style: { fontSize: '22px', margin: '8px 0' } }, h('span', { class: 'muted' }, 'Total'), h('span', { class: 'serif', style: { fontSize: '44px', color: 'var(--evergreen)' } }, Math.round(s.total)), s.capped ? h('span', { class: 'chip bad' }, 'Capped by outcomes floor') : null));
    box.append(h('div', { class: 'notes' }, dg.lines.map(l => h('div', { class: 'note' }, l)), dg.fit.map(l => h('div', { class: 'note' }, l))));
    box.append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn gold', id: 'finalclose', onclick: () => { S.finalSeen = true; S.overlay = null; render(); } }, 'Close')));
    return h('div', { class: 'overlay' }, box);
  }

  refresh();
  return { refresh };
}
