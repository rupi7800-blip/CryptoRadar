import 'server-only';
import { setCache, setCacheError, getCache } from '../db';
import { fetchJson } from '../http';
import { cg, cgMarkets, cgGlobal, cpMarkets, cpGlobal, cmcMarkets } from './providers';
import type { Coin } from './types';
import { markSuccess, markFailure, getSource } from '../sources/registry';

const PROVIDER_SOURCE: Record<string, string> = { CoinGecko: 'coingecko', CoinPaprika: 'coinpaprika', CoinMarketCap: 'coinmarketcap', 'Alternative.me': 'feargreed' };
function mark(name: string, ok: boolean, err?: string) {
  const id = PROVIDER_SOURCE[name];
  if (!id || !getSource(id)) return;
  if (ok) markSuccess(id, 0);
  else markFailure(id, err ?? 'errore');
}

/** Prova i fornitori in ordine; registra quale ha risposto. Mai valori inventati: se tutti falliscono resta l'ultimo dato valido marcato come non aggiornato. */
async function withFallback<T>(key: string, chain: [string, () => Promise<T>][]): Promise<number> {
  const errors: string[] = [];
  for (const [name, fn] of chain) {
    try {
      const v = await fn();
      setCache(key, v, name);
      mark(name, true);
      return Array.isArray(v) ? v.length : 1;
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
      mark(name, false, (e as Error).message);
    }
  }
  setCacheError(key, errors.join(' | '));
  throw new Error(errors.join(' | '));
}

export async function refreshMarkets() {
  const prev = getCache<Coin[]>('market:top');
  if (prev.value) setCache('market:prev', { at: prev.fetchedAt, vol: Object.fromEntries(prev.value.map((c) => [c.id, c.volume24h])) }, prev.source ?? '');
  return withFallback('market:top', [
    ['CoinGecko', () => cgMarkets()],
    ['CoinPaprika', () => cpMarkets()],
    ...(process.env.CMC_API_KEY ? ([['CoinMarketCap', () => cmcMarkets()]] as [string, () => Promise<Coin[]>][]) : []),
  ]);
}

export async function refreshGlobal() {
  return withFallback('market:global', [
    ['CoinGecko', () => cgGlobal()],
    ['CoinPaprika', () => cpGlobal()],
  ]);
}

export async function refreshTrending() {
  return withFallback('market:trending', [
    [
      'CoinGecko',
      async () => {
        const r = await cg<{ coins: { item: any }[]; categories?: any[] }>('/search/trending');
        return {
          coins: r.coins.map(({ item }) => ({
            id: item.id, name: item.name, symbol: item.symbol, rank: item.market_cap_rank, image: item.small ?? item.thumb ?? null,
            price: item.data?.price ?? null, ch24h: item.data?.price_change_percentage_24h?.usd ?? null,
          })),
          categories: (r.categories ?? []).slice(0, 6).map((c) => ({ id: c.slug ?? c.id, name: c.name, ch1h: c.data?.market_cap_1h_change ?? null })),
        };
      },
    ],
  ]);
}

export async function refreshMeme() {
  return withFallback('market:meme', [['CoinGecko', () => cgMarkets('&category=meme-token').then((c) => c.slice(0, 100))]]);
}

export async function refreshCategories() {
  return withFallback('market:categories', [
    [
      'CoinGecko',
      async () => {
        const r = await cg<any[]>('/coins/categories?order=market_cap_desc');
        return r.slice(0, 60).map((c) => ({
          id: c.id, name: c.name, marketCap: c.market_cap ?? null, ch24h: c.market_cap_change_24h ?? null, volume24h: c.volume_24h ?? null, top3: c.top_3_coins ?? [],
        }));
      },
    ],
  ]);
}

export async function refreshExchanges() {
  return withFallback('market:exchanges', [
    [
      'CoinGecko',
      async () => {
        const r = await cg<any[]>('/exchanges?per_page=60&page=1');
        return r.map((e) => ({
          id: e.id, name: e.name, image: e.image ?? null, country: e.country ?? null, year: e.year_established ?? null, url: e.url ?? null,
          trustScore: e.trust_score ?? null, volumeBtc24h: e.trade_volume_24h_btc ?? null, volumeUsd24h: null as number | null, rank: e.trust_score_rank ?? null,
        }));
      },
    ],
    [
      'CoinPaprika',
      async () => {
        const r = await fetchJson<any[]>('https://api.coinpaprika.com/v1/exchanges?quotes=USD', { sourceId: 'coinpaprika' });
        return r
          .filter((e) => e.active && e.adjusted_rank)
          .sort((a, b) => a.adjusted_rank - b.adjusted_rank)
          .slice(0, 60)
          .map((e) => ({
            id: e.id, name: e.name, image: null, country: null, year: null, url: e.links?.website?.[0] ?? null, trustScore: e.confidence_score != null ? Math.round(e.confidence_score * 10) : null,
            volumeBtc24h: null, volumeUsd24h: e.quotes?.USD?.adjusted_volume_24h ?? null, rank: e.adjusted_rank,
          }));
      },
    ],
  ]);
}

export async function refreshFearGreed() {
  return withFallback('market:feargreed', [
    [
      'Alternative.me',
      async () => {
        const r = await fetchJson<{ data: { value: string; value_classification: string; timestamp: string }[] }>('https://api.alternative.me/fng/?limit=30', { sourceId: 'feargreed' });
        return r.data.map((d) => ({ value: Number(d.value), label: d.value_classification, at: new Date(Number(d.timestamp) * 1000).toISOString() }));
      },
    ],
  ]);
}
