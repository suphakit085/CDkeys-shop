'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_URL } from '@/lib/config';

export default function MagicLoginPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) {
      return;
    }
    hasVerified.current = true;

    const verifyMagicLink = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/verify-magic-link/${token}`,
        );
        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
          user?: unknown;
          message?: string;
        };

        if (!response.ok || !data.accessToken || !data.refreshToken) {
          throw new Error(
            data.message || 'This sign-in link is invalid or has expired.',
          );
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        setStatus('success');
        setMessage('Sign-in complete. Redirecting you now.');
        window.setTimeout(() => {
          window.location.href = '/store';
        }, 1000);
      } catch (err) {
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Unable to connect to the server.',
        );
      }
    };

    void verifyMagicLink();
  }, [token]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <section className="page-shell relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center py-8 sm:py-12">
        <section className="surface w-full max-w-[500px] p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
          {status === 'loading' && (
            <>
              <p className="text-sm font-black uppercase text-[var(--primary)]">
                Secure sign-in
              </p>
              <h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">
                Checking your link
              </h1>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Please wait while we verify this one-time sign-in link.
              </p>
              <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            </>
          )}

          {status === 'success' && (
            <>
              <p className="text-sm font-black uppercase text-[var(--primary)]">
                Success
              </p>
              <h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">
                You are signed in
              </h1>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {message}
              </p>
              <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-sm font-black uppercase text-[var(--error)]">
                Link problem
              </p>
              <h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">
                We could not sign you in
              </h1>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {message}
              </p>
              <div className="mt-6 grid gap-3">
                <a className="btn-primary py-3" href="/login">
                  Back to login
                </a>
                <a className="btn-secondary py-3" href="/forgot-password">
                  Reset password instead
                </a>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
