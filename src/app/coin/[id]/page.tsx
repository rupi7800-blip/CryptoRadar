import Link from 'next/link';
import { notFound } from 'next/navigation';
import { coinDetail } from '@/lib/market/detail';
import { listNews } from '@/lib/news';
import { Card, PageHeader, Pct, Disclaimer, Empty } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import CoinChart from '@/components/CoinChart';
import WatchButton from '@/components/WatchButton';
import { fmtUsd, fmtNum, fmtDateTime, timeAgo } from '@/lib/text';
import { getCache } from '@/lib/db';
import type { Coin } from '@/lib/market/types';

export const dynamic = 'force-dynamic';

export default async function CoinPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/i.test(id)) notFound();
  const src = sp.src === 'coinpaprika' ? 'coinpaprika' : 'coingecko';
  const { data: d, error, stale } = await coinDetail(id, src);
  // le notizie sono indicizzate con gli id della fonte di mercato attiva
  const top = getCache<Coin[]>('market:top').value ?? [];
  const newsIds = [id, ...(d ? top.filter((c) => c.symbol === d.symbol).map((c) => c.id) : [])];
  const news = [...new Map(newsIds.flatMap((x) => listNews({ coin: x, limit: 15 })).map((n) => [n.id, n])).values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 15);
  if (!d) {
    return (
      <div className="space-y-4">
        <PageHeader title={id} desc="Dati della criptovaluta" />
        <Card title="Dati non disponibili"><Empty>Impossibile recuperare i dati da CoinGecko e CoinPaprika: {error}. Nessun valore viene mostrato per non presentare dati inventati.</Empty></Card>
        <Card title="Notizie correlate"><NewsList items={news} /></Card>
      </div>
    );
  }
  const m = d.market;
  return (
    <div className="space-y-4">
      <PageHeader title={`${d.name} (${d.symbol})`} desc={`${d.rank ? `#${d.rank} per capitalizzazione · ` : ''}${d.categories.slice(0, 3).join(' · ')}`}>
        <WatchButton type="coin" id={id} label={d.name} />
      </PageHeader>
      {stale && <p className="text-xs text-warn">⚠ Dati NON aggiornati (ultimo errore: {error}). Mostrato l&apos;ultimo valore valido del {fmtDateTime(d.fetchedAt)}.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <B l="Prezzo" v={fmtUsd(m.price)} s={<><Pct v={m.ch1h} /> 1h · <Pct v={m.ch24h} /> 24h</>} />
        <B l="Variazioni" v="" s={<span className="flex flex-wrap gap-x-2">7g <Pct v={m.ch7d} /> 30g <Pct v={m.ch30d} /> 1a <Pct v={m.ch1y} /></span>} />
        <B l="Capitalizzazione" v={fmtUsd(m.marketCap, { compact: true })} s={<span className="text-mute">FDV {fmtUsd(m.fdv, { compact: true })}</span>} />
        <B l="Volume 24h" v={fmtUsd(m.volume24h, { compact: true })} s={<span className="text-mute">{m.volume24h && m.marketCap ? `${((m.volume24h / m.marketCap) * 100).toFixed(1)}% della cap.` : ''}</span>} />
      </div>
      <p className="px-1 text-[11px] text-mute">Fonte: {d.source} · aggiornato {timeAgo(m.lastUpdated ?? d.fetchedAt)} · dato periodico (cache 10 min)</p>
      <Card title="Grafico prezzo"><CoinChart id={d.src === 'coingecko' ? d.id : id} symbol={d.symbol} /></Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Tokenomics e offerta">
          <dl className="grid grid-cols-2 gap-3 p-4 text-sm">
            <D l="Circolante" v={fmtNum(m.circulating)} /><D l="Totale" v={fmtNum(m.totalSupply)} /><D l="Massima" v={m.maxSupply ? fmtNum(m.maxSupply) : 'illimitata / n.d.'} />
            <D l="% in circolazione" v={m.circulating && m.maxSupply ? `${((m.circulating / m.maxSupply) * 100).toFixed(1)}%` : 'n.d.'} />
            <D l="Massimo storico" v={fmtUsd(m.ath)} s={m.athDate ? fmtDateTime(m.athDate).slice(0, 10) : ''} /><D l="Minimo storico" v={fmtUsd(m.atl)} s={m.atlDate ? fmtDateTime(m.atlDate).slice(0, 10) : m.atl == null ? 'non fornito dalla fonte' : ''} />
          </dl>
          {m.fdv && m.marketCap && m.fdv / m.marketCap > 2 && <p className="px-4 pb-3 text-xs text-warn">⚠ FDV pari a {(m.fdv / m.marketCap).toFixed(1)}× la capitalizzazione: una quota rilevante di token deve ancora entrare in circolazione (possibile pressione di vendita da sblocchi).</p>}
        </Card>
        <Card title="Attività degli sviluppatori">
          {d.developer && (d.developer.commits4w != null || d.developer.stars != null) ? (
            <dl className="grid grid-cols-2 gap-3 p-4 text-sm"><D l="Commit (4 settimane)" v={fmtNum(d.developer.commits4w)} /><D l="Contributori PR" v={fmtNum(d.developer.contributors)} /><D l="Stelle GitHub" v={fmtNum(d.developer.stars)} /><D l="Fork" v={fmtNum(d.developer.forks)} /></dl>
          ) : <Empty>Dati di sviluppo non forniti dalla fonte per questo progetto.</Empty>}
          {d.developer?.repo && <a href={d.developer.repo} target="_blank" rel="noopener noreferrer" className="block px-4 pb-3 text-xs text-accent">Repository ↗</a>}
        </Card>
        <Card title="Collegamenti ufficiali">
          <ul className="space-y-1 p-4 text-sm">{d.links.length ? d.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">{l.label} ↗</a></li>) : <li className="text-mute">n.d.</li>}</ul>
          {d.platforms.length > 0 && <div className="px-4 pb-3 text-xs text-mute"><div className="mb-1 font-semibold text-ink">Contratti</div>{d.platforms.map((p) => <div key={p.chain} className="truncate font-mono" data-notranslate>{p.chain}: {p.address}</div>)}<div className="mt-1">Verifica sempre l&apos;indirizzo sul sito ufficiale: esistono token contraffatti con lo stesso nome.</div></div>}
        </Card>
      </div>
      {d.description && <Card title="Descrizione"><p className="whitespace-pre-line p-4 text-sm text-mute">{d.description}</p><p className="px-4 pb-3 text-[11px] text-mute">Testo fornito da {d.source} (in inglese; usa il tasto di traduzione in alto).</p></Card>}
      <Card title={`Notizie su ${d.name}`}><NewsList items={news} empty="Nessuna notizia recente associata." /></Card>
      <p className="text-xs text-mute"><Link href="/alert" className="text-accent">Crea un avviso</Link> su prezzo, variazione o notizie di {d.symbol}.</p>
      <Disclaimer />
    </div>
  );
}
function B({ l, v, s }: { l: string; v: string; s?: React.ReactNode }) {
  return <div className="card px-4 py-3"><div className="text-xs text-mute">{l}</div>{v && <div className="text-xl font-bold tabular-nums">{v}</div>}{s && <div className="text-xs">{s}</div>}</div>;
}
function D({ l, v, s }: { l: string; v: string; s?: string }) {
  return <div><dt className="text-xs text-mute">{l}</dt><dd className="font-semibold tabular-nums">{v}</dd>{s && <dd className="text-[11px] text-mute">{s}</dd>}</div>;
}
