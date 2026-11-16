import { json, handler, bad } from '@/lib/api';
import { coinChart } from '@/lib/market/detail';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,80}$/i.test(id)) return bad('id non valido');
  const sp = new URL(req.url).searchParams;
  const days = [1, 7, 30, 90, 365].includes(Number(sp.get('days'))) ? Number(sp.get('days')) : 30;
  const sym = (sp.get('symbol') ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || null;
  return json(await coinChart(id, sym, days));
});
