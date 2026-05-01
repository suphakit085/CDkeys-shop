'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { paymentApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function StripeCancelPage() {
  return (
    <Suspense fallback={<StripeCancelSkeleton />}>
      <StripeCancelContent />
    </Suspense>
  );
}

function StripeCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { token } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState('');

  const retryStripeCheckout = async () => {
    if (!token || !orderId) return;

    setIsRetrying(true);
    setError('');

    try {
      const checkout = await paymentApi.createStripeCheckout(orderId, token);
      window.location.href = checkout.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to restart Stripe checkout');
      setIsRetrying(false);
    }
  };

  return (
    <main className="page-shell py-20">
      <section className="surface mx-auto max-w-xl p-8 text-center">
        <p className="admin-eyebrow">Stripe checkout</p>
        <h1 className="text-3xl font-black text-[color:var(--foreground)]">
          Payment canceled
        </h1>
        <p className="mt-3 leading-7 text-[color:var(--text-muted)]">
          No card payment was captured. Your order is still pending while reserved keys are held.
        </p>

        {error && (
          <div className="admin-notice admin-notice-error mt-5 text-left">
            {error}
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            onClick={retryStripeCheckout}
            disabled={!token || !orderId || isRetrying}
            className="btn-primary px-5 disabled:opacity-50"
          >
            {isRetrying ? 'Restarting...' : 'Try Stripe again'}
          </button>
          <Link href={orderId ? `/orders/${orderId}` : '/orders'} className="btn-secondary px-5">
            View order
          </Link>
        </div>
      </section>
    </main>
  );
}

function StripeCancelSkeleton() {
  return (
    <main className="page-shell py-20">
      <div className="surface mx-auto h-72 max-w-xl animate-pulse" />
    </main>
  );
}
