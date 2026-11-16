import 'server-only';
import { setCache, setCacheError } from '../db';
import { fetchJson } from '../http';

export async function refreshDefi() {
  try {
    const protocols = await fetchJson<any[]>('https://api.llama.fi/protocols', { sourceId: 'defillama', timeoutMs: 40000 });
    const slim = protocols
      .filter((p) => typeof p.tvl === 'number')
      .map((p) => ({
        slug: p.slug, name: p.name, category: p.category ?? 'n.d.', chains: (p.chains ?? []).slice(0, 6), tvl: p.tvl, ch1d: p.change_1d ?? null, ch7d: p.change_7d ?? null,
        symbol: p.symbol && p.symbol !== '-' ? p.symbol : null, url: p.url ?? null, logo: p.logo ?? null, listedAt: p.listedAt ? new Date(p.listedAt * 1000).toISOString() : null,
        description: typeof p.description === 'string' ? p.description.slice(0, 400) : null, audits: p.audits ?? null, gecko: p.gecko_id ?? null,
      }));
    const nonCex = slim.filter((p) => p.category !== 'CEX' && p.category !== 'Chain');
    setCache('defi:protocols', nonCex.sort((a, b) => b.tvl - a.tvl).slice(0, 300), 'DefiLlama');
    setCache('defi:cex', slim.filter((p) => p.category === 'CEX').sort((a, b) => b.tvl - a.tvl).slice(0, 40), 'DefiLlama');
    setCache(
      'defi:new',
      slim.filter((p) => p.listedAt && p.category !== 'CEX').sort((a, b) => Date.parse(b.listedAt!) - Date.parse(a.listedAt!)).slice(0, 60),
      'DefiLlama',
    );
    const cats = new Map<string, { tvl: number; n: number }>();
    for (const p of nonCex) {
      const c = cats.get(p.category) ?? { tvl: 0, n: 0 };
      c.tvl += p.tvl;
      c.n++;
      cats.set(p.category, c);
    }
    setCache('defi:categories', [...cats.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.tvl - a.tvl).slice(0, 25), 'DefiLlama');
  } catch (e) {
    setCacheError('defi:protocols', (e as Error).message);
    throw e;
  }
  const tasks: Promise<unknown>[] = [
    fetchJson<any[]>('https://api.llama.fi/v2/chains', { sourceId: 'defillama' })
      .then((r) => setCache('defi:chains', r.filter((c) => c.tvl > 0).sort((a, b) => b.tvl - a.tvl).slice(0, 30).map((c) => ({ name: c.name, tvl: c.tvl, symbol: c.tokenSymbol })), 'DefiLlama'))
      .catch((e) => setCacheError('defi:chains', e.message)),
    fetchJson<any>('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true', { sourceId: 'defillama' })
      .then((r) =>
        setCache(
          'defi:dexs',
          {
            total24h: r.total24h ?? null, change1d: r.change_1d ?? null, total7d: r.total7d ?? null,
            top: (r.protocols ?? []).filter((p: any) => p.total24h).sort((a: any, b: any) => b.total24h - a.total24h).slice(0, 20)
              .map((p: any) => ({ name: p.displayName ?? p.name, total24h: p.total24h, change1d: p.change_1d ?? null, chains: (p.chains ?? []).slice(0, 4) })),
          },
          'DefiLlama',
        ),
      )
      .catch((e) => setCacheError('defi:dexs', e.message)),
    fetchJson<any>('https://stablecoins.llama.fi/stablecoins?includePrices=true', { sourceId: 'defillama' })
      .then((r) =>
        setCache(
          'defi:stablecoins',
          (r.peggedAssets ?? [])
            .map((s: any) => ({
              name: s.name, symbol: s.symbol, pegType: s.pegType, mechanism: s.pegMechanism, circulating: s.circulating?.peggedUSD ?? null,
              prevWeek: s.circulatingPrevWeek?.peggedUSD ?? null, price: typeof s.price === 'number' ? s.price : null,
            }))
            .filter((s: any) => s.circulating)
            .sort((a: any, b: any) => b.circulating - a.circulating)
            .slice(0, 20),
          'DefiLlama',
        ),
      )
      .catch((e) => setCacheError('defi:stablecoins', e.message)),
    fetchJson<any[]>('https://api.llama.fi/hacks', { sourceId: 'defillama' })
      .then((r) =>
        setCache(
          'defi:hacks',
          r.sort((a, b) => b.date - a.date).slice(0, 60).map((h) => ({
            name: h.name, date: new Date(h.date * 1000).toISOString(), amount: h.amount ?? null, chains: h.chain ?? [], technique: h.technique ?? null,
            classification: h.classification ?? null, returned: h.returnedFunds ?? null, source: h.source || null, bridge: !!h.bridgeHack,
          })),
          'DefiLlama',
        ),
      )
      .catch((e) => setCacheError('defi:hacks', e.message)),
  ];
  await Promise.all(tasks);
  return 1;
}

const STAKING_CATS = new Set(['Liquid Staking', 'Liquid Restaking', 'Restaking', 'Staking Pool', 'Restaked BTC', 'Staking']);

export async function refreshYields() {
  try {
    const r = await fetchJson<{ data: any[] }>('https://yields.llama.fi/pools', { sourceId: 'defillama-yields', timeoutMs: 60000 });
    const { getCache } = await import('../db');
    const protos = getCache<{ slug: string; category: string; name: string; url: string | null; audits: string | null }[]>('defi:protocols').value ?? [];
    const bySlug = new Map(protos.map((p) => [p.slug, p]));
    const pools = r.data
      .filter((p) => p.tvlUsd > 1_000_000 && p.apy != null && p.apy < 200)
      .map((p) => {
        const proto = bySlug.get(p.project);
        return {
          pool: p.pool, project: p.project, projectName: proto?.name ?? p.project, category: proto?.category ?? null, url: proto?.url ?? null,
          chain: p.chain, symbol: p.symbol, tvl: p.tvlUsd, apy: p.apy, apyBase: p.apyBase ?? null, apyReward: p.apyReward ?? null,
          apyMean30d: p.apyMean30d ?? null, apyPct7D: p.apyPct7D ?? null, stablecoin: !!p.stablecoin, ilRisk: p.ilRisk, exposure: p.exposure,
          poolMeta: p.poolMeta ?? null, rewardTokens: p.rewardTokens ?? null, audits: proto?.audits ?? null,
        };
      });
    setCache('yields:staking', pools.filter((p) => p.category && STAKING_CATS.has(p.category)).sort((a, b) => b.tvl - a.tvl).slice(0, 120), 'DefiLlama Yields');
    setCache('yields:top', pools.filter((p) => !p.category || !STAKING_CATS.has(p.category)).sort((a, b) => b.tvl - a.tvl).slice(0, 80), 'DefiLlama Yields');
    return pools.length;
  } catch (e) {
    setCacheError('yields:staking', (e as Error).message);
    throw e;
  }
}
