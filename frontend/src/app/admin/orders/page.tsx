/* eslint-disable @next/next/no-img-element -- Admin order rows use uploaded artwork, external game images, and payment slip previews. */
'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Order,
  PaginationMeta,
  PaymentMethod,
  ordersApi,
  paymentApi,
} from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { formatMoney } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import {
  AdminAccessRequired,
  AdminEmpty,
  AdminNotice,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
  AdminStatCard,
  cx,
} from '@/components/admin/AdminUI';
import MoneyAmount from '@/components/MoneyAmount';

const pageSize = 12;

const orderStatusOptions: Array<{ value: '' | Order['status']; label: string }> = [
  { value: '', label: 'All order status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const paymentStatusOptions: Array<{
  value: '' | NonNullable<Order['paymentStatus']>;
  label: string;
}> = [
  { value: '', label: 'All payment status' },
  { value: 'PENDING', label: 'Unpaid' },
  { value: 'SLIP_UPLOADED', label: 'Slip uploaded' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusMeta: Record<
  Order['status'],
  { label: string; badge: string; tone: string; helper: string }
> = {
  PENDING: {
    label: 'รอดำเนินการ',
    badge: 'badge-reserved',
    tone: 'text-[var(--warning)]',
    helper: 'รอชำระเงินหรือรอตรวจสลิป',
  },
  COMPLETED: {
    label: 'สำเร็จ',
    badge: 'badge-available',
    tone: 'text-[var(--success)]',
    helper: 'ชำระแล้วและส่งคีย์แล้ว',
  },
  FAILED: {
    label: 'ไม่สำเร็จ',
    badge: 'badge-sold',
    tone: 'text-[var(--error)]',
    helper: 'ชำระไม่ผ่านหรือถูกปฏิเสธ',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    badge: 'badge-sold',
    tone: 'text-[var(--text-muted)]',
    helper: 'คืนคีย์กลับสต็อกแล้ว',
  },
};

const paymentMeta: Record<
  NonNullable<Order['paymentStatus']>,
  { label: string; badge: string; helper: string }
> = {
  PENDING: {
    label: 'ยังไม่จ่าย',
    badge: 'badge-reserved',
    helper: 'ยังเปลี่ยนวิธีชำระหรือยกเลิกได้',
  },
  SLIP_UPLOADED: {
    label: 'มีสลิป',
    badge: 'badge-reserved',
    helper: 'รอ admin ตรวจสอบ',
  },
  VERIFIED: {
    label: 'ยืนยันแล้ว',
    badge: 'badge-available',
    helper: 'พร้อมส่งหรือส่งคีย์แล้ว',
  },
  REJECTED: {
    label: 'ปฏิเสธ',
    badge: 'badge-sold',
    helper: 'สลิปไม่ผ่านการตรวจสอบ',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    badge: 'badge-sold',
    helper: 'ปิดรายการแล้ว',
  },
};

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function gameImage(url?: string) {
  return url ? getUploadUrl(url) : '/placeholder-game.jpg';
}

function formatDate(value?: string) {
  if (!value) return '-';

  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMethodLabel(method?: PaymentMethod) {
  return method === 'CREDIT_CARD' ? 'Stripe' : 'PromptPay';
}

function firstGameTitle(order: Order) {
  return order.orderItems[0]?.game.title || 'No items';
}

function orderPreviewImage(order: Order) {
  return gameImage(order.orderItems[0]?.game.imageUrl);
}

function getSlipUrl(order: Order) {
  return order.paymentSlipUrl ? getUploadUrl(order.paymentSlipUrl) : '';
}

export default function AdminOrdersPage() {
  const { user, token, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | Order['status']>('');
  const [paymentStatus, setPaymentStatus] = useState<
    '' | NonNullable<Order['paymentStatus']>
  >('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrders = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const result = await ordersApi.getPage(token, {
        page,
        limit: pageSize,
        search: search || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
      });
      setOrders(result.data);
      setPagination(result.meta);
      setSelectedOrderId((current) => {
        if (current && result.data.some((order) => order.id === current)) {
          return current;
        }
        return result.data[0]?.id || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [page, paymentStatus, search, status, token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      router.push('/');
      return;
    }

    loadOrders();
  }, [authLoading, isAdmin, loadOrders, router, user]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const summary = useMemo(() => {
    const pendingReview = orders.filter(
      (order) => order.paymentStatus === 'SLIP_UPLOADED',
    ).length;
    const completed = orders.filter((order) => order.status === 'COMPLETED');
    const unpaid = orders.filter(
      (order) => order.status === 'PENDING' && order.paymentStatus === 'PENDING',
    ).length;
    const currentRevenue = completed.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    return {
      total: pagination?.total || orders.length,
      pendingReview,
      unpaid,
      currentRevenue,
    };
  }, [orders, pagination?.total]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const refreshAfterAction = async (message: string) => {
    setSuccess(message);
    await loadOrders();
  };

  const verifyOrder = async (order: Order) => {
    if (!token) return;

    setError('');
    setSuccess('');
    setActionLoading(`verify:${order.id}`);
    try {
      await paymentApi.verify(order.id, token);
      await refreshAfterAction(`${shortId(order.id)} verified and keys delivered.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify order');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectOrder = async (order: Order) => {
    if (!token) return;

    const reason = window.prompt('เหตุผลที่ปฏิเสธสลิป');
    if (!reason) return;

    setError('');
    setSuccess('');
    setActionLoading(`reject:${order.id}`);
    try {
      await paymentApi.reject(order.id, reason, token);
      await refreshAfterAction(`${shortId(order.id)} rejected.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!token) return;

    const reason = window.prompt('เหตุผลที่ยกเลิก order นี้');
    if (reason === null) return;

    setError('');
    setSuccess('');
    setActionLoading(`cancel:${order.id}`);
    try {
      await ordersApi.adminCancel(order.id, reason.trim() || undefined, token);
      await refreshAfterAction(`${shortId(order.id)} cancelled and stock restored.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const resendKeys = async (order: Order) => {
    if (!token) return;

    const confirmed = window.confirm(`Resend CD keys for ${shortId(order.id)}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setActionLoading(`resend:${order.id}`);
    try {
      await paymentApi.resendKeys(order.id, token);
      await refreshAfterAction(`${shortId(order.id)} key email resent.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend keys');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || (isLoading && orders.length === 0)) {
    return <AdminPageSkeleton rows={4} />;
  }

  if (!isAdmin) {
    return <AdminAccessRequired />;
  }

  return (
    <AdminShell
      title="Order Management"
      description="ค้นหา ตรวจสลิป ยกเลิกรายการค้างจ่าย และส่งคีย์ซ้ำจากหน้ารวมคำสั่งซื้อ"
      actions={
        <>
          <Link href="/admin/verify-payments" className="btn-secondary px-4">
            Review slips
          </Link>
          <button onClick={loadOrders} className="btn-primary px-4">
            Refresh
          </button>
        </>
      }
    >
      {error && <AdminNotice tone="error">{error}</AdminNotice>}
      {success && <AdminNotice tone="success">{success}</AdminNotice>}

      <section className="admin-stat-grid">
        <AdminStatCard label="Total orders" value={summary.total} helper="Matching filters" />
        <AdminStatCard
          label="Need review"
          value={summary.pendingReview}
          helper="Slip uploaded"
          tone="amber"
        />
        <AdminStatCard
          label="Unpaid"
          value={summary.unpaid}
          helper="Can cancel safely"
          tone="blue"
        />
        <AdminStatCard
          label="Paid value"
          value={formatMoney(summary.currentRevenue)}
          helper="This page"
          tone="green"
        />
      </section>

      <AdminPanel>
        <form
          onSubmit={submitSearch}
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_200px_auto]"
        >
          <label>
            <span className="admin-field-label">Search</span>
            <input
              className="input"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Order ID, customer, email, or game"
            />
          </label>

          <label>
            <span className="admin-field-label">Order status</span>
            <select
              className="input"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as '' | Order['status']);
              }}
            >
              {orderStatusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="admin-field-label">Payment status</span>
            <select
              className="input"
              value={paymentStatus}
              onChange={(event) => {
                setPage(1);
                setPaymentStatus(
                  event.target.value as '' | NonNullable<Order['paymentStatus']>,
                );
              }}
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary w-full px-5">
              Search
            </button>
            {(search || status || paymentStatus) && (
              <button
                type="button"
                onClick={() => {
                  setDraftSearch('');
                  setSearch('');
                  setStatus('');
                  setPaymentStatus('');
                  setPage(1);
                }}
                className="btn-secondary px-4"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </AdminPanel>

      {orders.length === 0 ? (
        <AdminEmpty
          title="No orders found"
          description="ลองล้างตัวกรองหรือค้นหาด้วยอีเมล/ชื่อเกมอื่น"
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(440px,0.95fr)_minmax(0,1.2fr)]">
          <AdminPanel
            title="Orders"
            description={`${orders.length} visible on this page`}
            actions={
              pagination && (
                <span className="text-sm font-bold text-[color:var(--text-muted)]">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
              )
            }
          >
            <div className="space-y-3">
              {orders.map((order) => {
                const orderMeta = statusMeta[order.status];
                const payMeta = paymentMeta[order.paymentStatus || 'PENDING'];
                const isSelected = selectedOrderId === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cx(
                      'grid w-full gap-0 overflow-hidden rounded-lg border text-left transition md:grid-cols-[150px_minmax(0,1fr)]',
                      isSelected
                        ? 'border-[color:var(--primary)] bg-[color:var(--surface-muted)]'
                        : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)]',
                    )}
                  >
                    <div className="relative min-h-32 bg-[color:var(--surface-muted)] md:min-h-full">
                      <img
                        src={orderPreviewImage(order)}
                        alt={firstGameTitle(order)}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="min-w-0 p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={cx('badge', orderMeta.badge)}>
                          {orderMeta.label}
                        </span>
                        <span className={cx('badge', payMeta.badge)}>
                          {payMeta.label}
                        </span>
                        <span className="badge badge-epic">
                          {paymentMethodLabel(order.paymentMethod)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-lg font-black text-[color:var(--foreground)]">
                            {shortId(order.id)}
                          </p>
                          <p className="mt-1 truncate text-sm font-bold text-[color:var(--foreground)]">
                            {firstGameTitle(order)}
                          </p>
                          <p className="mt-1 truncate text-sm text-[color:var(--text-muted)]">
                            {order.user?.name || 'Customer'} · {order.user?.email || '-'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <MoneyAmount value={order.total} size="sm" align="right" />
                          <p className="mt-1 text-xs text-[color:var(--text-dim)]">
                            {order.orderItems.length} item
                            {order.orderItems.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-[color:var(--text-dim)]">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
                <button
                  type="button"
                  className="btn-secondary px-4 disabled:opacity-40"
                  disabled={!pagination.hasPrevious}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-[color:var(--text-muted)]">
                  {pagination.total} orders
                </span>
                <button
                  type="button"
                  className="btn-secondary px-4 disabled:opacity-40"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </AdminPanel>

          <OrderDetailPanel
            order={selectedOrder}
            actionLoading={actionLoading}
            onVerify={verifyOrder}
            onReject={rejectOrder}
            onCancel={cancelOrder}
            onResend={resendKeys}
          />
        </section>
      )}
    </AdminShell>
  );
}

function OrderDetailPanel({
  order,
  actionLoading,
  onVerify,
  onReject,
  onCancel,
  onResend,
}: {
  order: Order | null;
  actionLoading: string | null;
  onVerify: (order: Order) => void;
  onReject: (order: Order) => void;
  onCancel: (order: Order) => void;
  onResend: (order: Order) => void;
}) {
  if (!order) {
    return (
      <AdminPanel>
        <AdminEmpty title="Select an order" description="เลือกรายการทางซ้ายเพื่อดูรายละเอียด" />
      </AdminPanel>
    );
  }

  const orderMeta = statusMeta[order.status];
  const payMeta = paymentMeta[order.paymentStatus || 'PENDING'];
  const slipUrl = getSlipUrl(order);
  const canVerify = order.status === 'PENDING' && order.paymentStatus === 'SLIP_UPLOADED';
  const canReject = canVerify;
  const canCancel = order.status === 'PENDING' && order.paymentStatus === 'PENDING';
  const canResend = order.status === 'COMPLETED' && order.paymentStatus === 'VERIFIED';

  return (
    <AdminPanel className="xl:sticky xl:top-24 xl:self-start">
      <div className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={cx('badge', orderMeta.badge)}>{orderMeta.label}</span>
            <span className={cx('badge', payMeta.badge)}>{payMeta.label}</span>
            <span className="badge badge-epic">
              {paymentMethodLabel(order.paymentMethod)}
            </span>
          </div>
          <p className="font-mono text-2xl font-black text-[color:var(--foreground)]">
            {shortId(order.id)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {order.user?.name || 'Customer'} · {order.user?.email || '-'}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
            Total
          </p>
          <MoneyAmount value={order.total} size="xl" align="right" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
            Order state
          </p>
          <p className={cx('mt-2 text-lg font-black', orderMeta.tone)}>
            {orderMeta.label}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {orderMeta.helper}
          </p>
        </div>
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
            Payment state
          </p>
          <p className="mt-2 text-lg font-black text-[color:var(--foreground)]">
            {payMeta.label}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {payMeta.helper}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <InfoBlock label="Created" value={formatDate(order.createdAt)} />
        <InfoBlock label="Paid" value={formatDate(order.paidAt)} />
        <InfoBlock label="Verified" value={formatDate(order.verifiedAt)} />
        <InfoBlock label="Stripe status" value={order.stripePaymentStatus || '-'} />
      </div>

      <div className="mt-5 rounded-lg border border-[color:var(--border)]">
        <div className="border-b border-[color:var(--border)] p-4">
          <p className="text-sm font-black text-[color:var(--foreground)]">Items</p>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {order.orderItems.map((item) => (
            <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[84px_minmax(0,1fr)_auto]">
              <div className="h-16 overflow-hidden rounded-lg bg-[color:var(--surface-muted)]">
                <img
                  src={gameImage(item.game.imageUrl)}
                  alt={item.game.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-[color:var(--foreground)]">
                  {item.game.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`badge badge-${item.game.platform.toLowerCase()}`}>
                    {item.game.platform}
                  </span>
                  <span className="badge badge-epic">
                    {order.status === 'COMPLETED' && item.cdKey
                      ? item.cdKey.keyCode
                      : 'Key held'}
                  </span>
                </div>
              </div>
              <MoneyAmount value={item.price} size="sm" align="right" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="mb-3 text-sm font-black text-[color:var(--foreground)]">
            Payment slip
          </p>
          {slipUrl ? (
            <a
              href={slipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-solid)]"
            >
              <img
                src={slipUrl}
                alt="Payment slip"
                className="max-h-72 w-full object-contain"
              />
            </a>
          ) : (
            <div className="admin-preview-box min-h-40">
              <span className="text-sm font-bold text-[color:var(--text-muted)]">
                No slip uploaded
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="mb-3 text-sm font-black text-[color:var(--foreground)]">
            Actions
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              disabled={!canVerify || actionLoading === `verify:${order.id}`}
              onClick={() => onVerify(order)}
              className="btn-primary px-4 disabled:opacity-40"
            >
              {actionLoading === `verify:${order.id}` ? 'Working...' : 'Verify payment'}
            </button>
            <button
              type="button"
              disabled={!canResend || actionLoading === `resend:${order.id}`}
              onClick={() => onResend(order)}
              className="btn-secondary px-4 disabled:opacity-40"
            >
              {actionLoading === `resend:${order.id}` ? 'Working...' : 'Resend keys email'}
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!canReject || actionLoading === `reject:${order.id}`}
                onClick={() => onReject(order)}
                className="admin-danger-button px-4 disabled:opacity-40"
              >
                {actionLoading === `reject:${order.id}` ? 'Working...' : 'Reject slip'}
              </button>
              <button
                type="button"
                disabled={!canCancel || actionLoading === `cancel:${order.id}`}
                onClick={() => onCancel(order)}
                className="admin-danger-button px-4 disabled:opacity-40"
              >
                {actionLoading === `cancel:${order.id}` ? 'Working...' : 'Cancel unpaid'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
      <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-[color:var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
