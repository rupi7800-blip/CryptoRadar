'use client';
/** Motore di avvisi lato browser (versione statica): regole, eventi e notifiche restano sul dispositivo. */
import { lsGet, lsSet } from './local';
import { dataUrl, withBase } from './mode';

export type CRule = { id: number; type: string; target: string | null; threshold: number | null; cooldown_min: number; push: number; enabled: number; last_fired: string | null };
export type CEvent = { id: number; title: string; body: string | null; url: string | null; read: number; created_at: string; key: string };
type NewsLite = { id: number; t: string; ti: string | null; c: string[]; k: string[]; f: string[]; b: boolean; st: string; sid: string; scat: string; cl: number };
type CoinLite = { id: string; idSource: string; symbol: string; price: number | null; ch24h: number | null; volume24h: number | null };

const RK = 'cr_rules', EK = 'cr_events', VK = 'cr_prev_vol';
export const getRules = () => lsGet<CRule[]>(RK, []);
export const setRules = (r: CRule[]) => lsSet(RK, r);
export const getEvents = () => lsGet<CEvent[]>(EK, []);
export const setEvents = (e: CEvent[]) => { lsSet(EK, e.slice(0, 100)); window.dispatchEvent(new Event('cr-events')); };

const usd = (n: number | null) => (n == null ? 'n.d.' : '$' + n.toLocaleString('it-IT', { maximumFractionDigits: n >= 1 ? 2 : 6 }));

async function notify(title: string, body: string, url: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: withBase('/icons/icon-192.png'), data: { url: withBase(url) } });
    else new Notification(title, { body });
  } catch { /* */ }
}

export async function evaluateClient() {
  const rules = getRules().filter((r) => r.enabled);
  if (!rules.length) return 0;
  const [m, n] = await Promise.all([
    fetch(dataUrl('market.json'), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    fetch(dataUrl('news.json'), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
  ]);
  const coins: CoinLite[] = m?.coins ?? [];
  const news: NewsLite[] = n?.items ?? [];
  const prevVol = lsGet<Record<string, number>>(VK, {});
  const events = getEvents();
  const all = getRules();
  const hour = new Date().toISOString().slice(0, 13);
  const wl = lsGet<{ type: string; id: string }[]>('cr_watchlist', []).filter((x) => x.type === 'coin').map((x) => x.id);
  let fired = 0;
  const emit = (r: CRule, key: string, title: string, body: string, url: string) => {
    const k = `${r.id}:${key}`;
    if (events.some((e) => e.key === k)) return false;
    events.unshift({ id: Date.now() + Math.random(), title, body, url, read: 0, created_at: new Date().toISOString(), key: k });
    const rr = all.find((x) => x.id === r.id);
    if (rr) rr.last_fired = new Date().toISOString();
    if (r.push) notify(title, body, url);
    fired++;
    return true;
  };
  for (const r of rules) {
    if (r.last_fired && Date.now() - Date.parse(r.last_fired) < r.cooldown_min * 60e3) continue;
    const t = (r.target ?? '').toLowerCase();
    const c = t ? coins.find((x) => x.id === t || x.symbol.toLowerCase() === t) : undefined;
    const th = r.threshold ?? 0;
    const curl = c ? `/coin/${c.id}/` : '/';
    if (r.type === 'price_above' && c?.price != null && c.price >= th) emit(r, `above:${hour}`, `${c.symbol} sopra ${usd(th)}`, `Prezzo ${usd(c.price)} (dato periodico)`, curl);
    else if (r.type === 'price_below' && c?.price != null && c.price <= th) emit(r, `below:${hour}`, `${c.symbol} sotto ${usd(th)}`, `Prezzo ${usd(c.price)} (dato periodico)`, curl);
    else if (r.type === 'change_24h' && c?.ch24h != null && Math.abs(c.ch24h) >= th) emit(r, `ch:${hour}`, `${c.symbol} ${c.ch24h.toFixed(2)}% in 24h`, `Soglia ±${th}% superata`, curl);
    else if (r.type === 'volume_spike' && c?.volume24h && prevVol[c.id] && (c.volume24h / prevVol[c.id] - 1) * 100 >= th) emit(r, `vol:${hour}`, `Volume ${c.symbol} in aumento`, `+${((c.volume24h / prevVol[c.id] - 1) * 100).toFixed(1)}% dal controllo precedente`, curl);
    else {
      for (const a of news) {
        const title = a.ti || a.t;
        let ok = false;
        if (r.type === 'breaking') ok = a.b && a.st !== 'SMENTITA';
        else if (r.type === 'security') ok = a.k.includes('security') && a.f.includes('urgent') && (a.st === 'CONFERMATA' || a.st === 'CONFERMATA PARZIALMENTE');
        else if (r.type === 'listing') ok = a.scat === 'official-exchange' && /\b(list|listing|delist|launch|will add|new (spot|perpetual|futures))/i.test(a.t);
        else if (r.type === 'airdrop') ok = a.k.includes('airdrop');
        else if (r.type === 'coin_news') ok = !!t && (a.c.includes(t) || (!!c && a.c.includes(c.id)));
        else if (r.type === 'keyword') ok = !!t && (title.toLowerCase().includes(t) || a.t.toLowerCase().includes(t));
        else if (r.type === 'expert') ok = a.sid === t;
        else if (r.type === 'macro') ok = a.scat === 'regulator' || a.scat === 'macro';
        else if (r.type === 'watchlist_news') ok = a.c.some((x) => wl.includes(x));
        if (ok && emit(r, `c${a.cl}`, r.type === 'breaking' ? 'Notizia urgente' : 'Crypto Radar', title, `/notizia/${a.id}/`)) break;
      }
    }
  }
  if (coins.length) lsSet(VK, Object.fromEntries(coins.map((x) => [x.id, x.volume24h ?? 0])));
  setRules(all);
  setEvents(events);
  return fired;
}
