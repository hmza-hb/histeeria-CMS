'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { memories } from '@/lib/api';

export default function MemoryDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [mem, setMem] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memories.get(id)
      .then((r) => {
        setMem(r);
        setTitle(r.title || '');
        setContent(r.original_content || r.content || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    try {
      await memories.update(id, { title, content });
      setMem({ ...mem, title, original_content: content });
      setEditing(false);
    } catch {
      alert('Failed to update memory');
    }
  };

  const del = async () => {
    if (!confirm('Are you sure you want to delete this memory? This cannot be undone.')) return;
    try {
      await memories.delete(id);
      router.push('/memories');
    } catch {
      alert('Failed to delete memory');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 text-sm">Loading memory...</div>;
  if (!mem) return (
    <div className="p-12 text-center space-y-3">
      <p className="text-sm font-semibold text-slate-900">Memory not found</p>
      <Link href="/memories" className="text-xs text-blue-600 hover:underline">← Back to library</Link>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/memories" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Library</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={del}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 sm:p-8 space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 leading-relaxed"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={save}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {mem.memory_type || 'General'}
                    </span>
                    <time className="text-xs text-slate-400">
                      {new Date(mem.created_at).toLocaleString()}
                    </time>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {mem.title}
                  </h1>
                </div>

                {mem.summary && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Summary</span>
                    <p className="text-xs text-slate-700 leading-relaxed">{mem.summary}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Captured Content</span>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {mem.original_content || mem.content}
                  </p>
                </div>

                {mem.facts && mem.facts.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Extracted Knowledge Facts</span>
                    <div className="grid gap-1.5">
                      {mem.facts.map((f: any, idx: number) => (
                        <div key={idx} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{f.subject}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-slate-600">{f.predicate}:</span>
                          <span className="text-slate-800">{f.object}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
