import Link from 'next/link';
import type { Coin } from '@/lib/market/types';
import { Pct } from './ui';
import { Sparkline } from './Charts';
import { fmtUsd } from '@/lib/text';
import WatchButton from './WatchButton';

export function CoinTable({ coins, showSpark = true, dense = false }: { coins: Coin[]; showSpark?: boolean; dense?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl min-w-[640px]">
        <thead><tr><th className="w-8"></th><th>#</th><th>Nome</th><th className="text-right">Prezzo</th><th className="text-right">1h</th><th className="text-right">24h</th><th className="text-right">7g</th><th className="text-right">Cap.</th><th className="text-right">Volume 24h</th>{showSpark && !dense && <th className="text-right">7 giorni</th>}</tr></thead>
        <tbody>
          {coins.map((c) => (
            <tr key={c.id} className="hover:bg-panel2/50">
              <td><WatchButton type="coin" id={c.id} label={c.name} small /></td>
              <td className="text-mute tabular-nums">{c.rank ?? '—'}</td>
              <td><Link href={`/coin/${c.id}?src=${c.idSource}`} className="flex items-center gap-2 hover:underline">{c.image && <img src={c.image} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full" loading="lazy" />}<span className="font-medium">{c.name}</span><span className="text-xs text-mute">{c.symbol}</span></Link></td>
              <td className="text-right tabular-nums">{fmtUsd(c.price)}</td>
              <td className="text-right"><Pct v={c.ch1h} /></td>
              <td className="text-right"><Pct v={c.ch24h} /></td>
              <td className="text-right"><Pct v={c.ch7d} /></td>
              <td className="text-right tabular-nums">{fmtUsd(c.marketCap, { compact: true })}</td>
              <td className="text-right tabular-nums">{fmtUsd(c.volume24h, { compact: true })}</td>
              {showSpark && !dense && <td className="text-right"><Sparkline data={c.sparkline} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
