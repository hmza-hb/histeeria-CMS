'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { memories } from '@/lib/api';

export default function Memories() {
  const [mems, setMems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemories();
    const onCreated = () => loadMemories();
    window.addEventListener('histeeria:memory-created', onCreated);
    return () => window.removeEventListener('histeeria:memory-created', onCreated);
  }, []);

  const loadMemories = () => {
    memories.list()
      .then((r) => setMems(r.memories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const r = await memories.search(q.trim());
      setResults(r.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const list = results !== null ? results : mems;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Library</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                All Memories
              </h1>
            </div>
            <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {list.length} {list.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Search bar */}
          <form onSubmit={search} className="relative">
            <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search memories by keyword or semantic meaning..."
              className="w-full pl-10 pr-24 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setResults(null); setQ(''); }}
                className="absolute right-20 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Main List */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading memories...</div>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-900">No memories found</p>
              <p className="text-xs text-slate-500">Capture something in the bottom bar or home page to start remembering.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {list.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/memories/${m.id}`}
                  className="group bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 hover:shadow-md transition-all block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider mb-1">
                        {m.memory_type || 'General'}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {m.title}
                      </h3>
                    </div>
                    {m.created_at && (
                      <time className="text-xs text-slate-400 font-mono">
                        {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </time>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {m.summary || m.original_content || m.content}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
