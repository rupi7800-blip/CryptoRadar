'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWatchlist, type WItem } from '@/lib/local';
import { STATIC, dataUrl } from '@/lib/mode';
import WatchButton from './WatchButton';
import Ago from './Ago';
import { fmtUsd, fmtPct } from '@/lib/text';

type C = { id: string; idSource: string; symbol: string; name: string; price: number | null; ch1h: number | null; ch24h: number | null; ch7d: number | null };
type N = { id: number; title: string; at: string; source: string; sid: string; coins: string[] };
const LBL: Record<string, string> = { coin: 'Criptovalute', exchange: 'Exchange', project: 'Progetti', expert: 'Esperti e fonti', topic: 'Argomenti' };

const P = ({ v }: { v: number | null }) => <span className={`tabular-nums ${v == null ? 'text-mute' : v >= 0 ? 'up' : 'down'}`}>{fmtPct(v)}</span>;

export default function WatchlistClient() {
  const [items, setItems] = useState<WItem[] | null>(null);
  const [coins, setCoins] = useState<C[]>([]);
  const [news, setNews] = useState<N[]>([]);
  const [meta, setMeta] = useState<{ source: string | null; at: string | null }>({ source: null, at: null });

  useEffect(() => {
    const load = () => getWatchlist().then(setItems);
    load();
    window.addEventListener('cr-watchlist', load);
    (async () => {
      try {
        const m = await fetch(STATIC ? dataUrl('market.json') : '/api/market?n=250', { cache: 'no-store' }).then((r) => r.json());
        setCoins(m.coins ?? []);
        setMeta({ source: m.source, at: m.fetchedAt });
        const n = await fetch(STATIC ? dataUrl('news.json') : '/api/news?limit=100', { cache: 'no-store' }).then((r) => r.json());
        setNews((n.items ?? []).map((x: Record<string, unknown>) => (STATIC
          ? { id: x.id, title: (x.ti as string) || (x.t as string), at: x.at, source: x.s, sid: x.sid, coins: x.c }
          : { id: x.id, title: (x.titleIt as string) || (x.title as string), at: x.publishedAt, source: x.sourceName, sid: x.sourceId, coins: x.coins })) as N[]);
      } catch { /* dati non disponibili */ }
    })();
    return () => window.removeEventListener('cr-watchlist', load);
  }, []);

  if (!items) return <p className="text-sm text-mute">Caricamento…</p>;
  if (!items.length) return <section className="card p-6 text-center text-sm text-mute">La watchlist è vuota. Aggiungi elementi qui sopra o con la stella ☆ presente in tutte le tabelle.</section>;
  const byId = new Map(coins.map((c) => [c.id, c]));
  const coinIds = items.filter((i) => i.type === 'coin').map((i) => i.id);
  const texts = items.filter((i) => i.type !== 'coin' && i.type !== 'expert').map((i) => i.label.toLowerCase());
  const experts = items.filter((i) => i.type === 'expert').map((i) => i.id);
  const feed = news.filter((n) => n.coins?.some((c) => coinIds.includes(c)) || experts.includes(n.sid) || texts.some((t) => n.title.toLowerCase().includes(t))).slice(0, 40);
  return (
    <div className="space-y-4">
      {Object.keys(LBL).map((t) => {
        const list = items.filter((i) => i.type === t);
        if (!list.length) return null;
        return (
          <section key={t} className="card">
            <div className="card-h">{LBL[t]}</div>
            {t === 'coin' ? (
              <div className="overflow-x-auto"><table className="tbl"><thead><tr><th></th><th>Nome</th><th className="text-right">Prezzo</th><th className="text-right">1h</th><th className="text-right">24h</th><th className="text-right">7g</th></tr></thead>
                <tbody>{list.map((i) => { const c = byId.get(i.id); return (
                  <tr key={i.id}><td><WatchButton type="coin" id={i.id} label={i.label} small /></td>
                    <td>{c || !STATIC ? <Link href={`/coin/${i.id}`} className="hover:underline">{c?.name ?? i.label}</Link> : i.label} <span className="text-xs text-mute">{c?.symbol}</span></td>
                    <td className="text-right tabular-nums">{c ? fmtUsd(c.price) : <span className="text-xs text-mute">fuori dalle prime 250</span>}</td><td className="text-right"><P v={c?.ch1h ?? null} /></td><td className="text-right"><P v={c?.ch24h ?? null} /></td><td className="text-right"><P v={c?.ch7d ?? null} /></td></tr>); })}</tbody></table></div>
            ) : <ul className="flex flex-wrap gap-2 p-4">{list.map((i) => <li key={i.id} className="chip border-line py-1 text-sm"><WatchButton type={i.type} id={i.id} label={i.label} small /> {i.label}</li>)}</ul>}
          </section>
        );
      })}
      <section className="card">
        <div className="card-h">Notizie sugli elementi seguiti</div>
        {feed.length ? <ul className="divide-y divide-line">{feed.map((n) => <li key={n.id} className="px-4 py-2.5 text-sm"><div className="text-[11px] text-mute">{n.source} · <Ago iso={n.at} /></div><Link href={`/notizia/${n.id}`} className="font-medium hover:underline">{n.title}</Link></li>)}</ul> : <p className="p-4 text-sm text-mute">Nessuna notizia recente sugli elementi seguiti.</p>}
      </section>
      <p className="text-[11px] text-mute">Prezzi: {meta.source ?? 'n.d.'}, dato periodico{meta.at ? <> aggiornato <Ago iso={meta.at} /></> : null}. {STATIC ? 'La watchlist è salvata solo in questo browser.' : 'La watchlist è legata a un identificativo anonimo memorizzato in un cookie di questo browser: cancellando i cookie viene persa.'}</p>
    </div>
  );
}
