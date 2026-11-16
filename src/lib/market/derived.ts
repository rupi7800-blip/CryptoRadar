import 'server-only';
import { getCache } from '../db';
import type { Coin, GlobalMarket } from './types';

const STABLE = new Set(['tether', 'usd-coin', 'dai', 'ethena-usde', 'first-digital-usd', 'usds', 'paypal-usd', 'usdt-tether', 'usdc-usd-coin', 'dai-dai', 'true-usd', 'usd1-wlfi', 'binance-usd']);
export const isStable = (c: Coin) => STABLE.has(c.id) || /^(usd|usdt|usdc|dai|fdusd|tusd|usde|pyusd|usds|eurc)$/i.test(c.symbol);

export function marketSnapshot() {
  const top = getCache<Coin[]>('market:top');
  const glob = getCache<GlobalMarket>('market:global');
  const fg = getCache<{ value: number; label: string; at: string }[]>('market:feargreed');
  return { top, glob, fg };
}

export type Anomaly = { coin: Coin; reasons: string[] };

export function anomalies(): Anomaly[] {
  const coins = getCache<Coin[]>('market:top').value ?? [];
  const prev = getCache<{ vol: Record<string, number | null> }>('market:prev').value?.vol ?? {};
  const out: Anomaly[] = [];
  for (const c of coins) {
    if (isStable(c)) {
      if (c.price != null && Math.abs(c.price - 1) > 0.02 && /usd/i.test(c.symbol)) out.push({ coin: c, reasons: [`Stablecoin fuori dal peg: ${c.price.toFixed(4)} $`] });
      continue;
    }
    const r: string[] = [];
    if (c.ch1h != null && Math.abs(c.ch1h) >= 5) r.push(`${c.ch1h > 0 ? '+' : ''}${c.ch1h.toFixed(1)}% in 1 ora`);
    if (c.ch24h != null && Math.abs(c.ch24h) >= 15) r.push(`${c.ch24h > 0 ? '+' : ''}${c.ch24h.toFixed(1)}% in 24 ore`);
    if (c.volume24h && c.marketCap && c.volume24h / c.marketCap >= 0.6) r.push(`Volume pari al ${Math.round((c.volume24h / c.marketCap) * 100)}% della capitalizzazione`);
    const pv = prev[c.id];
    if (pv && c.volume24h && c.volume24h / pv >= 1.6) r.push(`Volume +${Math.round((c.volume24h / pv - 1) * 100)}% rispetto al rilevamento precedente`);
    if (r.length) out.push({ coin: c, reasons: r });
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length || (a.coin.rank ?? 999) - (b.coin.rank ?? 999)).slice(0, 15);
}

export function rankings(coins: Coin[]) {
  const nonStable = coins.filter((c) => !isStable(c));
  const by = (f: (c: Coin) => number | null, dir: 1 | -1) => [...nonStable].filter((c) => f(c) != null).sort((a, b) => dir * ((f(b) as number) - (f(a) as number))).slice(0, 10);
  return {
    gainers: by((c) => c.ch24h, 1),
    losers: by((c) => c.ch24h, -1),
    volume: by((c) => c.volume24h, 1),
    mcap: by((c) => c.marketCap, 1),
  };
}
