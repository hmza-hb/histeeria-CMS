'use client';

import { useEffect, useState } from 'react';
import { reminders } from '@/lib/api';

export default function Reminders() {
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'upcoming') {
        const r = await reminders.upcoming();
        setItems(r.reminders || []);
      } else if (tab === 'overdue') {
        const r = await reminders.overdue();
        setItems(r.reminders || []);
      } else {
        const r = await reminders.completed();
        setItems(r.reminders || []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onCreated = () => load();
    window.addEventListener('histeeria:memory-created', onCreated);
    return () => window.removeEventListener('histeeria:memory-created', onCreated);
  }, [tab]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !when) return;
    try {
      await reminders.create({ title: title.trim(), scheduled_at: new Date(when).toISOString() });
      setTitle('');
      setWhen('');
      load();
    } catch {
      alert('Failed to create reminder');
    }
  };

  const complete = async (id: string) => {
    try {
      await reminders.complete(id);
      load();
    } catch {
      alert('Failed to complete reminder');
    }
  };

  const remove = async (id: string) => {
    try {
      await reminders.delete(id);
      load();
    } catch {
      alert('Failed to delete reminder');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Commitments</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              Reminders
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            {(['upcoming', 'overdue', 'completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Quick Create Card */}
          <form onSubmit={create} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Schedule a New Reminder</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What to remember..."
                className="sm:col-span-2 px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Save Reminder
              </button>
            </div>
          </form>

          {/* List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading reminders...</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">No {tab} reminders</p>
              <p className="text-xs text-slate-500">You are completely caught up!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((r: any) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-4 flex items-center justify-between hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    {tab !== 'completed' && (
                      <button
                        onClick={() => complete(r.id)}
                        title="Mark completed"
                        className="mt-0.5 w-5 h-5 rounded-md border border-slate-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white flex items-center justify-center text-transparent transition-all"
                      >
                        <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <div>
                      <p className={`text-sm font-medium ${tab === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {r.title}
                      </p>
                      {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      {new Date(r.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <button
                      onClick={() => remove(r.id)}
                      title="Delete reminder"
                      className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
