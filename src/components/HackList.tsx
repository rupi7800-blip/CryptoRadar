import { Empty } from './ui';
import { fmtUsd, fmtDateTime } from '@/lib/text';

export function HackList({ items }: { items: { name: string; date: string; amount: number | null; chains: string[]; technique: string | null; returned: number | null; source: string | null }[] }) {
  if (!items.length) return <Empty>Nessun dato.</Empty>;
  return (
    <ul className="divide-y divide-line text-sm">{items.map((h, i) => (
      <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2">
        <span className="font-medium">{h.name}</span><span className="font-semibold tabular-nums text-down">{fmtUsd(h.amount, { compact: true })}</span>
        <span className="text-xs text-mute">{fmtDateTime(h.date).slice(0, 10)} · {h.chains.join(', ')} · {h.technique ?? 'tecnica n.d.'}</span>
        {h.returned ? <span className="text-xs text-up">recuperati {fmtUsd(h.returned, { compact: true })}</span> : null}
        {h.source && <a href={h.source} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto text-xs text-accent">fonte ↗</a>}
      </li>))}</ul>
  );
}
