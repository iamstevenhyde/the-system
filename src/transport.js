// Pages pick the transport: ?local=1 (or a remembered local choice) => LocalNet, otherwise Supabase.
import { LocalNet } from './net.js';
import { SupabaseNet } from './net-supabase.js';

export function isLocal() {
  const q = new URLSearchParams(location.search);
  if (q.get('local') === '1') { try { sessionStorage.setItem('sys:local', '1'); } catch { /* */ } return true; }
  if (q.get('local') === '0') { try { sessionStorage.removeItem('sys:local'); } catch { /* */ } return false; }
  try { return sessionStorage.getItem('sys:local') === '1'; } catch { return false; }
}
export const makeNet = () => (isLocal() ? new LocalNet() : new SupabaseNet());
// Links between pages carry the choice along.
export const withLocal = url => (isLocal() ? url + (url.includes('?') ? '&' : '?') + 'local=1' : url);
