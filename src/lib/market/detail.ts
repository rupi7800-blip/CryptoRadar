import 'server-only';
import { getCache, setCache, setCacheError } from '../db';
import { fetchJson } from '../http';
import { cg } from './providers';
import { stripHtml, truncate, safeUrl } from '../text';
import type { Coin } from './types';

export type CoinDetail = {
  id: string; src: string; name: string; symbol: string; image: string | null; rank: number | null; description: string | null;
  categories: string[]; links: { label: string; url: string }[]; genesis: string | null; hashing: string | null;
  market: Partial<Coin> & { fdv?: number | null; totalSupply?: number | null; ch30d?: number | null; ch1y?: number | null };
  developer: { stars?: number | null; forks?: number | null; commits4w?: number | null; contributors?: number | null; repo?: string | null } | null;
  platforms: { chain: string; address: string }[];
  source: string; fetchedAt: string;
};

async function fetchCg(id: string): Promise<CoinDetail> {
  const d = await cg<any>(`/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=true&sparkline=false`);
  const m = d.market_data ?? {};
  const links: { label: string; url: string }[] = [];
  const add = (label: string, u: unknown) => { const s = safeUrl(u); if (s) links.push({ label, url: s }); };
  add('Sito ufficiale', d.links?.homepage?.[0]);
  add('Whitepaper', d.links?.whitepaper);
  add('Explorer', d.links?.blockchain_site?.find((x: string) => x));
  add('GitHub', d.links?.repos_url?.github?.[0]);
  add('Reddit', d.links?.subreddit_url);
  if (d.links?.twitter_screen_name) add('X / Twitter', `https://x.com/${d.links.twitter_screen_name}`);
  return {
    id: d.id, src: 'coingecko', name: d.name, symbol: String(d.symbol).toUpperCase(), image: d.image?.large ?? null, rank: d.market_cap_rank ?? null,
    description: d.description?.en ? truncate(stripHtml(d.description.en), 1800) : null, categories: (d.categories ?? []).filter(Boolean).slice(0, 8), links,
    genesis: d.genesis_date ?? null, hashing: d.hashing_algorithm ?? null,
    market: {
      price: m.current_price?.usd ?? null, marketCap: m.market_cap?.usd ?? null, volume24h: m.total_volume?.usd ?? null, ch1h: m.price_change_percentage_1h_in_currency?.usd ?? null,
      ch24h: m.price_change_percentage_24h ?? null, ch7d: m.price_change_percentage_7d ?? null, ch30d: m.price_change_percentage_30d ?? null, ch1y: m.price_change_percentage_1y ?? null,
      circulating: m.circulating_supply ?? null, totalSupply: m.total_supply ?? null, maxSupply: m.max_supply ?? null, fdv: m.fully_diluted_valuation?.usd ?? null,
      ath: m.ath?.usd ?? null, athDate: m.ath_date?.usd ?? null, atl: m.atl?.usd ?? null, atlDate: m.atl_date?.usd ?? null, lastUpdated: m.last_updated ?? null,
    },
    developer: d.developer_data ? { stars: d.developer_data.stars, forks: d.developer_data.forks, commits4w: d.developer_data.commit_count_4_weeks, contributors: d.developer_data.pull_request_contributors, repo: d.links?.repos_url?.github?.[0] ?? null } : null,
    platforms: Object.entries(d.platforms ?? {}).filter(([k, v]) => k && v).map(([chain, address]) => ({ chain, address: String(address) })).slice(0, 8),
    source: 'CoinGecko', fetchedAt: new Date().toISOString(),
  };
}

async function fetchCp(id: string): Promise<CoinDetail> {
  const [d, t] = await Promise.all([
    fetchJson<any>(`https://api.coinpaprika.com/v1/coins/${encodeURIComponent(id)}`, { sourceId: 'coinpaprika' }),
    fetchJson<any>(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(id)}`, { sourceId: 'coinpaprika' }),
  ]);
  const q = t.quotes?.USD ?? {};
  const links: { label: string; url: string }[] = [];
  for (const [k, arr] of Object.entries(d.links ?? {})) for (const u of (arr as string[]).slice(0, 1)) { const s = safeUrl(u); if (s) links.push({ label: k, url: s }); }
  return {
    id: d.id, src: 'coinpaprika', name: d.name, symbol: d.symbol, image: `https://static.coinpaprika.com/coin/${d.id}/logo.png`, rank: d.rank || null,
    description: d.description ? truncate(stripHtml(d.description), 1800) : null, categories: (d.tags ?? []).map((x: any) => x.name).slice(0, 8), links,
    genesis: d.started_at ?? null, hashing: d.hash_algorithm ?? null,
    market: { price: q.price ?? null, marketCap: q.market_cap ?? null, volume24h: q.volume_24h ?? null, ch1h: q.percent_change_1h ?? null, ch24h: q.percent_change_24h ?? null, ch7d: q.percent_change_7d ?? null, ch30d: q.percent_change_30d ?? null, ch1y: q.percent_change_1y ?? null, circulating: t.circulating_supply ?? null, totalSupply: t.total_supply ?? null, maxSupply: t.max_supply || null, ath: q.ath_price ?? null, athDate: q.ath_date ?? null, atl: null, atlDate: null, lastUpdated: t.last_updated ?? null },
    developer: null, platforms: d.contract ? [{ chain: d.platform ?? 'n.d.', address: d.contract }] : [],
    source: 'CoinPaprika', fetchedAt: new Date().toISOString(),
  };
}

export async function coinDetail(id: string, src: string, ttlMs = 10 * 60e3): Promise<{ data: CoinDetail | null; error: string | null; stale: boolean }> {
  const key = `coin:${src}:${id}`;
  const c = getCache<CoinDetail>(key);
  if (c.value && c.fetchedAt && Date.now() - Date.parse(c.fetchedAt) < ttlMs) return { data: c.value, error: null, stale: false };
  try {
    let d: CoinDetail;
    if (src === 'coinpaprika') d = await fetchCp(id);
    else {
      try {
        d = await fetchCg(id);
      } catch (e) {
        // fallback: cerca su CoinPaprika lo stesso simbolo
        const top = getCache<Coin[]>('market:top').value ?? [];
        const sym = top.find((x) => x.id === id)?.symbol;
        const s = await fetchJson<any>(`https://api.coinpaprika.com/v1/search?q=${encodeURIComponent(sym ?? id)}&c=currencies&limit=5`, { sourceId: 'coinpaprika' });
        const match = (s.currencies ?? []).find((x: any) => !sym || x.symbol === sym) ?? s.currencies?.[0];
        if (!match) throw e;
        d = await fetchCp(match.id);
      }
    }
    setCache(key, d, d.source);
    return { data: d, error: null, stale: false };
  } catch (e) {
    setCacheError(key, (e as Error).message);
    return { data: c.value, error: (e as Error).message, stale: !!c.value };
  }
}

/** Serie storica prezzi: CoinGecko, in alternativa candele giornaliere Binance (coppia USDT). */
export async function coinChart(id: string, symbol: string | null, days: number) {
  const key = `chart:${id}:${days}`;
  const c = getCache<{ points: [number, number][] }>(key);
  if (c.value && c.fetchedAt && Date.now() - Date.parse(c.fetchedAt) < 30 * 60e3) return { ...c.value, source: c.source, fetchedAt: c.fetchedAt };
  try {
    const r = await cg<{ prices: [number, number][] }>(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`);
    const v = { points: r.prices.filter((_, i, a) => a.length < 400 || i % Math.ceil(a.length / 400) === 0) };
    setCache(key, v, 'CoinGecko');
    return { ...v, source: 'CoinGecko', fetchedAt: new Date().toISOString() };
  } catch {
    if (symbol) {
      try {
        const interval = days <= 2 ? '1h' : days <= 30 ? '4h' : '1d';
        const limit = Math.min(1000, days <= 2 ? days * 24 : days <= 30 ? days * 6 : days);
        const k = await fetchJson<any[]>(`https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT&interval=${interval}&limit=${limit}`, { sourceId: 'binance-ws' });
        const v = { points: k.map((x) => [x[0], Number(x[4])] as [number, number]) };
        setCache(key, v, 'Binance (coppia USDT)');
        return { ...v, source: 'Binance (coppia USDT)', fetchedAt: new Date().toISOString() };
      } catch {
        /* nessuna fonte */
      }
    }
    return { points: c.value?.points ?? [], source: c.source, fetchedAt: c.fetchedAt, error: 'Serie storica non disponibile dalle fonti gratuite in questo momento.' };
  }
}

export async function searchCoins(q: string) {
  const ql = q.toLowerCase().trim();
  const top = getCache<Coin[]>('market:top').value ?? [];
  const local = top.filter((c) => c.name.toLowerCase().includes(ql) || c.symbol.toLowerCase() === ql || c.id.includes(ql)).slice(0, 10)
    .map((c) => ({ id: c.id, src: c.idSource, name: c.name, symbol: c.symbol, rank: c.rank, image: c.image }));
  if (local.length >= 5 || ql.length < 2) return local;
  try {
    const r = await cg<{ coins: any[] }>(`/search?query=${encodeURIComponent(ql)}`);
    const remote = r.coins.slice(0, 15).map((c) => ({ id: c.id, src: 'coingecko', name: c.name, symbol: String(c.symbol).toUpperCase(), rank: c.market_cap_rank ?? null, image: c.thumb ?? null }));
    return dedupe([...local, ...remote]);
  } catch {
    try {
      const r = await fetchJson<any>(`https://api.coinpaprika.com/v1/search?q=${encodeURIComponent(ql)}&c=currencies&limit=15`, { sourceId: 'coinpaprika' });
      return dedupe([...local, ...(r.currencies ?? []).map((c: any) => ({ id: c.id, src: 'coinpaprika', name: c.name, symbol: c.symbol, rank: c.rank || null, image: null }))]);
    } catch {
      return local;
    }
  }
}
function dedupe<T extends { id: string }>(a: T[]) {
  const s = new Set<string>();
  return a.filter((x) => (s.has(x.id) ? false : (s.add(x.id), true)));
}

/** Scheda costruita dai soli dati di mercato (usata nella versione statica per le coin senza dettaglio in cache). */
export function detailFromMarket(c: Coin): CoinDetail {
  return {
    id: c.id, src: c.idSource, name: c.name, symbol: c.symbol, image: c.image, rank: c.rank, description: null, categories: [], links: [], genesis: null, hashing: null,
    market: { price: c.price, marketCap: c.marketCap, volume24h: c.volume24h, ch1h: c.ch1h, ch24h: c.ch24h, ch7d: c.ch7d, circulating: c.circulating, maxSupply: c.maxSupply, ath: c.ath, athDate: c.athDate, atl: c.atl, atlDate: c.atlDate, lastUpdated: c.lastUpdated },
    developer: null, platforms: [], source: 'dati di mercato', fetchedAt: c.lastUpdated ?? new Date().toISOString(),
  };
}

/** Versione statica: scarica in anticipo (con calma, cache 12 h) le schede delle prime coin e delle trending. */
export async function prefetchCoinDetails(n = 20) {
  const top = (getCache<Coin[]>('market:top').value ?? []).slice(0, n);
  const tr = getCache<{ coins: { id: string }[] }>('market:trending').value?.coins ?? [];
  const list: [string, string][] = [...top.map((c) => [c.id, c.idSource] as [string, string]), ...tr.slice(0, 7).map((c) => [c.id, 'coingecko'] as [string, string])];
  let ok = 0;
  for (const [id, src] of list) {
    const r = await coinDetail(id, src === 'coinpaprika' ? 'coinpaprika' : 'coingecko', 12 * 3600e3);
    if (r.data) ok++;
  }
  return ok;
}
