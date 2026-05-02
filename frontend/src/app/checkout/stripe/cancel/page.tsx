'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ordersApi, paymentApi } from '@/lib/api';
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
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

  const switchToPromptPay = async () => {
    if (!token || !orderId) return;

    setIsSwitching(true);
    setError('');

    try {
      await ordersApi.changePaymentMethod(orderId, 'PROMPTPAY', token);
      window.location.href = `/checkout/promptpay/${orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch to PromptPay');
      setIsSwitching(false);
    }
  };

  const cancelOrder = async () => {
    if (!token || !orderId) return;

    const confirmed = window.confirm('ยกเลิกคำสั่งซื้อนี้หรือไม่?');
    if (!confirmed) return;

    setIsCancelling(true);
    setError('');

    try {
      await ordersApi.cancel(orderId, token);
      window.location.href = `/orders/${orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel order');
      setIsCancelling(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--body-background)] py-16 text-[var(--foreground)]">
      <section className="page-shell">
        <div className="surface mx-auto max-w-2xl overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
            <p className="admin-eyebrow">Stripe Checkout</p>
            <h1 className="mt-2 text-3xl font-black">ยังไม่ได้ชำระผ่าน Stripe</h1>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-[var(--text-muted)]">
              คำสั่งซื้อยังคงรอชำระเงินอยู่ คุณสามารถลองจ่ายผ่าน Stripe อีกครั้ง เปลี่ยนเป็น PromptPay หรือยกเลิก order ได้
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="admin-notice admin-notice-error mb-5 text-left">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={retryStripeCheckout}
                disabled={!token || !orderId || isRetrying || isSwitching || isCancelling}
                className="btn-primary px-5 disabled:opacity-50"
              >
                {isRetrying ? 'กำลังเปิด Stripe...' : 'ลองจ่ายผ่าน Stripe อีกครั้ง'}
              </button>
              <button
                onClick={switchToPromptPay}
                disabled={!token || !orderId || isRetrying || isSwitching || isCancelling}
                className="btn-secondary px-5 disabled:opacity-50"
              >
                {isSwitching ? 'กำลังเปลี่ยน...' : 'เปลี่ยนเป็น PromptPay'}
              </button>
              <Link href={orderId ? `/orders/${orderId}` : '/orders'} className="btn-secondary px-5">
                ดูคำสั่งซื้อ
              </Link>
              <button
                onClick={cancelOrder}
                disabled={!token || !orderId || isRetrying || isSwitching || isCancelling}
                className="rounded-lg border border-red-400/40 px-5 py-3 font-black text-[var(--error)] transition hover:bg-red-400/10 disabled:opacity-50"
              >
                {isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกคำสั่งซื้อ'}
              </button>
            </div>
          </div>
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
