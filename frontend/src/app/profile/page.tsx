'use client';

import { useEffect, useState } from 'react';
import { profile, auth } from '@/lib/api';

export default function Profile() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    profile.get().then(setUser).catch(() => {});
  }, []);

  const signout = async () => {
    try {
      await auth.signout();
    } catch {}
    localStorage.removeItem('histeeria_token');
    window.location.href = '/auth/login';
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account Profile
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* User Card */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name || 'User'}</h2>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Account
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold">User ID</span>
                <p className="text-slate-700 font-mono mt-0.5 truncate">{user?.id || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Timezone</span>
                <p className="text-slate-700 font-medium mt-0.5">{user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}</p>
              </div>
            </div>
          </div>

          {/* Privacy & PWA Info Card */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Personal Data & Privacy</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All memories, facts, vector embeddings, and reminders are stored in your isolated database scope.
              No other user or external crawler can access your records.
            </p>
          </div>

          {/* Sign Out Card */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Sign Out</p>
              <p className="text-xs text-slate-500">End your current session on this device</p>
            </div>
            <button
              onClick={signout}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
