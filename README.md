# CRYPTO RADAR — *Il mondo cripto, sotto controllo*

Piattaforma web installabile (PWA) di informazione, monitoraggio e approfondimento sull'ecosistema cripto, blockchain e DeFi, in italiano.
Raccoglie notizie e dati da fonti internazionali autorizzate, li traduce, raggruppa gli articoli sullo stesso evento, ne valuta l'affidabilità in modo trasparente e li presenta in 12 sezioni tematiche più mercato, watchlist, alert, ricerca e archivio.

> Nessun dato viene inventato: se una fonte non risponde, l'interfaccia lo dice e mostra l'ultimo dato valido marcato come **non aggiornato**. Le funzioni che richiedono credenziali assenti sono indicate come **non disponibili**, con le istruzioni per attivarle.

---

## 1. Avvio rapido

Requisiti: **Node.js ≥ 22.13** (usa il modulo SQLite integrato `node:sqlite`, nessun database esterno da installare).

```bash
npm install
cp .env.example .env        # imposta almeno ADMIN_PASSWORD
npm run build
npm start                   # http://localhost:3000
```

Sviluppo: `npm run dev`. Con Docker: `docker compose up -d --build` (il database resta nella cartella `./data`).

Al primo avvio lo scheduler interno registra le fonti nel database e inizia subito l'acquisizione: le prime notizie e i prezzi compaiono entro 1–2 minuti.

**Hosting consigliato:** un server sempre acceso (VPS da pochi euro al mese, Raspberry Pi, Railway/Fly.io/Render con disco persistente). Lo scheduler gira dentro l'app; su piattaforme "serverless" che sospendono i processi imposta `DISABLE_SCHEDULER=1` e `CRON_SECRET`, poi chiama `POST /api/cron` ogni minuto da un servizio esterno (es. cron di sistema, cron-job.org) con l'header `Authorization: Bearer <CRON_SECRET>`.

Per installarla come app: aprila dal telefono (in HTTPS) e scegli "Installa" / "Aggiungi a schermata Home".

---

## 1-bis. Due modi di farla funzionare da GitHub

Lo stesso codice produce due versioni.

### A) Versione statica su GitHub Pages (gratuita, già configurata)
Il workflow `.github/workflows/pages.yml` ogni 30 minuti raccoglie notizie e dati, li traduce e (se ci sono chiavi AI) li analizza, genera il sito e lo pubblica su `https://<utente>.github.io/<repository>/`.

**Attivazione (una volta):**
1. Repository → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
2. (Consigliato) **Settings → Secrets and variables → Actions → New repository secret**: `COINGECKO_API_KEY`, `CONTACT_EMAIL`, `MYMEMORY_EMAIL` e almeno una chiave AI (`GEMINI_API_KEY` o `GROQ_API_KEY` hanno piani gratuiti; oppure `ANTHROPIC_API_KEY`). Facoltative: `FRED_API_KEY`, `ETHERSCAN_API_KEY`, `CMC_API_KEY`.
3. **Actions → "Pubblica su GitHub Pages" → Run workflow** per la prima pubblicazione (poi parte da sola).

**Requisiti di GitHub:** Pages da un repository **privato** richiede un piano a pagamento (GitHub Pro o superiore); con un repository pubblico è gratuito. I minuti di Actions sono illimitati per i repository pubblici; per quelli privati il piano gratuito include 2.000 minuti/mese (Pro 3.000): un aggiornamento dura circa 4–6 minuti, quindi con un repository privato conviene ridurre la frequenza (riga `cron` del workflow, es. `'7 */3 * * *'` = ogni 3 ore). Il sito pubblicato è comunque sempre visibile a chiunque abbia l'indirizzo. Nel codice non ci sono segreti: le chiavi stanno solo nei Secrets.

**Cosa cambia rispetto all'app completa:**
| Funzione | Versione statica |
|---|---|
| Notizie, sezioni, mercato, DeFi, Bitcoin, staking, meme, affidabilità | ✅ aggiornati ogni ~30 min (indicato in alto nella pagina) |
| Prezzi principali | ✅ in tempo reale nel browser via Binance WebSocket (se raggiungibile) |
| Grafici, ricerca, filtri, watchlist | ✅ nel browser (watchlist salvata sul dispositivo) |
| Traduzione di pagina | ✅ diretta dal browser con MyMemory (quota gratuita per utente) |
| Analisi AI | ✅ generate automaticamente per gli eventi principali; ❌ su richiesta |
| Avvisi | ✅ controllati nel browser **solo mentre l'app è aperta**; ❌ push in background |
| Archivio | ✅ ultimi 7 giorni consultabili (`STATIC_DAYS`) |
| Pannello admin | ❌ — fonti in `src/lib/sources/catalog.ts`, chiavi nei Secrets, frequenza nel workflow |

Prova in locale: `npm run ingest && NEXT_PUBLIC_BASE_PATH=/CryptoRadar npm run build:static` → cartella `out/`.

### B) App completa con deploy automatico da GitHub
Tutte le funzioni (admin, push in background, AI su richiesta, aggiornamento al minuto). Richiede un hosting Node sempre acceso:
- **Render** (configurazione inclusa, `render.yaml`): Render → New → **Blueprint** → collega il repository GitHub → inserisci `ADMIN_PASSWORD` e le chiavi → ogni push su `main` aggiorna l'app. Piano Starter con disco persistente: circa 7 $/mese.
- **Railway / Fly.io / VPS**: usa il `Dockerfile` incluso con un volume su `/app/data`.

Il workflow `ci.yml` controlla tipi e build a ogni modifica.

## 2. Credenziali: quali servono, dove inserirle, come ottenerle

Tutte vanno nel file `.env` sul server (mai nel frontend). Lo stato di ciascuna è visibile in **Admin → Configurazione**.

| Variabile | Necessità | A cosa serve | Come ottenerla (costo) |
|---|---|---|---|
| `ADMIN_PASSWORD` | **obbligatoria** | accesso a `/admin` | scegline una lunga (≥ 10 caratteri) |
| `SESSION_SECRET` | consigliata | firma delle sessioni admin | `openssl rand -hex 32` |
| `COINGECKO_API_KEY` | consigliata | prezzi, trending, settori, exchange con meno errori 429 | coingecko.com/en/api → *Demo* (gratis, senza carta) |
| `CONTACT_EMAIL` | consigliata | User-Agent richiesto dalla SEC | il tuo indirizzo |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` / `MISTRAL_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `OLLAMA_URL` | almeno una per l'AI | traduzione AI, analisi, briefing, confronto esperti | console dei rispettivi fornitori; Gemini, Groq, Mistral e OpenRouter hanno piani gratuiti, Ollama è locale e gratuito |
| `MYMEMORY_EMAIL` | facoltativa | quota di traduzione gratuita 50.000 car./giorno (invece di 5.000) | nessuna registrazione |
| `CMC_API_KEY` | facoltativa | terzo fornitore di prezzi | coinmarketcap.com/api → Basic (gratis) |
| `ETHERSCAN_API_KEY` | facoltativa | gas Ethereum | etherscan.io/myapikey (gratis) |
| `FRED_API_KEY` | facoltativa | tassi Fed/BCE, inflazione USA | fred.stlouisfed.org → API Keys (gratis) |
| `VAPID_*` | facoltativa | notifiche push | generate automaticamente se assenti |
| `CRON_SECRET` | facoltativa | scheduler esterno | stringa casuale |

**Modelli AI.** La catena dei modelli (ordine di priorità, modello per fornitore, attivazione) si configura da **Admin → AI** senza toccare il codice. Se un modello fallisce o è indisponibile si passa automaticamente al successivo. Sono previsti budget mensile, limite giornaliero di richieste, cache delle elaborazioni e registro dei consumi con costo stimato. Per Anthropic il modello predefinito è `claude-opus-5-5` (con fallback lato server in caso di rifiuto); per ridurre i costi di traduzioni in massa puoi impostare `claude-haiku-5-5` dalla stessa schermata. Senza alcun modello AI l'app funziona comunque: i titoli vengono tradotti con MyMemory (quota limitata) e le funzioni di analisi risultano "non disponibili".

---

## 3. Fonti integrate (ricerca e verifica — novembre 2026)

Elenco completo, con livello di affidabilità, gruppo editoriale, conflitti d'interesse, limiti API e stato in tempo reale, nella pagina **/fonti** dell'app. Le fonti si aggiungono, modificano, disattivano e sostituiscono da **Admin → Fonti** (con pulsante "Prova feed"), senza modificare il codice.

**Testate (RSS ufficiali):** CoinDesk, Cointelegraph, The Block, Decrypt, Blockworks, Bitcoin Magazine, CryptoSlate, DL News, NewsBTC, Bitcoinist, Bitcoin.com News, CryptoPotato, Protos, The Defiant, The Cryptonomist (IT).
**Exchange — comunicazioni ufficiali:** Bybit (API annunci v5), OKX (API annunci v5), Kraken (blog), Coinbase e Kraken (status page).
**Regolatori e banche centrali:** SEC, CFTC, ESMA (filtrati per temi cripto), BCE, Federal Reserve.
**Progetti e sviluppo:** Ethereum Foundation blog, Bitcoin Core, release GitHub (Bitcoin Core, LND, Geth, Agave/Solana, Cardano node, AvalancheGo, Polkadot SDK, Sui, rippled, TON, Chainlink).
**Esperti/analisti:** Vitalik Buterin, Glassnode Insights, Coin Metrics, Lyn Alden, Arthur Hayes, Nic Carter, Jameson Lopp, a16z crypto, Week in Ethereum News.
**Sicurezza:** Chainalysis, SlowMist, Rekt News, Web3 Is Going Just Great, registro hack DefiLlama.
**Community (mai usata come conferma):** Reddit r/CryptoCurrency, r/Bitcoin, r/ethereum.
**Dati:** CoinGecko → CoinPaprika (fallback automatico) → CoinMarketCap (con chiave); DefiLlama (TVL, chain, DEX, stablecoin, hack, riserve CEX, nuovi protocolli) e DefiLlama Yields (staking); mempool.space (hashrate, difficoltà, fee, halving, Lightning, transazioni ≥ 100 BTC); Alternative.me (Fear & Greed); DEX Screener (nuovi token) + GoPlus Security (controlli contratti EVM e Solana); Binance WebSocket pubblico (prezzi realmente in tempo reale, lato browser); FRED, Etherscan (con chiave gratuita).

### Valutate e non integrate (motivo)
| Servizio | Motivo |
|---|---|
| Glassnode, CryptoQuant, Arkham, Nansen | API solo a pagamento o con accesso riservato |
| Dune Analytics | piano gratuito con crediti limitati e query da scrivere: integrabile in seguito |
| Solscan Pro, Whale Alert | API a pagamento (le grandi transazioni BTC sono coperte parzialmente con mempool.space) |
| CryptoCompare / CoinDesk Data | chiave obbligatoria, piano gratuito ridotto: alternative gratuite già presenti |
| X/Twitter | API a pagamento (piano Basic ~200 $/mese); lo scraping non è consentito |
| Telegram | richiede un bot aggiunto ai canali; non adatto al monitoraggio di canali di terzi |
| Flussi ETF Bitcoin | nessuna API gratuita autorizzata (dati da emittenti/aggregatori a pagamento) |
| Annunci Binance, KuCoin, Bitget, Crypto.com | nessun RSS/API pubblica documentata per gli annunci (coperti tramite testate) |
| DefiLlama /raises | endpoint a pagamento |

---

## 4. Architettura

```
src/
  instrumentation.ts      avvio dello scheduler all'avvio del server
  middleware.ts           id anonimo dispositivo, rate limiting API, protezione CSRF
  lib/
    db.ts                 SQLite (WAL, FTS5), schema, cache dati, impostazioni
    http.ts               client HTTP: timeout, retry/backoff, rate limit per host, log chiamate
    sources/              catalogo e registro fonti (stato, errori, backoff automatico)
    rss.ts                parser RSS/Atom sicuro (rifiuta DTD/ENTITY, testo puro)
    ingest/               notizie, on-chain, DeFi, DEX/meme
    market/               fornitori prezzi con fallback, dettaglio coin, grafici, metriche derivate
    classify.ts           sezioni, criptovalute citate, segnali (urgente, rumor, smentita, sponsorizzato, previsione)
    reliability.ts        stati CONFERMATA / PARZIALE / NON VERIFICATA / SMENTITA con motivazioni
    ai/                   fornitori multipli, catena di fallback, budget, cache, schemi validati
    translate.ts          traduzione con cache (AI → MyMemory)
    alerts.ts, push.ts    regole, deduplica, cooldown, Web Push (VAPID)
    scheduler.ts          job periodici, frequenze configurabili, backup giornaliero
  app/                    pagine (server components) e API REST (app/api/*)
  components/             interfaccia (ticker, traduzione pagina, ricerca, grafici SVG, admin)
public/sw.js              service worker: offline + notifiche push
```

Scelte principali: **Next.js 15 + TypeScript + Tailwind**; **SQLite** integrato (costo zero, backup = un file; lo strato `lib/db.ts` isola le query per un'eventuale migrazione a PostgreSQL/Supabase); grafici in SVG senza librerie per la velocità su mobile.

**Aggiornamento automatico (default, modificabile da Admin → Job):** notizie: controllo ogni minuto, ogni fonte con la propria frequenza (10 min testate, 15 min annunci exchange, 1–3 h blog/GitHub) e backoff automatico sulle fonti in errore; prezzi 3 min; globali 10 min; trending/meme 15 min; rete Bitcoin 5 min; DeFi 15 min; staking 1 h; nuovi token 10 min; traduzioni 2 min; alert 1 min; backup e pulizia giornalieri (7 backup in `data/backups`).

---

## 5. Sicurezza

- Chiavi API solo lato server; mai registrate nei log (le query string non vengono salvate).
- Area admin: password con confronto a tempo costante, max 5 tentativi/15 min per IP, sessione firmata HMAC (httpOnly, SameSite=Strict, 12 h), registro attività.
- Tutte le richieste che modificano dati richiedono la stessa origine (CSRF); rate limiting per IP sulle API (più stretto su AI e traduzione).
- Input validati con schemi Zod; query SQL sempre parametrizzate; nessun HTML esterno renderizzato (solo testo) e link limitati a http/https; Content-Security-Policy e header di sicurezza.
- Feed XML con DTD/ENTITY rifiutati; test delle fonti con blocco degli indirizzi interni (SSRF).
- Prompt injection: i contenuti esterni sono racchiusi in delimitatori e dichiarati non attendibili; l'AI non ha strumenti né accesso alla configurazione; l'output è validato contro uno schema e scartato se non conforme.
- Backup giornaliero automatico + download da Admin.

---

## 6. Verifiche eseguite

Durante lo sviluppo (in un ambiente con rete filtrata) sono stati verificati con dati reali: acquisizione RSS e raggruppamento eventi, stati di affidabilità, fallback CoinGecko → CoinPaprika (scattato realmente su errore 429), DeFiLlama/Yields, mempool.space, Fear & Greed, DEX Screener + GoPlus, traduzione MyMemory, alert (deduplica e cooldown), login/permessi admin, CSRF, protezione SSRF, endpoint cron, catena AI con fornitore simulato (fallback su errore 500, cache, registro consumi), traduzione di pagina, tutte le pagine a larghezza smartphone. Alcune fonti risultavano irraggiungibili solo a causa della rete di test: sul tuo server lo stato reale di ciascuna è visibile in **/fonti**.

**Da fare sul tuo server dopo il primo avvio:** controlla /fonti (le fonti in errore permanente si possono correggere o sostituire da Admin), imposta almeno una chiave AI se vuoi traduzioni complete e analisi, prova le notifiche push da /alert (richiedono HTTPS).

---

⚖ *Crypto Radar ha scopo informativo. Nessun contenuto costituisce consulenza finanziaria, legale o fiscale. Le criptovalute sono strumenti ad altissimo rischio.*
