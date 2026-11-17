import Link from 'next/link';
import Ago from '@/components/Ago';
import { Card, Pct, Freshness, Empty, Disclaimer } from '@/components/ui';
import { NewsList, NewsCard } from '@/components/NewsCard';
import LivePrices from '@/components/LivePrices';
import { Gauge } from '@/components/Charts';
import { topNews, listNews, mostRead, officialUpdates, trendingTopics, tickerNews } from '@/lib/news';
import { marketSnapshot, anomalies, isStable } from '@/lib/market/derived';
import { getCache } from '@/lib/db';
import { fmtUsd, fmtPct, timeAgo } from '@/lib/text';
import { SECTION_LABEL } from '@/lib/sections';
import { aiAvailable, DISCLAIMER } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { top, glob, fg } = marketSnapshot();
  const g = glob.value;
  const fgNow = fg.value?.[0];
  const trending = getCache<{ coins: { id: string; name: string; symbol: string; rank: number | null; image: string | null; ch24h: number | null }[] }>('market:trending');
  const briefing = getCache<{ titolo: string; punti_chiave: string[]; rischi: string[]; da_monitorare: string[]; argomenti_emergenti: string[]; _model: string }>('ai:briefing');
  const breaking = tickerNews(30).filter((n) => n.isBreaking || n.flags.includes('urgent')).slice(0, 4);
  const important = topNews(8, 24);
  const latest = listNews({ limit: 15 });
  const read = mostRead(5, 'reads');
  const shared = mostRead(5, 'shares');
  const official = officialUpdates(6);
  const topics = trendingTopics();
  const anom = anomalies().slice(0, 6);
  const coins = (top.value ?? []).filter((c) => !isStable(c) && !/[_]/.test(c.symbol) && !/heloc|wrapped|staked/i.test(c.name)).slice(0, 10).map(({ sparkline, ...c }) => c);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Crypto Radar — il mondo cripto, sotto controllo</h1>
      {breaking.length > 0 && (
        <section className="rounded-xl border border-down/50 bg-down/10 p-3" aria-label="Notizie urgenti">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-down"><span className="pulse-dot">●</span> IN EVIDENZA ORA</div>
          <ul className="space-y-1">
            {breaking.map((n) => (
              <li key={n.id} className="text-sm"><Link href={`/notizia/${n.id}`} className="font-semibold hover:underline"><span className="t-it">{n.titleIt || n.title}</span><span className="t-orig">{n.title}</span></Link> <span className="text-xs text-mute">· {n.sourceName} · <Ago iso={n.publishedAt} /> · {n.status.toLowerCase()}</span></li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Capitalizzazione totale" value={fmtUsd(g?.totalMarketCap, { compact: true })} sub={<Pct v={g?.marketCapChange24h} />} />
        <Stat label="Volume 24h" value={fmtUsd(g?.totalVolume, { compact: true })} />
        <Stat label="Dominance BTC" value={g?.btcDominance != null ? fmtPct(g.btcDominance).replace('+', '') : 'n.d.'} sub={g?.ethDominance != null ? <span className="text-mute">ETH {g.ethDominance.toFixed(1)}%</span> : null} />
        <Stat label="Criptovalute attive" value={g?.activeCryptos?.toLocaleString('it-IT') ?? 'n.d.'} sub={<span className="text-mute">{glob.source ?? ''}</span>} />
        <div className="card col-span-2 flex items-center gap-3 px-4 py-3 lg:col-span-1">
          {fgNow ? <Gauge value={fgNow.value} label={fgNow.label} /> : <span className="text-sm text-mute">n.d.</span>}
          <div className="text-xs"><div className="text-mute">Fear &amp; Greed</div><div className="font-semibold">{fgNow?.label ?? 'n.d.'}</div><div className="text-mute">{fgNow ? `del ${new Date(fgNow.at).toLocaleDateString('it-IT')}` : ''}</div></div>
        </div>
      </div>
      <div className="-mt-2 px-1"><Freshness fetchedAt={glob.fetchedAt} source={glob.source} error={glob.error} everySec={600} /></div>

      <Card title="Prezzi principali" right={<Link href="/mercato" className="text-xs text-accent">Tutto il mercato →</Link>}>
        {coins.length ? <LivePrices initial={coins} fetchedAt={top.fetchedAt} source={top.source} /> : <Empty>Dati di mercato in caricamento (primo aggiornamento entro pochi minuti dall&apos;avvio).{top.error && <span className="block text-warn">Ultimo errore: {top.error}</span>}</Empty>}
      </Card>

      {briefing.value ? (
        <Card title={<span>✦ Briefing AI · <span className="font-normal text-mute">{briefing.value.titolo}</span></span>} right={<span className="text-[11px] text-mute"><Ago iso={briefing.fetchedAt} /></span>}>
          <div className="grid gap-4 p-4 text-sm md:grid-cols-3">
            <div className="md:col-span-2"><ul className="list-disc space-y-1 pl-5">{briefing.value.punti_chiave.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
            <div className="space-y-3 text-xs">
              {briefing.value.rischi.length > 0 && <div><div className="mb-1 font-semibold text-warn">Rischi</div><ul className="list-disc pl-4 text-mute">{briefing.value.rischi.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
              {briefing.value.da_monitorare.length > 0 && <div><div className="mb-1 font-semibold text-info">Da monitorare</div><ul className="list-disc pl-4 text-mute">{briefing.value.da_monitorare.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
            </div>
            <p className="text-[11px] text-mute md:col-span-3">⚠ {DISCLAIMER}</p>
          </div>
        </Card>
      ) : !aiAvailable() ? null : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Notizie più importanti di oggi" right={<span className="text-[11px] text-mute">per importanza, conferme e attualità</span>}>
            <NewsList items={important} empty="Raccolta in corso: le prime notizie arrivano entro qualche minuto dall'avvio." />
          </Card>
          <Card title="Ultime notizie" right={<Link href="/archivio" className="text-xs text-accent">Archivio →</Link>}>
            <NewsList items={latest} compact />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Trending coin" right={<span className="text-[11px] text-mute">{trending.source ?? ''}</span>}>
            {trending.value?.coins?.length ? (
              <ul className="divide-y divide-line">
                {trending.value.coins.slice(0, 8).map((c) => (
                  <li key={c.id}><Link href={`/coin/${c.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-panel2">
                    {c.image && <img src={c.image} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full" loading="lazy" />}
                    <span className="font-medium">{c.name}</span><span className="text-xs text-mute">{c.symbol}{c.rank ? ` #${c.rank}` : ''}</span>
                    <span className="ml-auto"><Pct v={c.ch24h} /></span>
                  </Link></li>
                ))}
              </ul>
            ) : <Empty>{trending.error ? `Non disponibile: ${trending.error.slice(0, 100)}` : 'In caricamento…'}</Empty>}
            <div className="px-4 pb-2"><Freshness fetchedAt={trending.fetchedAt} source={trending.source} everySec={900} /></div>
          </Card>
          <Card title="Movimenti anomali" right={<Link href="/mercato#anomalie" className="text-xs text-accent">tutti →</Link>}>
            {anom.length ? (
              <ul className="divide-y divide-line">{anom.map((a) => (
                <li key={a.coin.id} className="px-4 py-2 text-sm"><Link href={`/coin/${a.coin.id}?src=${a.coin.idSource}`} className="font-medium hover:underline">{a.coin.name} <span className="text-xs text-mute">{a.coin.symbol}</span></Link><div className="text-xs text-warn">{a.reasons.join(' · ')}</div></li>
              ))}</ul>
            ) : <Empty>Nessun movimento anomalo rilevato sulle prime 250 criptovalute.</Empty>}
          </Card>
          <Card title="Argomenti di tendenza (24h)">
            <div className="flex flex-wrap gap-1.5 p-4">
              {topics.categories.slice(0, 8).map(([c, n]) => <Link key={c} href={`/cerca?section=${c}`} className="chip border-line text-mute hover:text-ink">{SECTION_LABEL[c] ?? c} · {n}</Link>)}
              {topics.coins.slice(0, 8).map((c) => <Link key={c.id} href={`/coin/${c.id}`} className="chip border-accent/30 text-accent">{c.id} · {c.n}{c.growth > 0 ? ' ↑' : ''}</Link>)}
              {topics.phrases.slice(0, 8).map((p) => <Link key={p.phrase} href={`/cerca?q=${encodeURIComponent(p.phrase)}`} className="chip border-line text-ink">“{p.phrase}”</Link>)}
              {!topics.categories.length && <span className="text-sm text-mute">Dati insufficienti.</span>}
            </div>
          </Card>
          <Card title="Aggiornamenti ufficiali">
            {official.length ? official.map((n) => <NewsCard key={n.id} n={n} compact />) : <Empty>Nessun aggiornamento ufficiale recente.</Empty>}
          </Card>
          <Card title="Più lette su Crypto Radar">{read.length ? read.map((n) => <NewsCard key={n.id} n={n} compact />) : <Empty>Ancora nessuna lettura registrata.</Empty>}</Card>
          <Card title="Più condivise su Crypto Radar">{shared.length ? shared.map((n) => <NewsCard key={n.id} n={n} compact />) : <Empty>Ancora nessuna condivisione registrata.</Empty>}</Card>
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-mute">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs">{sub}</div>}
    </div>
  );
}
