'use client';
import { useEffect, useState } from 'react';
import { LineChart } from './Charts';
import { STATIC } from '@/lib/mode';

type Data = { points: [number, number][]; source: string | null; fetchedAt: string | null; error?: string };

/** Versione statica: il browser interroga direttamente le API pubbliche (CoinGecko, poi Binance). */
async function fetchDirect(id: string, symbol: string, days: number): Promise<Data> {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { points: j.prices, source: 'CoinGecko', fetchedAt: new Date().toISOString() };
  } catch {
    try {
      const interval = days <= 2 ? '1h' : days <= 30 ? '4h' : '1d';
      const limit = Math.min(1000, days <= 2 ? days * 24 : days <= 30 ? days * 6 : days);
      const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT&interval=${interval}&limit=${limit}`);
      if (!r.ok) throw new Error(String(r.status));
      const k = (await r.json()) as [number, string, string, string, string][];
      return { points: k.map((x) => [x[0], Number(x[4])]), source: 'Binance (coppia USDT)', fetchedAt: new Date().toISOString() };
    } catch {
      return { points: [], source: null, fetchedAt: null, error: 'Serie storica non disponibile in questo momento (limiti delle API pubbliche gratuite).' };
    }
  }
}

export default function CoinChart({ id, symbol }: { id: string; symbol: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    setData(null);
    if (STATIC) { fetchDirect(id, symbol, days).then(setData); return; }
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
