// Shared UI helpers: element builder, icons, region scenes, portraits, number tween.
import { REGIONS } from '../engine/data.js';

export const NS = 'http://www.w3.org/2000/svg';
export function h(tag, attrs = {}, ...kids) {
  const svg = ['svg', 'g', 'path', 'circle', 'line', 'text', 'rect', 'polygon', 'defs', 'linearGradient', 'stop', 'ellipse', 'tspan', 'radialGradient', 'title'].includes(tag);
  const e = svg ? document.createElementNS(NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const money = (x, d = 1) => (x < 0 ? '-$' : '$') + Math.abs(x).toFixed(d) + 'M';
export const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '-' : '') + Math.abs(x).toFixed(d);

export const ROUND_TITLES = ['Founding', 'Expansion', 'Disruption', 'Resistance', 'Reckoning'];
export const MARKET_NAMES = { primary: 'Primary care', specialty: 'Specialty care', chronic: 'Chronic care' };
export const CAP_NAMES = { efficiency: 'Efficiency', expertise: 'Expertise', coordination: 'Coordination', responsiveness: 'Responsiveness', scalability: 'Scalability', adaptability: 'Adaptability' };
export const POINT_NAMES = { strategy: 'Strategy', structure: 'Structure', people: 'People', process: 'Process', rewards: 'Rewards' };
export const GROUP_NAMES = { physicians: 'Physicians', nurses: 'Nurses', admins: 'Administrators', coordinators: 'Care coordinators' };
export const FIT_LABELS = {
  lean_machine: ['Lean machine', 1], care_team: ['Care team', 1], turf_war: ['Two bosses', -1], star_clinic: ['Star clinic', 1],
  flex_bench: ['Flex bench', 1], fast_lanes: ['Fast lanes', 0], volume_vs_teams: ['Mixed signals', -1],
};

// ---------- icons (24x24 line icons) ----------
const P = {
  primary: 'M3 11l9-7 9 7v9H3z M12 10v6 M9 13h6',
  specialty: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z M7 12h3l1.5-3 2 5 1.5-2h2',
  chronic: 'M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5',
  financial: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.100 0-2.100-.5-2.500-1.500 M12 6v1.500 M12 16.500V18',
  outcomes: 'M12 21s-8-5-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 6-8 11-8 11z M12 8v6 M9 11h6',
  trust: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20c0-3.500 2.700-6 6-6s6 2.500 6 6 M12 20c0-3 2-5.500 4.500-5.500S21 17 21 20',
  share: 'M12 3a9 9 0 1 0 9 9h-9z M14 3.200A9 9 0 0 1 20.800 10H14z',
  low: 'M12 4v14 M6 12l6 6 6-6',
  standard: 'M5 12h14',
  premium: 'M12 3l2.800 5.800 6.200.9-4.500 4.400 1.100 6.200L12 17.300 6.400 20.300l1.100-6.200L3 9.700l6.200-.9z',
  mandate: 'M3 11v3h3l7 4V7L6 11z M16 9c1.500 1 1.500 5 0 6 M19 6c3 2.500 3 9.500 0 12',
  consult: 'M4 5h16v10H9l-5 4z M8 9h8 M8 12h5',
  joint: 'M9 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M15 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  check: 'M5 12l5 5 9-10',
  warn: 'M12 4l9 16H3z M12 10v4 M12 17v.5',
  pin: 'M12 21s-6-6.500-6-11a6 6 0 0 1 12 0c0 4.500-6 11-6 11z M12 7.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z',
  // star options
  s0: 'M4 16l5-5 4 3 7-8 M16 6h4v4', s1: 'M5 19l3-11 4 5 4-5 3 11z', s2: 'M9 9a3 3 0 1 0 0 6h3 M15 9a3 3 0 1 1 0 6h-3 M9 12h6',
  t0: 'M5 4h14v4H5z M5 10h14v4H5z M5 16h14v4H5z', t1: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z', t2: 'M4 4h16v16H4z M4 12h16 M12 4v16 M4 4l16 16',
  p0: 'M8 8a3 3 0 1 0 0-.1 M3 20c0-4 2.500-6 5-6s5 2 5 6 M15 6h6 M15 10h6 M15 14h6', p1: 'M12 4l9 4-9 4-9-4z M7 11v5c0 1.500 2.200 3 5 3s5-1.500 5-3v-5', p2: 'M5 8h11l-3-3 M19 16H8l3 3',
  r0: 'M4 18h4v-4H4z M10 18h4V9h-4z M16 18h4V4h-4z', r1: 'M12 3l3 6 6 1-4.500 4.500 1 6.500L12 18l-5.500 3 1-6.500L3 10l6-1z', r2: 'M7 9a2.500 2.500 0 1 0 0-.1 M17 9a2.500 2.500 0 1 0 0-.1 M12 12a2.500 2.500 0 1 0 0-.1 M3 20h18',
  q0: 'M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5', q1: 'M8 6a4 4 0 1 0 0 .1 M4 20c0-4 2-6 4-6 M14 8l2 2 4-4 M14 16l2 2 4-4', q2: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12h8 M12 8v8',
  generic: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8v5 M12 16v.5',
  snow: 'M12 3v18 M4 7.500l16 9 M20 7.500l-16 9', nurse: 'M12 4v16 M4 12h16 M8 8h8v8H8z', clinic: 'M4 20V8l8-4 8 4v12z M12 10v6 M9 13h6',
  raid: 'M4 4l16 16 M20 4L4 20', merge: 'M4 5l8 7v7 M20 5l-8 7', gavel: 'M5 18l7-7 M9 6l6 6 M14 3l7 7 M3 21h9',
  houses: 'M2 20v-8l5-4 5 4v8z M12 20v-6l5-4 5 4v6z', crane: 'M6 20V4h8 M6 8h12 M14 8v6 M12 14h4v3h-4z', badge: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  grant: 'M3 8h18v10H3z M12 11v4 M3 8l9-4 9 4', strike: 'M4 21V4 M4 5h13l-3 4 3 4H4', boiler: 'M8 4h8v16H8z M8 9h8 M8 14h8',
};
export function icon(name, size = 22, cls = '') {
  const s = h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'ico ' + cls, 'aria-hidden': 'true' });
  s.append(h('path', { d: P[name] || P.generic }));
  return s;
}

// ---------- number tween ----------
export function tween(el, to, { from = 0, ms = 900, fmt = v => v.toFixed(1) } = {}) {
  const t0 = performance.now();
  const step = t => {
    const p = clamp((t - t0) / ms, 0, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- image with SVG/CSS fallback ----------
// The fallback always renders underneath; a real PNG fades in over it when it loads.
export function withImage(src, fallback, cls = '') {
  const box = h('div', { class: 'imgbox ' + cls, style: { background: '#d9d4c0' } });
  const img = new Image();
  img.alt = ''; img.className = 'imgtop'; img.style.opacity = 1;
  img.onload = () => box.append(img);
  img.onerror = () => box.append(fallback);       // illustrated fallback only when the file is missing
  img.src = src;
  return box;
}

// ---------- region scenes ----------
const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
function rnd(seed) { let a = seed; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); }
const SCENES = {
  mountain() {
    const r = rnd(7); let s = sky('g', '#1b3a4a', '#d6b88a') + '<rect width="1600" height="900" fill="url(#g)"/>';
    s += '<circle cx="1180" cy="230" r="70" fill="#f3d9a0" opacity=".85"/>';
    const ridge = (y, amp, col, seed) => { const q = rnd(seed); let d = `M0 900 L0 ${y}`; for (let x = 0; x <= 1600; x += 100) d += ` L${x} ${y - q() * amp}`; return `<path d="${d} L1600 900 Z" fill="${col}"/>`; };
    s += ridge(520, 260, '#6d8795', 3) + ridge(600, 220, '#4d6f6b', 9) + ridge(700, 150, '#2f5248', 21) + ridge(790, 90, '#1f3a32', 5);
    for (let i = 0; i < 46; i++) { const x = r() * 1600, y = 760 + r() * 130, k = 0.6 + r() * 0.9; s += `<path d="M${x} ${y} l${-14 * k} ${40 * k} h${28 * k}z M${x} ${y - 24 * k} l${-12 * k} ${34 * k} h${24 * k}z" fill="#14281f"/>`; }
    s += '<path d="M300 760 q200 -40 420 10 t600 -20" stroke="#cdb98d" stroke-width="5" fill="none" opacity=".5"/>';
    return s;
  },
  metro() {
    const r = rnd(11); let s = sky('g', '#1c2140', '#8a7aa0') + '<rect width="1600" height="900" fill="url(#g)"/>';
    s += '<circle cx="300" cy="200" r="46" fill="#efe6d8" opacity=".8"/>';
    for (const [col, base, mh, op] of [['#3a3f66', 700, 380, 1], ['#262a4a', 780, 440, 1]]) {
      for (let x = -20; x < 1600; x += 70 + r() * 40) { const w = 60 + r() * 50, ht = 120 + r() * mh; s += `<rect x="${x}" y="${base - ht}" width="${w}" height="${ht + 200}" fill="${col}" opacity="${op}"/>`; for (let wy = base - ht + 14; wy < base - 8; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r() < 0.38) s += `<rect x="${wx}" y="${wy}" width="7" height="10" fill="#f0cf86" opacity=".75"/>`; }
    }
    s += '<rect y="800" width="1600" height="100" fill="#14162b"/><path d="M0 850 H1600" stroke="#d8b45c" stroke-width="3" stroke-dasharray="40 30" opacity=".5"/>';
    return s;
  },
  sunbelt() {
    const r = rnd(5); let s = sky('g', '#e7a15a', '#f7dba0') + '<rect width="1600" height="900" fill="url(#g)"/>';
    s += '<circle cx="1050" cy="520" r="150" fill="#fff2c9" opacity=".9"/>';
    const hill = (y, amp, col, seed) => { const q = rnd(seed); let d = `M0 900 L0 ${y}`; for (let x = 0; x <= 1600; x += 160) d += ` Q${x + 80} ${y - q() * amp} ${x + 160} ${y}`; return `<path d="${d} L1600 900 Z" fill="${col}"/>`; };
    s += hill(600, 90, '#c9855a', 2) + hill(690, 70, '#a8683f', 8);
    s += '<rect y="760" width="1600" height="140" fill="#7e4d30"/>';
    for (let i = 0; i < 16; i++) { const x = 40 + i * 100 + r() * 40, w = 50 + r() * 30; s += `<rect x="${x}" y="${700 - w * 0.4}" width="${w}" height="${w * 0.5}" fill="#f1dfc2"/><path d="M${x - 5} ${700 - w * 0.4} h${w + 10} l-8 -14 h${-w + 6}z" fill="#b5532f"/>`; }
    for (const x of [140, 560, 1380]) s += `<path d="M${x} 760 v-120 M${x} 700 h-26 v-40 M${x} 680 h26 v-34" stroke="#3f6b3a" stroke-width="14" stroke-linecap="round" fill="none"/>`;
    s += '<path d="M0 840 H1600" stroke="#f0d6a8" stroke-width="4" stroke-dasharray="34 24" opacity=".6"/>';
    return s;
  },
  lakes() {
    const r = rnd(13); let s = sky('g', '#58616f', '#c9c2cf') + '<rect width="1600" height="900" fill="url(#g)"/>';
    s += '<path d="M0 560 Q400 520 800 550 T1600 540 V900 H0Z" fill="#4c6577"/>';
    for (let y = 600; y < 900; y += 26) s += `<path d="M0 ${y} q100 -10 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0" stroke="#9ab3c4" stroke-width="2" fill="none" opacity="${0.15 + (y - 600) / 1500}"/>`;
    s += '<path d="M0 560 L0 470 Q300 440 600 480 T1200 470 L1600 450 V560Z" fill="#3f4a45"/>';
    for (let i = 0; i < 9; i++) { const x = 100 + i * 170 + r() * 50, ht = 90 + r() * 120; s += `<rect x="${x}" y="${480 - ht}" width="${46 + r() * 30}" height="${ht}" fill="#554a4e"/>`; if (i % 3 === 0) s += `<rect x="${x + 12}" y="${480 - ht - 80}" width="16" height="80" fill="#6a5a58"/><circle cx="${x + 20}" cy="${480 - ht - 90}" r="${22}" fill="#cfcad0" opacity=".5"/>`; }
    s += '<path d="M1180 640 l40 -60 l40 60z" fill="#e6e1d6"/><path d="M1150 640 h140" stroke="#222" stroke-width="3"/>';
    return s;
  },
};
export function regionSceneSVG(rid) {
  const wrap = h('div', { class: 'scene-svg' });
  wrap.innerHTML = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${REGIONS[rid].name}">${SCENES[rid]()}</svg>`;
  return wrap;
}
export function regionScene(rid, cls = '') {
  return withImage(`assets/regions/${rid}.jpg`, regionSceneSVG(rid), 'scene ' + cls);
}

// ---------- portraits ----------
const PORTRAIT = {
  physicians: { bg: '#3d5a80', skin: '#e0b48c', hair: '#4a3b2f', cloth: '#f2f2f2', extra: 'steth' },
  nurses: { bg: '#4f8a7b', skin: '#c68863', hair: '#2b2220', cloth: '#7ac7c4', extra: 'cap' },
  admins: { bg: '#7a6a8f', skin: '#f0c9a4', hair: '#8a8a8a', cloth: '#2f3a52', extra: 'tie' },
  coordinators: { bg: '#b0793f', skin: '#8d5a3b', hair: '#1c1512', cloth: '#d8b45c', extra: 'tablet' },
};
export function portraitSVG(group) {
  const p = PORTRAIT[group] || PORTRAIT.nurses;
  let extra = '';
  if (p.extra === 'steth') extra = '<path d="M38 112 q-6 28 22 28 q28 0 22 -28" stroke="#222" stroke-width="3" fill="none"/><circle cx="60" cy="142" r="5" fill="#999"/>';
  if (p.extra === 'cap') extra = '<path d="M38 36 h44 l-4 -12 h-36z" fill="#fff"/><path d="M56 28 h8 M60 24 v8" stroke="#c0392b" stroke-width="2"/>';
  if (p.extra === 'tie') extra = '<path d="M56 108 l4 6 4 -6 l3 30 l-7 6 l-7 -6z" fill="#b0793f"/>';
  if (p.extra === 'tablet') extra = '<rect x="68" y="118" width="34" height="26" rx="3" fill="#222" stroke="#aaa"/><rect x="71" y="121" width="28" height="20" fill="#6fbf8e" opacity=".7"/>';
  const d = h('div', { class: 'portrait-svg' });
  d.innerHTML = `<svg viewBox="0 0 120 150" role="img" aria-label="${GROUP_NAMES[group]}"><rect width="120" height="150" fill="${p.bg}"/><circle cx="60" cy="150" r="52" fill="${p.cloth}"/><ellipse cx="60" cy="68" rx="25" ry="29" fill="${p.skin}"/><path d="M33 64 q2 -34 27 -34 q25 0 27 34 q-10 -16 -27 -16 q-17 0 -27 16z" fill="${p.hair}"/><circle cx="50" cy="70" r="2.500" fill="#222"/><circle cx="70" cy="70" r="2.500" fill="#222"/><path d="M52 83 q8 6 16 0" stroke="#7a3b2e" stroke-width="2.500" fill="none" stroke-linecap="round"/>${extra}</svg>`;
  return d;
}
export const portrait = (group, cls = '') => withImage(`assets/portraits/${group}.jpg`, portraitSVG(group), 'portrait ' + cls);

// ---------- emblems ----------
const EMB = { access: ['#4f7a6a', 'M12 3l8 4v6c0 4-3.500 7-8 8-4.500-1-8-4-8-8V7z M8 12h8 M12 8v8'], excellence: ['#7a5a6b', 'M12 3l2.800 5.800 6.200.9-4.500 4.400 1.100 6.200L12 17.300 6.400 20.300l1.100-6.200L3 9.700l6.200-.9z'], integrated: ['#5a5f8f', 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M12 4v5 M12 15v5 M4 12h5 M15 12h5 M6.500 6.500l3 3 M14.500 14.500l3 3'] };
export function emblem(arch, size = 56) {
  const [col, d] = EMB[arch] || EMB.access;
  const fb = h('div', { class: 'emblem-svg', style: { width: size + 'px', height: size + 'px', background: col } }, h('svg', { viewBox: '0 0 24 24', width: size * 0.6, height: size * 0.6, fill: 'none', stroke: '#f6efe0', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, h('path', { d })));
  const b = withImage(`assets/emblems/${arch}.png`, fb, 'emblem');
  b.style.width = size + 'px'; b.style.height = size + 'px';
  return b;
}

// ---------- timer text ----------
export function timerMs(t) {
  if (!t) return null;
  if (t.paused) return t.remainingMs;
  return Math.max(0, t.endsAt - Date.now());
}
export function mmss(ms) {
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
export function stepper(round, rounds = 5) {
  return h('div', { class: 'stepper', 'aria-label': `Round ${Math.min(round, rounds)} of ${rounds}` },
    Array.from({ length: rounds }, (_, i) => h('span', { class: 'dot' + (i + 1 < round ? ' done' : i + 1 === round ? ' now' : '') })));
}
export function pos(id, i = 0) {
  let x = 2166136261; for (const c of id + i) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); }
  const a = (x >>> 0) / 4294967296, b = (Math.imul(x, 2654435761) >>> 0) / 4294967296;
  return [a, b];
}

// ---------- art helpers ----------
export function logo(width = 260) {
  const img = h('img', { src: 'assets/brand/logo.png', alt: 'The System: A Healthcare Strategy Simulation', style: { width: '100%', display: 'block' } });
  const plate = h('div', { class: 'logoplate', style: { width: width + 'px', maxWidth: '100%' } }, img);
  img.onerror = () => { plate.className = 'logo'; img.replaceWith(document.createTextNode('THE SYSTEM')); };
  return plate;
}
export function building(kind, size = 64) {
  const img = h('img', { src: `assets/buildings/${kind}.png`, alt: '', style: { width: size + 'px', height: 'auto', objectFit: 'contain' } });
  img.onerror = () => img.remove();
  return img;
}
export const MARKET_BUILDING = { primary: 'clinic', specialty: 'specialty', chronic: 'chronic' };
// Hex shield emblem drawn in SVG: a symbol (mountain, cross, star, wave, sun, tower) on a team colour.
const EMB_COL = ['#1f4e5f', '#7a2f3a', '#2f6b4a', '#b0793f', '#3d5a8a', '#5a4a7a'];
const EMB_SYM = [
  '<path d="M8 29 L16 15 L21 23 L25 18 L32 29 Z" fill="#fff6dc"/>',
  '<path d="M17 12h6v7h7v6h-7v7h-6v-7h-7v-6h7z" fill="#fff6dc"/>',
  '<path d="M20 11l2.600 5.500 6 .8-4.400 4.200 1.100 6L20 24.500 14.700 27.500l1.100-6L11.400 17.300l6-.8z" fill="#fff6dc"/>',
  '<path d="M9 20q3-4 6 0t6 0t6 0 M9 27q3-4 6 0t6 0t6 0" stroke="#fff6dc" stroke-width="2.600" fill="none" stroke-linecap="round"/>',
  '<circle cx="20" cy="21" r="5" fill="#fff6dc"/><path d="M20 11v3 M20 28v3 M10 21h3 M27 21h3 M13 14l2 2 M27 14l-2 2" stroke="#fff6dc" stroke-width="2.400" stroke-linecap="round"/>',
  '<path d="M12 31V18h6v13z M21 31V12h7v19z M10 31h20" fill="#fff6dc" stroke="#fff6dc" stroke-width="1.500"/>',
];
export function hexEmblem(name, region, size = 40) {
  let x = 7; for (const c of String(name)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const col = EMB_COL[x % EMB_COL.length], sym = EMB_SYM[(x >>> 3) % EMB_SYM.length];
  const d = h('span', { class: 'hex', role: 'img', 'aria-label': name + ' emblem', style: { width: size + 'px', height: size * 1.12 + 'px', display: 'inline-block', flex: 'none' } });
  d.innerHTML = `<svg viewBox="0 0 40 45" width="100%" height="100%" aria-hidden="true"><path d="M20 1.500 38 11v23L20 43.500 2 34V11z" fill="${col}" stroke="#CF9A49" stroke-width="2.500"/>${sym}</svg>`;
  return d;
}
