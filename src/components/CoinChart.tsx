'use client';
import { useEffect, useState } from 'react';
import { LineChart } from './Charts';

export default function CoinChart({ id, symbol }: { id: string; symbol: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{ points: [number, number][]; source: string | null; fetchedAt: string | null; error?: string } | null>(null);
  useEffect(() => {
    setData(null);
    fetch(`/api/coin/${encodeURIComponent(id)}/chart?days=${days}&symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then(setData).catch(() => setData({ points: [], source: null, fetchedAt: null, error: 'Errore di rete' }));
  }, [id, symbol, days]);
  const pts = data?.points ?? [];
  const first = pts[0]?.[1], last = pts[pts.length - 1]?.[1];
  const ch = first && last ? ((last - first) / first) * 100 : null;
  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {[1, 7, 30, 90, 365].map((d) => <button key={d} onClick={() => setDays(d)} className={`btn px-2 py-0.5 text-xs ${days === d ? 'btn-primary' : ''}`}>{d === 1 ? '24h' : d === 365 ? '1 anno' : `${d}g`}</button>)}
        {ch != null && <span className={`ml-auto text-sm tabular-nums ${ch >= 0 ? 'up' : 'down'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(2).replace('.', ',')}% nel periodo</span>}
      </div>
      {!data ? <div className="h-[220px] animate-pulse rounded bg-panel2" /> : <LineChart points={pts} />}
      <div className="mt-1 text-[11px] text-mute">{data?.error ? `⚠ ${data.error}` : data?.source ? `Fonte: ${data.source} · prezzi in USD` : ''}</div>
    </div>
  );
}
