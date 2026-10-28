'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/api';

export default function OTP() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.sendOTP({ email });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await auth.verifyOTP({ email, code });
      if (res.token) {
        localStorage.setItem('histeeria_token', res.token);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired OTP code');
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email OTP Sign-In</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to Histeeria Memory with a secure 6-digit code
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

          {!sent ? (
            <form onSubmit={send} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Enter your email address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send 6-Digit Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 mb-2">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>. Check your inbox (or backend logs if running locally).
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-center tracking-[0.5em] text-2xl font-mono font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-900 text-center"
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Prefer standard password?{' '}
            <Link href="/auth/login" className="font-semibold text-slate-900 hover:underline">
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
