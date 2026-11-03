// The team screen, shared by team.html (networked) and solo.html (local driver).
// driver.load() -> view {name, teamId, region, status, round, timer, state(scoped), submitted, decision, publicTeams, events, final, key}
// driver.submit(decision) -> Promise; driver.subscribe(cb) -> unsubscribe
// status: lobby | open | locked | done. Teams may edit any time; only 'open' accepts a submission.
import * as D from '../engine/data.js';
import { PROPOSALS } from '../engine/cards.js';
import { brief, forecast, capabilities, validateDecision, defaultDecision, changeCost, weightedTrust, interactionsActive, diagnosis, influence } from '../engine/engine.js';
import { h, icon, money, tween, clamp, regionScene, portrait, emblem, hexEmblem, building, logo, withImage, stepper, timerMs, mmss, pos, ROUND_TITLES, MARKET_NAMES, MARKET_BUILDING, CAP_NAMES, POINT_NAMES, GROUP_NAMES, FIT_LABELS } from './ui.js';

const onehot = i => [0, 1, 2].map(j => (j === i ? 1 : 0));
const STAR_ORDER = ['strategy', 'structure', 'people', 'process', 'rewards'];
// Tile centres and icon centres on star.png (900x900), in percent.
const STAR_TILE = { strategy: [50, 27], structure: [79, 46], people: [67, 75], process: [33, 75], rewards: [21, 46] };
const STAR_ICON = { strategy: [50, 15.5], structure: [79, 38], people: [67, 67.5], process: [33, 67.5], rewards: [21, 39] };
const OPT_ICON = { strategy: ['s0', 's1', 's2'], structure: ['t0', 't1', 't2'], people: ['p0', 'p1', 'p2'], process: ['q0', 'q1', 'q2'], rewards: ['r0', 'r1', 'r2'] };
// Neutral descriptions only: what each approach is, never which is better.
const APPROACH_INFO = {
  mandate: ['Executive mandate', 'Leaders decide and roll it out', 'mandate'],
  consult: ['Employee consultation', 'Ask staff first, then decide', 'consult'],
  joint: ['Joint redesign', 'Staff help design it', 'joint'],
};
const SPEAKER = {
  physicians: ['Dr. Elena Marsh', 'Physician Council'], nurses: ['Maria Alvarez, RN', 'Nursing Council'],
  admins: ['Helen Brandt', 'Administrative Council'], coordinators: ['Priya Raman', 'Care Coordination Team'],
};
const ARCH_TAG = { access: 'Scale / Access / Efficiency', excellence: 'Specialty / Quality / Expertise', integrated: 'Coordinated / Chronic / Continuity' };
const EVENT_ART = { 2: 'expansion', 3: 'reform', 4: 'resistance' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const artImg = (name, cls = '') => { const i = h('img', { src: `assets/scenes/${name}.jpg`, alt: '', class: 'art ' + cls }); i.onerror = () => i.remove(); return i; };

export function mountTeamApp(root, driver, opts = {}) {
  const S = { view: null, draft: null, tab: 'market', panel: null, sel: null, round: 0, fc: null, fcTimer: null, msg: '', dirty: false, overlay: null, busy: false, wiz: 0 };

  // ---------- data helpers ----------
  const st = () => S.view.state;
  const me = () => st().teams[S.view.teamId];
  const regionId = () => me().region;
  const roundNo = () => S.view.round;
  const baseStar = () => (roundNo() === 1 ? D.ARCHETYPES[S.draft.archetype].star : me().target);
  const planned = () => ({ ...baseStar(), ...S.draft.changes });
  function previewTeam() {
    const t = me();
    if (roundNo() !== 1) return t;
    const a = D.ARCHETYPES[S.draft.archetype], pl = planned();
    return { ...t, archetype: S.draft.archetype, capacity: { ...a.capacity }, trust: { ...a.trust }, target: pl, w: Object.fromEntries(D.POINTS.map(p => [p, onehot(pl[p])])), transitions: {} };
  }
  const legal = () => validateDecision(st(), S.view.teamId, S.draft);
  const canSubmit = () => S.view.status === 'open';
  const key = () => S.view.key || S.view.code;
  const draftKey = () => `sys:draft:${key()}:${S.view.teamId}:${roundNo()}`;
  const wizKey = () => `sys:wiz:${key()}:${S.view.teamId}`;
  const firstPlay = () => roundNo() === 1 && S.view.status !== 'done' && !store.get(wizKey());

  function freshDraft() {
    const d = defaultDecision(st(), S.view.teamId);
    delete d.missing;
    d.archetype = me().archetype;
    d.focus = Object.fromEntries(D.MARKETS.map(m => [m, Math.round(d.focus[m])]));
    d.focus.primary += 100 - Object.values(d.focus).reduce((a, b) => a + b, 0);
    d.response = 'counter';
    return d;
  }
  function loadDraft() {
    S.draft = S.view.decision ? { ...freshDraft(), ...S.view.decision } : store.get(draftKey()) || freshDraft();
    S.draft.changes ||= {};
    S.dirty = false; S.sel = null; S.panel = null; S.fc = null;
  }
  function onDraft() {
    store.set(draftKey(), S.draft);
    S.dirty = true;
    clearTimeout(S.fcTimer);
    S.fcTimer = setTimeout(() => { try { S.fc = forecast(st(), S.view.teamId, S.draft); } catch (e) { S.fc = null; } paintLive(); }, 200);
    paintLive();
  }

  // ---------- load ----------
  async function refresh() {
    let v;
    try { v = await driver.load(); } catch (e) { root.replaceChildren(h('div', { class: 'center' }, h('div', { class: 'glass joinbox' }, h('h2', {}, 'Cannot reach the game'), h('p', { class: 'err' }, e.message), h('a', { class: 'btn', href: 'index.html' }, 'Back to join')))); return; }
    const newRound = !S.view || S.round !== v.round || (!S.view.state && v.state);
    S.view = v;
    if (v.state) {
      if (newRound || !S.draft) { S.round = v.round; loadDraft(); }
      else if (v.decision && !S.dirty) S.draft = { ...S.draft, ...v.decision };
      const seen = store.get(`sys:seen:${key()}:${v.teamId}`) || 0;
      const len = me().history.length;
      if (len > seen && !S.overlay) S.overlay = { type: 'results', len };
      else if (!S.overlay && v.status === 'done' && len <= seen && !S.finalSeen) S.overlay = { type: 'final', len };
      if (!S.fc) { try { S.fc = forecast(st(), v.teamId, S.draft); } catch { /* ignore */ } }
    }
    render();
  }
  driver.subscribe?.(() => refresh());
  setInterval(() => { if (S.view && !S.overlay && !S.panel && !document.hidden && driver.poll) refresh(); }, 2500);
  setInterval(() => { if (S.view) updateTimer(); }, 400);

  // ---------- render ----------
  function render() {
    const v = S.view, keep = root.querySelector('#view')?.scrollTop || 0;
    root.replaceChildren();
    if (!v.state) { root.append(waitScreen()); return; }
    const reg = D.REGIONS[regionId()];
    const stage = h('div', { class: 'stage' + (S.tab === 'market' ? '' : ' dim') });
    stage.append(regionScene(regionId()));
    const view = h('div', { class: 'view', id: 'view' });
    stage.append(view);
    root.append(topbar(reg), stage);
    if (S.tab === 'market') marketView(view, stage);
    else if (S.tab === 'org') orgView(view);
    else boardView(view);
    if (firstPlay()) root.append(wizard());
    else if (S.overlay) root.append(S.overlay.type === 'results' ? resultsOverlay() : finalOverlay());
    paintLive();
    const nv = root.querySelector('#view'); if (nv && keep) nv.scrollTop = keep;
  }

  function waitScreen() {
    const v = S.view;
    const bg = regionScene('mountain'); bg.style.cssText = 'position:absolute;inset:0;filter:brightness(.5)';
    return h('div', { class: 'center', style: { position: 'absolute', inset: 0 } }, bg, h('div', { class: 'glass joinbox', style: { textAlign: 'center' } },
      logo(320), h('h2', {}, v.name), icon('clock', 48), h('h2', {}, 'Waiting for the instructor to start'), h('p', { class: 'muted' }, 'Game ' + v.code)));
  }

  function topbar(reg) {
    const v = S.view, r = clamp(v.round, 1, 5);
    const b = brief(st(), v.teamId);
    const sub = v.status === 'done' ? 'Final results' : b.event ? b.event.title : reg.name;
    const tb = h('div', { class: 'tabs', role: 'tablist' }, [['market', 'Compete', 'primary'], ['org', 'Organize', 'trust'], ['board', 'Lead', 'mandate']].map(([k, l, ic]) =>
      h('button', { class: 'tab' + (S.tab === k ? ' on' : ''), role: 'tab', 'aria-selected': S.tab === k, onclick: () => { S.tab = k; S.panel = null; render(); } }, icon(ic, 20), l)));
    const timer = h('div', { class: 'timerbox', id: 'timer' }, h('div', { class: 'n' }, '--'), h('div', { class: 's', style: { fontSize: '11px', color: 'var(--ink2)' } }, ''));
    return h('div', { class: 'topbar' }, h('div', { class: 'brand' }, logo(190)), tb,
      h('div', { class: 'roundbox' }, h('div', { class: 't' }, v.status === 'done' ? 'Game over' : `Round ${r} of 5: ${ROUND_TITLES[r - 1]}`), h('div', { class: 's' }, sub), stepper(v.status === 'done' ? 6 : r)),
      timer, h('div', { class: 'teamtag' }, h('div', {}, h('b', {}, v.name), reg.name), hexEmblem(v.name, regionId(), 40)));
  }

  // ---------- Market (dashboard hub) ----------
  function marketDemand(m) {
    const rid = regionId(), reg = D.REGIONS[rid], n = st().regions[rid].teams.length;
    let g = st().regions[rid].growth; if (roundNo() > 1) g *= 1 + reg.growth;
    return D.DEMAND_PER_TEAM[m] * n * reg.demand[m] * g;
  }
  function eventArt(b) {
    const r = roundNo();
    if (r === 3 && b.reform) return 'reform';
    if (b.event && ['population_surge', 'construction_delay', 'hiring_crunch'].includes(b.event.id)) return 'expansion';
    return EVENT_ART[r] || null;
  }
  function marketView(view, stage) {
    const t = me(), v = S.view, b = brief(st(), v.teamId);
    const rivals = v.publicTeams.filter(x => x.region === regionId() && x.id !== v.teamId);
    const reg = D.REGIONS[regionId()];
    stage.append(h('div', { class: 'regionhead' }, h('small', {}, 'YOUR REGION'), h('h2', {}, reg.name), h('div', {}, reg.tag)));
    // DOM pill markers generated from team data
    const pins = h('div', { class: 'pinlayer' });
    const pill = (cls, x, y, name, region, sub) => h('div', { class: 'pin ' + cls, style: { left: x * 100 + '%', top: y * 100 + '%' } }, hexEmblem(name, region, cls === 'me' ? 26 : 22), cls === 'me' ? name + ' (You)' : name, sub ? h('span', { class: 'sub' }, sub) : null);
    pins.append(pill('me', 0.5, 0.52, v.name, regionId(), t.history.length ? Math.round(t.history.at(-1).marketShare * 100) + '%' : ''));
    const SLOTS = [[0.36, 0.34], [0.66, 0.38], [0.34, 0.7], [0.68, 0.7], [0.5, 0.26], [0.5, 0.78]];
    rivals.forEach((r, i) => { const [sx, sy] = SLOTS[i % SLOTS.length]; const sh = r.hist.at(-1)?.share; pins.append(pill('rival', sx, sy, r.name, r.region, sh != null ? Math.round(sh * 100) + '%' : '')); });
    stage.append(pins);
    const left = h('div', { class: 'card mk-left' }, h('h3', {}, 'Patient demand'));
    let total = 0;
    for (const m of D.MARKETS) {
      const dm = marketDemand(m); total += dm;
      left.append(h('div', { class: 'mkt' }, h('div', { class: 'ic' }, building(MARKET_BUILDING[m], 52)), h('div', {}, h('div', { class: 'nm' }, MARKET_NAMES[m]),
        h('div', { class: 'dm' }, Math.round(dm) + 'k'), h('small', {}, `You hold ${Math.round(t.share[m] * 100)}% · room ${Math.round(t.capacity[m])}k`))));
    }
    left.append(h('div', { class: 'muted' }, `${Math.round(total * 1000).toLocaleString('en-US')} patients in the region`),
      h('button', { class: 'btn gold', id: 'allocate', onclick: () => { S.panel = S.panel === 'compete' ? null : 'compete'; render(); } }, 'Allocate & invest →'));
    const ev = b.event, art = eventArt(b);
    const evc = h('div', { class: 'card eventcard' }, art ? artImg(art) : null, h('div', { class: 'ic' + (ev ? '' : ' none') }, icon(ev ? ev.icon : 'check', 26)),
      h('div', { class: 'et' }, h('h3', {}, b.reform && roundNo() === 3 ? 'National payment reform' : ev ? ev.title : 'A steady year'),
        h('p', {}, b.reform && roundNo() === 3 ? 'Payment now follows patient outcomes.' : ev ? ev.line : 'No big shock in your region this round.'),
        b.warning && roundNo() < 5 ? h('span', { class: 'chip warn' }, icon('warn', 14), 'Next: ' + b.warning.line) : null));
    const right = h('div', { class: 'card mk-right' }, h('h3', {}, 'Network standing'), perfRows(),
      h('div', { class: 'rivals' }, h('div', { class: 'lab' }, 'Regional competitors'),
        h('div', { class: 'rv me' }, hexEmblem(v.name, regionId(), 22), h('span', {}, v.name + ' (You)'), h('b', {}, t.history.length ? Math.round(t.history.at(-1).marketShare * 100) + '%' : '-')),
        rivals.map(r => h('div', { class: 'rv' }, hexEmblem(r.name, r.region, 22), h('span', {}, r.name), h('b', {}, r.hist.length ? Math.round(r.hist.at(-1).share * 100) + '%' : '-')))));
    view.append(left, evc, right, pillNav());
    if (S.panel === 'compete') view.append(competePanel());
  }

  function perfRows() {
    const t = previewTeam(), hist = me().history, last = hist.at(-1), prev = hist.at(-2);
    // Every delta compares the last resolved round with the one before it. Round 1 has nothing earlier,
    // except trust, which starts from the archetype's opening state.
    const a = D.ARCHETYPES[t.archetype];
    const start = weightedTrust({ ...t, trust: { ...a.trust }, w: Object.fromEntries(D.POINTS.map(p => [p, onehot(a.star[p])])) });
    const row = (ic, lbl, val, unit, pct, delta, dtxt) => h('div', { class: 'met' }, h('div', { class: 'ic' }, icon(ic, 28)),
      h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, lbl), h('span', { class: 'val' }, val == null ? '-' : unit(val))),
        h('div', { class: 'bar' }, h('i', { style: { width: clamp(pct, 0, 100) + '%' } })),
        h('div', { class: 'dl' }, h('span', { class: 'delta ' + (delta == null ? 'flat' : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat') }, delta == null ? 'First round' : (delta > 0.05 ? '▲ ' : delta < -0.05 ? '▼ ' : '● ') + dtxt(Math.abs(delta)) + ' vs last'))));
    const wt = weightedTrust(t), wtLast = last ? last.workforceTrust : wt;
    return [
      row('financial', 'Financial Health', t.cash, v => money(v), (t.cash + 10) / 70 * 100, last ? last.cash - last.startCash : null, v => money(v)),
      row('outcomes', 'Patient Outcomes', last ? last.outcome : null, v => Math.round(v) + '/100', last ? last.outcome : 0, last && prev ? last.outcome - prev.outcome : null, v => v.toFixed(1)),
      row('trust', 'Workforce Trust', wt, v => Math.round(v) + '/100', wt, last ? wtLast - (prev ? prev.workforceTrust : start) : null, v => v.toFixed(1)),
      row('share', 'Market Share', last ? last.marketShare * 100 : null, v => v.toFixed(0) + '%', last ? last.marketShare * 100 * 2.5 : 0, last && prev ? (last.marketShare - prev.marketShare) * 100 : null, v => v.toFixed(1) + ' pts'),
    ];
  }

  function pillNav() {
    const d = S.draft, nch = Object.keys(d.changes).length;
    const pn = (no, title, target, body) => h('button', { class: 'pn' + (target === 'compete' && S.panel === 'compete' ? ' on' : ''), onclick: () => { if (target === 'compete') { S.tab = 'market'; S.panel = S.panel === 'compete' ? null : 'compete'; render(); } else { S.tab = target; S.panel = null; render(); } } }, h('b', {}, h('span', { class: 'no' }, no), title), body);
    return h('div', { class: 'pillnav' },
      pn('1', 'Compete', 'compete', [h('div', { class: 'seg', 'data-live': 'seg' }), h('small', { 'data-live': 'compsub' })]),
      pn('2', 'Organize', 'org', [h('div', { class: 'row', 'data-live': 'orgdots' }), h('small', { 'data-live': 'orgsub' }, nch ? nch + ' change' + (nch > 1 ? 's' : '') + ' queued' : 'No changes yet')]),
      pn('3', 'Lead', 'board', [h('small', { 'data-live': 'leadsub' })]), submitBox());
  }
  function waitNote(s) { return s.status === 'open' ? (s.submitted ? 'You can still revise until time is up' : '') : s.status === 'done' ? '' : 'Waiting for the instructor'; }
  function submitBox() {
    const s = S.view;
    const label = s.submitted ? (S.dirty ? 'Update submission' : 'Submitted') : 'Submit round';
    const btn = h('button', { class: 'btn big ' + (s.submitted && !S.dirty ? 'green' : 'gold'), id: 'submitbtn', disabled: !canSubmit() || S.busy, onclick: doSubmit }, s.submitted && !S.dirty ? icon('check', 22) : null, label);
    return h('div', { class: 'submitbox' }, btn, h('small', { 'data-live': 'subnote' }, waitNote(s)));
  }
  async function doSubmit() {
    S.busy = true; paintLive();
    try { await driver.submit(legal()); S.view.submitted = true; S.dirty = false; S.msg = ''; }
    catch (e) { S.msg = e.message; alert(e.message); }
    S.busy = false;
    await refresh();
  }

  // live parts that update without rebuilding the page
  function paintLive() {
    if (!S.view?.state) return;
    const d = S.draft, q = k => root.querySelector(`[data-live="${k}"]`);
    root.querySelectorAll('[data-live="seg"]').forEach(seg => seg.replaceChildren(h('i', { class: 'p', style: { width: d.focus.primary + '%' } }), h('i', { class: 's', style: { width: d.focus.specialty + '%' } }), h('i', { class: 'c', style: { width: d.focus.chronic + '%' } })));
    const inv = legal();
    const totalInv = D.MARKETS.reduce((a, m) => a + inv.invest[m], 0) + inv.explore;
    root.querySelectorAll('[data-live="compsub"]').forEach(cs => (cs.textContent = `Price ${d.price} · invest ${money(totalInv, 1)}`));
    root.querySelectorAll('[data-live="orgdots"]').forEach(dots => dots.replaceChildren(...STAR_ORDER.map(p => h('span', { class: 'chip' + (d.changes[p] != null ? ' warn' : ''), style: { padding: '2px 7px', fontSize: '11px' } }, POINT_NAMES[p].slice(0, 3)))));
    const n = Object.keys(d.changes).length;
    root.querySelectorAll('[data-live="orgsub"]').forEach(os => (os.textContent = n ? `${n} change${n > 1 ? 's' : ''} queued · ${money(changeCost(st(), inv))}` : 'No changes yet'));
    root.querySelectorAll('[data-live="leadsub"]').forEach(ls => (ls.textContent = n ? APPROACH_INFO[d.approach][0] + ' · proposal: ' + d.response : 'No change to lead' + (brief(st(), S.view.teamId).proposal ? ' · 1 proposal' : '')));
    root.querySelectorAll('[data-live="subnote"]').forEach(el => (el.textContent = waitNote(S.view)));
    root.querySelectorAll('#submitbtn').forEach(btn => {
      btn.disabled = !canSubmit() || S.busy;
      btn.replaceChildren(...(S.view.submitted && !S.dirty ? [icon('check', 22)] : []), S.view.submitted ? (S.dirty ? 'Update submission' : 'Submitted') : 'Submit round');
      btn.className = 'btn big ' + (S.view.submitted && !S.dirty ? 'green' : 'gold');
    });
    root.querySelectorAll('[data-fc]').forEach(el => { const k = el.dataset.fc; if (S.fc) el.textContent = k === 'cash' ? money(S.fc.cash) : k === 'out' ? Math.round(S.fc.outcome) + '/100' : k === 'share' ? Math.round(S.fc.marketShare * 100) + '%' : money(S.fc.operating); });
    const spend = inv.invest.primary + inv.invest.specialty + inv.invest.chronic + inv.explore + changeCost(st(), inv) + (inv.pilot ? D.PILOT_COST : 0);
    root.querySelectorAll('[data-cash]').forEach(el => (el.textContent = `Cash ${money(me().cash)} · plan spends ${money(spend)} · credit ${money(D.CREDIT_LINE, 0)}`));
    root.querySelectorAll('[data-sl]').forEach(el => { const [kind, m] = el.dataset.sl.split(':'); el.textContent = kind === 'focus' ? Math.round(d.focus[m]) + '%' : kind === 'inv' ? '$' + inv.invest[m].toFixed(1) + 'M' : '$' + inv.explore.toFixed(1) + 'M'; });
    updateTimer();
  }

  function updateTimer() {
    const tb = root.querySelector('#timer'); if (!tb || !S.view) return;
    const ms = timerMs(S.view.timer), n = tb.querySelector('.n'), st0 = S.view.status;
    if (st0 === 'open' && ms != null) { n.textContent = mmss(ms); tb.classList.toggle('low', ms < 30000 && !S.view.timer.paused); tb.lastChild.textContent = S.view.timer.paused ? 'paused' : ''; }
    else { n.textContent = st0 === 'open' ? 'Open' : st0 === 'locked' ? 'Ready' : st0 === 'done' ? 'End' : '--'; tb.classList.remove('low'); tb.lastChild.textContent = ''; }
  }

  // ---------- Compete panel ----------
  function setFocus(m, val) {
    const f = S.draft.focus, others = D.MARKETS.filter(x => x !== m);
    val = clamp(Math.round(val), 0, 100);
    const rest = 100 - val, tot = others.reduce((a, x) => a + f[x], 0);
    f[m] = val;
    if (tot > 0) { let used = 0; others.forEach((x, i) => { f[x] = i === others.length - 1 ? rest - used : Math.round(f[x] / tot * rest); used += f[x]; }); }
    else { f[others[0]] = Math.round(rest / 2); f[others[1]] = rest - f[others[0]]; }
    onDraft();
  }
  function competePanel() {
    const d = S.draft;
    const slider = (ic, label, k, min, max, step, get, set, attrs = {}) => h('div', { class: 'slr' }, ic, h('span', {}, label),
      h('input', { type: 'range', min, max, step, value: get(), 'aria-label': label, ...attrs, oninput: e => set(Number(e.target.value)) }), h('span', { class: 'v', 'data-sl': k }, ''));
    const bIcon = m => h('div', { class: 'bico' }, building(MARKET_BUILDING[m], 40));
    const p = h('div', { class: 'glass drawer', role: 'dialog', 'aria-label': 'Compete' },
      h('div', { class: 'hd' }, h('h2', {}, '1. Compete'), h('button', { class: 'btn', onclick: () => { S.panel = null; render(); } }, 'Done')),
      h('div', { class: 'cashline' }, h('span', { class: 'chip', 'data-cash': 1 }, '')),
      h('div', { class: 'fc' }, ['Cash after', 'Operating', 'Outcomes', 'Share'].map((l, i) => h('div', {}, h('div', { class: 'k' }, l + ' (estimate)'), h('div', { class: 'n', 'data-fc': ['cash', 'op', 'out', 'share'][i] }, '-')))),
      h('div', { class: 'muted' }, 'Where to focus (sums to 100)'),
      ...D.MARKETS.map(m => slider(bIcon(m), MARKET_NAMES[m], 'focus:' + m, 0, 100, 1, () => d.focus[m], v => { setFocus(m, v); root.querySelectorAll('.drawer input[data-f]').forEach(i => (i.value = d.focus[i.dataset.f])); }, { 'data-f': m })),
      h('div', { class: 'muted' }, 'Invest in capacity ($M, arrives next round)'),
      ...D.MARKETS.map(m => slider(bIcon(m), MARKET_NAMES[m], 'inv:' + m, 0, 12, 0.5, () => d.invest[m], v => { d.invest[m] = v; onDraft(); })),
      slider(icon('adaptability' in CAP_NAMES ? 'chronic' : 'chronic', 30), 'Explore (new ideas)', 'exp:x', 0, 8, 0.5, () => d.explore, v => { d.explore = v; onDraft(); }),
      h('div', { class: 'muted', style: { marginTop: '6px' } }, 'Price'),
      h('div', { class: 'sw3' }, ['low', 'standard', 'premium'].map(k => h('button', { class: d.price === k ? 'on' : '', onclick: () => { d.price = k; onDraft(); root.querySelectorAll('.sw3 button').forEach((b, i) => b.classList.toggle('on', ['low', 'standard', 'premium'][i] === k)); } }, icon(k, 26), k[0].toUpperCase() + k.slice(1)))),
      roundNo() >= D.PILOT_ROUND ? h('div', { class: 'row', style: { marginTop: '12px', justifyContent: 'space-between' } }, h('span', { class: 'row' }, icon('specialty', 28), h('span', {}, `Run a pilot unit (${money(D.PILOT_COST, 0)} a round)`)),
        h('button', { class: 'toggle' + (d.pilot ? ' on' : ''), role: 'switch', 'aria-checked': !!d.pilot, 'aria-label': 'Pilot unit', onclick: e => { d.pilot = !d.pilot; e.currentTarget.classList.toggle('on', d.pilot); e.currentTarget.setAttribute('aria-checked', d.pilot); onDraft(); } })) : null);
    return p;
  }

  // ---------- Organization ----------
  function setChange(p, o) {
    const base = baseStar()[p], ch = S.draft.changes;
    if (o === base) delete ch[p];
    else {
      if (roundNo() > 1 && ch[p] == null && Object.keys(ch).length >= D.MAX_CHANGES) { S.msg = `Only ${D.MAX_CHANGES} changes per round.`; render(); return; }
      ch[p] = o;
    }
    S.msg = '';
    onDraft(); render();
  }
  function orgView(view) {
    const n = Object.keys(S.draft.changes).length;
    view.append(h('div', { class: 'pagehead' }, h('small', {}, 'ORGANIZATIONAL DESIGN'), h('h2', {}, 'Organize for your strategy')));
    const sw = h('div', { class: 'card starwrap' }, starSVG());
    if (S.msg) sw.append(h('div', { class: 'chip warn' }, S.msg));
    sw.append(h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '8px' } },
      h('button', { class: 'btn', id: 'undo', disabled: !n, onclick: () => { S.draft.changes = {}; onDraft(); render(); } }, icon('chronic', 18), 'Undo changes'),
      h('button', { class: 'btn gold', id: 'apply', onclick: () => { S.tab = 'board'; render(); } }, n ? `Apply changes (${money(changeCost(st(), legal()))})` : 'Continue to Lead')));
    const choices = h('div', { class: 'card' }, h('h3', {}, 'Five design choices'), roundNo() === 1 ? h('div', { class: 'muted', style: { marginBottom: '6px' } }, 'Founding round: set each point freely.') : h('div', { class: 'muted', style: { marginBottom: '6px' } }, `Up to ${D.MAX_CHANGES} changes this round. Each costs ${money(D.CHANGE_COST)}.`), choiceRows());
    view.append(h('div', { class: 'org' }, h('div', { class: 'col' }, sw), h('div', { class: 'col' }, choices), h('div', { class: 'col' }, capsCard(), workforceCard())));
  }

  // Accessible clickable vector star: five kite segments around a centre disc.
  const STAR_FILL = { strategy: '#EBCB88', structure: '#B5CCDA', people: '#E6BBA9', process: '#BBD0BC', rewards: '#CDBFD7' };
  function starSVG() {
    const t = previewTeam(), pl = planned();
    const cx = 320, cy = 330, R = 285, r = 150;
    const pt = (rad, deg) => [cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180)];
    const svg = h('svg', { viewBox: '0 0 640 650', class: 'star', role: 'group', 'aria-label': 'Star model, five clickable segments' });
    STAR_ORDER.forEach((p, i) => {
      const a = -90 + 72 * i, tip = pt(R, a), l = pt(r, a - 36), rr = pt(r, a + 36);
      const w = t.w[p], tr = t.transitions[p], prog = tr ? tr.progress : 1;
      const queued = S.draft.changes[p] != null, sel = S.sel === p;
      const g = h('g', { class: 'seg-hit', tabindex: 0, role: 'button', 'aria-label': `${POINT_NAMES[p]}: ${D.OPTIONS[p][pl[p]]}${queued ? ', change queued' : ''}`, 'data-point': p,
        onclick: () => { S.sel = p; render(); root.querySelector('.prow2.sel')?.scrollIntoView({ block: 'nearest' }); },
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.sel = p; render(); } } });
      g.append(h('polygon', { points: [tip, l, [cx, cy], rr].map(q => q.join(',')).join(' '), fill: STAR_FILL[p], stroke: sel ? '#183B35' : '#CF9A49', 'stroke-width': sel ? 6 : 3, 'stroke-linejoin': 'round' }));
      const [lx, ly] = pt(R * 0.55 + 6, a);
      g.append(h('text', { x: lx, y: ly - 14, 'text-anchor': 'middle', fill: '#183B35', 'font-size': 24, 'font-family': 'Georgia, serif', 'font-weight': 700 }, POINT_NAMES[p]));
      const full = D.OPTIONS[p][pl[p]], words = full.split(' ');
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && full.length > 14 ? words : [full];
      lines.forEach((ln, k) => g.append(h('text', { x: lx, y: ly + 6 + k * 16, 'text-anchor': 'middle', fill: queued ? '#7a5518' : '#2c443d', 'font-size': 14, 'font-weight': queued ? 700 : 500 }, ln)));
      if (tr || queued) {
        const [bx, by] = pt(R * 0.82, a), C = 2 * Math.PI * 16;
        g.append(h('circle', { cx: bx, cy: by, r: 20, fill: '#FFFDF7', stroke: '#e0d9c4', 'stroke-width': 2 }));
        g.append(h('circle', { cx: bx, cy: by, r: 16, fill: 'none', stroke: queued ? '#CF9A49' : '#3d6b4a', 'stroke-width': 5, 'stroke-dasharray': queued ? '5 4' : `${C * prog} ${C}`, transform: `rotate(-90 ${bx} ${by})` }));
        g.append(h('text', { x: bx, y: by + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#183B35', 'font-weight': 700 }, queued ? 'new' : Math.round(prog * 100) + '%'));
      }
      svg.append(g);
    });
    svg.append(h('circle', { cx, cy, r: 82, fill: '#183B35', stroke: '#CF9A49', 'stroke-width': 4 }));
    svg.append(h('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#fff8e6', 'font-size': 22, 'font-family': 'Georgia, serif', 'font-weight': 700 }, 'THE'));
    svg.append(h('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', fill: '#fff8e6', 'font-size': 22, 'font-family': 'Georgia, serif', 'font-weight': 700 }, 'SYSTEM'));
    return svg;
  }

  // Large tappable option tiles for each point; never a dropdown.
  function choiceRows() {
    const t = previewTeam(), pl = planned(), wrap = h('div', {});
    for (const p of ['strategy', 'structure', 'people', 'process', 'rewards']) {
      const w = t.w[p], inForce = w.indexOf(Math.max(...w));
      const row = h('div', { class: 'prow2' + (S.sel === p ? ' sel' : '') }, h('div', { class: 'nm' }, p === 'process' ? 'Processes' : POINT_NAMES[p], S.draft.changes[p] != null ? h('span', { class: 'chip warn' }, 'Change queued') : null,
        p === 'structure' ? h('button', { class: 'btn helpbtn', 'aria-expanded': !!S.help, onclick: () => { S.help = !S.help; render(); } }, icon('t1', 18), 'See the three') : null));
      if (p === 'structure' && S.help) { const pop = h('div', { class: 'helppop' }, artImg('structures', 'structures'), h('button', { class: 'btn', onclick: () => { S.help = false; render(); } }, 'Close')); row.append(pop); }
      row.append(h('div', { class: 'tiles', role: 'radiogroup', 'aria-label': POINT_NAMES[p] }, D.OPTIONS[p].map((name, o) => h('button', { class: 'tile' + (pl[p] === o ? ' plan' : ''), role: 'radio', 'aria-checked': pl[p] === o, onclick: () => { S.sel = p; setChange(p, o); } },
        icon(OPT_ICON[p][o], 26), name, inForce === o ? h('span', { class: 'now' }, t.transitions[p] ? 'moving from here' : 'in place now') : null))));
      wrap.append(row);
    }
    return wrap;
  }

  function capsCard() {
    const t = previewTeam();
    const cur = capabilities(t, regionId()), est = S.fc?.capabilities;
    const c = h('div', { class: 'card' }, h('h3', {}, 'Capabilities'));
    const bars = h('div', { class: 'capbars' });
    for (const k of D.CAPS) bars.append(h('div', {}, h('div', { class: 'l' }, h('span', {}, CAP_NAMES[k]), h('b', {}, Math.round(cur[k]))), h('div', { class: 'bar' }, h('i', { style: { width: cur[k] + '%' } }), est ? h('b', { style: { left: clamp(est[k], 0, 100) + '%' }, title: 'estimate next round' }) : null)));
    c.append(bars, h('div', { class: 'muted', style: { fontSize: '12px', margin: '6px 0' } }, 'Gold tick: estimate for next round'));
    const pl = planned();
    const fit = interactionsActive({ w: Object.fromEntries(D.POINTS.map(p => [p, onehot(pl[p])])) });
    const bad = fit.filter(f => FIT_LABELS[f.id][1] < 0);
    c.append(h('div', { class: 'chips' }, fit.map(f => { const [lbl, kind] = FIT_LABELS[f.id]; return h('span', { class: 'chip ' + (kind > 0 ? 'good' : kind < 0 ? 'bad' : 'warn') }, icon(kind < 0 ? 'warn' : 'check', 14), lbl); })));
    c.append(h('div', { class: 'friction' }, h('b', {}, 'Potential friction'), h('p', {}, bad.length ? bad.map(f => f.note).join(' ') : 'Nothing in this design is working against itself.')));
    return c;
  }

  // ---------- Boardroom ----------
  function boardView(view) {
    const d = S.draft, b = brief(st(), S.view.teamId), nch = Object.keys(d.changes).length, pr = b.proposal;
    view.append(h('div', { class: 'pagehead' }, h('small', {}, 'CHANGE MANAGEMENT'), h('h2', {}, 'Lead the change')));
    const cards = h('div', { class: 'board' });
    // Card 1: your own change and how you will implement it (only when a star change is queued)
    if (nch) {
      const mine = h('div', { class: 'card' }, h('h3', {}, 'Your change'),
        h('div', { class: 'chips', style: { margin: '6px 0 10px' } }, Object.entries(d.changes).map(([p, o]) => h('span', { class: 'chip warn' }, `${POINT_NAMES[p]}: ${D.OPTIONS[p][o]}`)), h('span', { class: 'chip' }, 'Cost ' + money(changeCost(st(), legal())))),
        h('div', { class: 'role', style: { margin: '4px 0 8px' } }, 'HOW WILL YOU IMPLEMENT IT?'),
        h('div', { class: 'radios', role: 'radiogroup' }, Object.entries(APPROACH_INFO).map(([k, [name, line, ic]]) => h('button', { class: 'radio' + (d.approach === k ? ' on' : ''), role: 'radio', 'aria-checked': d.approach === k, onclick: () => { d.approach = k; onDraft(); render(); } },
          h('span', { class: 'dotr' }), icon(ic, 30), h('span', { class: 'rt' }, h('b', {}, name), h('small', {}, line)), h('span', { class: 'muted' }, D.APPROACHES[k].cost ? money(D.APPROACHES[k].cost) : '$0')))));
      cards.append(mine);
    }
    // Card 2: the staff proposal, with its own response buttons
    const prop = h('div', { class: 'card proposal propcard' });
    if (pr) {
      const [who, role] = SPEAKER[pr.group], card = PROPOSALS.find(x => x.id === pr.id);
      if (roundNo() === 4) prop.append(artImg('resistance', 'bgart'));
      prop.append(h('h3', {}, 'Proposal from staff'), h('div', { class: 'propgrid' },
        h('div', { class: 'leadpic small' }, portrait(pr.group), h('div', { class: 'cap' }, h('div', { class: 'role' }, role.toUpperCase()), h('b', {}, who))),
        h('div', {}, h('div', { class: 'role' }, pr.title.toUpperCase()), h('p', { class: 'quote' }, '“' + pr.line + '”'),
          pr.evidence ? h('span', { class: 'chip ' + (pr.evidence === 'strong' ? 'good' : 'warn') }, icon(pr.evidence === 'strong' ? 'check' : 'warn', 14), pr.evidence === 'strong' ? 'Floor data backs this' : 'Floor data is thin') : h('span')),
      ));
      prop.append(h('div', { class: 'resp' }, [['reject', 'Reject'], ['counter', 'Counteroffer'], ['accept', 'Accept proposal']].map(([k, l]) => h('button', { class: (d.response === k ? 'on ' : '') + k, onclick: () => { d.response = k; onDraft(); render(); } }, l, h('small', {}, card?.[k]?.cost ? money(card[k].cost) : '$0')))));
    } else {
      prop.append(h('h3', {}, 'Proposal from staff'), h('div', { class: 'muted', style: { padding: '20px 0' } }, 'No proposal on the table this round.'));
    }
    cards.append(prop);
    if (!nch) cards.append(h('div', { class: 'card' }, h('h3', {}, 'Your change'), h('div', { class: 'row', style: { padding: '14px 0' } }, icon('check', 28), h('span', { class: 'muted' }, 'No star change is queued. Pick one in Organize to choose an approach.'))));
    const sum = h('div', { class: 'card', style: { gridColumn: '1/-1' } }, h('h3', {}, 'Your plan'),
      h('div', { class: 'sumrow' }, building('clinic', 36), h('div', { class: 'seg', style: { flex: 1 }, 'data-live': 'seg' }), h('span', { 'data-live': 'compsub' })),
      h('div', { class: 'sumrow' }, icon('trust', 24), h('span', { 'data-live': 'orgsub' }), h('span', { 'data-live': 'orgdots', class: 'row' })),
      h('div', { class: 'sumrow' }, icon('mandate', 24), h('span', { 'data-live': 'leadsub' })),
      h('div', { class: 'fc' }, ['Cash after', 'Operating', 'Outcomes', 'Share'].map((l, i) => h('div', {}, h('div', { class: 'k' }, l + ' (estimate)'), h('div', { class: 'n', 'data-fc': ['cash', 'op', 'out', 'share'][i] }, '-')))),
      h('div', { style: { marginTop: '14px', display: 'flex', justifyContent: 'center' } }, submitBox()));
    cards.append(sum);
    view.append(cards);
  }
  function workforceCardBody() {
    const t = previewTeam(), inf = influence(t);
    return h('div', { class: 'wf' }, D.GROUPS.map(g => {
      const tr = t.trust[g];
      return h('div', { class: 'p' }, portrait(g), h('div', { class: 'gname' }, GROUP_NAMES[g]),
        h('div', { class: 'gline' }, h('span', {}, 'Trust'), h('b', {}, Math.round(tr))),
        h('div', { class: 'gauge', title: 'Trust' }, h('i', { style: { width: tr + '%', background: tr < 40 ? 'var(--terra)' : tr < 60 ? 'var(--gold)' : 'var(--sage)' } })),
        h('div', { class: 'gline' }, h('span', {}, 'Influence'), h('b', {}, Math.round(inf[g] * 100) + '%')));
    }));
  }
  function workforceCard() { return h('div', { class: 'card' }, h('h3', {}, 'Workforce'), workforceCardBody()); }

  // ---------- Create Your Network wizard (round 1) ----------
  function wizard() {
    const steps = ['Network name', 'Archetype', 'Region', 'Confirm'];
    const d = S.draft, back = S.wiz > 0 ? h('button', { class: 'btn', onclick: () => { S.wiz--; render(); } }, 'Back') : null;
    const body = h('div', { class: 'wizbody' });
    if (S.wiz === 0) {
      body.append(h('div', { class: 'row', style: { gap: '18px', margin: '20px 0' } }, hexEmblem(S.view.name, regionId(), 88), h('div', {}, h('div', { class: 'muted' }, 'Network name'), h('div', { class: 'serif', style: { fontSize: '44px' } }, S.view.name))));
    } else if (S.wiz === 1) {
      const row = h('div', { class: 'archs' });
      for (const [k, a] of Object.entries(D.ARCHETYPES)) {
        const mx = Math.max(...Object.values(a.capacity));
        row.append(h('button', { class: 'arch' + (d.archetype === k ? ' on' : ''), onclick: () => { d.archetype = k; d.changes = {}; onDraft(); render(); } },
          emblem(k, 52), h('b', {}, a.name), h('small', { class: 'muted' }, ARCH_TAG[k]), h('div', { class: 'minibars' }, D.MARKETS.map(m => h('i', { style: { height: a.capacity[m] / mx * 100 + '%' }, title: MARKET_NAMES[m] }))), h('small', { class: 'muted' }, 'Primary · Specialty · Chronic')));
      }
      body.append(row);
    } else if (S.wiz === 2) {
      const reg = D.REGIONS[regionId()], sc = regionScene(regionId(), 'wizscene');
      body.append(h('div', { class: 'wizregion' }, sc, h('div', { class: 'chip', style: { position: 'absolute', right: '12px', bottom: '12px', fontSize: '16px' } }, icon('pin', 16), 'Assigned by your instructor: ' + reg.name)));
    } else {
      const a = D.ARCHETYPES[d.archetype];
      body.append(h('div', { class: 'row', style: { gap: '18px', margin: '16px 0' } }, hexEmblem(S.view.name, regionId(), 80), h('div', {}, h('div', { class: 'serif', style: { fontSize: '40px' } }, S.view.name), h('div', {}, a.name + ' in ' + D.REGIONS[regionId()].name), h('div', { class: 'muted' }, 'You can shape the star next.'))));
    }
    const last = S.wiz === 3;
    const next = h('button', { class: 'btn gold big', id: 'wiznext', onclick: () => { if (last) { store.set(wizKey(), true); S.tab = 'org'; render(); } else { S.wiz++; render(); } } }, last ? 'Create Network' : 'Next');
    return h('div', { class: 'overlay' }, h('div', { class: 'glass wiz' }, h('div', { class: 'wizhead' }, h('h2', {}, 'Create Your Network'),
      h('div', { class: 'wsteps' }, steps.map((s, i) => h('span', { class: 'ws' + (i === S.wiz ? ' now' : i < S.wiz ? ' done' : '') }, h('i', {}, i < S.wiz ? '✓' : i + 1), s)))), body, h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '16px' } }, back || h('span'), next)));
  }

  // ---------- results ----------
  const APPROACH_WORDS = { mandate: 'executive mandate', consult: 'employee consultation', joint: 'joint redesign' };
  function plainNote(n) {
    const m = /^(\w+): (.+) \((mandate|consult|joint)\)$/.exec(n);
    if (m) return `You changed ${POINT_NAMES[m[1]] || m[1][0].toUpperCase() + m[1].slice(1)} to ${m[2]} by ${APPROACH_WORDS[m[3]]}.`;
    return n[0].toUpperCase() + n.slice(1);
  }
  function takeaways(hh, prev) {
    const out = [];
    const m = [['Financial health', hh.cash - hh.startCash, v => money(v)], ['Patient outcomes', prev ? hh.outcome - prev.outcome : null, v => v.toFixed(1) + ' points'],
      ['Workforce trust', prev ? hh.workforceTrust - prev.workforceTrust : null, v => v.toFixed(1) + ' points'], ['Market share', prev ? (hh.marketShare - prev.marketShare) * 100 : null, v => v.toFixed(1) + ' points']].filter(x => x[1] != null);
    const sorted = [...m].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    if (sorted[0] && Math.abs(sorted[0][1]) > 0.05) out.push(`${sorted[0][0]} ${sorted[0][1] > 0 ? 'rose' : 'fell'} by ${sorted[0][2](Math.abs(sorted[0][1]))}, the biggest move this round.`);
    const rest = sorted.slice(1).find(x => Math.sign(x[1]) !== Math.sign(sorted[0]?.[1] || 0) && Math.abs(x[1]) > 0.5);
    if (rest) out.push(`${rest[0]} went the other way and ${rest[1] > 0 ? 'rose' : 'fell'} by ${rest[2](Math.abs(rest[1]))}.`);
    if (!prev) out.push(`You served ${Math.round(Object.values(hh.served).reduce((a, b) => a + b, 0))}k patients and hold ${Math.round(hh.marketShare * 100)}% of the region.`);
    for (const n of (hh.notes || []).slice(0, 3)) out.push(plainNote(n));
    if (hh.completed?.length) out.push(`Change finished: ${hh.completed.map(c => POINT_NAMES[c]).join(', ')}.`);
    return out.slice(0, 4);
  }
  function resultsOverlay() {
    const t = me(), hh = t.history.at(-1), prev = t.history.at(-2);
    const box = h('div', { class: 'glass res' }, h('div', { class: 'reshead' }, regionScene(regionId(), 'resscene'), h('h2', {}, `Round ${hh.round} Results`)),
      hh.missing ? h('div', { class: 'chip warn', style: { marginTop: '6px' } }, 'No decision came in. Defaults were used.') : null);
    const items = [['Financial Health', hh.cash, v => money(v), prev?.cash, 'financial'], ['Patient Outcomes', hh.outcome, v => Math.round(v) + '/100', prev?.outcome, 'outcomes'],
      ['Workforce Trust', hh.workforceTrust, v => Math.round(v) + '/100', prev?.workforceTrust, 'trust'], ['Market Share', hh.marketShare * 100, v => v.toFixed(0) + '%', prev ? prev.marketShare * 100 : null, 'share']];
    const grid = h('div', { class: 'resgrid' });
    for (const [k, to, fmt, pv, ic] of items) {
      const n = h('div', { class: 'n' }, fmt(0));
      grid.append(h('div', { class: 'rbox' }, h('div', { class: 'k row' }, icon(ic, 18), k), n, h('div', { class: 'delta ' + (pv == null ? 'flat' : to > pv + 0.05 ? 'up' : to < pv - 0.05 ? 'down' : 'flat'), style: { fontSize: '14px' } }, pv == null ? 'First round' : (to >= pv ? '▲ ' : '▼ ') + fmt(Math.abs(to - pv)).replace('/100', ''))));
      setTimeout(() => tween(n, to, { fmt, ms: 1100 }), 50);
    }
    box.append(grid);
    const tk = h('div', { class: 'takeaway' }, h('h3', {}, 'Key Takeaways'), h('ul', {}, takeaways(hh, prev).map(x => h('li', {}, x))));
    box.append(tk, h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, h('button', { class: 'btn gold big', autofocus: true, onclick: () => { store.set(`sys:seen:${key()}:${S.view.teamId}`, S.overlay.len); S.overlay = null; refresh(); } }, S.view.status === 'done' ? 'See final results' : 'Next Round')));
    return h('div', { class: 'overlay' }, box);
  }

  function finalOverlay() {
    const dg = diagnosis(st(), S.view.teamId);
    const rk = S.view.final?.rankings?.find(x => x.id === S.view.teamId);
    const s = dg.score;
    const box = h('div', { class: 'glass res' }, h('h2', {}, 'Final results'));
    if (rk) box.append(h('div', { class: 'row', style: { margin: '8px 0 14px' } }, h('span', { class: 'chip good', style: { fontSize: '18px' } }, `#${rk.regionRank} in ${D.REGIONS[rk.region].name}`), h('span', { class: 'chip warn', style: { fontSize: '18px' } }, `#${rk.classRank} in class`)));
    for (const [k, v] of [['Financial', s.financial], ['Outcomes', s.outcomes], ['Resilience', s.resilience]]) box.append(h('div', { class: 'scorebar' }, h('span', {}, k), h('div', { class: 'bar' }, h('i', { style: { width: v + '%' } })), h('b', {}, Math.round(v))));
    box.append(h('div', { class: 'row', style: { fontSize: '22px', margin: '8px 0' } }, h('span', { class: 'muted' }, 'Total'), h('span', { class: 'serif', style: { fontSize: '44px', color: 'var(--gold)' } }, Math.round(s.total)), s.capped ? h('span', { class: 'chip bad' }, 'Capped by outcomes floor') : null));
    box.append(h('div', { class: 'notes' }, dg.lines.map(l => h('div', { class: 'note' }, l)), dg.fit.map(l => h('div', { class: 'note' }, l))));
    box.append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn gold', onclick: () => { S.finalSeen = true; S.overlay = null; render(); } }, 'Close')));
    return h('div', { class: 'overlay' }, box);
  }

  refresh();
  return { refresh };
}
