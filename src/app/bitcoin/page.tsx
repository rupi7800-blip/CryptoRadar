import Link from 'next/link';
import { getCache } from '@/lib/db';
import type { Coin, GlobalMarket } from '@/lib/market/types';
import { Card, PageHeader, Pct, Freshness, Unavailable, Disclaimer, Empty } from '@/components/ui';
import { SectionNews } from '@/components/SectionNews';
import { NewsList } from '@/components/NewsCard';
import CoinChart from '@/components/CoinChart';
import WatchButton from '@/components/WatchButton';
import { listNews } from '@/lib/news';
import { fmtUsd, fmtNum, fmtDateTime, timeAgo } from '@/lib/text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bitcoin' };

type Net = {
  height: number; difficulty: number | null; hashrate: number | null; hashrateSeries: { t: number; v: number }[];
  difficultyAdjustment: { progress: number; change: number; remainingBlocks: number; estimatedDate: string | null; previous: number };
  fees: { fastestFee: number; halfHourFee: number; hourFee: number; economyFee: number };
  halving: { nextHeight: number; blocksLeft: number; estimatedDate: string; subsidyNow: number; subsidyNext: number };
  lightning: { channels: number; nodes: number; capacityBtc: number; snapshotDate: string } | null;
};

export default async function Bitcoin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const btc = (getCache<Coin[]>('market:top').value ?? []).find((c) => c.id === 'bitcoin' || c.id === 'btc-bitcoin');
  const top = getCache<Coin[]>('market:top');
  const glob = getCache<GlobalMarket>('market:global').value;
  const net = getCache<Net>('btc:network');
  const whales = getCache<{ threshold: number; scope: string; items: { txid: string; btc: number; at: string; where: string }[] }>('btc:whales');
  const n = net.value;
  const lnAgeDays = n?.lightning ? (Date.now() - Date.parse(n.lightning.snapshotDate)) / 86400e3 : null;
  const etf = listNews({ q: 'ETF', coin: 'bitcoin', limit: 6 });
  const inst = listNews({ q: 'treasury OR institutional OR BlackRock OR Strategy', section: 'bitcoin', limit: 6 });
  return (
    <div className="space-y-4">
      <PageHeader title="Bitcoin" desc="Prezzo, rete, mining, halving, Lightning, ETF e adozione" color="#f7931a">
        <WatchButton type="coin" id="bitcoin" label="Bitcoin" />
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Box label="Prezzo BTC" value={fmtUsd(btc?.price)} sub={<><Pct v={btc?.ch1h} /> 1h · <Pct v={btc?.ch24h} /> 24h · <Pct v={btc?.ch7d} /> 7g</>} />
        <Box label="Capitalizzazione" value={fmtUsd(btc?.marketCap, { compact: true })} sub={<span className="text-mute">Dominance {glob?.btcDominance?.toFixed(2) ?? 'n.d.'}%</span>} />
        <Box label="Volume 24h" value={fmtUsd(btc?.volume24h, { compact: true })} sub={<span className="text-mute">Offerta {fmtNum(btc?.circulating)} / 21.000.000</span>} />
        <Box label="Massimo storico" value={fmtUsd(btc?.ath)} sub={<span className="text-mute">{btc?.athDate ? fmtDateTime(btc.athDate).slice(0, 10) : 'n.d.'}{btc?.ath && btc.price ? ` · ${(((btc.price - btc.ath) / btc.ath) * 100).toFixed(1)}% dall'ATH` : ''}</span>} />
      </div>
      <div className="px-1"><Freshness fetchedAt={top.fetchedAt} source={top.source} error={top.error} everySec={180} /></div>
      <Card title="Grafico prezzo"><CoinChart id={btc?.idSource === 'coinpaprika' ? 'bitcoin' : btc?.id ?? 'bitcoin'} symbol="BTC" /></Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Rete e mining" right={<span className="text-[11px] text-mute">mempool.space</span>}>
          {n ? (
            <dl className="grid grid-cols-2 gap-3 p-4 text-sm">
              <Dt l="Altezza blocco" v={fmtNum(n.height)} />
              <Dt l="Hashrate" v={n.hashrate ? `${(n.hashrate / 1e18).toFixed(1)} EH/s` : 'n.d.'} />
              <Dt l="Difficoltà" v={n.difficulty ? `${(n.difficulty / 1e12).toFixed(2)} T` : 'n.d.'} />
              <Dt l="Prossimo aggiustamento" v={`${n.difficultyAdjustment.change > 0 ? '+' : ''}${n.difficultyAdjustment.change.toFixed(2)}% (stima)`} sub={`${n.difficultyAdjustment.remainingBlocks} blocchi · ${n.difficultyAdjustment.estimatedDate ? fmtDateTime(n.difficultyAdjustment.estimatedDate) : ''}`} />
              <Dt l="Commissioni (sat/vB)" v={`${n.fees.fastestFee} / ${n.fees.halfHourFee} / ${n.fees.hourFee}`} sub="veloce / 30 min / 1 h" />
              <Dt l="Aggiustamento precedente" v={`${n.difficultyAdjustment.previous?.toFixed(2)}%`} />
            </dl>
          ) : <Empty>{net.error ? `Non disponibile: ${net.error}` : 'In caricamento…'}</Empty>}
          <div className="px-4 pb-3"><Freshness fetchedAt={net.fetchedAt} source={net.source} error={net.error} everySec={300} /></div>
        </Card>
        <Card title="Halving">
          {n ? (
            <div className="p-4 text-sm">
              <div className="text-2xl font-bold tabular-nums">{fmtNum(n.halving.blocksLeft)} <span className="text-sm font-normal text-mute">blocchi</span></div>
              <div className="text-mute">al blocco {fmtNum(n.halving.nextHeight)} · data stimata {fmtDateTime(n.halving.estimatedDate).slice(0, 10)}</div>
              <div className="mt-2 h-2 rounded bg-panel2"><div className="h-2 rounded bg-[#f7931a]" style={{ width: `${100 - (n.halving.blocksLeft / 210000) * 100}%` }} /></div>
              <p className="mt-3 text-xs text-mute">Ricompensa per blocco: {n.halving.subsidyNow} BTC → {n.halving.subsidyNext} BTC. La data è una stima basata sul tempo medio dei blocchi recenti, non una certezza.</p>
            </div>
          ) : <Empty>n.d.</Empty>}
        </Card>
        <Card title="Lightning Network">
          {n?.lightning ? (
            <div className="p-4 text-sm">
              <dl className="grid grid-cols-2 gap-3"><Dt l="Nodi pubblici" v={fmtNum(n.lightning.nodes)} /><Dt l="Canali" v={fmtNum(n.lightning.channels)} /><Dt l="Capacità" v={`${fmtNum(n.lightning.capacityBtc, 0)} BTC`} /></dl>
              <p className={`mt-3 text-xs ${lnAgeDays && lnAgeDays > 7 ? 'text-warn' : 'text-mute'}`}>Istantanea della fonte del {fmtDateTime(n.lightning.snapshotDate).slice(0, 10)}{lnAgeDays && lnAgeDays > 7 ? ` — ⚠ dato vecchio di ${Math.round(lnAgeDays)} giorni: la fonte non l'ha aggiornato.` : ''} Solo nodi/canali pubblici.</p>
            </div>
          ) : <Empty>Statistiche Lightning non disponibili.</Empty>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Movimenti delle balene (≥ 100 BTC)">
          {whales.value?.items.length ? (
            <ul className="divide-y divide-line text-sm">{whales.value.items.slice(0, 10).map((w) => (
              <li key={w.txid} className="flex items-center gap-2 px-4 py-2"><span className="font-semibold tabular-nums">{fmtNum(w.btc, 2)} BTC</span><span className="text-xs text-mute">{w.where} · {timeAgo(w.at)}</span><a href={`https://mempool.space/tx/${w.txid}`} target="_blank" rel="noopener noreferrer" className="ml-auto font-mono text-xs text-accent">{w.txid.slice(0, 10)}… ↗</a></li>
            ))}</ul>
          ) : <Empty>Nessuna transazione ≥ 100 BTC nel campione analizzato.</Empty>}
          <p className="px-4 pb-3 text-[11px] text-mute">Copertura parziale e dichiarata: {whales.value?.scope ?? 'n.d.'}. Il valore include il resto restituito al mittente: non è necessariamente un trasferimento tra soggetti diversi. Per un monitoraggio completo multi-chain serve Whale Alert (a pagamento).</p>
        </Card>
        <Card title="ETF Bitcoin e flussi">
          <div className="p-4"><Unavailable title="Flussi giornalieri degli ETF">Non esiste un&apos;API gratuita e autorizzata per i flussi netti giornalieri degli ETF spot (i dati provengono dagli emittenti e da aggregatori a pagamento). Mostriamo le notizie verificate sugli ETF; i flussi potranno essere integrati con un fornitore a pagamento (vedi README → Integrazioni opzionali).</Unavailable></div>
          <NewsList items={etf} compact empty="Nessuna notizia recente sugli ETF Bitcoin." />
        </Card>
      </div>
      <Card title="Adozione istituzionale"><NewsList items={inst} compact empty="Nessuna notizia recente." /></Card>
      <SectionNews title="Notizie e analisi su Bitcoin" filter={{ section: 'bitcoin' }} sp={sp} basePath="/bitcoin" />
      <p className="text-xs text-mute">Sviluppi normativi su Bitcoin: vedi <Link href="/regolamentazione" className="text-accent">Regolamentazione</Link>. Aggiornamenti software: Bitcoin Core e LND in <Link href="/tecnologia" className="text-accent">Tecnologia</Link>.</p>
      <Disclaimer />
    </div>
  );
}

function Box({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return <div className="card px-4 py-3"><div className="text-xs text-mute">{label}</div><div className="text-xl font-bold tabular-nums">{value}</div>{sub && <div className="text-xs">{sub}</div>}</div>;
}
function Dt({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return <div><dt className="text-xs text-mute">{l}</dt><dd className="font-semibold tabular-nums">{v}</dd>{sub && <dd className="text-[11px] text-mute">{sub}</dd>}</div>;
}
