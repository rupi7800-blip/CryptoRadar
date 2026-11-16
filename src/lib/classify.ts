import 'server-only';
import { getCache, getSetting } from './db';
import type { Coin } from './market/types';

/** Parole chiave predefinite per sezione (modificabili dal pannello admin → impostazione "category_keywords"). */
export const DEFAULT_CATEGORY_KEYWORDS: Record<string, string> = {
  bitcoin: '\\bbitcoin\\b|\\bbtc\\b|satoshi|lightning network|halving|\\bminers?\\b|hashrate|spot etf|\\bibit\\b|microstrategy|\\bstrategy\\b.*\\bbtc|ordinals|runes',
  altcoin: '\\bethereum\\b|\\beth\\b|solana|\\bsol\\b|\\bxrp\\b|ripple|\\bbnb\\b|cardano|\\bada\\b|avalanche|\\bavax\\b|chainlink|polkadot|\\bsui\\b|\\bton\\b|toncoin|tron|\\btrx\\b|litecoin|hyperliquid|aptos|near protocol|altcoin|stellar|\\bxlm\\b|hedera',
  meme: 'memecoin|meme coin|meme token|dogecoin|\\bdoge\\b|shiba|\\bpepe\\b|\\bbonk\\b|\\bwif\\b|pump\\.fun|pumpfun|shitcoin|rug ?pull|honeypot|pump and dump|trump coin|\\$trump|floki',
  defi: '\\bdefi\\b|decentralized finance|\\btvl\\b|lending|borrow|yield|liquidity pool|\\bdex\\b|uniswap|aave|curve finance|maker|sky protocol|lido|eigenlayer|restaking|stablecoin|usdt|usdc|tether|\\bethena\\b|pendle|morpho',
  exchange: 'binance|coinbase|kraken|\\bokx\\b|bybit|kucoin|bitget|crypto\\.com|uniswap|pancakeswap|exchange|listing|delist|proof of reserves|withdrawals',
  staking: 'staking|staked|\\bstake\\b|validator|\\bapy\\b|\\bapr\\b|liquid staking|restaking|slashing|unstak',
  tech: 'layer[ -]?2|\\bl2\\b|rollup|zero[- ]knowledge|\\bzk\\b|zk-?evm|smart contract|upgrade|hard ?fork|mainnet|interoperab|cross-chain|bridge|oracle|tokeniz|real[- ]world asset|\\brwa\\b|\\bnft\\b|gaming|web3|modular|data availability|scalab|account abstraction|quantum|release|client',
  regulation: '\\bsec\\b|\\bcftc\\b|\\besma\\b|\\becb\\b|\\bbce\\b|central bank|federal reserve|\\bfed\\b|\\bfomc\\b|interest rate|inflation|\\bcpi\\b|mica|regulat|legislat|congress|senate|lawsuit|court|judge|tax|treasury|government|banca d.italia|european commission|\\bgenius act\\b|clarity act|ban\\b|license|compliance|aml',
  airdrop: 'airdrop|testnet|\\btge\\b|token generation|token launch|\\bico\\b|\\bido\\b|launchpad|points program|incentive program|retroactive|claim|snapshot|whitelist',
  experts: 'analyst|research|report|economist|founder says|ceo says|opinion|interview|outlook',
  security: 'hack|exploit|drained|phishing|scam|fraud|rug ?pull|stolen|theft|vulnerab|breach|attack|malware|drainer|compromis|ponzi|laundering|lazarus|address poisoning|private key',
};

export const FLAG_PATTERNS: Record<string, RegExp> = {
  rumor: /\b(reportedly|rumou?rs?|according to (people|sources|a source|insiders)|people familiar|allegedly|unconfirmed|speculation|leaked|insiders say|indiscrezion|secondo fonti)\b/i,
  denial: /\b(denies|denied|deny|refutes?|debunk(s|ed)?|fake news|false (report|claim)s?|smentisc\w*|not true|no plans? to)\b/i,
  urgent: /\b(hack(ed|s)?|exploit(ed|s)?|drain(ed|s)?|breach(ed)?|stolen|halts? withdrawals|paus(es|ed) withdrawals|suspend(s|ed) withdrawals|insolven\w*|bankrupt\w*|outage|emergency|critical vulnerabilit\w*|under attack)\b/i,
  breaking: /^breaking\b|\bbreaking:|\bjust in\b/i,
  prediction: /\b(price prediction|could (reach|hit|soar|surge|crash)|predicts?|forecast|price target|to hit \$|will hit|eyes \$|previsione|outlook)\b/i,
  sponsored: /\b(sponsored|press release|partner content|paid content|presale|pre-sale|comunicato sponsorizzato)\b/i,
};

const SYMBOL_STOP = new Set(['ONE', 'FOR', 'THE', 'NOW', 'NEW', 'BIG', 'TOP', 'ALL', 'CAT', 'SUN', 'GAS', 'KEY', 'AND', 'ANY', 'API', 'AI', 'CEO', 'SEC', 'ETF', 'USD', 'EUR', 'USA', 'FED', 'CPI', 'GDP', 'IPO', 'DAO', 'NFT', 'DEX', 'CEX', 'TVL', 'APY', 'APR', 'OKB', 'HYPE', 'MOVE', 'JUST', 'MAX', 'PUMP', 'TRUMP', 'ACT', 'WIN', 'HOT', 'LOW', 'ICP', 'LINK', 'SAFE', 'REAL', 'OPEN', 'BEAM', 'PEOPLE', 'MEME', 'WAVES', 'GOLD', 'SPX', 'AERO', 'ZRO', 'CORE', 'FLOW', 'SUPER', 'TIME', 'AMP', 'PRIME', 'ROSE', 'FRONT', 'EDGE', 'ARK', 'LAYER', 'SAND', 'ME', 'IO', 'OM', 'GT', 'HT', 'S', 'G', 'T']);

type IndexEntry = { id: string; re: RegExp; rank: number };
let idxCache: { at: string | null; entries: IndexEntry[] } = { at: null, entries: [] };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function coinIndex(): IndexEntry[] {
  const c = getCache<Coin[]>('market:top');
  if (idxCache.at === c.fetchedAt && idxCache.entries.length) return idxCache.entries;
  const entries: IndexEntry[] = [];
  for (const coin of (c.value ?? []).slice(0, 250)) {
    const parts: string[] = [];
    const name = coin.name.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (name.length >= 4 && !/^(wrapped|bridged|staked|binance-peg)/i.test(name) && !/usd|dollar|euro/i.test(name)) parts.push(escapeRe(name));
    const sym = coin.symbol.toUpperCase();
    const symParts: string[] = [];
    if (sym.length >= 3 && !SYMBOL_STOP.has(sym) && /^[A-Z0-9]+$/.test(sym)) symParts.push(escapeRe(sym));
    const nameRe = parts.length ? `\\b(?:${parts.join('|')})\\b` : null;
    // il simbolo deve essere MAIUSCOLO nel testo, oppure preceduto da $
    const symRe = `\\$${escapeRe(sym)}\\b` + (symParts.length ? `|\\b${symParts[0]}\\b` : '');
    entries.push({ id: coin.id, rank: coin.rank ?? 9999, re: new RegExp(symRe) });
    if (nameRe) entries.push({ id: coin.id, rank: coin.rank ?? 9999, re: new RegExp(nameRe, 'i') });
  }
  idxCache = { at: c.fetchedAt, entries };
  return entries;
}

export function detectCoins(text: string): string[] {
  const found = new Map<string, number>();
  for (const e of coinIndex()) {
    if (found.has(e.id)) continue;
    try {
      if (e.re.test(text)) found.set(e.id, e.rank);
    } catch {
      /* regex non valida: ignora */
    }
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6).map(([id]) => id);
}

let kwCache: { key: string; compiled: Record<string, RegExp> } | null = null;
function categoryRegexes(): Record<string, RegExp> {
  const custom = getSetting<Record<string, string>>('category_keywords', {});
  const merged = { ...DEFAULT_CATEGORY_KEYWORDS, ...custom };
  const key = JSON.stringify(merged);
  if (kwCache?.key === key) return kwCache.compiled;
  const compiled: Record<string, RegExp> = {};
  for (const [k, v] of Object.entries(merged)) {
    try {
      compiled[k] = new RegExp(v, 'i');
    } catch {
      compiled[k] = new RegExp(DEFAULT_CATEGORY_KEYWORDS[k] ?? '(?!)', 'i');
    }
  }
  kwCache = { key, compiled };
  return compiled;
}

export function classify(title: string, excerpt: string, sourceCategory: string, sectionHint: string | null) {
  const text = `${title}. ${excerpt}`;
  const cats = new Set<string>();
  const res = categoryRegexes();
  for (const [cat, re] of Object.entries(res)) {
    if (cat === 'experts') continue;
    // per le categorie "larghe" usiamo solo il titolo per ridurre i falsi positivi
    const target = ['exchange', 'tech', 'regulation', 'staking'].includes(cat) ? title : text;
    if (re.test(target)) cats.add(cat);
  }
  if (sectionHint) cats.add(sectionHint);
  if (sourceCategory === 'expert') cats.add('experts');
  if (sourceCategory === 'security') cats.add('security');
  if (sourceCategory === 'regulator' || sourceCategory === 'macro') cats.add('regulation');
  if (sourceCategory === 'official-exchange') cats.add('exchange');
  if (sourceCategory === 'dev') cats.add('tech');
  const flags: string[] = [];
  for (const [f, re] of Object.entries(FLAG_PATTERNS)) {
    const target = f === 'breaking' || f === 'denial' || f === 'rumor' || f === 'urgent' ? title : text;
    if (re.test(target)) flags.push(f);
  }
  // "urgent" su sicurezza solo se riguarda effettivamente un incidente
  if (flags.includes('urgent')) cats.add('security');
  const coins = detectCoins(text);
  if (coins.includes('bitcoin')) cats.add('bitcoin');
  if (coins.some((c) => c !== 'bitcoin' && c !== 'tether' && c !== 'usd-coin')) cats.add('altcoin');
  return { categories: [...cats], coins, flags };
}
