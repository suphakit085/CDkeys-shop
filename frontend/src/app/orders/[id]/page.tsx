/* eslint-disable @next/next/no-img-element -- Order thumbnails use uploaded artwork and external game images. */
'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, paymentApi, Order, OrderItem } from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import MoneyAmount from '@/components/MoneyAmount';

const statusStyles: Record<Order['status'], { label: string; badge: string; title: string; note: string }> = {
    COMPLETED: {
        label: 'สำเร็จ',
        badge: 'badge-available',
        title: 'คำสั่งซื้อสำเร็จแล้ว',
        note: 'คีย์เกมพร้อมใช้งานในรายการด้านล่าง',
    },
    PENDING: {
        label: 'รอชำระเงิน',
        badge: 'badge-reserved',
        title: 'กำลังรอการชำระเงิน',
        note: 'หลังยืนยันการชำระเงิน ระบบจะแสดงคีย์เกมให้ทันที',
    },
    FAILED: {
        label: 'ไม่สำเร็จ',
        badge: 'badge-sold',
        title: 'คำสั่งซื้อไม่สำเร็จ',
        note: 'ยังไม่มีคีย์สำหรับคำสั่งซื้อนี้',
    },
};

const platformBadgeStyles: Record<string, string> = {
    STEAM: 'badge-steam',
    PLAYSTATION: 'badge-playstation',
    XBOX: 'badge-xbox',
    NINTENDO: 'badge-nintendo',
    ORIGIN: 'badge-origin',
    UPLAY: 'badge-uplay',
    EPIC: 'badge-epic',
};

function getStatusMeta(status: Order['status'] | string) {
    return statusStyles[status as Order['status']] || {
        label: status,
        badge: 'badge-reserved',
        title: 'กำลังประมวลผลคำสั่งซื้อ',
        note: 'โปรดตรวจสอบสถานะอีกครั้ง',
    };
}

function getPlatformBadge(platform: string) {
    return platformBadgeStyles[platform] || 'badge-epic';
}

function getPaymentLabel(method?: Order['paymentMethod']) {
    return method === 'CREDIT_CARD' ? 'Stripe' : 'PromptPay';
}

function formatDateTime(date: string) {
    return new Date(date).toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function shortId(id: string) {
    return `#${id.slice(0, 8).toUpperCase()}`;
}

function gameImage(url?: string) {
    return url ? getUploadUrl(url) : '/placeholder-game.jpg';
}

function TimelineStep({ label, state }: { label: string; state: 'done' | 'active' | 'muted' }) {
    const markerClass = {
        done: 'border-[var(--success)] bg-[var(--success)]',
        active: 'border-[var(--warning)] bg-[var(--warning)]',
        muted: 'border-[var(--border-strong)] bg-[var(--surface-muted)]',
    }[state];

    return (
        <div className="flex min-w-0 items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full border ${markerClass}`} />
            <span className={`text-sm font-bold ${state === 'muted' ? 'text-[var(--text-muted)]' : 'text-[var(--foreground)]'}`}>
                {label}
            </span>
        </div>
    );
}

function OrderDetailSkeleton() {
    return (
        <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
            <div className="page-shell animate-pulse">
                <div className="mb-5 h-5 w-40 rounded-lg bg-[var(--surface-muted)]" />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-4">
                        <div className="h-52 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
                        <div className="h-44 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
                    </div>
                    <div className="h-80 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestartingStripe, setIsRestartingStripe] = useState(false);
    const [stripeError, setStripeError] = useState('');
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const [copiedKeyId, setCopiedKeyId] = useState('');

    const loadOrder = useCallback(async () => {
        if (!token) return;
        try {
            const data = await ordersApi.getOne(id, token);
            setOrder(data);
        } catch (error) {
            console.error('Failed to load order:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (token && id) {
            loadOrder();
        }
    }, [user, token, authLoading, id, router, loadOrder]);

    const meta = order ? getStatusMeta(order.status) : null;
    const timeline = useMemo(() => {
        if (!order) return [];
        const paid = order.status === 'COMPLETED';
        const failed = order.status === 'FAILED';

        return [
            { label: 'สร้างคำสั่งซื้อ', state: 'done' as const },
            { label: getPaymentLabel(order.paymentMethod), state: paid ? 'done' as const : failed ? 'muted' as const : 'active' as const },
            { label: 'รับคีย์เกม', state: paid ? 'done' as const : 'muted' as const },
        ];
    }, [order]);

    const toggleKeyReveal = (itemId: string) => {
        setRevealedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const copyKey = async (item: OrderItem) => {
        if (!item.cdKey?.keyCode) return;
        await navigator.clipboard.writeText(item.cdKey.keyCode);
        setCopiedKeyId(item.id);
        window.setTimeout(() => setCopiedKeyId(''), 1600);
    };

    const restartStripeCheckout = async () => {
        if (!order || !token) return;

        setIsRestartingStripe(true);
        setStripeError('');

        try {
            const checkout = await paymentApi.createStripeCheckout(order.id, token);
            window.location.href = checkout.url;
        } catch (err) {
            setStripeError(err instanceof Error ? err.message : 'Unable to restart Stripe checkout');
            setIsRestartingStripe(false);
        }
    };

    if (authLoading || isLoading) {
        return <OrderDetailSkeleton />;
    }

    if (!order || !meta) {
        return (
            <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
                <div className="page-shell">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center shadow-[var(--card-shadow)]">
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Order</p>
                        <h1 className="mt-2 text-3xl font-black">ไม่พบคำสั่งซื้อนี้</h1>
                        <Link href="/orders" className="btn-primary mt-8 inline-flex px-6">
                            กลับไปหน้าคำสั่งซื้อ
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-page min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
            <main className="page-shell">
                <Link href="/orders" className="mb-5 inline-flex text-sm font-bold text-[var(--text-muted)] hover:text-[var(--foreground)]">
                    กลับไปหน้าคำสั่งซื้อ
                </Link>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <section className="min-w-0 space-y-5">
                        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
                            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                                        <h1 className="mt-4 text-3xl font-black leading-tight">{meta.title}</h1>
                                        <p className="mt-2 text-sm text-[var(--text-muted)]">{meta.note}</p>
                                    </div>
                                    <div className="shrink-0 sm:text-right">
                                        <p className="text-xs font-black uppercase text-[var(--text-muted)]">Order ID</p>
                                        <p className="mt-1 font-mono text-lg font-black">{shortId(order.id)}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    {timeline.map((step) => (
                                        <TimelineStep key={step.label} label={step.label} state={step.state} />
                                    ))}
                                </div>
                            </div>

                            {order.status === 'PENDING' && order.paymentMethod === 'CREDIT_CARD' && (
                                <div className="border-b border-[var(--border)] p-5">
                                    <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-black text-[var(--warning)]">รอชำระเงินผ่าน Stripe</p>
                                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                    กลับไปชำระเงินให้เสร็จเพื่อปลดล็อกคีย์เกม
                                                </p>
                                                {stripeError && (
                                                    <p className="mt-2 text-sm font-bold text-[var(--error)]">{stripeError}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={restartStripeCheckout}
                                                disabled={isRestartingStripe}
                                                className="btn-primary px-5 disabled:opacity-50"
                                            >
                                                {isRestartingStripe ? 'กำลังเปิด Stripe' : 'ชำระเงินต่อ'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {order.status === 'PENDING' && order.paymentMethod !== 'CREDIT_CARD' && (
                                <div className="border-b border-[var(--border)] p-5">
                                    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-black">รอการชำระเงินผ่าน PromptPay</p>
                                            <p className="mt-1 text-sm text-[var(--text-muted)]">อัปโหลดสลิปหรือกลับไปหน้าชำระเงินของคำสั่งซื้อนี้</p>
                                        </div>
                                        <Link href={`/checkout/promptpay/${order.id}`} className="btn-primary px-5">
                                            ไปหน้าชำระเงิน
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
                            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm font-black uppercase text-[var(--primary)]">Game keys</p>
                                    <h2 className="text-2xl font-black">รายการสินค้า</h2>
                                </div>
                                <p className="text-sm text-[var(--text-muted)]">{order.orderItems.length} รายการ</p>
                            </div>

                            <div className="space-y-3">
                                {order.orderItems.map((item) => {
                                    const keyVisible = revealedKeys.has(item.id);

                                    return (
                                        <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-900 sm:w-32">
                                                    <img src={gameImage(item.game.imageUrl)} alt={item.game.title} className="h-full w-full object-cover" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 text-lg font-black">{item.game.title}</h3>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className={`badge ${getPlatformBadge(item.game.platform)}`}>{item.game.platform}</span>
                                                        <MoneyAmount value={item.price} size="sm" />
                                                    </div>
                                                </div>
                                            </div>

                                            {order.status === 'COMPLETED' && item.cdKey ? (
                                                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black uppercase text-[var(--text-muted)]">CD Key</p>
                                                            <button
                                                                onClick={() => toggleKeyReveal(item.id)}
                                                                className={`mt-1 block max-w-full break-all text-left font-mono text-lg font-black ${keyVisible ? 'text-[var(--success)]' : 'key-blur text-[var(--foreground)]'}`}
                                                            >
                                                                {item.cdKey.keyCode}
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={() => toggleKeyReveal(item.id)} className="btn-secondary px-4 text-sm">
                                                                {keyVisible ? 'ซ่อนคีย์' : 'แสดงคีย์'}
                                                            </button>
                                                            <button onClick={() => copyKey(item)} className="btn-primary px-4 text-sm">
                                                                {copiedKeyId === item.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : order.status === 'PENDING' ? (
                                                <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-bold text-[var(--warning)]">
                                                    คีย์จะแสดงหลังจากคำสั่งซื้อได้รับการยืนยัน
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-[var(--error)]">
                                                    คำสั่งซื้อไม่สำเร็จ จึงยังไม่มีคีย์สำหรับรายการนี้
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <aside className="h-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)] lg:sticky lg:top-24">
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Summary</p>
                        <h2 className="mt-1 text-2xl font-black">สรุปคำสั่งซื้อ</h2>

                        <dl className="mt-5 space-y-4">
                            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                                <dt className="text-sm text-[var(--text-muted)]">สถานะ</dt>
                                <dd><span className={`badge ${meta.badge}`}>{meta.label}</span></dd>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                                <dt className="text-sm text-[var(--text-muted)]">วิธีชำระเงิน</dt>
                                <dd className="font-black">{getPaymentLabel(order.paymentMethod)}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                                <dt className="text-sm text-[var(--text-muted)]">วันที่สั่งซื้อ</dt>
                                <dd className="text-right text-sm font-bold">{formatDateTime(order.createdAt)}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                                <dt className="text-sm text-[var(--text-muted)]">จำนวนสินค้า</dt>
                                <dd className="font-black">{order.orderItems.length}</dd>
                            </div>
                        </dl>

                        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                            <p className="text-xs font-black uppercase text-[var(--text-muted)]">ยอดรวม</p>
                            <div className="mt-2">
                                <MoneyAmount value={order.total} size="xl" />
                            </div>
                        </div>

                        <p className="mt-5 break-all font-mono text-xs text-[var(--text-muted)]">{order.id}</p>
                    </aside>
                </div>
            </main>
        </div>
    );
}
