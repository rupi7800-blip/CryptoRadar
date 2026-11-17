import Link from 'next/link';
import { getCache } from '@/lib/db';
import type { Coin } from '@/lib/market/types';
import { Card, PageHeader, Freshness, Pct, Disclaimer, Empty } from '@/components/ui';
import { CoinTable } from '@/components/CoinTable';
import { SectionNews } from '@/components/SectionNews';
import { fmtUsd } from '@/lib/text';
import { isStable } from '@/lib/market/derived';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Altcoin' };

const MAJORS = ['ethereum', 'solana', 'ripple', 'binancecoin', 'cardano', 'avalanche-2', 'chainlink', 'polkadot', 'sui', 'the-open-network', 'tron', 'hyperliquid', 'litecoin', 'stellar', 'near', 'aptos'];
const MAJORS_CP = ['eth-ethereum', 'sol-solana', 'xrp-xrp', 'bnb-bnb', 'ada-cardano', 'avax-avalanche', 'link-chainlink', 'dot-polkadot', 'sui-sui', 'ton-toncoin', 'trx-tron', 'hype-hyperliquid', 'ltc-litecoin', 'xlm-stellar', 'near-near-protocol', 'apt-aptos'];
const CAPS: [string, number, number][] = [['Large cap (> 10 Mld $)', 10e9, Infinity], ['Mid cap (1–10 Mld $)', 1e9, 10e9], ['Small cap (< 1 Mld $)', 0, 1e9]];

export default async function Altcoin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const top = getCache<Coin[]>('market:top');
  const all = (top.value ?? []).filter((c) => !['bitcoin', 'btc-bitcoin'].includes(c.id) && !isStable(c));
  const majors = all.filter((c) => MAJORS.includes(c.id) || MAJORS_CP.includes(c.id));
  const cats = getCache<{ id: string; name: string; marketCap: number | null; ch24h: number | null; volume24h: number | null }[]>('market:categories');
  return (
    <div className="space-y-4">
      <PageHeader title="Altcoin" desc="Ethereum, Solana, XRP, BNB, Cardano, Avalanche, Chainlink, Polkadot, Sui, TON e gli altri progetti rilevanti" color="#8b5cf6">
        <Link href="/cerca" className="btn">⌕ Cerca qualsiasi criptovaluta</Link>
      </PageHeader>
      <Card title="Principali altcoin" right={<Freshness fetchedAt={top.fetchedAt} source={top.source} error={top.error} everySec={180} />}>
        {majors.length ? <CoinTable coins={majors} /> : <Empty>Dati di mercato non ancora disponibili.</Empty>}
      </Card>
      <Card title="Per capitalizzazione (stablecoin escluse)">
        <Tabs id="cap" tabs={CAPS.map(([l]) => l)} panels={CAPS.map(([l, lo, hi]) => <CoinTable key={l} coins={all.filter((c) => (c.marketCap ?? 0) >= lo && (c.marketCap ?? 0) < hi).slice(0, 50)} dense />)} />
      </Card>
      <Card title="Settori (per capitalizzazione)" right={<Freshness fetchedAt={cats.fetchedAt} source={cats.source} error={cats.error} everySec={3600} />}>
        {cats.value?.length ? (
          <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Settore</th><th className="text-right">Capitalizzazione</th><th className="text-right">24h</th><th className="text-right">Volume</th></tr></thead>
            <tbody>{cats.value.slice(0, 25).map((c) => <tr key={c.id}><td>{c.name}</td><td className="text-right tabular-nums">{fmtUsd(c.marketCap, { compact: true })}</td><td className="text-right"><Pct v={c.ch24h} /></td><td className="text-right tabular-nums">{fmtUsd(c.volume24h, { compact: true })}</td></tr>)}</tbody></table></div>
        ) : <Empty>{cats.error ? `Non disponibile: ${cats.error.slice(0, 120)}` : 'In caricamento…'}</Empty>}
      </Card>
      <SectionNews title="Notizie: aggiornamenti, collaborazioni, quotazioni, sviluppo, tokenomics" filter={{ section: 'altcoin' }} sp={sp} basePath="/altcoin" />
      <Disclaimer />
    </div>
  );
}
