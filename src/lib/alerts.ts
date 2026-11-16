import 'server-only';
import { all, run, get, getCache, jparse } from './db';
import { pushToDevice } from './push';
import type { Coin } from './market/types';
import { fmtUsd, fmtPct } from './text';

export const ALERT_TYPES: Record<string, { label: string; needsTarget: boolean; needsThreshold: boolean; hint: string }> = {
  price_above: { label: 'Prezzo sopra soglia', needsTarget: true, needsThreshold: true, hint: 'Criptovaluta + prezzo in USD' },
  price_below: { label: 'Prezzo sotto soglia', needsTarget: true, needsThreshold: true, hint: 'Criptovaluta + prezzo in USD' },
  change_24h: { label: 'Variazione 24h oltre ±%', needsTarget: true, needsThreshold: true, hint: 'Criptovaluta + percentuale (es. 8)' },
  volume_spike: { label: 'Aumento volume', needsTarget: true, needsThreshold: true, hint: 'Criptovaluta + aumento % rispetto al rilevamento precedente' },
  breaking: { label: 'Notizie urgenti (breaking)', needsTarget: false, needsThreshold: false, hint: '' },
  security: { label: 'Problemi di sicurezza confermati', needsTarget: false, needsThreshold: false, hint: '' },
  listing: { label: 'Nuove quotazioni / delisting (annunci ufficiali)', needsTarget: false, needsThreshold: false, hint: '' },
  airdrop: { label: 'Nuovi airdrop / lanci', needsTarget: false, needsThreshold: false, hint: '' },
  coin_news: { label: 'Notizie su una criptovaluta', needsTarget: true, needsThreshold: false, hint: 'Criptovaluta (id, es. bitcoin)' },
  keyword: { label: 'Parola chiave nelle notizie', needsTarget: true, needsThreshold: false, hint: 'Parola o frase' },
  expert: { label: 'Nuovi contributi di un esperto/fonte', needsTarget: true, needsThreshold: false, hint: 'Id della fonte (es. vitalik)' },
  macro: { label: 'Eventi macro / regolatori', needsTarget: false, needsThreshold: false, hint: '' },
  watchlist_news: { label: 'Notizie sugli elementi della watchlist', needsTarget: false, needsThreshold: false, hint: '' },
};

type Rule = { id: number; device_id: string; type: string; target: string | null; threshold: number | null; cooldown_min: number; push: number; last_fired: string | null };

function emit(rule: Rule, dedupe: string, title: string, body: string, url: string) {
  const r = run('INSERT OR IGNORE INTO alert_events(device_id, rule_id, title, body, url, dedupe_key) VALUES(?,?,?,?,?,?)', rule.device_id, rule.id, title, body, url, `${rule.id}:${dedupe}`);
  if (!r.changes) return false;
  run('UPDATE alert_rules SET last_fired = ? WHERE id = ?', new Date().toISOString(), rule.id);
  if (rule.push) pushToDevice(rule.device_id, { title, body, url, tag: `r${rule.id}` }).catch(() => null);
  return true;
}

function coolingDown(rule: Rule) {
  return rule.last_fired && Date.now() - Date.parse(rule.last_fired) < rule.cooldown_min * 60e3;
}

/** Valuta tutte le regole attive. Deduplica per evento e rispetta il periodo di silenzio (cooldown) di ogni regola. */
export function evaluateAlerts() {
  const rules = all<Rule>('SELECT * FROM alert_rules WHERE enabled = 1');
  if (!rules.length) return 0;
  const coins = getCache<Coin[]>('market:top').value ?? [];
  const prev = getCache<{ vol: Record<string, number | null> }>('market:prev').value;
  const byId = new Map(coins.map((c) => [c.id, c]));
  const bySym = new Map(coins.map((c) => [c.symbol.toLowerCase(), c]));
  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const recent = all<{ id: number; title: string; title_it: string | null; categories: string; coins: string; flags: string; source_id: string; is_breaking: number; cluster_id: number; status: string; source_cat: string }>(
    `SELECT a.id, a.title, a.title_it, a.categories, a.coins, a.flags, a.source_id, a.is_breaking, a.cluster_id, COALESCE(c.status_override, c.status) AS status, s.category AS source_cat
     FROM articles a JOIN clusters c ON c.id = a.cluster_id JOIN sources s ON s.id = a.source_id WHERE a.fetched_at >= ? OR a.published_at >= ? ORDER BY a.published_at DESC LIMIT 300`,
    since.replace('T', ' ').slice(0, 19), since,
  );
  let fired = 0;
  for (const rule of rules) {
    if (coolingDown(rule)) continue;
    const coin = rule.target ? byId.get(rule.target) ?? bySym.get(rule.target.toLowerCase()) : undefined;
    const t = rule.threshold ?? 0;
    const ttl = (a: { title: string; title_it: string | null }) => a.title_it || a.title;
    switch (rule.type) {
      case 'price_above':
        if (coin?.price != null && coin.price >= t && emit(rule, `above:${new Date().toISOString().slice(0, 13)}`, `${coin.symbol} sopra ${fmtUsd(t)}`, `Prezzo attuale ${fmtUsd(coin.price)} (fonte: dato periodico)`, `/coin/${coin.id}?src=${coin.idSource}`)) fired++;
        break;
      case 'price_below':
        if (coin?.price != null && coin.price <= t && emit(rule, `below:${new Date().toISOString().slice(0, 13)}`, `${coin.symbol} sotto ${fmtUsd(t)}`, `Prezzo attuale ${fmtUsd(coin.price)}`, `/coin/${coin.id}?src=${coin.idSource}`)) fired++;
        break;
      case 'change_24h':
        if (coin?.ch24h != null && Math.abs(coin.ch24h) >= t && emit(rule, `ch:${new Date().toISOString().slice(0, 13)}`, `${coin.symbol} ${fmtPct(coin.ch24h)} in 24h`, `Soglia ±${t}% superata. Prezzo ${fmtUsd(coin.price)}`, `/coin/${coin.id}?src=${coin.idSource}`)) fired++;
        break;
      case 'volume_spike': {
        const pv = coin && prev?.vol?.[coin.id];
        if (coin?.volume24h && pv && ((coin.volume24h / pv - 1) * 100) >= t && emit(rule, `vol:${new Date().toISOString().slice(0, 13)}`, `Volume ${coin.symbol} in aumento`, `+${((coin.volume24h / pv - 1) * 100).toFixed(1)}% rispetto al rilevamento precedente`, `/coin/${coin.id}?src=${coin.idSource}`)) fired++;
        break;
      }
      default: {
        for (const a of recent) {
          const cats = jparse<string[]>(a.categories, []);
          const cs = jparse<string[]>(a.coins, []);
          const flags = jparse<string[]>(a.flags, []);
          let match = false;
          if (rule.type === 'breaking') match = a.is_breaking === 1 && a.status !== 'SMENTITA';
          else if (rule.type === 'security') match = cats.includes('security') && flags.includes('urgent') && (a.status === 'CONFERMATA' || a.status === 'CONFERMATA PARZIALMENTE');
          else if (rule.type === 'listing') match = a.source_cat === 'official-exchange' && /\b(list|listing|delist|launch|will add|new (spot|perpetual|futures))/i.test(a.title);
          else if (rule.type === 'airdrop') match = cats.includes('airdrop');
          else if (rule.type === 'coin_news') match = !!rule.target && (cs.includes(rule.target) || (coin ? cs.includes(coin.id) : false));
          else if (rule.type === 'keyword') match = !!rule.target && (ttl(a).toLowerCase().includes(rule.target.toLowerCase()) || a.title.toLowerCase().includes(rule.target.toLowerCase()));
          else if (rule.type === 'expert') match = a.source_id === rule.target;
          else if (rule.type === 'macro') match = a.source_cat === 'regulator' || a.source_cat === 'macro';
          else if (rule.type === 'watchlist_news') {
            const wl = all<{ item_id: string }>("SELECT item_id FROM watchlist WHERE device_id = ? AND item_type = 'coin'", rule.device_id).map((x) => x.item_id);
            match = cs.some((c) => wl.includes(c));
          }
          // una notifica per evento (cluster), non per ogni articolo che lo riprende
          if (match && emit(rule, `c${a.cluster_id}`, ALERT_TYPES[rule.type]?.label ?? 'Avviso', ttl(a), `/notizia/${a.id}`)) {
            fired++;
            break; // max 1 notifica per regola per ciclo: niente raffiche
          }
        }
      }
    }
  }
  return fired;
}

export function unreadCount(deviceId: string) {
  return get<{ n: number }>('SELECT COUNT(*) AS n FROM alert_events WHERE device_id = ? AND read = 0', deviceId)?.n ?? 0;
}
