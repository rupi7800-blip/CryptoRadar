import 'server-only';
import { setCache, setCacheError } from '../db';
import { fetchJson } from '../http';

/**
 * Radar nuovi token (DEX Screener) + controlli automatici dei contratti (GoPlus Security).
 * NOTA: nessun token viene mai classificato come "sicuro". L'analisi automatica può solo segnalare rischi.
 */

const GOPLUS_CHAIN: Record<string, string> = { ethereum: '1', bsc: '56', base: '8453', arbitrum: '42161', polygon: '137', avalanche: '43114', optimism: '10' };

export type TokenRisk = { level: 'ESTREMO' | 'MOLTO ALTO' | 'ALTO'; reasons: string[]; checks: string[]; securityAvailable: boolean };

type Pair = {
  chainId: string; dexId: string; url: string; pairAddress: string; baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string; liquidity?: { usd?: number }; volume?: { h24?: number; h1?: number }; priceChange?: { h1?: number; h24?: number };
  txns?: { h24?: { buys: number; sells: number } }; fdv?: number; marketCap?: number; pairCreatedAt?: number; boosts?: { active?: number };
  info?: { socials?: { type: string; url: string }[]; websites?: { url: string }[] };
};

export async function refreshNewTokens() {
  try {
    const [profiles, boosts] = await Promise.all([
      fetchJson<any[]>('https://api.dexscreener.com/token-profiles/latest/v1', { sourceId: 'dexscreener' }),
      fetchJson<any[]>('https://api.dexscreener.com/token-boosts/latest/v1', { sourceId: 'dexscreener' }).catch(() => []),
    ]);
    const boosted = new Set(boosts.map((b) => `${b.chainId}:${b.tokenAddress}`.toLowerCase()));
    const seen = new Set<string>();
    const tokens = [...profiles, ...boosts]
      .filter((p) => p.chainId && p.tokenAddress)
      .filter((p) => {
        const k = `${p.chainId}:${p.tokenAddress}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 60);

    // dati di mercato delle coppie, raggruppati per chain (max 30 indirizzi per chiamata)
    const byChain = new Map<string, string[]>();
    for (const t of tokens) byChain.set(t.chainId, [...(byChain.get(t.chainId) ?? []), t.tokenAddress]);
    const pairs: Pair[] = [];
    for (const [chain, addrs] of byChain) {
      for (let i = 0; i < addrs.length; i += 30) {
        const r = await fetchJson<Pair[]>(`https://api.dexscreener.com/tokens/v1/${encodeURIComponent(chain)}/${addrs.slice(i, i + 30).map(encodeURIComponent).join(',')}`, { sourceId: 'dexscreener' }).catch(() => []);
        pairs.push(...r);
      }
    }
    // coppia più liquida per token
    const best = new Map<string, Pair>();
    for (const p of pairs) {
      const k = `${p.chainId}:${p.baseToken.address}`.toLowerCase();
      const cur = best.get(k);
      if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(k, p);
    }

    const items = [];
    for (const t of tokens) {
      const k = `${t.chainId}:${t.tokenAddress}`.toLowerCase();
      const p = best.get(k);
      const sec = await securityCheck(t.chainId, t.tokenAddress).catch(() => null);
      const risk = assessRisk(p, sec, boosted.has(k));
      items.push({
        chain: t.chainId, address: t.tokenAddress, name: p?.baseToken.name ?? null, symbol: p?.baseToken.symbol ?? null,
        description: typeof t.description === 'string' ? t.description.slice(0, 280) : null, icon: t.icon ?? null,
        dexUrl: p?.url ?? t.url ?? null, priceUsd: p?.priceUsd ? Number(p.priceUsd) : null, liquidityUsd: p?.liquidity?.usd ?? null,
        volume24h: p?.volume?.h24 ?? null, volume1h: p?.volume?.h1 ?? null, ch1h: p?.priceChange?.h1 ?? null, ch24h: p?.priceChange?.h24 ?? null,
        buys24h: p?.txns?.h24?.buys ?? null, sells24h: p?.txns?.h24?.sells ?? null, fdv: p?.fdv ?? null,
        createdAt: p?.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null, boosted: boosted.has(k),
        links: (t.links ?? []).slice(0, 4).map((l: any) => ({ label: l.label ?? l.type ?? 'link', url: l.url })),
        security: sec, risk,
      });
    }
    setCache('meme:new', items, 'DEX Screener + GoPlus');
    return items.length;
  } catch (e) {
    setCacheError('meme:new', (e as Error).message);
    throw e;
  }
}

type Sec = Record<string, any> & { _chain: string };

async function securityCheck(chain: string, address: string): Promise<Sec | null> {
  if (chain === 'solana') {
    const r = await fetchJson<any>(`https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(address)}`, { sourceId: 'goplus', retries: 0 });
    const d = r?.result?.[address] ?? Object.values(r?.result ?? {})[0];
    return d ? { ...(d as object), _chain: 'solana' } : null;
  }
  const id = GOPLUS_CHAIN[chain];
  if (!id) return null;
  const r = await fetchJson<any>(`https://api.gopluslabs.io/api/v1/token_security/${id}?contract_addresses=${encodeURIComponent(address)}`, { sourceId: 'goplus', retries: 0 });
  const d = r?.result?.[address.toLowerCase()];
  return d ? { ...d, _chain: chain } : null;
}

function pct(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function assessRisk(p: Pair | undefined, sec: Sec | null, boosted: boolean): TokenRisk {
  const reasons: string[] = [];
  const checks: string[] = [];
  let score = 2; // ogni token di questa sezione parte da rischio ALTO
  const liq = p?.liquidity?.usd ?? 0;
  const ageH = p?.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3.6e6 : null;
  if (!p) { reasons.push('Nessuna coppia di scambio trovata: impossibile valutare liquidità e prezzo.'); score += 2; }
  if (p && liq < 10_000) { reasons.push(`Liquidità molto bassa (${Math.round(liq).toLocaleString('it-IT')} $): uscire dalla posizione può essere impossibile.`); score += 2; }
  else if (p && liq < 100_000) { reasons.push('Liquidità bassa (< 100.000 $).'); score += 1; }
  if (ageH != null && ageH < 24) { reasons.push(`Coppia creata da meno di 24 ore (${ageH.toFixed(1)} h).`); score += 1; }
  if (boosted) reasons.push('Il token ha acquistato visibilità a pagamento ("boost") su DEX Screener: non è un indicatore di qualità.');
  const ch = p?.priceChange?.h24;
  if (ch != null && Math.abs(ch) > 100) { reasons.push(`Variazione di prezzo estrema nelle 24h (${ch.toFixed(0)}%): possibile pump and dump.`); score += 1; }
  const tx = p?.txns?.h24;
  if (tx && tx.buys > 50 && tx.sells < tx.buys * 0.05) { reasons.push('Quasi nessuna vendita rispetto agli acquisti: possibile honeypot.'); score += 2; }

  if (!sec) {
    reasons.push('Controllo automatico del contratto non disponibile per questa chain o fallito.');
  } else if (sec._chain === 'solana') {
    checks.push('GoPlus Solana');
    if (sec.mintable?.status === '1') { reasons.push('Autorità di mint attiva: possono essere creati nuovi token.'); score += 1; }
    if (sec.freezable?.status === '1') { reasons.push('Autorità di freeze attiva: i token possono essere congelati.'); score += 2; }
    if (sec.closable?.status === '1') { reasons.push('Il conto token può essere chiuso dal proprietario.'); score += 1; }
    const top = topHolderShare(sec.holders);
    if (top != null && top > 50) { reasons.push(`I primi 10 indirizzi detengono il ${top.toFixed(0)}% della supply.`); score += 1; }
  } else {
    checks.push('GoPlus EVM');
    if (sec.is_honeypot === '1') { reasons.push('Rilevato HONEYPOT: potrebbe essere impossibile vendere.'); score += 4; }
    if (sec.cannot_sell_all === '1') { reasons.push('Non è possibile vendere l\'intero saldo.'); score += 2; }
    const bt = pct(sec.buy_tax), st = pct(sec.sell_tax);
    if ((bt ?? 0) > 0.1 || (st ?? 0) > 0.1) { reasons.push(`Tasse elevate: acquisto ${(100 * (bt ?? 0)).toFixed(0)}%, vendita ${(100 * (st ?? 0)).toFixed(0)}%.`); score += 2; }
    if (sec.is_mintable === '1') { reasons.push('Il proprietario può emettere nuovi token (mint).'); score += 1; }
    if (sec.is_open_source === '0') { reasons.push('Codice del contratto non verificato/pubblico.'); score += 2; }
    if (sec.is_proxy === '1') { reasons.push('Contratto proxy: la logica può essere cambiata.'); score += 1; }
    if (sec.hidden_owner === '1' || sec.can_take_back_ownership === '1') { reasons.push('Proprietà nascosta o recuperabile.'); score += 2; }
    if (sec.is_blacklisted === '1') reasons.push('Il contratto prevede una blacklist di indirizzi.');
    if (sec.trading_cooldown === '1' || sec.transfer_pausable === '1') { reasons.push('Trasferimenti sospendibili o con cooldown.'); score += 1; }
    const top = topHolderShare(sec.holders);
    if (top != null && top > 50) { reasons.push(`I primi 10 indirizzi detengono il ${top.toFixed(0)}% della supply.`); score += 1; }
    const lpLocked = (sec.lp_holders ?? []).some((h: any) => h.is_locked === 1);
    if (sec.lp_holders && !lpLocked) { reasons.push('Nessuna liquidità risulta bloccata (rischio rug pull).'); score += 1; }
    if (sec.is_airdrop_scam === '1' || sec.fake_token === '1') { reasons.push('Segnalato come token falso o truffa airdrop.'); score += 4; }
  }
  const level: TokenRisk['level'] = score >= 6 ? 'ESTREMO' : score >= 4 ? 'MOLTO ALTO' : 'ALTO';
  if (!reasons.length) reasons.push('Nessun segnale specifico rilevato dai controlli automatici: questo NON significa che il token sia sicuro.');
  return { level, reasons, checks, securityAvailable: !!sec };
}

function topHolderShare(holders: any): number | null {
  if (!Array.isArray(holders) || !holders.length) return null;
  const s = holders.slice(0, 10).reduce((acc: number, h: any) => acc + (Number(h.percent) || 0), 0);
  return s <= 1.5 ? s * 100 : s;
}
