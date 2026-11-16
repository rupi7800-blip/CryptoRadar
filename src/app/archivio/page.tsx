import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { listNews, newsStats } from '@/lib/news';
import { all } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Archivio storico' };

export default async function Archivio({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? '') ? sp.day : new Date().toISOString().slice(0, 10);
  const items = listNews({ from: `${day}T00:00:00.000Z`, to: `${day}T23:59:59.999Z`, limit: 200 });
  const days = all<{ d: string; n: number }>('SELECT substr(published_at,1,10) d, COUNT(DISTINCT cluster_id) n FROM articles GROUP BY d ORDER BY d DESC LIMIT 60');
  const st = newsStats();
  const prev = new Date(Date.parse(day + 'T12:00:00Z') - 86400e3).toISOString().slice(0, 10);
  const next = new Date(Date.parse(day + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <PageHeader title="Archivio storico" desc={`${st.total.toLocaleString('it-IT')} articoli archiviati, raggruppati in ${st.clusters.toLocaleString('it-IT')} eventi. Si conservano titolo, estratto, fonte, link, date, categorie, token, stato di verifica e analisi AI (non i testi integrali protetti).`}>
        <Link href="/cerca" className="btn">⌕ Ricerca storica con filtri</Link>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card title="Giorni" className="lg:order-2">
          <ul className="max-h-[70vh] overflow-y-auto text-sm">{days.map((d) => <li key={d.d}><Link href={`/archivio?day=${d.d}`} className={`flex justify-between px-4 py-1.5 hover:bg-panel2 ${d.d === day ? 'text-accent' : ''}`}>{new Date(d.d + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}<span className="text-mute">{d.n}</span></Link></li>)}</ul>
        </Card>
        <div className="lg:col-span-3">
          <Card title={`Eventi del ${new Date(day + 'T12:00:00Z').toLocaleDateString('it-IT', { dateStyle: 'full' })} (${items.length})`} right={<span className="flex gap-3 text-xs"><Link href={`/archivio?day=${prev}`} className="text-accent">← giorno prima</Link><Link href={`/archivio?day=${next}`} className="text-accent">giorno dopo →</Link></span>}>
            <NewsList items={items} empty="Nessuna notizia archiviata per questo giorno." />
          </Card>
        </div>
      </div>
    </div>
  );
}
