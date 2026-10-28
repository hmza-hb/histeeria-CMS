'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ask } from '@/lib/api';

export default function Ask() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    'What did Ali recommend I learn?',
    'When is my database assignment due?',
    'What books or articles did I want to read?',
    'What have I captured recently?',
  ];

  const submit = async (qText?: string) => {
    const q = (qText || question).trim();
    if (!q) return;
    setQuestion(q);
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const res = await ask.question({ question: q });
      setAnswer(res.answer || 'No matching information found in your memories.');
      setSources(res.sources || []);
    } catch {
      setAnswer('Something went wrong contacting the AI service. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversational AI</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ask Histeeria Memory
          </h1>
          <p className="text-xs text-slate-500">
            Ask natural language questions grounded in your personal cognitive memories.
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Question Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about what you've saved..."
              className="flex-1 px-4 py-2.5 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                'Ask'
              )}
            </button>
          </form>

          {/* Sample Prompts */}
          {!answer && !loading && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Example queries</p>
              <div className="flex flex-wrap gap-2">
                {sampleQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => submit(sq)}
                    className="text-xs bg-white hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors text-left"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer Card */}
          {answer && (
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Answer</span>
              </div>

              <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {answer}
              </div>

              {sources.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supporting Memories</span>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <Link
                        key={s.id}
                        href={`/memories/${s.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
