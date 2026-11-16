'use client';
import { useEffect, useState } from 'react';

let cache: Promise<{ type: string; id: string }[]> | null = null;
function loadList() {
  cache ??= fetch('/api/watchlist', { cache: 'no-store' }).then((r) => r.json()).then((j) => j.items ?? []).catch(() => []);
  return cache;
}

export default function WatchButton({ type, id, label, small = false }: { type: 'coin' | 'exchange' | 'project' | 'expert' | 'topic'; id: string; label: string; small?: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { loadList().then((l) => setOn(l.some((x) => x.type === type && x.id === id))); }, [type, id]);
  const toggle = async () => {
    setBusy(true);
    const r = await fetch('/api/watchlist', { method: on ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, label }) });
    if (r.ok) { setOn(!on); cache = null; }
    setBusy(false);
  };
  return (
    <button onClick={toggle} disabled={busy} className={small ? `text-base leading-none ${on ? 'text-warn' : 'text-mute hover:text-warn'}` : `btn ${on ? 'border-warn/50 text-warn' : ''}`} aria-pressed={on} title={on ? 'Rimuovi dalla watchlist' : 'Aggiungi alla watchlist'}>
      {on ? '★' : '☆'}{!small && (on ? ` ${label} in watchlist` : ` Segui ${label}`)}
    </button>
  );
}
