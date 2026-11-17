import { getCache } from '@/lib/db';
import Ago from '@/components/Ago';
import type { Coin } from '@/lib/market/types';
import { Card, PageHeader, Freshness, Empty, Disclaimer } from '@/components/ui';
import { CoinTable } from '@/components/CoinTable';
import { SectionNews } from '@/components/SectionNews';
import { fmtUsd, timeAgo } from '@/lib/text';
import type { TokenRisk } from '@/lib/ingest/dex';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meme coin e token ad alto rischio' };

type T = { chain: string; address: string; name: string | null; symbol: string | null; description: string | null; icon: string | null; dexUrl: string | null; priceUsd: number | null; liquidityUsd: number | null; volume24h: number | null; ch1h: number | null; ch24h: number | null; buys24h: number | null; sells24h: number | null; fdv: number | null; createdAt: string | null; boosted: boolean; links: { label: string; url: string }[]; risk: TokenRisk };
const LVL: Record<string, string> = { ESTREMO: 'border-down bg-down/20 text-down', 'MOLTO ALTO': 'border-down/60 bg-down/10 text-down', ALTO: 'border-warn/60 bg-warn/10 text-warn' };

export default async function Meme({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const meme = getCache<Coin[]>('market:meme');
  const nt = getCache<T[]>('meme:new');
  const coins = meme.value ?? [];
  const movers = [...coins].filter((c) => c.ch24h != null && Math.abs(c.ch24h) > 20);
  return (
    <div className="space-y-4">
      <PageHeader title="Meme coin e shitcoin" desc="Token speculativi, appena lanciati e progetti ad altissimo rischio" color="#f43f5e" />
      <div className="rounded-xl border border-down/50 bg-down/10 p-4 text-sm">
        <div className="font-bold text-down">⚠ Area ad altissimo rischio</div>
        <p className="mt-1 text-ink/80">La grande maggioranza dei token appena lanciati perde quasi tutto il valore. Sono frequenti rug pull, honeypot, token contraffatti e schemi pump and dump. I controlli automatici sotto possono solo <b>segnalare</b> rischi: <b>nessun token viene mai classificato come sicuro</b>. La visibilità a pagamento (&quot;boost&quot;) non è un indicatore di qualità.</p>
      </div>
      <Card title="Radar nuovi token (DEX)" right={<Freshness fetchedAt={nt.fetchedAt} source={nt.source} error={nt.error} everySec={600} />}>
        {nt.value?.length ? (
          <ul className="divide-y divide-line">
            {nt.value.slice(0, 40).map((t) => (
              <li key={`${t.chain}:${t.address}`} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {t.icon && <img src={t.icon} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full" loading="lazy" />}
                  <span className="font-semibold">{t.name ?? 'Nome n.d.'}</span><span className="text-xs text-mute">{t.symbol ?? ''} · {t.chain}</span>
                  <span className={`chip ${LVL[t.risk.level]}`}>RISCHIO {t.risk.level}</span>
                  {t.boosted && <span className="chip border-warn/50 text-warn">promosso a pagamento</span>}
                  <span className="ml-auto text-xs text-mute">{t.createdAt ? <Ago iso={t.createdAt} prefix="coppia creata " /> : 'età n.d.'}</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-mute sm:grid-cols-5">
                  <span>Prezzo <b className="text-ink">{fmtUsd(t.priceUsd)}</b></span>
                  <span>Liquidità <b className={(t.liquidityUsd ?? 0) < 10000 ? 'text-down' : 'text-ink'}>{fmtUsd(t.liquidityUsd, { compact: true })}</b></span>
                  <span>Volume 24h <b className="text-ink">{fmtUsd(t.volume24h, { compact: true })}</b></span>
                  <span>24h <b className={(t.ch24h ?? 0) >= 0 ? 'up' : 'down'}>{t.ch24h != null ? `${t.ch24h.toFixed(0)}%` : 'n.d.'}</b></span>
                  <span>Acquisti/vendite 24h <b className="text-ink">{t.buys24h ?? 'n.d.'}/{t.sells24h ?? 'n.d.'}</b></span>
                </div>
                <details className="mt-1">
                  <summary className="text-xs text-accent">Rischi individuati ({t.risk.reasons.length}){t.risk.checks.length ? ` · controlli: ${t.risk.checks.join(', ')}` : ''}</summary>
                  <ul className="mt-1 list-disc pl-5 text-xs text-mute">{t.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  <div className="mt-1 break-all font-mono text-[10px] text-mute" data-notranslate>{t.address}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">{t.dexUrl && <a className="text-accent" href={t.dexUrl} target="_blank" rel="noopener noreferrer nofollow">DEX Screener ↗</a>}{t.links.map((l) => <a key={l.url} className="text-mute hover:text-ink" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label} ↗</a>)}</div>
                </details>
              </li>
            ))}
          </ul>
        ) : <Empty>{nt.error ? `Radar non disponibile: ${nt.error.slice(0, 160)}` : 'Analisi dei nuovi token in corso…'}</Empty>}
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Fonti: profili e boost più recenti di DEX Screener (non è l&apos;elenco completo dei token creati); controlli contratto GoPlus Security (EVM e Solana). I controlli automatici possono avere falsi negativi.</p>
      </Card>
      {movers.length > 0 && <Card title="Variazioni estreme (> ±20% in 24h)"><CoinTable coins={movers.slice(0, 15)} dense /></Card>}
      <Card title="Meme coin per capitalizzazione" right={<Freshness fetchedAt={meme.fetchedAt} source={meme.source} error={meme.error} everySec={900} />}>
        {coins.length ? <CoinTable coins={coins.slice(0, 40)} /> : <Empty>{meme.error ? `Non disponibile: ${meme.error.slice(0, 120)}` : 'In caricamento…'}</Empty>}
      </Card>
      <SectionNews title="Notizie: meme coin, rug pull, honeypot, pump and dump" filter={{ section: 'meme' }} sp={sp} basePath="/meme" />
      <Disclaimer />
    </div>
  );
}
