import Link from 'next/link';
import { Card, PageHeader, Freshness, Empty, Disclaimer, Pct } from '@/components/ui';
import { CoinTable } from '@/components/CoinTable';
import { marketSnapshot, anomalies, rankings } from '@/lib/market/derived';
import { trendingTopics } from '@/lib/news';
import { fmtUsd } from '@/lib/text';
import type { Coin } from '@/lib/market/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mercato' };

export default async function Mercato({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { top, glob, fg } = marketSnapshot();
  const coins = top.value ?? [];
  const page = Math.max(1, Math.min(5, Number(sp.page) || 1));
  const r = rankings(coins);
  const anom = anomalies();
  const interest = trendingTopics().rising.filter((x) => x.growth > 0);
  const byId = new Map(coins.map((c) => [c.id, c]));
  const g = glob.value;
  return (
    <div className="space-y-4">
      <PageHeader title="Mercato" desc="Prezzi, variazioni, capitalizzazione, volumi, dominance, supply, massimi e minimi storici" color="#14b8a6" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card px-4 py-3"><div className="text-xs text-mute">Capitalizzazione totale</div><div className="text-lg font-bold">{fmtUsd(g?.totalMarketCap, { compact: true })}</div><Pct v={g?.marketCapChange24h} className="text-xs" /></div>
        <div className="card px-4 py-3"><div className="text-xs text-mute">Volume 24h</div><div className="text-lg font-bold">{fmtUsd(g?.totalVolume, { compact: true })}</div></div>
        <div className="card px-4 py-3"><div className="text-xs text-mute">Dominance</div><div className="text-lg font-bold">BTC {g?.btcDominance?.toFixed(1) ?? 'n.d.'}%</div><div className="text-xs text-mute">ETH {g?.ethDominance?.toFixed(1) ?? 'n.d.'}%</div></div>
        <div className="card px-4 py-3"><div className="text-xs text-mute">Fear &amp; Greed (30 giorni)</div>
          <div className="mt-1 flex h-8 items-end gap-px">{(fg.value ?? []).slice().reverse().map((d) => <div key={d.at} title={`${new Date(d.at).toLocaleDateString('it-IT')}: ${d.value} (${d.label})`} className="flex-1 rounded-t" style={{ height: `${d.value}%`, background: d.value < 25 ? '#ef4444' : d.value < 45 ? '#f97316' : d.value < 55 ? '#eab308' : '#22c55e' }} />)}</div>
          <div className="text-xs text-mute">oggi: {fg.value?.[0]?.value ?? 'n.d.'} — {fg.value?.[0]?.label ?? ''}</div></div>
      </div>
      <div className="px-1"><Freshness fetchedAt={top.fetchedAt} source={top.source} error={top.error} everySec={180} /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Rank title="Maggiori rialzi 24h" list={r.gainers} f={(c) => <Pct v={c.ch24h} />} />
        <Rank title="Maggiori ribassi 24h" list={r.losers} f={(c) => <Pct v={c.ch24h} />} />
        <Rank title="Maggiori volumi" list={r.volume} f={(c) => fmtUsd(c.volume24h, { compact: true })} />
        <Card title="Maggiore crescita di interesse" right={<span className="text-[10px] text-mute">menzioni nelle notizie</span>}>
          {interest.length ? <ul className="divide-y divide-line text-sm">{interest.map((x) => { const c = byId.get(x.id); return <li key={x.id} className="flex justify-between px-4 py-1.5"><Link href={`/coin/${x.id}${c ? `?src=${c.idSource}` : ''}`} className="hover:underline">{c?.name ?? x.id}</Link><span className="text-xs text-mute">{x.prev} → {x.n} eventi</span></li>; })}</ul> : <Empty>Dati insufficienti (servono 48 ore di notizie).</Empty>}
        </Card>
      </div>
      <Card id="anomalie" title="Movimenti anomali" right={<span className="text-[10px] text-mute">soglie: ±5% in 1h, ±15% in 24h, volume/cap ≥ 60%, volume +60%, stablecoin fuori peg</span>}>
        {anom.length ? <ul className="divide-y divide-line">{anom.map((a) => <li key={a.coin.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"><Link href={`/coin/${a.coin.id}?src=${a.coin.idSource}`} className="font-medium hover:underline">{a.coin.name}</Link><span className="text-xs text-mute">{a.coin.symbol} · #{a.coin.rank}</span><span className="text-xs text-warn">{a.reasons.join(' · ')}</span></li>)}</ul> : <Empty>Nessun movimento anomalo.</Empty>}
      </Card>
      <Card title={`Classifica per capitalizzazione (${(page - 1) * 50 + 1}–${Math.min(page * 50, coins.length)} di ${coins.length})`}>
        {coins.length ? <CoinTable coins={coins.slice((page - 1) * 50, page * 50)} /> : <Empty>Dati non disponibili. {top.error}</Empty>}
        <div className="flex gap-1 border-t border-line px-4 py-2 text-sm">{[1, 2, 3, 4, 5].map((p) => <Link key={p} href={`/mercato?page=${p}`} className={`chip ${p === page ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>{p}</Link>)}</div>
      </Card>
      <Disclaimer />
    </div>
  );
}

function Rank({ title, list, f }: { title: string; list: Coin[]; f: (c: Coin) => React.ReactNode }) {
  return (
    <Card title={title}>
      {list.length ? <ol className="divide-y divide-line text-sm">{list.map((c, i) => <li key={c.id} className="flex items-center gap-2 px-4 py-1.5"><span className="w-4 text-xs text-mute">{i + 1}</span><Link href={`/coin/${c.id}?src=${c.idSource}`} className="truncate hover:underline">{c.name}</Link><span className="text-xs text-mute">{c.symbol}</span><span className="ml-auto tabular-nums">{f(c)}</span></li>)}</ol> : <Empty>n.d.</Empty>}
    </Card>
  );
}
