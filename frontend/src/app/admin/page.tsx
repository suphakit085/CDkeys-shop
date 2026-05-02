'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, keysApi, SalesStats, KeyStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
  AdminStatCard,
} from '@/components/admin/AdminUI';
import { formatMoney } from '@/lib/currency';

export default function AdminDashboard() {
  const { user, token, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [sales, keys] = await Promise.all([
        ordersApi.getSalesStats(token),
        keysApi.getStats(token),
      ]);
      setSalesStats(sales);
      setKeyStats(keys);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        router.push('/');
        return;
      }
      loadStats();
    }
  }, [user, isAdmin, authLoading, router, loadStats]);

  if (authLoading || isLoading) {
    return <AdminPageSkeleton rows={4} />;
  }

  const inventoryTotal =
    (keyStats?.available || 0) + (keyStats?.reserved || 0) + (keyStats?.sold || 0);
  const inventorySafeTotal = inventoryTotal || 1;
  const completedOrders = salesStats?.ordersByStatus?.completed || 0;
  const pendingOrders = salesStats?.ordersByStatus?.pending || 0;
  const failedOrders = salesStats?.ordersByStatus?.failed || 0;
  const cancelledOrders = salesStats?.ordersByStatus?.cancelled || 0;
  const orderTotal =
    completedOrders + pendingOrders + failedOrders + cancelledOrders || 1;

  return (
    <AdminShell
      title="Admin Dashboard"
      description="Monitor revenue, payment flow, and key inventory from one quiet command center."
      actions={
        <>
          <Link href="/admin/orders" className="btn-secondary px-4">
            Manage orders
          </Link>
          <Link href="/admin/games" className="btn-secondary px-4">
            Manage games
          </Link>
          <Link href="/admin/verify-payments" className="btn-primary px-4">
            Review payments
          </Link>
        </>
      }
    >
      <section className="admin-stat-grid">
        <AdminStatCard
          label="Revenue"
          value={formatMoney(Number(salesStats?.totalRevenue || 0))}
          helper="Completed order value"
          tone="green"
        />
        <AdminStatCard
          label="Completed"
          value={salesStats?.completedOrders || 0}
          helper="Paid orders"
          tone="teal"
        />
        <AdminStatCard
          label="Available keys"
          value={keyStats?.available || 0}
          helper="Ready to sell"
          tone="blue"
        />
        <AdminStatCard
          label="Sold keys"
          value={keyStats?.sold || 0}
          helper="Delivered inventory"
          tone="amber"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminPanel
          title="Key inventory"
          description={`${inventoryTotal} total keys across all statuses`}
        >
          <div className="space-y-4">
            {[
              {
                label: 'Available',
                value: keyStats?.available || 0,
                color: 'var(--success)',
              },
              {
                label: 'Reserved',
                value: keyStats?.reserved || 0,
                color: 'var(--warning)',
              },
              {
                label: 'Sold',
                value: keyStats?.sold || 0,
                color: 'var(--error)',
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[color:var(--text-muted)]">
                    {item.label}
                  </span>
                  <span className="font-bold text-[color:var(--foreground)]">
                    {item.value}
                  </span>
                </div>
                <div className="admin-progress">
                  <span
                    style={{
                      width: `${(item.value / inventorySafeTotal) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Order pipeline" description="Current order status mix">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Completed', value: completedOrders, tone: 'var(--success)' },
              { label: 'Pending', value: pendingOrders, tone: 'var(--warning)' },
              { label: 'Failed', value: failedOrders, tone: 'var(--error)' },
              { label: 'Cancelled', value: cancelledOrders, tone: 'var(--text-muted)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-center"
              >
                <p className="text-2xl font-black" style={{ color: item.tone }}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-[color:var(--text-muted)]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 admin-progress">
            <span
              style={{
                width: `${(completedOrders / orderTotal) * 100}%`,
                background: 'var(--success)',
              }}
            />
          </div>
        </AdminPanel>
      </section>

      <AdminPanel
        title="Recent completed orders"
        description="Latest successful purchases and delivered products"
      >
        {salesStats?.recentOrders && salesStats.recentOrders.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {salesStats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-sm">{order.id.slice(0, 8)}</td>
                    <td>{order.user?.email || '-'}</td>
                    <td className="max-w-[420px] truncate text-[color:var(--text-muted)]">
                      {order.orderItems.map((i) => i.game.title).join(', ')}
                    </td>
                    <td className="font-bold text-[color:var(--success)]">
                      {formatMoney(Number(order.total))}
                    </td>
                    <td className="text-[color:var(--text-muted)]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-[color:var(--text-muted)]">
            No completed orders yet.
          </p>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
