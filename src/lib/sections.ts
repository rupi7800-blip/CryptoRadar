/** Definizione delle sezioni (condivisa server/client). */
export type SectionId = 'bitcoin' | 'altcoin' | 'meme' | 'defi' | 'exchange' | 'staking' | 'tech' | 'regulation' | 'airdrop' | 'experts' | 'security';

export const SECTIONS: { id: SectionId; label: string; href: string; color: string; icon: string; desc: string }[] = [
  { id: 'bitcoin', label: 'Bitcoin', href: '/bitcoin', color: '#f7931a', icon: '₿', desc: 'Prezzo, rete, mining, ETF, Lightning e adozione' },
  { id: 'altcoin', label: 'Altcoin', href: '/altcoin', color: '#8b5cf6', icon: '◆', desc: 'Progetti per settore e capitalizzazione' },
  { id: 'meme', label: 'Meme coin', href: '/meme', color: '#f43f5e', icon: '⚠', desc: 'Token speculativi ad alto rischio' },
  { id: 'defi', label: 'DeFi', href: '/defi', color: '#06b6d4', icon: '⇄', desc: 'TVL, protocolli, DEX, stablecoin, exploit' },
  { id: 'exchange', label: 'Exchange', href: '/exchange', color: '#eab308', icon: '⇅', desc: 'Annunci ufficiali, listing, riserve, incidenti' },
  { id: 'staking', label: 'Staking', href: '/staking', color: '#22c55e', icon: '%', desc: 'Rendimenti verificati e rischi' },
  { id: 'tech', label: 'Tecnologia', href: '/tecnologia', color: '#3b82f6', icon: '⚙', desc: 'Layer 1/2, ZK, RWA, release software' },
  { id: 'regulation', label: 'Regole & Economia', href: '/regolamentazione', color: '#a3a3a3', icon: '§', desc: 'SEC, ESMA, BCE, MiCA, macro' },
  { id: 'airdrop', label: 'Airdrop & Nuovi', href: '/airdrop', color: '#ec4899', icon: '✦', desc: 'Airdrop, testnet, lanci, nuovi protocolli' },
  { id: 'experts', label: 'Esperti', href: '/esperti', color: '#14b8a6', icon: '✎', desc: 'Analisi e opinioni a confronto' },
  { id: 'security', label: 'Sicurezza', href: '/sicurezza', color: '#ef4444', icon: '⛨', desc: 'Hack, exploit, phishing, truffe' },
];

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));

export const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  CONFERMATA: { label: 'Confermata', cls: 'bg-up/15 text-up border-up/40' },
  'CONFERMATA PARZIALMENTE': { label: 'Confermata parzialmente', cls: 'bg-info/15 text-info border-info/40' },
  'NON VERIFICATA': { label: 'Non verificata', cls: 'bg-warn/15 text-warn border-warn/40' },
  SMENTITA: { label: 'Smentita', cls: 'bg-down/15 text-down border-down/40' },
};
export const STATUSES = Object.keys(STATUS_STYLE);
