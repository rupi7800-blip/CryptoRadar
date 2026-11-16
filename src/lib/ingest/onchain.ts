import 'server-only';
import { setCache, setCacheError } from '../db';
import { fetchJson, fetchText } from '../http';

const M = 'https://mempool.space/api';

export async function refreshBitcoinNetwork() {
  try {
    const [heightTxt, diff, fees, hash, ln] = await Promise.all([
      fetchText(`${M}/blocks/tip/height`, { sourceId: 'mempool' }),
      fetchJson<any>(`${M}/v1/difficulty-adjustment`, { sourceId: 'mempool' }),
      fetchJson<any>(`${M}/v1/fees/recommended`, { sourceId: 'mempool' }),
      fetchJson<any>(`${M}/v1/mining/hashrate/1m`, { sourceId: 'mempool' }),
      fetchJson<any>(`${M}/v1/lightning/statistics/latest`, { sourceId: 'mempool' }).catch(() => null),
    ]);
    const height = Number(heightTxt.trim());
    const nextHalving = Math.ceil((height + 1) / 210000) * 210000;
    const blocksLeft = nextHalving - height;
    const avgBlockMs = diff.timeAvg && diff.timeAvg > 0 ? diff.timeAvg : 600000;
    const hashrates = (hash.hashrates ?? []) as { timestamp: number; avgHashrate: number }[];
    setCache(
      'btc:network',
      {
        height,
        difficulty: hash.currentDifficulty ?? null,
        hashrate: hash.currentHashrate ?? null,
        hashrateSeries: hashrates.slice(-30).map((h) => ({ t: h.timestamp * 1000, v: h.avgHashrate })),
        difficultyAdjustment: {
          progress: diff.progressPercent, change: diff.difficultyChange, remainingBlocks: diff.remainingBlocks,
          estimatedDate: diff.estimatedRetargetDate ? new Date(diff.estimatedRetargetDate).toISOString() : null, previous: diff.previousRetarget,
        },
        fees,
        halving: {
          nextHeight: nextHalving, blocksLeft, estimatedDate: new Date(Date.now() + blocksLeft * avgBlockMs).toISOString(),
          subsidyNow: 50 / 2 ** Math.floor(height / 210000), subsidyNext: 50 / 2 ** Math.floor(nextHalving / 210000),
        },
        lightning: ln?.latest
          ? {
              channels: ln.latest.channel_count, nodes: ln.latest.node_count, capacityBtc: ln.latest.total_capacity / 1e8,
              snapshotDate: ln.latest.added, // può essere vecchio: mostrato esplicitamente
            }
          : null,
      },
      'mempool.space',
    );
    // grandi transazioni nel blocco più recente (prime 25 tx per valore non disponibili via API: si analizzano i blocchi recenti)
    await refreshWhaleTx().catch(() => null);
    return 1;
  } catch (e) {
    setCacheError('btc:network', (e as Error).message);
    throw e;
  }
}

/**
 * "Movimenti delle balene" con dati gratuiti: analizza le transazioni nel mempool (endpoint /mempool/recent)
 * e quelle delle prime pagine dell'ultimo blocco, registrando quelle oltre la soglia (default 100 BTC).
 * Copertura parziale e dichiarata nell'interfaccia. Con WHALE_ALERT_API_KEY si usa Whale Alert (multi-chain).
 */
export async function refreshWhaleTx() {
  const threshold = 100e8;
  const out: { txid: string; btc: number; at: string; where: string }[] = [];
  const recent = await fetchJson<{ txid: string; value: number }[]>(`${M}/mempool/recent`, { sourceId: 'mempool' });
  for (const t of recent) if (t.value >= threshold) out.push({ txid: t.txid, btc: t.value / 1e8, at: new Date().toISOString(), where: 'mempool' });
  const hash = (await fetchText(`${M}/blocks/tip/hash`, { sourceId: 'mempool' })).trim();
  for (const start of [0, 25, 50, 75]) {
    const txs = await fetchJson<any[]>(`${M}/block/${hash}/txs/${start}`, { sourceId: 'mempool' });
    for (const tx of txs) {
      const v = (tx.vout as { value: number }[]).reduce((s, o) => s + (o.value || 0), 0);
      if (v >= threshold && !tx.vin?.[0]?.is_coinbase)
        out.push({ txid: tx.txid, btc: v / 1e8, at: new Date((tx.status?.block_time ?? Date.now() / 1000) * 1000).toISOString(), where: `blocco ${tx.status?.block_height ?? ''}` });
    }
  }
  setCache('btc:whales', { threshold: 100, items: out.sort((a, b) => b.btc - a.btc).slice(0, 20), scope: 'mempool recente + prime 100 tx dell\'ultimo blocco' }, 'mempool.space');
}

export async function refreshEthGas() {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) {
    setCacheError('eth:gas', 'ETHERSCAN_API_KEY non configurata');
    return 0;
  }
  const r = await fetchJson<any>(`https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${encodeURIComponent(key)}`, { sourceId: 'etherscan' });
  if (r.status !== '1') throw new Error('Etherscan: ' + (r.message || 'errore'));
  setCache('eth:gas', { safe: Number(r.result.SafeGasPrice), propose: Number(r.result.ProposeGasPrice), fast: Number(r.result.FastGasPrice), base: Number(r.result.suggestBaseFee) }, 'Etherscan');
  return 1;
}

/** Dati macro ufficiali da FRED (chiave gratuita). */
export async function refreshMacro() {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    setCacheError('macro:fred', 'FRED_API_KEY non configurata');
    return 0;
  }
  const series: [string, string, string][] = [
    ['FEDFUNDS', 'Tasso Fed Funds effettivo', '%'],
    ['CPIAUCSL', 'Inflazione USA (CPI, indice)', 'indice'],
    ['DGS10', 'Rendimento Treasury 10 anni', '%'],
    ['DTWEXBGS', 'Indice dollaro (broad)', 'indice'],
    ['ECBDFR', 'Tasso BCE sui depositi', '%'],
  ];
  const out = [];
  for (const [id, label, unit] of series) {
    const r = await fetchJson<any>(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=13`,
      { sourceId: 'fred' },
    );
    const obs = (r.observations as { date: string; value: string }[]).filter((o) => o.value !== '.');
    const last = obs[0];
    let yoy: number | null = null;
    if (id === 'CPIAUCSL' && obs[12]) yoy = (Number(obs[0].value) / Number(obs[12].value) - 1) * 100;
    out.push({ id, label, unit, value: last ? Number(last.value) : null, date: last?.date ?? null, yoy });
  }
  setCache('macro:fred', out, 'FRED');
  return out.length;
}
