'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type R = { id: string; src: string; name: string; symbol: string; rank: number | null };
export default function AddCoin() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<R[]>([]);
  const [type, setType] = useState<'coin' | 'topic' | 'exchange' | 'project'>('coin');
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const search = async () => {
    if (type !== 'coin') return add({ id: q.trim().toLowerCase(), name: q.trim() } as R);
    const r = await fetch(`/api/coins/search?q=${encodeURIComponent(q)}`);
    setRes((await r.json()).items ?? []);
  };
  const add = async (c: R) => {
    if (!c.id) return;
    const r = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id: c.id, label: c.name }) });
    setMsg(r.ok ? `Aggiunto: ${c.name}` : (await r.json()).error);
    setRes([]); setQ('');
    router.refresh();
  };
  return (
    <div className="p-4">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) search(); }}>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="coin">Criptovaluta</option><option value="topic">Argomento / parola chiave</option><option value="exchange">Exchange (nome)</option><option value="project">Progetto (nome)</option>
        </select>
        <input className="input min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={type === 'coin' ? 'Nome o simbolo (es. Solana, ETH)' : 'Testo da seguire nelle notizie'} maxLength={80} />
        <button className="btn btn-primary">{type === 'coin' ? 'Cerca' : 'Aggiungi'}</button>
      </form>
      {res.length > 0 && <ul className="mt-2 divide-y divide-line rounded border border-line">{res.map((c) => <li key={c.id}><button onClick={() => add(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-panel2">{c.name} <span className="text-mute">{c.symbol}{c.rank ? ` · #${c.rank}` : ''}</span> <span className="float-right text-accent">+ aggiungi</span></button></li>)}</ul>}
      {msg && <p className="mt-2 text-xs text-up">{msg}</p>}
    </div>
  );
}
