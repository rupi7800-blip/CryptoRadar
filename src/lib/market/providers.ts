import 'server-only';
import { fetchJson } from '../http';
import type { Coin, GlobalMarket } from './types';

/* ---------------- CoinGecko ---------------- */
export function cgBase() {
  return process.env.COINGECKO_PRO_API_KEY ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
}
export function cgHeaders(): Record<string, string> {
  if (process.env.COINGECKO_PRO_API_KEY) return { 'x-cg-pro-api-key': process.env.COINGECKO_PRO_API_KEY };
  if (process.env.COINGECKO_API_KEY) return { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY };
  return {};
}
export async function cg<T>(path: string, timeoutMs = 20000): Promise<T> {
  return fetchJson<T>(cgBase() + path, { sourceId: 'coingecko', headers: cgHeaders(), timeoutMs, retries: 1 });
}

type CgMarket = {
  id: string; symbol: string; name: string; image: string; market_cap_rank: number | null; current_price: number | null;
  market_cap: number | null; total_volume: number | null; price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null; price_change_percentage_24h?: number | null; price_change_percentage_7d_in_currency?: number | null;
  circulating_supply: number | null; max_supply: number | null; ath: number | null; ath_date: string | null; atl: number | null; atl_date: string | null;
  sparkline_in_7d?: { price: number[] } | null; last_updated: string | null;
};

export function fromCg(m: CgMarket): Coin {
  return {
    id: m.id, idSource: 'coingecko', symbol: m.symbol.toUpperCase(), name: m.name, image: m.image || null, rank: m.market_cap_rank,
    price: m.current_price, marketCap: m.market_cap, volume24h: m.total_volume,
    ch1h: m.price_change_percentage_1h_in_currency ?? null,
    ch24h: m.price_change_percentage_24h_in_currency ?? m.price_change_percentage_24h ?? null,
    ch7d: m.price_change_percentage_7d_in_currency ?? null,
    circulating: m.circulating_supply, maxSupply: m.max_supply, ath: m.ath, athDate: m.ath_date, atl: m.atl, atlDate: m.atl_date,
    sparkline: m.sparkline_in_7d?.price ? downsample(m.sparkline_in_7d.price, 42) : null,
    lastUpdated: m.last_updated,
  };
}
function downsample(a: number[], n: number) {
  if (a.length <= n) return a;
  const step = a.length / n;
  return Array.from({ length: n }, (_, i) => a[Math.floor(i * step)]);
}

export async function cgMarkets(extra = ''): Promise<Coin[]> {
  const data = await cg<CgMarket[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d${extra}`,
  );
  if (!Array.isArray(data) || !data.length) throw new Error('CoinGecko: risposta vuota');
  return data.map(fromCg);
}

export async function cgGlobal(): Promise<GlobalMarket> {
  const r = await cg<{ data: any }>('/global');
  const d = r.data;
  return {
    totalMarketCap: d.total_market_cap?.usd ?? null,
    totalVolume: d.total_volume?.usd ?? null,
    btcDominance: d.market_cap_percentage?.btc ?? null,
    ethDominance: d.market_cap_percentage?.eth ?? null,
    marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? null,
    activeCryptos: d.active_cryptocurrencies ?? null,
  };
}

/* ---------------- CoinPaprika (fallback gratuito) ---------------- */
type CpTicker = {
  id: string; name: string; symbol: string; rank: number; circulating_supply: number; max_supply: number; last_updated: string;
  quotes: { USD: { price: number; volume_24h: number; market_cap: number; percent_change_1h: number; percent_change_24h: number; percent_change_7d: number; ath_price: number | null; ath_date: string | null } };
};
export function fromCp(t: CpTicker): Coin {
  const q = t.quotes.USD;
  return {
    id: t.id, idSource: 'coinpaprika', symbol: t.symbol.toUpperCase(), name: t.name, image: `https://static.coinpaprika.com/coin/${t.id}/logo.png`,
    rank: t.rank || null, price: q.price, marketCap: q.market_cap || null, volume24h: q.volume_24h, ch1h: q.percent_change_1h,
    ch24h: q.percent_change_24h, ch7d: q.percent_change_7d, circulating: t.circulating_supply || null, maxSupply: t.max_supply || null,
    ath: q.ath_price, athDate: q.ath_date, atl: null, atlDate: null, sparkline: null, lastUpdated: t.last_updated,
  };
}
export async function cpMarkets(): Promise<Coin[]> {
  const data = await fetchJson<CpTicker[]>('https://api.coinpaprika.com/v1/tickers?quotes=USD', { sourceId: 'coinpaprika', timeoutMs: 30000 });
  return data.filter((t) => t.rank > 0).sort((a, b) => a.rank - b.rank).slice(0, 250).map(fromCp);
}
export async function cpGlobal(): Promise<GlobalMarket> {
  const d = await fetchJson<any>('https://api.coinpaprika.com/v1/global', { sourceId: 'coinpaprika' });
  return {
    totalMarketCap: d.market_cap_usd ?? null,
    totalVolume: d.volume_24h_usd ?? null,
    btcDominance: d.bitcoin_dominance_percentage ?? null,
    ethDominance: null,
    marketCapChange24h: d.market_cap_change_24h ?? null,
    activeCryptos: d.cryptocurrencies_number ?? null,
  };
}

/* ---------------- CoinMarketCap (terzo fallback, richiede chiave gratuita) ---------------- */
export async function cmcMarkets(): Promise<Coin[]> {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error('CMC_API_KEY non configurata');
  const r = await fetchJson<any>('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=250&convert=USD', {
    sourceId: 'coinmarketcap', headers: { 'X-CMC_PRO_API_KEY': key },
  });
  return (r.data as any[]).map((c) => ({
    id: c.slug, idSource: 'coinmarketcap' as const, symbol: c.symbol, name: c.name, image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
    rank: c.cmc_rank, price: c.quote.USD.price, marketCap: c.quote.USD.market_cap, volume24h: c.quote.USD.volume_24h,
    ch1h: c.quote.USD.percent_change_1h, ch24h: c.quote.USD.percent_change_24h, ch7d: c.quote.USD.percent_change_7d,
    circulating: c.circulating_supply, maxSupply: c.max_supply, ath: null, athDate: null, atl: null, atlDate: null, sparkline: null, lastUpdated: c.last_updated,
  }));
}
