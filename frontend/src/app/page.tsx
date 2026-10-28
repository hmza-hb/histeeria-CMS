'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { memories, reminders, profile } from '@/lib/api';

export default function Home() {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [greeting, setGreeting] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const token = localStorage.getItem('histeeria_token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    profile.get().then(setUser).catch(() => {});
    loadData();

    // Check speech recognition support
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setRecognitionSupported(true);
    }

    const onCreated = () => loadData();
    window.addEventListener('histeeria:memory-created', onCreated);
    return () => window.removeEventListener('histeeria:memory-created', onCreated);
  }, []);

  const loadData = () => {
    memories.list().then((r) => setRecent((r.memories || []).slice(0, 5))).catch(() => {});
    reminders.upcoming().then((r) => setUpcoming(r.reminders || [])).catch(() => {});
  };

  const saveMemory = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await memories.create({ content: content.trim() });
      setContent('');
      loadData();
    } catch (e) {
      alert('Failed to save memory. Please ensure backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionSupported) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    } else {
      setIsRecording(false);
    }
  };

  const completeReminder = async (id: string) => {
    try {
      await reminders.complete(id);
      reminders.upcoming().then((r) => setUpcoming(r.reminders || [])).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{greeting}</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {user?.name || user?.email?.split('@')[0] || 'there'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Ask Histeeria</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 sm:px-10 py-8 pb-24 md:pb-12">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Memory Capture Input */}
            <section>
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-slate-900/20">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      saveMemory();
                    }
                  }}
                  placeholder="Capture a thought, recommendation, or commitment (e.g. 'Had lunch with Ali. He recommended distributed systems' or 'Remind me to call dentist tomorrow at 10 AM')..."
                  className="w-full px-5 pt-5 pb-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none min-h-[120px] bg-transparent"
                />

                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>{isRecording ? 'Listening...' : 'Voice'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Press ⌘+Enter to save</span>
                  </div>

                  <button
                    onClick={saveMemory}
                    disabled={saving || !content.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing AI...</span>
                      </>
                    ) : (
                      <>
                        <span>Remember</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Upcoming Reminders */}
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Upcoming Reminders</h2>
                  </div>
                  <Link href="/reminders" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    View all ({upcoming.length})
                  </Link>
                </div>

                <div className="grid gap-2.5">
                  {upcoming.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-xl ring-1 ring-slate-900/5 p-4 flex items-center justify-between hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => completeReminder(r.id)}
                          title="Mark completed"
                          className="mt-0.5 w-5 h-5 rounded-md border border-slate-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white flex items-center justify-center text-transparent transition-all"
                        >
                          <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.title}</p>
                          {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                        {new Date(r.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Memories Library */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Recent Memories</h2>
                <Link href="/memories" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  Browse library
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Your memory bank is empty</h3>
                    <p className="text-xs text-slate-500 mt-1">Capture your first thought above to let Histeeria start remembering.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {recent.map((m) => (
                    <Link
                      key={m.id}
                      href={`/memories/${m.id}`}
                      className="group bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 hover:shadow-md transition-all block"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                            {m.memory_type || 'General'}
                          </span>
                          <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {m.title}
                          </h3>
                        </div>
                        <time className="text-xs text-slate-400">
                          {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </time>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {m.summary || m.original_content}
                      </p>

                      {m.facts && m.facts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                          {m.facts.slice(0, 3).map((f: any, idx: number) => (
                            <span key={idx} className="text-[11px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100">
                              {f.subject} → {f.predicate}: {f.object}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
  );
}
