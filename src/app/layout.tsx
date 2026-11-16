import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Ticker from '@/components/Ticker';
import Nav from '@/components/Nav';
import SearchBox from '@/components/SearchBox';
import LangSwitch from '@/components/LangSwitch';
import Bell from '@/components/Bell';
import Pwa from '@/components/Pwa';

export const metadata: Metadata = {
  title: { default: 'Crypto Radar — Il mondo cripto, sotto controllo', template: '%s · Crypto Radar' },
  description: 'Centro di informazione e intelligence sul mondo delle criptovalute, della blockchain e della DeFi. Notizie tradotte in italiano, verificate e confrontate.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Crypto Radar',
  appleWebApp: { capable: true, title: 'Crypto Radar', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#0b0d10', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-mode="it">
      <body className="min-h-screen font-sans">
        <div id="app-root">
          <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
              <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Crypto Radar — home">
                <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="29" fill="none" stroke="#14b8a6" strokeWidth="3" /><circle cx="32" cy="32" r="18" fill="none" stroke="#14b8a6" strokeOpacity=".5" strokeWidth="2" /><circle cx="32" cy="32" r="7" fill="none" stroke="#14b8a6" strokeOpacity=".35" strokeWidth="2" /><path d="M32 32 L54 14" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" /><circle cx="45" cy="23" r="3.5" fill="#eab308" /></svg>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[15px] font-extrabold tracking-[0.12em]" data-notranslate>CRYPTO RADAR</span>
                  <span className="block text-[10px] text-mute">Il mondo cripto, sotto controllo</span>
                </span>
              </Link>
              <div className="min-w-0 flex-1"><SearchBox /></div>
              <LangSwitch />
              <Bell />
            </div>
            <Ticker />
            <Nav />
          </header>
          <Pwa />
          <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
          <footer className="mt-10 border-t border-line">
            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-xs text-mute sm:grid-cols-3">
              <div>
                <div className="mb-1 font-semibold text-ink">Crypto Radar</div>
                Informazione indipendente aggregata da fonti internazionali, tradotta in italiano. Ogni notizia rimanda alla fonte originale.
              </div>
              <div className="flex flex-col gap-1">
                <Link href="/metodologia" className="hover:text-ink">Metodologia e affidabilità</Link>
                <Link href="/fonti" className="hover:text-ink">Fonti e stato dei servizi</Link>
                <Link href="/archivio" className="hover:text-ink">Archivio storico</Link>
                <Link href="/admin" className="hover:text-ink">Amministrazione</Link>
              </div>
              <div>⚖ Nessun contenuto costituisce consulenza finanziaria. Le criptovalute sono investimenti ad altissimo rischio. Le previsioni di analisti ed esperti sono opinioni, non fatti.</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
