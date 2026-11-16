import Link from 'next/link';
import { all, getCache } from '@/lib/db';
import { deviceId } from '@/lib/device';
import { Card, PageHeader, Empty, Pct } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { listNews, type NewsItem } from '@/lib/news';
import type { Coin } from '@/lib/market/types';
import { fmtUsd } from '@/lib/text';
import WatchButton from '@/components/WatchButton';
import AddCoin from '@/components/AddCoin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Watchlist' };

type W = { type: 'coin' | 'exchange' | 'project' | 'expert' | 'topic'; id: string; label: string };
const LBL: Record<string, string> = { coin: 'Criptovalute', exchange: 'Exchange', project: 'Progetti', expert: 'Esperti e fonti', topic: 'Argomenti' };

export default async function Watchlist() {
  const d = await deviceId();
  const items = d ? all<W>('SELECT item_type AS type, item_id AS id, label FROM watchlist WHERE device_id = ? ORDER BY added_at DESC', d) : [];
  const coins = getCache<Coin[]>('market:top');
  const byId = new Map((coins.value ?? []).map((c) => [c.id, c]));
  const news: NewsItem[] = [];
  for (const it of items) {
    if (it.type === 'coin') news.push(...listNews({ coin: it.id, limit: 5 }));
    else if (it.type === 'expert') news.push(...listNews({ sourceId: it.id, limit: 5 }));
    else news.push(...listNews({ q: it.label, limit: 5 }));
  }
  const feed = [...new Map(news.map((n) => [n.clusterId, n])).values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 30);
  const groups = Object.keys(LBL).map((t) => [t, items.filter((i) => i.type === t)] as const).filter(([, l]) => l.length);
  return (
    <div className="space-y-4">
      <PageHeader title="La mia watchlist" desc="Criptovalute, exchange, progetti, esperti e argomenti che segui. Salvata in forma anonima su questo dispositivo.">
        <Link href="/alert" className="btn">🔔 Imposta avvisi</Link>
      </PageHeader>
      <Card title="Aggiungi"><AddCoin /></Card>
      {!items.length && <Card><Empty>La watchlist è vuota. Aggiungi elementi qui sopra o con la stella ☆ presente in tutte le tabelle.</Empty></Card>}
      {groups.map(([t, list]) => (
        <Card key={t} title={LBL[t]}>
          {t === 'coin' ? (
            <div className="overflow-x-auto"><table className="tbl"><thead><tr><th></th><th>Nome</th><th className="text-right">Prezzo</th><th className="text-right">1h</th><th className="text-right">24h</th><th className="text-right">7g</th></tr></thead>
              <tbody>{list.map((i) => { const c = byId.get(i.id); return <tr key={i.id}><td><WatchButton type="coin" id={i.id} label={i.label} small /></td><td><Link href={`/coin/${i.id}${c ? `?src=${c.idSource}` : ''}`} className="hover:underline">{c?.name ?? i.label}</Link> <span className="text-xs text-mute">{c?.symbol}</span></td><td className="text-right tabular-nums">{c ? fmtUsd(c.price) : <span className="text-xs text-mute">fuori top 250 — apri la scheda</span>}</td><td className="text-right"><Pct v={c?.ch1h} /></td><td className="text-right"><Pct v={c?.ch24h} /></td><td className="text-right"><Pct v={c?.ch7d} /></td></tr>; })}</tbody></table></div>
          ) : (
            <ul className="flex flex-wrap gap-2 p-4">{list.map((i) => <li key={i.id} className="chip border-line py-1 text-sm"><WatchButton type={i.type} id={i.id} label={i.label} small /> {i.label}</li>)}</ul>
          )}
        </Card>
      ))}
      {items.length > 0 && <Card title="Notizie sugli elementi seguiti"><NewsList items={feed} empty="Nessuna notizia recente sugli elementi seguiti." /></Card>}
      <p className="text-[11px] text-mute">Prezzi: {coins.source ?? 'n.d.'}, dato periodico. La watchlist è legata a un identificativo anonimo memorizzato in un cookie di questo browser: cancellando i cookie viene persa.</p>
    </div>
  );
}
