import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Freshness } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { HackList } from '@/components/HackList';
import { listNews } from '@/lib/news';
import { fmtUsd } from '@/lib/text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sicurezza e truffe' };

const TIPS = [
  'Nessun progetto serio ti chiederà mai la seed phrase o la chiave privata: chi la chiede è un truffatore.',
  'Gli "airdrop" che richiedono di collegare il wallet e firmare una transazione sconosciuta sono spesso drainer.',
  'Verifica sempre l\'URL: siti di phishing imitano exchange e wallet con domini quasi identici.',
  'Controlla l\'indirizzo del contratto sul sito ufficiale: esistono token falsi con lo stesso nome e simbolo.',
  'Revoca periodicamente le autorizzazioni (approval) concesse ai contratti che non usi più.',
  'Diffida dei rendimenti "garantiti": nessun rendimento cripto è privo di rischio.',
  'Attenzione all\'"address poisoning": copia gli indirizzi dalla rubrica, non dalla cronologia delle transazioni.',
];

export default async function Sicurezza({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const hacks = getCache<{ name: string; date: string; amount: number | null; chains: string[]; technique: string | null; returned: number | null; source: string | null }[]>('defi:hacks');
  const confirmedUrgent = listNews({ section: 'security', flag: 'urgent', limit: 30 }).filter((n) => n.status === 'CONFERMATA' || n.status === 'CONFERMATA PARZIALMENTE').slice(0, 6);
  const phishing = listNews({ q: 'phishing OR scam OR drainer OR fake OR impersonat OR poisoning', limit: 8 });
  const since30 = Date.now() - 30 * 86400e3;
  const last30 = (hacks.value ?? []).filter((h) => Date.parse(h.date) >= since30);
  return (
    <div className="space-y-4">
      <PageHeader title="Sicurezza e truffe" desc="Hack, exploit, phishing, rug pull, wallet compromessi, vulnerabilità e falsi airdrop" color="#ef4444" />
      {confirmedUrgent.length > 0 && (
        <section className="rounded-xl border border-down/60 bg-down/10">
          <div className="border-b border-down/40 px-4 py-2 text-sm font-bold text-down">🚨 Avvisi urgenti — problemi di sicurezza confermati o confermati parzialmente</div>
          <NewsList items={confirmedUrgent} compact />
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3"><div className="text-xs text-mute">Fondi sottratti (ultimi 30 giorni)</div><div className="text-xl font-bold text-down tabular-nums">{fmtUsd(last30.reduce((s, h) => s + (h.amount ?? 0), 0), { compact: true })}</div><div className="text-xs text-mute">{last30.length} incidenti registrati da DefiLlama</div></div>
        <div className="card px-4 py-3 sm:col-span-2"><div className="mb-1 text-xs text-mute">Come proteggersi</div><ul className="list-disc space-y-0.5 pl-4 text-xs">{TIPS.slice(0, 4).map((t) => <li key={t}>{t}</li>)}</ul></div>
      </div>
      <Card title="Registro exploit e hack" right={<Freshness fetchedAt={hacks.fetchedAt} source={hacks.source} error={hacks.error} everySec={900} />}><HackList items={(hacks.value ?? []).slice(0, 25)} /></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Phishing, truffe, falsi airdrop"><NewsList items={phishing} compact empty="Nessuna segnalazione recente." /></Card>
        <Card title="Buone pratiche"><ul className="list-disc space-y-1 p-4 pl-8 text-sm text-mute">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul></Card>
      </div>
      <SectionNews title="Tutte le notizie di sicurezza" filter={{ section: 'security' }} sp={sp} basePath="/sicurezza" />
      <Disclaimer text="Se sei vittima di una truffa, conserva le prove (hash delle transazioni, indirizzi, screenshot) e sporgi denuncia alla Polizia Postale. Diffida di chi promette di recuperare i fondi a pagamento: è spesso una seconda truffa." />
    </div>
  );
}
