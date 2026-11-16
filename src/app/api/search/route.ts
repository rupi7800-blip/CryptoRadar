import { z } from 'zod';
import { json, handler } from '@/lib/api';
import { listNews } from '@/lib/news';
import { searchCoins } from '@/lib/market/detail';
import { all, getCache } from '@/lib/db';
export const dynamic = 'force-dynamic';
const Q = z.object({ q: z.string().trim().min(1).max(120) });
/** Ricerca globale: notizie, criptovalute, fonti/esperti/exchange, protocolli DeFi, exchange. */
export const GET = handler(async (req) => {
  const { q } = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const ql = q.toLowerCase();
  const protocols = (getCache<{ slug: string; name: string; category: string; tvl: number }[]>('defi:protocols').value ?? []).filter((p) => p.name.toLowerCase().includes(ql)).slice(0, 6);
  const exchanges = (getCache<{ id: string; name: string }[]>('market:exchanges').value ?? []).filter((e) => e.name.toLowerCase().includes(ql)).slice(0, 5);
  const [coins] = await Promise.all([searchCoins(q).catch(() => [])]);
  return json({
    news: listNews({ q, limit: 12 }),
    coins: coins.slice(0, 8),
    sources: all('SELECT id, name, category, tier FROM sources WHERE name LIKE ? OR id LIKE ? LIMIT 8', like, like),
    authors: all('SELECT DISTINCT author, source_id FROM articles WHERE author LIKE ? LIMIT 6', like),
    protocols,
    exchanges,
  });
});
