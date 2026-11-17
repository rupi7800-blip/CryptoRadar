import { getCache } from '@/lib/db';
import { Card, PageHeader, Freshness, Empty, Disclaimer } from '@/components/ui';
import { SectionNews } from '@/components/SectionNews';
import { fmtUsd } from '@/lib/text';
import Tabs from '@/components/Tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staking e rendimenti' };

type Pool = { pool: string; project: string; projectName: string; category: string | null; url: string | null; chain: string; symbol: string; tvl: number; apy: number; apyBase: number | null; apyReward: number | null; apyMean30d: number | null; apyPct7D: number | null; stablecoin: boolean; ilRisk: string; exposure: string; poolMeta: string | null; audits: string | null };

/** APY → APR equivalente (capitalizzazione giornaliera ipotizzata): solo stima, dichiarata come tale. */
const apr = (apy: number | null) => (apy == null ? null : (365 * (Math.pow(1 + apy / 100, 1 / 365) - 1)) * 100);
const p2 = (n: number | null) => (n == null ? 'n.d.' : `${n.toFixed(2).replace('.', ',')}%`);

const NATIVE: { chain: string; lock: string; unlock: string; req: string; slashing: string; doc: string }[] = [
  { chain: 'Ethereum (ETH)', lock: 'Nessun periodo fisso; i fondi restano attivi finché non si richiede l\'uscita', unlock: 'Coda di uscita variabile (da ore a settimane) + ciclo di prelievo', req: '32 ETH per un validatore in proprio; importi minori tramite pool/liquid staking', slashing: 'Sì (penalità per doppia firma/inattività)', doc: 'https://ethereum.org/staking/' },
  { chain: 'Solana (SOL)', lock: 'Nessuno', unlock: 'Disattivazione alla fine dell\'epoca (circa 2–3 giorni)', req: 'Nessun minimo rilevante per la delega', slashing: 'Previsto dal protocollo, applicazione limitata', doc: 'https://solana.com/staking' },
  { chain: 'Cardano (ADA)', lock: 'Nessuno: i fondi restano spendibili', unlock: 'Immediato', req: 'Deposito rimborsabile di 2 ADA per la registrazione', slashing: 'No', doc: 'https://cardano.org/stake-pool-delegation/' },
  { chain: 'Polkadot (DOT)', lock: 'Fondi vincolati durante lo staking', unlock: '28 giorni di unbonding', req: 'Minimo variabile (nomination pool per importi piccoli)', slashing: 'Sì', doc: 'https://polkadot.com/' },
  { chain: 'Cosmos Hub (ATOM)', lock: 'Fondi vincolati durante lo staking', unlock: '21 giorni di unbonding', req: 'Nessun minimo rilevante', slashing: 'Sì', doc: 'https://cosmos.network/' },
  { chain: 'Avalanche (AVAX)', lock: 'Periodo scelto dall\'utente (minimo 2 settimane per la delega)', unlock: 'Alla scadenza del periodo', req: 'Minimo per delega definito dal protocollo', slashing: 'No (ricompense perse in caso di scarsa disponibilità del validatore)', doc: 'https://www.avax.network/' },
  { chain: 'NEAR (NEAR)', lock: 'Nessun periodo fisso', unlock: 'Circa 4 epoche (2–3 giorni)', req: 'Nessun minimo rilevante', slashing: 'Previsto dal protocollo', doc: 'https://near.org/' },
];

export default async function Staking({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const y = getCache<Pool[]>('yields:staking');
  const all = y.value ?? [];
  const chains = [...new Set(all.map((p) => p.chain))].slice(0, 12);
  return (
    <div className="space-y-4">
      <PageHeader title="Staking e rendimenti" desc="Rendimenti verificati on-chain, tipologia del rendimento e rischi" color="#22c55e" />
      <div className="rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm text-ink/85">
        <b className="text-warn">Come leggere i rendimenti.</b> Tutti i valori sono <b>variabili</b> e calcolati sul passato: non sono garantiti. <b>APY base</b> = rendimento generato dal protocollo (ricompense di staking/commissioni). <b>APY incentivi</b> = token distribuiti come premio: <b>promozionale</b>, può terminare in qualsiasi momento ed è pagato in token il cui prezzo può crollare. L&apos;<b>APR</b> mostrato è una <b>stima</b> convertita dall&apos;APY (capitalizzazione giornaliera). Il rendimento percentuale è espresso nel token in staking: il <b>rendimento effettivo</b> in euro dipende dal prezzo del token, dalle commissioni e dalle tasse. Nessun rendimento è garantito contrattualmente da questa pagina.
      </div>
      <Card title="Liquid staking e restaking — pool principali" right={<Freshness fetchedAt={y.fetchedAt} source={y.source} error={y.error} everySec={3600} />}>
        {all.length ? <Tabs id="chain" tabs={['Tutte', ...chains]} panels={[all, ...chains.map((c) => all.filter((p) => p.chain === c))].map((pools, k) => <PoolTable key={k} pools={pools} />)} /> : <Empty>{y.error ? `Non disponibile: ${y.error.slice(0, 160)}` : 'In caricamento…'}</Empty>}
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Fonte: DefiLlama Yields (pool con TVL &gt; 1 Mln $). Periodo di blocco: i token di liquid staking sono scambiabili, ma il riscatto diretto segue la coda del protocollo sottostante. Requisiti e commissioni specifici della piattaforma: verificare sul sito ufficiale (link sul nome). Rendimenti di exchange centralizzati (Earn) non mostrati: non esiste una fonte gratuita verificabile e includono rischio di controparte dell&apos;exchange.</p>
      </Card>
      <Card title="Staking nativo — regole di protocollo">
        <div className="overflow-x-auto"><table className="tbl min-w-[860px]"><thead><tr><th>Blockchain</th><th>Periodo di blocco</th><th>Sblocco</th><th>Requisiti</th><th>Slashing</th><th>Documentazione</th></tr></thead>
          <tbody>{NATIVE.map((n) => <tr key={n.chain}><td className="font-medium">{n.chain}</td><td className="text-xs">{n.lock}</td><td className="text-xs">{n.unlock}</td><td className="text-xs text-mute">{n.req}</td><td className="text-xs">{n.slashing}</td><td><a className="text-xs text-accent" href={n.doc} target="_blank" rel="noopener noreferrer">ufficiale ↗</a></td></tr>)}</tbody></table></div>
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Regole di protocollo compilate dalla redazione (revisione: novembre 2026). Possono cambiare con gli aggiornamenti di rete: verifica sempre la documentazione ufficiale. Gli APY dello staking nativo variano con la partecipazione complessiva e non sono mostrati senza una fonte verificata.</p>
      </Card>
      <SectionNews title="Notizie su staking, validatori e restaking" filter={{ section: 'staking' }} sp={sp} basePath="/staking" />
      <Disclaimer />
    </div>
  );
}

function PoolTable({ pools }: { pools: Pool[] }) {
  return (
          <div className="overflow-x-auto"><table className="tbl min-w-[980px]">
            <thead><tr><th>Cripto</th><th>Piattaforma</th><th>Chain</th><th className="text-right">APY totale</th><th className="text-right">APY base</th><th className="text-right">APY incentivi</th><th className="text-right">APR (stima)</th><th className="text-right">Media 30g</th><th className="text-right">TVL</th><th>Tipo rendimento</th><th>Rischi principali</th></tr></thead>
            <tbody>{pools.slice(0, 50).map((p) => {
              const restaking = /restak/i.test(p.category ?? '');
              return (
                <tr key={p.pool}>
                  <td className="font-medium">{p.symbol}{p.poolMeta && <div className="text-[10px] text-mute">{p.poolMeta}</div>}</td>
                  <td>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{p.projectName}</a> : p.projectName}<div className="text-[10px] text-mute">{p.category}</div></td>
                  <td className="text-xs text-mute">{p.chain}</td>
                  <td className="text-right font-semibold tabular-nums">{p2(p.apy)}</td>
                  <td className="text-right tabular-nums">{p2(p.apyBase)}</td>
                  <td className={`text-right tabular-nums ${p.apyReward ? 'text-warn' : 'text-mute'}`}>{p.apyReward ? p2(p.apyReward) : '—'}</td>
                  <td className="text-right tabular-nums text-mute">{p2(apr(p.apyBase ?? p.apy))}</td>
                  <td className="text-right tabular-nums text-mute">{p2(p.apyMean30d)}</td>
                  <td className="text-right tabular-nums">{fmtUsd(p.tvl, { compact: true })}</td>
                  <td className="text-xs">{p.apyReward ? <span className="text-warn">variabile + promozionale</span> : 'variabile'}</td>
                  <td className="text-[11px] text-mute">
                    Smart contract/controparte{restaking ? ', slashing cumulato (restaking)' : ', slashing dei validatori'}, de-peg del token liquido{p.ilRisk === 'yes' ? ', perdita impermanente' : ''}, prezzo del token{!p.audits || p.audits === '0' ? '; nessun audit dichiarato' : ''}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        );
}
