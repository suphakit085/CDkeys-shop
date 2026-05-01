/* eslint-disable @next/next/no-img-element -- Payment slips are local uploads reviewed by admins. */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { paymentApi, PendingPayment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getUploadUrl } from '@/lib/config';
import {
  AdminAccessRequired,
  AdminEmpty,
  AdminNotice,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
  AdminStatCard,
} from '@/components/admin/AdminUI';

function formatMoney(value: number) {
  return `THB ${value.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
  })}`;
}

export default function VerifyPaymentsPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPayments = useCallback(async () => {
    if (!token) return;
    try {
      const data = await paymentApi.getPending(token);
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Unable to load pending payments');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token && isAdmin) {
      loadPayments();
    }
  }, [token, authLoading, isAdmin, loadPayments]);

  const handleVerify = async (orderId: string) => {
    if (!token) return;
    setActionLoading(orderId);
    setError('');
    setSuccess('');

    try {
      await paymentApi.verify(orderId, token);
      setSuccess(`Order ${orderId.slice(0, 8)} verified.`);
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!token) return;
    const reason = window.prompt('Reject reason');
    if (!reason) return;

    setActionLoading(orderId);
    setError('');
    setSuccess('');

    try {
      await paymentApi.reject(orderId, reason, token);
      setSuccess(`Order ${orderId.slice(0, 8)} rejected.`);
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reject payment');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || isLoading) {
    return <AdminPageSkeleton rows={3} />;
  }

  if (!isAdmin) {
    return <AdminAccessRequired />;
  }

  const pendingValue = payments.reduce((sum, payment) => sum + Number(payment.total), 0);

  return (
    <AdminShell
      title="Payment Review"
      description="Inspect uploaded PromptPay slips before completing or releasing orders."
      actions={
        <button onClick={loadPayments} className="btn-secondary px-4">
          Refresh
        </button>
      }
    >
      {error && <AdminNotice tone="error">{error}</AdminNotice>}
      {success && <AdminNotice tone="success">{success}</AdminNotice>}

      <section className="admin-stat-grid">
        <AdminStatCard label="Pending slips" value={payments.length} helper="Awaiting review" />
        <AdminStatCard
          label="Pending value"
          value={formatMoney(pendingValue)}
          helper="Uploaded slips"
          tone="amber"
        />
        <AdminStatCard label="Review mode" value="Manual" helper="Admin approval" tone="blue" />
        <AdminStatCard label="Delivery" value="After pay" helper="Keys reveal after verification" tone="green" />
      </section>

      {payments.length === 0 ? (
        <AdminEmpty
          title="No payments waiting"
          description="New uploaded slips will appear here for review."
        />
      ) : (
        <div className="admin-card-list">
          {payments.map((payment) => {
            const slipUrl = payment.paymentSlipUrl ? getUploadUrl(payment.paymentSlipUrl) : '';

            return (
              <AdminPanel key={payment.id} className="p-0">
                <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="border-b border-[color:var(--border)] p-4 lg:border-b-0 lg:border-r">
                    {slipUrl ? (
                      <a
                        href={slipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)]"
                      >
                        <img
                          src={slipUrl}
                          alt="Payment slip"
                          className="max-h-[360px] w-full object-contain"
                        />
                      </a>
                    ) : (
                      <div className="admin-preview-box min-h-[240px]">
                        <span className="text-sm font-semibold text-[color:var(--text-muted)]">
                          No slip image
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="admin-eyebrow">Order #{payment.id.slice(0, 8)}</p>
                        <h2 className="text-xl font-black text-[color:var(--foreground)]">
                          {payment.user.name}
                        </h2>
                        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                          {payment.user.email}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
                          {new Date(payment.createdAt).toLocaleString('th-TH')}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-3xl font-black text-[color:var(--foreground)]">
                          {formatMoney(Number(payment.total))}
                        </p>
                        <span className="badge badge-reserved mt-2">Pending review</span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                      <p className="mb-3 text-xs font-black uppercase text-[color:var(--text-muted)]">
                        Items
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {payment.orderItems.map((item) => (
                          <span key={item.id} className="badge badge-epic">
                            {item.game.title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => handleVerify(payment.id)}
                        disabled={actionLoading === payment.id}
                        className="btn-primary px-6 disabled:opacity-50"
                      >
                        {actionLoading === payment.id ? 'Working...' : 'Verify payment'}
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        disabled={actionLoading === payment.id}
                        className="admin-danger-button px-6 disabled:opacity-50"
                      >
                        {actionLoading === payment.id ? 'Working...' : 'Reject slip'}
                      </button>
                    </div>
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
