import { getCache } from '@/lib/db';
import { Card, PageHeader, Freshness, Pct, Empty, Disclaimer } from '@/components/ui';
import { BarList } from '@/components/Charts';
import { SectionNews } from '@/components/SectionNews';
import { fmtUsd, fmtDateTime } from '@/lib/text';
import WatchButton from '@/components/WatchButton';
import { HackList } from '@/components/HackList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'DeFi' };

type P = { slug: string; name: string; category: string; chains: string[]; tvl: number; ch1d: number | null; ch7d: number | null; symbol: string | null; url: string | null; logo: string | null; listedAt: string | null; audits: string | null };

export default async function Defi({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const prot = getCache<P[]>('defi:protocols');
  const chains = getCache<{ name: string; tvl: number; symbol: string }[]>('defi:chains');
  const cats = getCache<{ name: string; tvl: number; n: number }[]>('defi:categories');
  const dex = getCache<{ total24h: number | null; change1d: number | null; top: { name: string; total24h: number; change1d: number | null; chains: string[] }[] }>('defi:dexs');
  const stables = getCache<{ name: string; symbol: string; mechanism: string; circulating: number; prevWeek: number | null; price: number | null }[]>('defi:stablecoins');
  const hacks = getCache<{ name: string; date: string; amount: number | null; chains: string[]; technique: string | null; returned: number | null; source: string | null }[]>('defi:hacks');
  const totalTvl = (chains.value ?? []).reduce((s, c) => s + c.tvl, 0);
  const cat = sp.cat;
  const plist = (prot.value ?? []).filter((p) => !cat || p.category === cat).filter((p) => !sp.p || p.slug === sp.p || true).slice(0, 40);
  return (
    <div className="space-y-4">
      <PageHeader title="DeFi — Finanza decentralizzata" desc="Lending, DEX, liquid staking, restaking, stablecoin, rischi ed exploit" color="#06b6d4" />
      <div className="grid gap-3 sm:grid-cols-3">
        <S l="TVL totale (top 30 chain)" v={fmtUsd(totalTvl, { compact: true })} />
        <S l="Volume DEX 24h" v={fmtUsd(dex.value?.total24h, { compact: true })} sub={<Pct v={dex.value?.change1d} />} />
        <S l="Stablecoin in circolazione (top 20)" v={fmtUsd((stables.value ?? []).reduce((s, x) => s + x.circulating, 0), { compact: true })} />
      </div>
      <div className="px-1"><Freshness fetchedAt={prot.fetchedAt} source={prot.source} error={prot.error} everySec={900} /></div>
      <Card id="protocolli" title={`Protocolli per TVL${cat ? ` — ${cat}` : ''}`} right={cat ? <a href="/defi#protocolli" className="text-xs text-accent">rimuovi filtro</a> : null}>
        {plist.length ? (
          <div className="overflow-x-auto"><table className="tbl min-w-[640px]"><thead><tr><th></th><th>Protocollo</th><th>Categoria</th><th>Chain</th><th className="text-right">TVL</th><th className="text-right">1g</th><th className="text-right">7g</th></tr></thead>
            <tbody>{plist.map((p) => (
              <tr key={p.slug} className={sp.p === p.slug ? 'bg-accent/10' : ''}>
                <td><WatchButton type="project" id={p.slug} label={p.name} small /></td>
                <td>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline">{p.name}</a> : p.name} {p.symbol && <span className="text-xs text-mute">{p.symbol}</span>}</td>
                <td><a href={`/defi?cat=${encodeURIComponent(p.category)}#protocolli`} className="text-xs text-mute hover:text-ink">{p.category}</a></td>
                <td className="text-xs text-mute">{p.chains.slice(0, 3).join(', ')}{p.chains.length > 3 ? '…' : ''}</td>
                <td className="text-right tabular-nums">{fmtUsd(p.tvl, { compact: true })}</td><td className="text-right"><Pct v={p.ch1d} /></td><td className="text-right"><Pct v={p.ch7d} /></td>
              </tr>))}</tbody></table></div>
        ) : <Empty>{prot.error ? `Non disponibile: ${prot.error}` : 'In caricamento…'}</Empty>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="TVL per categoria"><BarList items={(cats.value ?? []).slice(0, 12).map((c) => ({ label: c.name, value: c.tvl, sub: `${c.n} protocolli`, href: `/defi?cat=${encodeURIComponent(c.name)}#protocolli` }))} format={(n) => fmtUsd(n, { compact: true })} /></Card>
        <Card title="TVL per blockchain"><BarList items={(chains.value ?? []).slice(0, 12).map((c) => ({ label: c.name, value: c.tvl }))} format={(n) => fmtUsd(n, { compact: true })} /></Card>
        <Card title="DEX per volume 24h">
          <ul className="divide-y divide-line text-sm">{(dex.value?.top ?? []).slice(0, 10).map((d) => <li key={d.name} className="flex justify-between gap-2 px-4 py-2"><span className="truncate">{d.name}</span><span className="tabular-nums">{fmtUsd(d.total24h, { compact: true })} <Pct v={d.change1d} className="text-xs" /></span></li>)}</ul>
        </Card>
      </div>
      <Card title="Stablecoin" right={<Freshness fetchedAt={stables.fetchedAt} source={stables.source} error={stables.error} everySec={900} />}>
        {stables.value?.length ? (
          <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Stablecoin</th><th>Meccanismo</th><th className="text-right">Prezzo</th><th className="text-right">In circolazione</th><th className="text-right">7g</th></tr></thead>
            <tbody>{stables.value.map((s) => {
              const ch = s.prevWeek ? ((s.circulating - s.prevWeek) / s.prevWeek) * 100 : null;
              const depeg = s.price != null && Math.abs(s.price - 1) > 0.01;
              return <tr key={s.symbol + s.name}><td>{s.name} <span className="text-xs text-mute">{s.symbol}</span></td><td className="text-xs text-mute">{s.mechanism}</td><td className={`text-right tabular-nums ${depeg ? 'font-bold text-down' : ''}`}>{s.price != null ? `$${s.price.toFixed(4)}` : 'n.d.'}{depeg ? ' ⚠' : ''}</td><td className="text-right tabular-nums">{fmtUsd(s.circulating, { compact: true })}</td><td className="text-right"><Pct v={ch} /></td></tr>;
            })}</tbody></table></div>
        ) : <Empty>{stables.error ? `Non disponibile: ${stables.error.slice(0, 120)}` : 'In caricamento…'}</Empty>}
      </Card>
      <Card title="Exploit e hack recenti (DefiLlama)" right={<a href="/sicurezza" className="text-xs text-accent">Sicurezza →</a>}>
        <HackList items={(hacks.value ?? []).slice(0, 10)} />
      </Card>
      <SectionNews title="Notizie DeFi" filter={{ section: 'defi' }} sp={sp} basePath="/defi" />
      <Disclaimer />
    </div>
  );
}
function S({ l, v, sub }: { l: string; v: string; sub?: React.ReactNode }) {
  return <div className="card px-4 py-3"><div className="text-xs text-mute">{l}</div><div className="text-xl font-bold tabular-nums">{v}</div>{sub && <div className="text-xs">{sub}</div>}</div>;
}
