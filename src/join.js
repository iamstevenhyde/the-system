// Join screen shared by index.html and team.html: the class code plus a team name, nothing else.
import { h, regionScene, logo } from './ui.js';
import { makeNet, withLocal } from './transport.js';

export function mountJoin(root, { staff = true } = {}) {
  const net = makeNet(), q = new URLSearchParams(location.search);
  const code = h('input', { class: 'code', maxlength: 5, placeholder: 'GAME CODE', value: (q.get('code') || '').toUpperCase(), 'aria-label': 'Game code', autocomplete: 'off' });
  const name = h('input', { placeholder: 'Team name', maxlength: 40, value: q.get('name') || '', 'aria-label': 'Team name', autocomplete: 'off' });
  const err = h('div', { class: 'err', role: 'alert' });
  const tokKey = (c, n) => 'sys:tok:' + c + ':' + n.trim().toLowerCase();
  async function go() {
    err.textContent = '';
    const c = code.value.trim().toUpperCase(), n = name.value.trim();
    try {
      let saved = null; try { saved = localStorage.getItem(tokKey(c, n)); } catch { /* */ }
      const r = await net.join(c, n, saved);
      try { localStorage.setItem(tokKey(c, n), r.teamToken); } catch { /* */ }
      location.href = withLocal(`team.html?code=${r.code}&t=${encodeURIComponent(r.teamToken)}`);
    } catch (e) { err.textContent = e.message; }
  }
  [code, name].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
  const bg = regionScene('mountain'); bg.style.cssText = 'position:absolute;inset:0;filter:brightness(.8)';
  root.replaceChildren(h('div', { class: 'center', style: { position: 'absolute', inset: 0 } }, bg,
    h('div', { class: 'glass joinbox' }, logo(380), h('div', { class: 'muted', style: { textAlign: 'center' } }, 'Type the code on the screen and a name for your team.'), code, name,
      h('button', { class: 'btn gold big', id: 'join', onclick: go, style: { justifyContent: 'center' } }, 'Join'), err,
      staff ? h('div', { class: 'row', style: { justifyContent: 'center', gap: '24px' } },
        h('a', { class: 'btn', href: withLocal('host.html'), style: { minHeight: '34px' } }, 'Instructor'),
        h('a', { class: 'btn', href: withLocal('solo.html'), style: { minHeight: '34px' } }, 'Play solo')) : null)));
}
