'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/config';

type LoginMode = 'password' | 'magic';

function LoadingIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/store');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send sign-in link.');
      }

      setSuccess(
        data.message ||
          'If this email exists, a secure sign-in link has been sent.',
      );
      setEmail('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the server.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=2200&q=85')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,10,14,0.72)_0%,rgba(9,20,27,0.46)_46%,rgba(7,10,14,0.88)_100%)]" />

      <section className="page-shell relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center py-8 sm:py-12">
        <section className="surface w-full max-w-[500px] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="mb-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-300/30 bg-teal-300/[0.14] text-sm font-black text-[var(--primary)]">
              CK
            </div>
            <p className="text-sm font-black uppercase text-[var(--primary)]">
              Secure login
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">
              Welcome back
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Sign in to buy game keys, track orders, and reveal your purchased
              keys.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => changeMode('password')}
              aria-pressed={mode === 'password'}
              className={`min-h-11 rounded-lg px-3 text-sm font-black transition-all ${
                mode === 'password'
                  ? 'bg-[var(--primary)] text-[#06201c] shadow-[0_10px_28px_rgba(45,212,191,0.18)]'
                  : 'text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--foreground)]'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => changeMode('magic')}
              aria-pressed={mode === 'magic'}
              className={`min-h-11 rounded-lg px-3 text-sm font-black transition-all ${
                mode === 'magic'
                  ? 'bg-[var(--primary)] text-[#06201c] shadow-[0_10px_28px_rgba(45,212,191,0.18)]'
                  : 'text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--foreground)]'
              }`}
            >
              Email link
            </button>
          </div>

          {error && (
            <div className="admin-notice admin-notice-error mb-5 text-sm" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="admin-notice admin-notice-success mb-5 text-sm" role="status">
              {success}
            </div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <label className="grid gap-2" htmlFor="email">
                <span className="text-sm font-bold text-[var(--text-muted)]">
                  Email
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="grid gap-2" htmlFor="password">
                <span className="text-sm font-bold text-[var(--text-muted)]">
                  Password
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-hover)]"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
              >
                {isLoading && <LoadingIcon />}
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
              <div className="rounded-lg border border-teal-300/30 bg-teal-300/[0.08] p-4 text-sm leading-6 text-[var(--text-muted)]">
                We will send a secure one-time sign-in link to your email. The
                link expires after 15 minutes.
              </div>

              <label className="grid gap-2" htmlFor="magic-email">
                <span className="text-sm font-bold text-[var(--text-muted)]">
                  Email
                </span>
                <input
                  id="magic-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
              >
                {isLoading && <LoadingIcon />}
                {isLoading ? 'Sending link...' : 'Send sign-in link'}
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-[var(--border)] pt-5 text-center text-sm text-[var(--text-muted)]">
            No account yet?{' '}
            <Link
              href="/register"
              className="font-black text-[var(--primary)] hover:text-[var(--primary-hover)]"
            >
              Create account
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
