'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type C = { id: string; idSource: string; symbol: string; name: string; image: string | null; price: number | null; ch24h: number | null; ch1h: number | null };

const fmt = (n: number | null) => (n == null ? 'n.d.' : '$' + n.toLocaleString('it-IT', { maximumFractionDigits: n >= 1000 ? 0 : n >= 1 ? 2 : 6, minimumFractionDigits: n >= 1000 ? 0 : 2 }));
const pct = (n: number | null) => (n == null ? 'n.d.' : (n > 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + '%');

/**
 * Prezzi principali. Dato base: aggiornamento periodico dal server (CoinGecko/CoinPaprika).
 * Se il browser riesce a connettersi al WebSocket pubblico di Binance, i prezzi diventano realmente in tempo reale
 * (etichetta "LIVE Binance"); altrimenti resta l'etichetta "periodico".
 */
export default function LivePrices({ initial, fetchedAt, source }: { initial: C[]; fetchedAt: string | null; source: string | null }) {
  const [coins, setCoins] = useState(initial);
  const [live, setLive] = useState<Record<string, { p: number; c: number }>>({});
  const [wsOk, setWsOk] = useState(false);
  const [meta, setMeta] = useState({ fetchedAt, source });
  const flash = useRef<Record<string, number>>({});

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/market?n=${initial.length}`, { cache: 'no-store' });
        const j = await r.json();
        if (j.coins?.length) { setCoins(j.coins); setMeta({ fetchedAt: j.fetchedAt, source: j.source }); }
      } catch { /* */ }
    }, 60_000);
    return () => clearInterval(t);
  }, [initial.length]);

  useEffect(() => {
    const syms = initial.map((c) => c.symbol.toLowerCase()).filter((s) => !['usdt', 'usdc', 'dai', 'usde', 'fdusd', 'steth', 'wbtc', 'weth', 'usds', 'wsteth', 'weeth', 'busd'].includes(s));
    const streams = syms.map((s) => `${s}usdt@miniTicker`).join('/');
    let ws: WebSocket | null = null;
    let closed = false;
    try {
      ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${streams}`);
      ws.onopen = () => setWsOk(true);
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data)?.data;
        if (!m?.s) return;
        const sym = String(m.s).replace(/USDT$/, '');
        const p = Number(m.c), o = Number(m.o);
        flash.current[sym] = Date.now();
        setLive((l) => ({ ...l, [sym]: { p, c: o ? ((p - o) / o) * 100 : 0 } }));
      };
      ws.onerror = () => setWsOk(false);
      ws.onclose = () => { if (!closed) setWsOk(false); };
    } catch { setWsOk(false); }
    return () => { closed = true; ws?.close(); };
  }, [initial]);

  const ago = meta.fetchedAt ? Math.round((Date.now() - Date.parse(meta.fetchedAt)) / 60000) : null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-[11px] text-mute">
        {wsOk ? <span className="chip border-up/40 text-up"><span className="pulse-dot">●</span> LIVE · Binance WebSocket (coppie USDT)</span> : <span className="chip border-line">Periodico · {meta.source ?? 'n.d.'} · {ago != null ? `${ago} min fa` : 'in attesa'}</span>}
        {wsOk && <span>Variazione 24h live = rolling 24h Binance; capitalizzazione da {meta.source}.</span>}
      </div>
      <div className="grid grid-cols-2 gap-px bg-line p-px sm:grid-cols-3 lg:grid-cols-5">
        {coins.map((c) => {
          const l = live[c.symbol.toUpperCase()];
          const price = l?.p ?? c.price;
          const ch = l?.c ?? c.ch24h;
          const recent = l && Date.now() - (flash.current[c.symbol.toUpperCase()] ?? 0) < 1200;
          return (
            <Link key={c.id} href={`/coin/${c.id}?src=${c.idSource}`} className="bg-panel px-3 py-2.5 hover:bg-panel2">
              <div className="flex items-center gap-1.5 text-xs text-mute">
                {c.image && <img src={c.image} alt="" width={16} height={16} className="h-4 w-4 rounded-full" loading="lazy" />}
                <span className="font-semibold text-ink">{c.symbol}</span><span className="truncate">{c.name}</span>
                {l && <span className="ml-auto text-[9px] text-up" title="prezzo in tempo reale">●</span>}
              </div>
              <div className={`mt-0.5 text-base font-semibold tabular-nums transition-colors ${recent ? 'text-white' : ''}`}>{fmt(price)}</div>
              <div className={`text-xs tabular-nums ${ch == null ? 'text-mute' : ch >= 0 ? 'up' : 'down'}`}>{pct(ch)} <span className="text-mute">24h</span></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
