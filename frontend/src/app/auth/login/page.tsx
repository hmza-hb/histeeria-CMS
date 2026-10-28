'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await auth.login({ email, password });
      if (res.token) {
        localStorage.setItem('histeeria_token', res.token);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    if (!email) {
      setError('Please enter your email above to continue with Google');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await auth.google({ email, name: email.split('@')[0] });
      if (res.token) {
        localStorage.setItem('histeeria_token', res.token);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError('Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
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
          You live your life; Histeeria remembers it.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl sm:px-10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mt-1">Access your personal cognitive memory</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in with password'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={googleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <Link
              href="/auth/otp"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Sign in with 6-Digit Email OTP</span>
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/auth/register" className="font-semibold text-slate-900 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
