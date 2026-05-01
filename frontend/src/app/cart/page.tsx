/* eslint-disable @next/next/no-img-element -- Cart thumbnails use local uploads and remote admin-provided URLs. */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi, paymentApi, PaymentMethod } from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { formatMoney } from '@/lib/currency';

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PROMPTPAY');
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (items.length === 0) return;

    setIsCheckingOut(true);
    setError('');

    try {
      const order = await ordersApi.create(
        items.map((item) => ({
          gameId: item.game.id,
          quantity: item.quantity,
        })),
        token,
        paymentMethod,
      );

      localStorage.setItem(`order_${order.id}`, JSON.stringify(order));
      clearCart();

      if (paymentMethod === 'CREDIT_CARD') {
        const checkout = await paymentApi.createStripeCheckout(order.id, token);
        window.location.href = checkout.url;
        return;
      }

      router.push(`/checkout/promptpay/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="page-shell py-20 text-center">
        <div className="surface mx-auto max-w-xl p-8">
          <p className="admin-eyebrow">Cart</p>
          <h1 className="text-3xl font-black text-[color:var(--foreground)]">
            Your cart is empty
          </h1>
          <p className="mt-3 text-[color:var(--text-muted)]">
            Add a game key to start checkout.
          </p>
          <Link href="/store" className="btn-primary mt-6 inline-flex px-7">
            Browse store
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-8 flex flex-col gap-2">
        <p className="admin-eyebrow">Checkout</p>
        <h1 className="text-3xl font-black text-[color:var(--foreground)]">
          Shopping Cart
        </h1>
        <p className="text-[color:var(--text-muted)]">
          Choose PromptPay or Stripe card checkout. Keys are delivered after payment is confirmed.
        </p>
      </div>

      {error && (
        <div className="admin-notice admin-notice-error mb-5">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          {items.map((item) => (
            <article key={item.game.id} className="surface p-4">
              <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                <img
                  src={item.game.imageUrl ? getUploadUrl(item.game.imageUrl) : '/placeholder-game.jpg'}
                  alt={item.game.title}
                  className="h-24 w-24 rounded-lg object-cover"
                />

                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-black text-[color:var(--foreground)]">
                    {item.game.title}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {item.game.platform}
                  </p>
                  <p className="mt-2 font-black text-[color:var(--foreground)]">
                    {formatMoney(item.game.price)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="inline-flex overflow-hidden rounded-lg border border-[color:var(--border)]">
                    <button
                      onClick={() => updateQuantity(item.game.id, item.quantity - 1)}
                      className="h-10 w-10 bg-[color:var(--surface-muted)] font-black text-[color:var(--foreground)]"
                      aria-label={`Decrease ${item.game.title} quantity`}
                    >
                      -
                    </button>
                    <span className="grid h-10 w-12 place-items-center font-black text-[color:var(--foreground)]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.game.id, item.quantity + 1)}
                      disabled={item.quantity >= item.game.availableKeys}
                      className="h-10 w-10 bg-[color:var(--surface-muted)] font-black text-[color:var(--foreground)] disabled:opacity-40"
                      aria-label={`Increase ${item.game.title} quantity`}
                    >
                      +
                    </button>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-black text-[color:var(--foreground)]">
                      {formatMoney(Number(item.game.price) * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(item.game.id)}
                      className="mt-1 text-sm font-bold text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="surface h-fit p-5">
          <h2 className="text-xl font-black text-[color:var(--foreground)]">
            Order summary
          </h2>

          <div className="mt-5 space-y-3 border-b border-[color:var(--border)] pb-5">
            <div className="flex justify-between text-sm">
              <span className="text-[color:var(--text-muted)]">
                Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
              <span className="font-black text-[color:var(--foreground)]">
                {formatMoney(total)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[color:var(--text-muted)]">Processing fee</span>
              <span className="font-black text-green-400">Free</span>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <span className="text-lg font-black text-[color:var(--foreground)]">
              Total
            </span>
            <span className="text-3xl font-black text-[color:var(--foreground)]">
              {formatMoney(total)}
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            <p className="text-sm font-black text-[color:var(--foreground)]">
              Payment method
            </p>

            <PaymentOption
              title="PromptPay"
              description="Upload a transfer slip and wait for admin or SlipOK verification."
              badge="Manual"
              checked={paymentMethod === 'PROMPTPAY'}
              onSelect={() => setPaymentMethod('PROMPTPAY')}
            />

            <PaymentOption
              title="Credit / debit card"
              description="Pay securely on Stripe Checkout. Keys unlock after Stripe confirms payment."
              badge="Stripe"
              checked={paymentMethod === 'CREDIT_CARD'}
              onSelect={() => setPaymentMethod('CREDIT_CARD')}
            />
          </div>

          {!user ? (
            <Link href="/login" className="btn-primary mt-6 w-full px-4">
              Sign in to checkout
            </Link>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="btn-primary mt-6 w-full px-4 disabled:opacity-50"
            >
              {isCheckingOut
                ? 'Creating checkout...'
                : paymentMethod === 'CREDIT_CARD'
                  ? 'Pay with Stripe'
                  : 'Pay with PromptPay'}
            </button>
          )}

          <p className="mt-4 text-center text-sm text-[color:var(--text-muted)]">
            PromptPay remains available. Stripe card payments are confirmed by webhook.
          </p>
        </aside>
      </div>
    </main>
  );
}

function PaymentOption({
  title,
  description,
  badge,
  checked,
  onSelect,
}: {
  title: string;
  description: string;
  badge: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        checked
          ? 'border-teal-300/70 bg-teal-300/10'
          : 'border-[color:var(--border)] bg-[color:var(--surface-muted)] hover:border-teal-300/40'
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-start justify-between gap-4">
        <span>
          <span className="block font-black text-[color:var(--foreground)]">
            {title}
          </span>
          <span className="mt-1 block text-sm leading-6 text-[color:var(--text-muted)]">
            {description}
          </span>
        </span>
        <span className={checked ? 'badge badge-available' : 'badge badge-epic'}>
          {badge}
        </span>
      </span>
    </label>
  );
}
