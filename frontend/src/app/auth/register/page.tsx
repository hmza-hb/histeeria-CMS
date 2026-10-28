'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await auth.register({ email, password, name });
      if (res.token) {
        localStorage.setItem('histeeria_token', res.token);
        window.location.href = '/';
      } else {
        window.location.href = '/auth/login';
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="relative inline-block w-16 h-16 mb-4">
          <Image
            src="/histeeria-logo.png"
            alt="Histeeria Memory Logo"
            width={64}
            height={64}
            priority
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Histeeria Memory</h1>
        <p className="mt-2 text-sm text-slate-600">
          Start capturing and recalling your life effortlessly
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={register} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hamza"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                Password (min 6 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-slate-900 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
