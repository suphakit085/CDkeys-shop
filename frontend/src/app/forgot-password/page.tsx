'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send reset email.');
      }

      setMessage(
        data.message ||
          'If this email exists, a password reset link has been sent.',
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
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,10,14,0.74)_0%,rgba(9,20,27,0.56)_48%,rgba(7,10,14,0.9)_100%)]" />

      <section className="page-shell relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center py-8 sm:py-12">
        <section className="surface w-full max-w-[500px] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="mb-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-300/30 bg-teal-300/[0.14] text-sm font-black text-[var(--primary)]">
              CK
            </div>
            <p className="text-sm font-black uppercase text-[var(--primary)]">
              Account recovery
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">
              Reset your password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Enter your email and we will send a secure reset link if an
              account exists.
            </p>
          </div>

          {message && (
            <div className="admin-notice admin-notice-success mb-5 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="admin-notice admin-notice-error mb-5 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                disabled={isLoading}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {isLoading ? 'Sending reset link...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-7 border-t border-[var(--border)] pt-5 text-center text-sm text-[var(--text-muted)]">
            <Link
              href="/login"
              className="font-black text-[var(--primary)] hover:text-[var(--primary-hover)]"
            >
              Back to login
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
