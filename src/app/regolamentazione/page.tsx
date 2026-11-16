import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Unavailable, Freshness } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regolamentazione ed economia' };

export default async function Reg({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const official = listNews({ sourceCategory: ['regulator', 'macro'], limit: 12, dedupe: false });
  const mica = listNews({ q: 'MiCA OR ESMA OR "European Commission" OR Consob OR "Banca d\'Italia"', limit: 8 });
  const us = listNews({ q: 'SEC OR CFTC OR Congress OR Senate OR stablecoin bill', section: 'regulation', limit: 8 });
  const macro = getCache<{ id: string; label: string; unit: string; value: number | null; date: string | null; yoy: number | null }[]>('macro:fred');
  const urgent = listNews({ section: 'regulation', limit: 30 }).filter((n) => n.importance >= 45).slice(0, 6);
  return (
    <div className="space-y-4">
      <PageHeader title="Regolamentazione ed economia" desc="SEC, ESMA, BCE, Banca d'Italia, Commissione Europea, MiCA, politiche monetarie e dati macro" color="#a3a3a3" />
      {urgent.length > 0 && <Card title="⚑ Eventi con possibili conseguenze sull'intero settore"><NewsList items={urgent} compact /></Card>}
      <Card title="Dati macroeconomici ufficiali" right={<Freshness fetchedAt={macro.fetchedAt} source={macro.source} error={macro.error} everySec={21600} />}>
        {macro.value?.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">{macro.value.map((m) => (
            <div key={m.id} className="rounded-lg border border-line p-3"><div className="text-xs text-mute">{m.label}</div><div className="text-lg font-bold tabular-nums">{m.value != null ? m.value.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : 'n.d.'}{m.unit === '%' ? '%' : ''}</div>{m.yoy != null && <div className="text-xs">su base annua: {m.yoy.toFixed(1)}%</div>}<div className="text-[10px] text-mute">dato del {m.date}</div></div>
          ))}</div>
        ) : (
          <div className="p-4"><Unavailable title="Serie macro (tassi, inflazione)">Richiede una chiave gratuita FRED (Federal Reserve Bank of St. Louis): registrati su fred.stlouisfed.org → My Account → API Keys e imposta <code>FRED_API_KEY</code> nel file .env del server. Nel frattempo sono monitorati i comunicati ufficiali di BCE e Federal Reserve.</Unavailable></div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Comunicati ufficiali (SEC, CFTC, ESMA, BCE, Fed)"><NewsList items={official} compact empty="Nessun comunicato recente pertinente." /></Card>
        <div className="space-y-4">
          <Card title="Europa e MiCA"><NewsList items={mica} compact empty="Nessuna notizia recente." /></Card>
          <Card title="Stati Uniti"><NewsList items={us} compact empty="Nessuna notizia recente." /></Card>
        </div>
      </div>
      <SectionNews title="Tutte le notizie su regolamentazione, policy e macro" filter={{ section: 'regulation' }} sp={sp} basePath="/regolamentazione" />
      <Disclaimer text="Le informazioni normative sono sintesi giornalistiche e non costituiscono consulenza legale o fiscale." />
    </div>
  );
}
