'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ordersApi, Order } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function StripeSuccessPage() {
  return (
    <Suspense fallback={<CheckoutStatusSkeleton />}>
      <StripeSuccessContent />
    </Suspense>
  );
}

function StripeSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  const { token, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!token || !orderId) return;

    let cancelled = false;
    let attempts = 0;

    const loadOrder = async () => {
      attempts += 1;
      try {
        const data = await ordersApi.getOne(orderId, token);
        if (cancelled) return;

        setOrder(data);
        if (data.status === 'COMPLETED' || attempts >= 8) {
          setIsLoading(false);
          return;
        }

        window.setTimeout(loadOrder, 2000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load order');
          setIsLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [authLoading, orderId, token]);

  if (!token) {
    return (
      <StatusCard
        eyebrow="Stripe checkout"
        title="Payment returned"
        description="Sign in to view the latest order status and reveal keys after confirmation."
        action={<Link href="/login" className="btn-primary px-6">Sign in</Link>}
      />
    );
  }

  if (!orderId) {
    return (
      <StatusCard
        eyebrow="Stripe checkout"
        title="Missing order reference"
        description="The checkout return URL does not include an order reference."
        action={<Link href="/orders" className="btn-primary px-6">Go to orders</Link>}
      />
    );
  }

  if (authLoading || isLoading) {
    return <CheckoutStatusSkeleton />;
  }

  if (error || !order) {
    return (
      <StatusCard
        eyebrow="Stripe checkout"
        title="We could not load this order"
        description={error || 'The order reference is missing from the checkout return URL.'}
        action={<Link href="/orders" className="btn-primary px-6">Go to orders</Link>}
      />
    );
  }

  const isCompleted = order.status === 'COMPLETED';

  return (
    <StatusCard
      eyebrow="Stripe checkout"
      title={isCompleted ? 'Payment confirmed' : 'Payment is being confirmed'}
      description={
        isCompleted
          ? 'Stripe confirmed your payment. Your CD keys are ready in the order page.'
          : 'Stripe has redirected you back. The webhook may take a few seconds to finish unlocking keys.'
      }
      meta={[
        ['Order', order.id.slice(0, 8)],
        ['Session', sessionId ? sessionId.slice(0, 18) : 'Pending'],
        ['Status', order.status],
      ]}
      action={<Link href={`/orders/${order.id}`} className="btn-primary px-6">View order</Link>}
    />
  );
}

function CheckoutStatusSkeleton() {
  return (
    <main className="page-shell py-20">
      <div className="surface mx-auto h-80 max-w-xl animate-pulse" />
    </main>
  );
}

function StatusCard({
  eyebrow,
  title,
  description,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: Array<[string, string]>;
  action: ReactNode;
}) {
  return (
    <main className="page-shell py-20">
      <section className="surface mx-auto max-w-xl p-8 text-center">
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1 className="text-3xl font-black text-[color:var(--foreground)]">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-[color:var(--text-muted)]">
          {description}
        </p>

        {meta && (
          <div className="mt-6 grid gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-left">
            {meta.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="font-bold text-[color:var(--text-muted)]">{label}</span>
                <span className="font-black text-[color:var(--foreground)]">{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-7 flex justify-center">{action}</div>
      </section>
    </main>
  );
}
