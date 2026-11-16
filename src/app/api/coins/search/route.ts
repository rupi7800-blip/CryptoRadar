import { json, handler } from '@/lib/api';
import { searchCoins } from '@/lib/market/detail';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 60);
  if (q.trim().length < 1) return json({ items: [] });
  return json({ items: await searchCoins(q) });
});
