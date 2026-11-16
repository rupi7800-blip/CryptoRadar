import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Freshness, Empty, StatusBadge } from '@/components/ui';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';
import { fmtUsd, fmtDateTime, timeAgo } from '@/lib/text';
import Link from 'next/link';
import WatchButton from '@/components/WatchButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Airdrop e nuovi progetti' };

type P = { slug: string; name: string; category: string; chains: string[]; tvl: number; symbol: string | null; url: string | null; listedAt: string | null; description: string | null; audits: string | null };

export default async function Airdrop({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const fresh = getCache<P[]>('defi:new');
  const since = Date.now() - 45 * 86400e3;
  const newProtocols = (fresh.value ?? []).filter((p) => p.listedAt && Date.parse(p.listedAt) >= since && p.tvl >= 100_000);
  const noToken = (getCache<P[]>('defi:protocols').value ?? []).filter((p) => !p.symbol && p.tvl > 50e6).slice(0, 15);
  const opp = listNews({ section: 'airdrop', limit: 20 });
  const confirmed = opp.filter((n) => n.status === 'CONFERMATA' || n.sourceOfficial);
  const rumors = opp.filter((n) => !(n.status === 'CONFERMATA' || n.sourceOfficial));
  return (
    <div className="space-y-4">
      <PageHeader title="Airdrop e nuovi progetti" desc="Airdrop, testnet, mainnet, ICO/IDO, launchpad, programmi di incentivi e nuove blockchain" color="#ec4899" />
      <div className="rounded-xl border border-down/50 bg-down/10 p-4 text-sm">
        <b className="text-down">Attenzione ai falsi airdrop.</b> Nessun progetto richiede la seed phrase o pagamenti anticipati per ricevere token. Non firmare transazioni da siti raggiunti tramite link non ufficiali. <b>La partecipazione a testnet, programmi a punti o campagne non garantisce la ricezione di token né profitti</b>: le regole possono cambiare o il token potrebbe non essere mai emesso.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Iniziative da fonti ufficiali / confermate">
          <OppList items={confirmed} empty="Nessuna iniziativa confermata da fonti ufficiali nel periodo." />
        </Card>
        <Card title="Indiscrezioni e segnalazioni non confermate">
          <OppList items={rumors} empty="Nessuna segnalazione." />
        </Card>
      </div>
      <Card title="Nuovi protocolli (ultimi 45 giorni)" right={<Freshness fetchedAt={fresh.fetchedAt} source={fresh.source} error={fresh.error} everySec={900} />}>
        {newProtocols.length ? (
          <div className="overflow-x-auto"><table className="tbl min-w-[860px]"><thead><tr><th></th><th>Progetto</th><th>Descrizione</th><th>Blockchain</th><th>Token</th><th className="text-right">TVL</th><th>Censito</th><th>Rischi</th></tr></thead>
            <tbody>{newProtocols.slice(0, 30).map((p) => (
              <tr key={p.slug}>
                <td><WatchButton type="project" id={p.slug} label={p.name} small /></td>
                <td>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline">{p.name} ↗</a> : p.name}<div className="text-[10px] text-mute">{p.category}</div></td>
                <td className="max-w-xs text-xs text-mute"><span className="line-clamp-2">{p.description ?? 'n.d.'}</span></td>
                <td className="text-xs">{p.chains.slice(0, 3).join(', ')}</td>
                <td className="text-xs">{p.symbol ?? <span className="text-warn">nessun token</span>}</td>
                <td className="text-right tabular-nums">{fmtUsd(p.tvl, { compact: true })}</td>
                <td className="text-xs text-mute">{p.listedAt ? fmtDateTime(p.listedAt).slice(0, 10) : 'n.d.'}</td>
                <td className="text-[11px] text-mute">Progetto giovane{!p.audits || p.audits === '0' ? ', nessun audit dichiarato' : ''}; verificare team e contratti</td>
              </tr>))}</tbody></table></div>
        ) : <Empty>{fresh.error ? `Non disponibile: ${fresh.error}` : 'Nessun nuovo protocollo rilevante.'}</Empty>}
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Fonte: data di inserimento su DefiLlama. Requisiti, scadenze e costi di eventuali campagne non sono forniti dalla fonte: consultare esclusivamente il sito ufficiale (link sul nome).</p>
      </Card>
      <Card title="Protocolli affermati senza token (TVL > 50 Mln $)">
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">{noToken.map((p) => <li key={p.slug} className="bg-panel px-4 py-2 text-sm">{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline">{p.name}</a> : p.name} <span className="text-xs text-mute">{p.category} · {fmtUsd(p.tvl, { compact: true })}</span></li>)}</ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Elenco informativo: l&apos;assenza di un token NON implica che verrà effettuato un airdrop. Qualsiasi ipotesi in tal senso è speculazione.</p>
      </Card>
      <SectionNews title="Tutte le notizie su airdrop, lanci e testnet" filter={{ section: 'airdrop' }} sp={sp} basePath="/airdrop" />
      <Disclaimer />
    </div>
  );
}

function OppList({ items, empty }: { items: ReturnType<typeof listNews>; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-line">{items.map((n) => (
      <li key={n.id} className="px-4 py-2.5 text-sm">
        <Link href={`/notizia/${n.id}`} className="font-medium hover:underline"><span className="t-it">{n.titleIt || n.title}</span><span className="t-orig">{n.title}</span></Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-mute"><StatusBadge status={n.status} compact />{n.flags.includes('rumor') && <span className="chip border-warn/40 text-warn">rumor</span>}<span>{n.sourceName} · {timeAgo(n.publishedAt)}</span>{n.coins.length > 0 && <span>· {n.coins.join(', ')}</span>}<a className="ml-auto text-accent" href={n.url} target="_blank" rel="noopener noreferrer nofollow">fonte originale ↗</a></div>
      </li>))}</ul>
  );
}
