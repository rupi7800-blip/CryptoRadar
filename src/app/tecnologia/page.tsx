import Tabs from '@/components/Tabs';
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
  const releases = listNews({ sourceCategory: 'dev', limit: 10, dedupe: false });
  const official = listNews({ sourceCategory: 'official-project', limit: 8 });
  return (
    <div className="space-y-4">
      <PageHeader title="Blockchain e tecnologia" desc="Layer 1 e 2, smart contract, ZK, RWA, interoperabilità, oracoli, scalabilità, release software" color="#3b82f6" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Release software ufficiali (GitHub)"><NewsList items={releases} compact empty="Nessuna release recente (o feed GitHub non raggiungibili: vedi Fonti)." /></Card>
        <Card title="Blog ufficiali di blockchain e fondazioni"><NewsList items={official} compact empty="Nessun aggiornamento recente." /></Card>
      </div>
      <Card id="argomenti" title="Notizie per argomento">
        <Tabs id="argomenti" tabs={TOPICS.map(([l]) => l)} panels={TOPICS.map(([l, q]) => <NewsList key={l} items={listNews({ q, limit: 15 })} empty="Nessuna notizia recente su questo argomento." />)} />
      </Card>
      <SectionNews title="Tutte le notizie di tecnologia" filter={{ section: 'tech' }} />
      <Disclaimer />
    </div>
  );
}
