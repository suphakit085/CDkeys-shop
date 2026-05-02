/* eslint-disable @next/next/no-img-element -- Order thumbnails use uploaded artwork and external game images. */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, Order } from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import MoneyAmount from '@/components/MoneyAmount';

const statusStyles: Record<Order['status'], { label: string; badge: string; text: string }> = {
    COMPLETED: {
        label: 'สำเร็จ',
        badge: 'badge-available',
        text: 'ส่งคีย์เรียบร้อย',
    },
    PENDING: {
        label: 'รอชำระเงิน',
        badge: 'badge-reserved',
        text: 'กำลังรอการยืนยัน',
    },
    FAILED: {
        label: 'ไม่สำเร็จ',
        badge: 'badge-sold',
        text: 'คำสั่งซื้อถูกยกเลิก',
    },
};

function getStatusMeta(status: Order['status'] | string) {
    return statusStyles[status as Order['status']] || {
        label: status,
        badge: 'badge-reserved',
        text: 'กำลังประมวลผล',
    };
}

function getPaymentLabel(method?: Order['paymentMethod']) {
    return method === 'CREDIT_CARD' ? 'Stripe' : 'PromptPay';
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function shortId(id: string) {
    return `#${id.slice(0, 8).toUpperCase()}`;
}

function gameImage(url?: string) {
    return url ? getUploadUrl(url) : '/placeholder-game.jpg';
}

function OrdersSkeleton() {
    return (
        <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
            <div className="page-shell animate-pulse">
                <div className="mb-6 h-6 w-56 rounded-lg bg-[var(--surface-muted)]" />
                <div className="mb-6 grid gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-28 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-40 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function OrdersPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await ordersApi.getMy(token);
            setOrders(data);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (token) {
            loadOrders();
        }
    }, [user, token, authLoading, router, loadOrders]);

    const summary = useMemo(() => {
        const completedOrders = orders.filter((order) => order.status === 'COMPLETED');
        const pendingOrders = orders.filter((order) => order.status === 'PENDING');
        const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

        return {
            total: orders.length,
            completed: completedOrders.length,
            pending: pendingOrders.length,
            totalSpent,
        };
    }, [orders]);

    if (authLoading || isLoading) {
        return <OrdersSkeleton />;
    }

    if (orders.length === 0) {
        return (
            <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
                <div className="page-shell">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center shadow-[var(--card-shadow)]">
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Orders</p>
                        <h1 className="mt-2 text-3xl font-black">ยังไม่มีคำสั่งซื้อ</h1>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                            เลือกเกมที่ต้องการ แล้วคำสั่งซื้อทั้งหมดจะมาอยู่ในหน้านี้พร้อมสถานะการชำระเงินและคีย์เกม
                        </p>
                        <Link href="/store" className="btn-primary mt-8 inline-flex px-6">
                            ไปเลือกเกม
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
            <main className="page-shell">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Orders</p>
                        <h1 className="mt-1 text-3xl font-black leading-tight md:text-4xl">คำสั่งซื้อของฉัน</h1>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            ติดตามสถานะการชำระเงินและเปิดดูคีย์เกมที่ซื้อไว้
                        </p>
                    </div>
                    <Link href="/store" className="btn-secondary px-5">
                        เลือกเกมเพิ่ม
                    </Link>
                </div>

                <section className="mb-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
                        <p className="text-xs font-black uppercase text-[var(--text-muted)]">Total orders</p>
                        <p className="mt-2 text-3xl font-black">{summary.total}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">ทั้งหมดในบัญชีนี้</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
                        <p className="text-xs font-black uppercase text-[var(--text-muted)]">Completed</p>
                        <p className="mt-2 text-3xl font-black text-[var(--success)]">{summary.completed}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">พร้อมเปิดดูคีย์</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
                        <p className="text-xs font-black uppercase text-[var(--text-muted)]">Total paid</p>
                        <div className="mt-2">
                            <MoneyAmount value={summary.totalSpent} size="lg" />
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{summary.pending} รายการรอตรวจสอบ</p>
                    </div>
                </section>

                <section className="space-y-4">
                    {orders.map((order) => {
                        const meta = getStatusMeta(order.status);
                        const previewItems = order.orderItems.slice(0, 4);
                        const firstItem = previewItems[0];
                        const extraItems = order.orderItems.length - 1;

                        return (
                            <Link
                                key={order.id}
                                href={`/orders/${order.id}`}
                                className="group block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                            >
                                <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                                    <div className="relative min-h-[190px] overflow-hidden bg-[var(--surface-muted)]">
                                        {firstItem ? (
                                            <>
                                                <img
                                                    src={gameImage(firstItem.game.imageUrl)}
                                                    alt={firstItem.game.title}
                                                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                                                {previewItems.length > 1 && (
                                                    <div className="absolute inset-x-3 bottom-3 flex gap-2">
                                                        {previewItems.slice(1).map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="h-14 w-20 overflow-hidden rounded-lg border border-white/20 bg-slate-900 shadow-lg"
                                                            >
                                                                <img src={gameImage(item.game.imageUrl)} alt="" className="h-full w-full object-cover" />
                                                            </div>
                                                        ))}
                                                        {extraItems > 3 && (
                                                            <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-white/20 bg-black/45 text-sm font-black text-white">
                                                                +{extraItems - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex h-full min-h-[190px] items-center justify-center text-sm font-black text-[var(--text-muted)]">
                                                No image
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                                                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-black uppercase text-[var(--text-muted)]">
                                                        {getPaymentLabel(order.paymentMethod)}
                                                    </span>
                                                </div>
                                                <h2 className="mt-3 text-xl font-black">{shortId(order.id)}</h2>
                                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                    {formatDate(order.createdAt)} · {order.orderItems.length} รายการ · {meta.text}
                                                </p>
                                            </div>
                                            <div className="shrink-0 sm:text-right">
                                                <p className="text-xs font-black uppercase text-[var(--text-muted)]">ยอดรวม</p>
                                                <div className="mt-1">
                                                    <MoneyAmount value={order.total} size="md" align="right" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {order.orderItems.slice(0, 3).map((item) => (
                                                <span key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-bold">
                                                    {item.game.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}
