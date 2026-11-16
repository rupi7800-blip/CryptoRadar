import { getCache } from '@/lib/db';
import { Card, PageHeader, Freshness, Pct, Empty, Disclaimer, Unavailable } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';
import { fmtUsd, fmtNum } from '@/lib/text';
import WatchButton from '@/components/WatchButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Exchange' };

type Ex = { id: string; name: string; image: string | null; country: string | null; year: number | null; url: string | null; trustScore: number | null; volumeBtc24h: number | null; volumeUsd24h: number | null; rank: number | null };
type Cex = { slug: string; name: string; tvl: number; ch1d: number | null; ch7d: number | null; url: string | null };

export default async function Exchange({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ex = getCache<Ex[]>('market:exchanges');
  const cex = getCache<Cex[]>('defi:cex');
  const official = listNews({ sourceCategory: 'official-exchange', limit: 20, dedupe: false });
  const listings = official.filter((n) => /\b(list|listing|will add|launch|new (spot|perpetual|futures|pair))/i.test(n.title) && !/delist/i.test(n.title));
  const delist = official.filter((n) => /delist|remov|discontinu|suspend/i.test(n.title));
  const incidents = listNews({ sourceCategory: 'official-exchange', q: 'incident OR degraded OR outage OR maintenance OR investigating', limit: 8, dedupe: false });
  const security = listNews({ section: 'exchange', flag: 'urgent', limit: 8 });
  return (
    <div className="space-y-4">
      <PageHeader title="Exchange" desc="Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Bitget, Crypto.com, Uniswap, PancakeSwap e altri" color="#eab308" />
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="chip border-info/40 bg-info/10 text-info">UFFICIALE = comunicazione diretta dell&apos;exchange</span>
        <span className="chip border-up/40 text-up">Confermata = fonte ufficiale presente</span>
        <span className="chip border-warn/40 text-warn">Non verificata / Indiscrezione = da trattare con cautela</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Nuove quotazioni (annunci ufficiali)"><NewsList items={listings.slice(0, 8)} compact empty="Nessun annuncio di listing nel periodo." /></Card>
        <Card title="Delisting e sospensioni (annunci ufficiali)"><NewsList items={delist.slice(0, 8)} compact empty="Nessun delisting annunciato nel periodo." /></Card>
        <Card title="Problemi tecnici e manutenzioni (status page)"><NewsList items={incidents} compact empty="Nessun incidente segnalato dalle status page monitorate." /></Card>
        <Card title="Problemi di sicurezza"><NewsList items={security} compact empty="Nessun problema di sicurezza recente sugli exchange." /></Card>
      </div>
      <Card title="Riserve on-chain monitorate (Proof of Reserves)" right={<Freshness fetchedAt={cex.fetchedAt} source={cex.source} error={cex.error} everySec={900} />}>
        {cex.value?.length ? (
          <div className="overflow-x-auto"><table className="tbl"><thead><tr><th></th><th>Exchange</th><th className="text-right">Asset on-chain</th><th className="text-right">1g</th><th className="text-right">7g</th></tr></thead>
            <tbody>{cex.value.slice(0, 20).map((c) => <tr key={c.slug}><td><WatchButton type="exchange" id={c.slug} label={c.name} small /></td><td>{c.name}</td><td className="text-right tabular-nums">{fmtUsd(c.tvl, { compact: true })}</td><td className="text-right"><Pct v={c.ch1d} /></td><td className={`text-right ${c.ch7d != null && c.ch7d < -15 ? 'font-bold' : ''}`}><Pct v={c.ch7d} /></td></tr>)}</tbody></table></div>
        ) : <Empty>Non disponibile.</Empty>}
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Somma degli indirizzi pubblicamente attribuiti a ciascun exchange (DefiLlama CEX Transparency). Non include le passività: non è una prova di solvibilità. Forti cali possono riflettere prelievi massicci o variazioni di prezzo.</p>
      </Card>
      <Card id="classifica" title="Classifica exchange per volume" right={<Freshness fetchedAt={ex.fetchedAt} source={ex.source} error={ex.error} everySec={3600} />}>
        {ex.value?.length ? (
          <div className="overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th></th><th>#</th><th>Exchange</th><th>Paese</th><th className="text-right">Punteggio fiducia</th><th className="text-right">Volume 24h</th></tr></thead>
            <tbody>{ex.value.slice(0, 30).map((e) => <tr key={e.id}><td><WatchButton type="exchange" id={e.id} label={e.name} small /></td><td className="text-mute">{e.rank ?? '—'}</td><td>{e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{e.name}</a> : e.name}</td><td className="text-xs text-mute">{e.country ?? 'n.d.'}</td><td className="text-right">{e.trustScore ?? 'n.d.'}/10</td><td className="text-right tabular-nums">{e.volumeBtc24h != null ? `${fmtNum(e.volumeBtc24h)} BTC` : fmtUsd(e.volumeUsd24h, { compact: true })}</td></tr>)}</tbody></table></div>
        ) : <Empty>{ex.error ? `Non disponibile: ${ex.error.slice(0, 120)}` : 'In caricamento…'}</Empty>}
      </Card>
      <Unavailable title="Annunci ufficiali Binance, KuCoin, Bitget, Crypto.com">Questi exchange non offrono un feed RSS o un&apos;API pubblica documentata per gli annunci. Le loro notizie arrivano tramite le testate monitorate (stato di verifica indicato). Gli annunci ufficiali sono integrati per Bybit e OKX (API pubbliche), Kraken (blog) e Coinbase/Kraken (status page). Altre fonti si possono aggiungere da Admin → Fonti.</Unavailable>
      <SectionNews title="Tutte le notizie sugli exchange" filter={{ section: 'exchange' }} sp={sp} basePath="/exchange" />
      <Disclaimer />
    </div>
  );
}
