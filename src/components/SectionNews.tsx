import Link from 'next/link';
import { listNews, type NewsFilter } from '@/lib/news';
import { Card } from './ui';
import { NewsList } from './NewsCard';
import { STATUSES, STATUS_STYLE } from '@/lib/sections';

/** Feed notizie di una sezione, con filtro per stato di verifica e paginazione. */
export function SectionNews({ title = 'Notizie', filter, sp, basePath, perPage = 20 }: { title?: string; filter: NewsFilter; sp: Record<string, string | undefined>; basePath: string; perPage?: number }) {
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : undefined;
  const items = listNews({ ...filter, status, limit: perPage, offset: (page - 1) * perPage });
  const q = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, page, ...o })) if (v !== undefined && v !== '' && !(k === 'page' && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `${basePath}${s ? '?' + s : ''}#notizie`;
  };
  return (
    <Card id="notizie" title={title} right={
      <div className="scroll-x flex gap-1 text-[11px]">
        <Link href={q({ status: undefined, page: 1 })} className={`chip ${!status ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>Tutte</Link>
        {STATUSES.map((s) => <Link key={s} href={q({ status: s, page: 1 })} className={`chip ${status === s ? STATUS_STYLE[s].cls : 'border-line text-mute'}`}>{STATUS_STYLE[s].label}</Link>)}
      </div>
    }>
      <NewsList items={items} empty="Nessuna notizia per questi filtri." />
      <div className="flex justify-between border-t border-line px-4 py-2 text-sm">
        {page > 1 ? <Link href={q({ page: page - 1 })} className="text-accent">← Più recenti</Link> : <span />}
        {items.length === perPage ? <Link href={q({ page: page + 1 })} className="text-accent">Meno recenti →</Link> : <span />}
      </div>
    </Card>
  );
}
