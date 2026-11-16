import Link from 'next/link';
import { Card, PageHeader, Disclaimer } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blockchain e tecnologia' };

const TOPICS: [string, string][] = [
  ['Layer 2', 'layer 2 OR rollup OR L2'], ['Zero Knowledge', 'zero knowledge OR zk OR zkEVM'], ['Real World Assets', 'tokenization OR tokenized OR RWA'],
  ['Interoperabilità / cross-chain', 'bridge OR interoperability OR cross-chain'], ['Oracoli', 'oracle OR Chainlink OR Pyth'], ['NFT e gaming', 'NFT OR gaming'],
  ['Smart contract e upgrade', 'upgrade OR hard fork OR smart contract'], ['Scalabilità e modular', 'modular OR data availability OR scaling'], ['Sicurezza crittografica', 'quantum OR cryptography'],
];

export default async function Tech({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const topic = TOPICS.find(([l]) => l === sp.topic);
  const releases = listNews({ sourceCategory: 'dev', limit: 10, dedupe: false });
  const official = listNews({ sourceCategory: 'official-project', limit: 8 });
  return (
    <div className="space-y-4">
      <PageHeader title="Blockchain e tecnologia" desc="Layer 1 e 2, smart contract, ZK, RWA, interoperabilità, oracoli, scalabilità, release software" color="#3b82f6" />
      <div className="scroll-x flex gap-1.5">
        <Link href="/tecnologia" className={`chip ${!topic ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>Tutti</Link>
        {TOPICS.map(([l]) => <Link key={l} href={`/tecnologia?topic=${encodeURIComponent(l)}#notizie`} className={`chip shrink-0 ${topic?.[0] === l ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>{l}</Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Release software ufficiali (GitHub)"><NewsList items={releases} compact empty="Nessuna release recente (o feed GitHub non raggiungibili: vedi Fonti)." /></Card>
        <Card title="Blog ufficiali di blockchain e fondazioni"><NewsList items={official} compact empty="Nessun aggiornamento recente." /></Card>
      </div>
      <SectionNews title={topic ? `Notizie: ${topic[0]}` : 'Notizie di tecnologia'} filter={topic ? { q: topic[1] } : { section: 'tech' }} sp={sp} basePath={topic ? `/tecnologia?topic=${encodeURIComponent(topic[0])}` : '/tecnologia'} />
      <Disclaimer />
    </div>
  );
}
