'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          data.message || 'This reset link is invalid or has expired.',
        );
      }

      setSuccess(true);
      window.setTimeout(() => router.push('/login'), 1800);
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

  if (success) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="absolute inset-0 bg-[var(--background)]" />
        <section className="page-shell relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center py-8 sm:py-12">
          <section className="surface w-full max-w-[500px] p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
            <p className="text-sm font-black uppercase text-[var(--primary)]">
              Password updated
            </p>
            <h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">
              Your password has been changed
            </h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Redirecting you to the login page.
            </p>
            <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2200&q=85')",
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
              Set a new password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Choose a strong password with at least 8 characters.
            </p>
          </div>

          {error && (
            <div className="admin-notice admin-notice-error mb-5 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="grid gap-2" htmlFor="password">
              <span className="text-sm font-bold text-[var(--text-muted)]">
                New password
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isLoading}
              />
            </label>

            <label className="grid gap-2" htmlFor="confirmPassword">
              <span className="text-sm font-bold text-[var(--text-muted)]">
                Confirm password
              </span>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isLoading}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {isLoading ? 'Saving password...' : 'Save new password'}
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
