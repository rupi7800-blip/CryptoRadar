import { Card, PageHeader, StatusBadge } from '@/components/ui';

export const metadata = { title: 'Metodologia' };

export default function Metodologia() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
      <PageHeader title="Metodologia e affidabilità" desc="Come Crypto Radar raccoglie, raggruppa, valuta e presenta le informazioni" />
      <Card title="1. Raccolta"><div className="space-y-2 p-4 text-ink/85">
        <p>Usiamo esclusivamente feed RSS/Atom pubblici, API ufficiali e dati aperti, rispettando i limiti di utilizzo. Niente scraping non autorizzato. Di ogni articolo conserviamo titolo, estratto fornito dal feed e collegamento all&apos;originale: per il testo completo si rimanda sempre alla fonte.</p>
        <p>Ogni fonte ha un livello: <b>A</b> primaria/ufficiale (regolatori, exchange, fondazioni, repository), <b>B</b> testata affermata, <b>C</b> secondaria o di opinione, <b>D</b> community. Per ogni fonte indichiamo il gruppo editoriale e gli eventuali conflitti d&apos;interesse (pagina Fonti).</p>
      </div></Card>
      <Card title="2. Raggruppamento degli eventi"><div className="space-y-2 p-4 text-ink/85">
        <p>Gli articoli che parlano dello stesso fatto vengono raggruppati in un <b>evento</b> (similarità dei titoli, criptovalute citate, finestra di 48 ore; per gli incidenti di sicurezza, stessa entità coinvolta). Banner e liste mostrano un solo elemento per evento, evitando ripetizioni.</p>
      </div></Card>
      <Card title="3. Stati di verifica"><div className="space-y-3 p-4 text-ink/85">
        <p><StatusBadge status="CONFERMATA" compact /> almeno una fonte primaria o ufficiale riporta l&apos;evento (es. comunicato del regolatore, annuncio dell&apos;exchange, release sul repository).</p>
        <p><StatusBadge status="CONFERMATA PARZIALMENTE" compact /> almeno due gruppi editoriali indipendenti e affermati riportano l&apos;evento senza linguaggio da indiscrezione, ma manca una conferma ufficiale.</p>
        <p><StatusBadge status="NON VERIFICATA" compact /> fonte singola, linguaggio da indiscrezione (&quot;secondo fonti&quot;, &quot;reportedly&quot;) o presenza solo su canali community.</p>
        <p><StatusBadge status="SMENTITA" compact /> un articolo del gruppo riporta una smentita esplicita.</p>
        <p><b>Indipendenza:</b> più testate dello stesso gruppo editoriale contano come una sola fonte. Anche testate diverse possono riprendere la stessa fonte originale: per questo, senza una fonte primaria, lo stato massimo è &quot;confermata parzialmente&quot;. Ogni stato è sempre accompagnato dall&apos;elenco dei motivi; le correzioni manuali della redazione sono motivate e registrate nello storico visibile nella scheda della notizia.</p>
      </div></Card>
      <Card title="4. Importanza e breaking news"><div className="space-y-2 p-4 text-ink/85">
        <p>Il punteggio considera: livello della fonte, numero di fonti indipendenti, segnali di urgenza (hack, sospensione prelievi, insolvenza), rilevanza delle criptovalute coinvolte, provenienza istituzionale. Penalizza contenuti sponsorizzati e previsioni di prezzo. Una notizia è &quot;breaking&quot; se recente (meno di 3 ore) e urgente o ripresa da almeno 3 fonti indipendenti.</p>
      </div></Card>
      <Card title="5. Dati di mercato"><div className="space-y-2 p-4 text-ink/85">
        <p>I prezzi provengono da aggiornamenti periodici (CoinGecko, con CoinPaprika come alternativa automatica). L&apos;orario e la fonte sono sempre indicati; se un dato supera la sua frequenza attesa viene marcato &quot;NON aggiornato&quot;. Solo i prezzi ricevuti dal WebSocket di Binance sono etichettati &quot;LIVE&quot;. Se nessuna fonte risponde non mostriamo valori inventati.</p>
      </div></Card>
      <Card title="6. Intelligenza artificiale"><div className="space-y-2 p-4 text-ink/85">
        <p>Traduzioni, riassunti, analisi e confronti possono essere generati da modelli AI di diversi fornitori, con passaggio automatico a un modello alternativo in caso di errore. I contenuti esterni sono trattati come dati non attendibili: le istruzioni eventualmente contenute negli articoli vengono ignorate e segnalate. Le analisi separano fatti, dichiarazioni, indiscrezioni e interpretazioni, e non costituiscono consulenza finanziaria.</p>
        <p>Senza un modello AI configurato i titoli vengono tradotti con un servizio gratuito a quota limitata; ciò che non è tradotto è indicato con [EN].</p>
      </div></Card>
    </div>
  );
}
