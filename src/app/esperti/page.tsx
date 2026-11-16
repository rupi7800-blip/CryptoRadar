import Link from 'next/link';
import { Card, PageHeader, Disclaimer, Empty, TierChip } from '@/components/ui';
import { listNews } from '@/lib/news';
import { listSources, sourceMeta } from '@/lib/sources/registry';
import { timeAgo, fmtDateTime } from '@/lib/text';
import ComparePanel from '@/components/ComparePanel';
import WatchButton from '@/components/WatchButton';
import { aiAvailable } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analisi ed esperti' };

const ROLES = ['Analisti on-chain', 'Economista', 'Ricercatore', 'Sviluppatori', 'Fondatore', 'Sicurezza', 'VC'];

export default async function Esperti({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const experts = listSources("category = 'expert'");
  const role = sp.role;
  const filtered = experts.filter((e) => !role || (sourceMeta(e).role ?? '').toLowerCase().includes(role.toLowerCase()));
  const items = listNews({ sourceCategory: ['expert', 'security'], limit: 40, dedupe: false, coin: sp.coin || undefined }).filter((n) => !role || filtered.some((f) => f.id === n.sourceId));
  return (
    <div className="space-y-4">
      <PageHeader title="Analisi ed esperti" desc="Contributi di analisti, economisti, ricercatori, sviluppatori, fondatori ed esperti di sicurezza" color="#14b8a6" />
      <div className="rounded-xl border border-line bg-panel2 p-3 text-xs text-mute">
        Gli esperti sono selezionati per competenza documentata e storico pubblico, non per numero di follower. Per ognuno indichiamo ruolo e <b>possibili conflitti d&apos;interesse</b>. <b>Le previsioni e le opinioni non sono fatti.</b> I contenuti social (X/Twitter, Telegram) non sono integrati: le relative API sono a pagamento o non consentono un monitoraggio autorizzato (vedi README).
      </div>
      <div className="scroll-x flex gap-1.5">
        <Link href="/esperti" className={`chip ${!role ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>Tutti</Link>
        {ROLES.map((r) => <Link key={r} href={`/esperti?role=${encodeURIComponent(r)}`} className={`chip shrink-0 ${role === r ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>{r}</Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Contributi recenti" right={<span className="text-[11px] text-mute">seleziona 2–6 contributi per confrontarli</span>}>
            {items.length ? <ComparePanel aiEnabled={aiAvailable()} items={items.map((n) => ({ id: n.id, title: n.titleIt || n.title, original: n.title, source: n.sourceName, author: n.author, at: n.publishedAt, ago: timeAgo(n.publishedAt), url: n.url, coins: n.coins, cats: n.categories, prediction: n.flags.includes('prediction') }))} /> : <Empty>Nessun contributo recente (le fonti esperti si aggiornano ogni ora).</Empty>}
          </Card>
        </div>
        <Card title={`Esperti e fonti monitorate (${filtered.length})`}>
          <ul className="divide-y divide-line">{filtered.map((e) => {
            const m = sourceMeta(e);
            return (
              <li key={e.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2"><a href={e.homepage ?? '#'} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{e.name}</a><TierChip tier={e.tier} /><span className="ml-auto"><WatchButton type="expert" id={e.id} label={e.name} small /></span></div>
                <div className="text-xs text-mute">{m.role ?? 'n.d.'} · {m.area ?? ''}</div>
                <div className="text-xs text-mute">{e.reliability_note}</div>
                {e.conflicts && <div className="text-xs text-warn">Possibili conflitti: {e.conflicts}</div>}
                <div className="text-[10px] text-mute">{e.status === 'ok' ? `ultimo aggiornamento ${timeAgo(e.last_success)}` : e.status === 'error' ? `⚠ feed in errore dal ${fmtDateTime(e.last_success ?? e.last_attempt)}` : 'in attesa'}</div>
              </li>
            );
          })}</ul>
          <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Nuovi esperti si aggiungono da Admin → Fonti (categoria &quot;expert&quot;).</p>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}
