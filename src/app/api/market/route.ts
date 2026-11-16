import { json, handler } from '@/lib/api';
import { getCache } from '@/lib/db';
import type { Coin, GlobalMarket } from '@/lib/market/types';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req) => {
  const n = Math.min(Number(new URL(req.url).searchParams.get('n') ?? 20) || 20, 250);
  const top = getCache<Coin[]>('market:top');
  const glob = getCache<GlobalMarket>('market:global');
  return json({
    coins: (top.value ?? []).slice(0, n).map(({ sparkline, ...c }) => c),
    source: top.source, fetchedAt: top.fetchedAt, error: top.error,
    global: glob.value, globalSource: glob.source, globalFetchedAt: glob.fetchedAt,
  });
});
