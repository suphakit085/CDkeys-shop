/* eslint-disable @next/next/no-img-element -- Checkout uses QR data URLs, slip previews, and remote game artwork. */
'use client';

import { useCallback, useEffect, useMemo, useState, use, type ChangeEvent } from 'react';
import Link from 'next/link';
import MoneyAmount from '@/components/MoneyAmount';
import { useAuth } from '@/contexts/AuthContext';
import { getUploadUrl } from '@/lib/config';
import { formatMoney } from '@/lib/currency';
import { ordersApi, paymentApi, type Order, type OrderItem, type PaymentMethod } from '@/lib/api';

type CheckoutAction = 'upload' | 'stripe' | 'promptpay' | 'cancel' | null;

const paymentLabels: Record<PaymentMethod, string> = {
  PROMPTPAY: 'PromptPay',
  CREDIT_CARD: 'Stripe Card',
};

const uploadMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const uploadExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

function shortOrderId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function gameImage(url?: string) {
  return url ? getUploadUrl(url) : '/placeholder-game.jpg';
}

function isValidSlipFile(file: File) {
  const name = file.name.toLowerCase();
  return uploadMimeTypes.has(file.type) || uploadExtensions.some((extension) => name.endsWith(extension));
}

function paymentStatusLabel(order: Order) {
  if (order.status === 'COMPLETED') return 'ชำระเงินสำเร็จ';
  if (order.status === 'CANCELLED') return 'ยกเลิกแล้ว';
  if (order.paymentStatus === 'SLIP_UPLOADED') return 'รอตรวจสลิป';
  if (order.paymentStatus === 'REJECTED') return 'ไม่สำเร็จ';
  return 'รอชำระเงิน';
}

export default function PromptPayCheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { token, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<CheckoutAction>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isBusy = action !== null;
  const canModifyOrder = order?.status === 'PENDING' && order.paymentStatus === 'PENDING';
  const isPromptPay = order?.paymentMethod !== 'CREDIT_CARD';

  const loadOrder = useCallback(async () => {
    if (authLoading) return;

    const cached = localStorage.getItem(`order_${orderId}`);
    if (cached) {
      try {
        setOrder(JSON.parse(cached) as Order);
        localStorage.removeItem(`order_${orderId}`);
      } catch {
        localStorage.removeItem(`order_${orderId}`);
      }
    }

    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อนดูคำสั่งซื้อ');
      setIsLoading(false);
      return;
    }

    try {
      const data = await ordersApi.getOne(orderId, token);
      setOrder(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบคำสั่งซื้อนี้');
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, orderId, token]);

  const refreshOrder = useCallback(async () => {
    if (!token) return;
    const data = await ordersApi.getOne(orderId, token);
    setOrder(data);
  }, [orderId, token]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const orderTotal = useMemo(() => Number(order?.total || 0), [order]);

  const selectSlip = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidSlipFile(file)) {
      setError('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WEBP, AVIF หรือ GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกินไป ขนาดสูงสุดคือ 5MB');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNotice('');
    setError('');
  };

  const clearSelectedSlip = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const uploadSlip = async () => {
    if (!selectedFile || !token || !order || !canModifyOrder || !isPromptPay) return;

    setAction('upload');
    setNotice('');
    setError('');

    try {
      const result = await paymentApi.uploadSlip(order.id, selectedFile, token);
      clearSelectedSlip();
      setNotice(result.message || 'อัปโหลดสลิปสำเร็จ');
      await refreshOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดสลิปไม่สำเร็จ');
    } finally {
      setAction(null);
    }
  };

  const changePaymentMethod = async (method: PaymentMethod) => {
    if (!token || !order || !canModifyOrder) return;

    setAction(method === 'CREDIT_CARD' ? 'stripe' : 'promptpay');
    setNotice('');
    setError('');

    try {
      const updated = await ordersApi.changePaymentMethod(order.id, method, token);
      setOrder(updated);

      if (method === 'CREDIT_CARD') {
        const checkout = await paymentApi.createStripeCheckout(order.id, token);
        window.location.href = checkout.url;
        return;
      }

      setNotice('เปลี่ยนเป็น PromptPay แล้ว สามารถสแกน QR และอัปโหลดสลิปได้เลย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนวิธีชำระเงินไม่สำเร็จ');
    } finally {
      setAction(null);
    }
  };

  const cancelOrder = async () => {
    if (!token || !order || !canModifyOrder) return;

    const confirmed = window.confirm('ยกเลิกคำสั่งซื้อนี้หรือไม่? คีย์ที่จองไว้จะถูกปล่อยกลับเข้าสต็อก');
    if (!confirmed) return;

    setAction('cancel');
    setNotice('');
    setError('');

    try {
      const cancelled = await ordersApi.cancel(order.id, token);
      setOrder(cancelled);
      clearSelectedSlip();
      setNotice('ยกเลิกคำสั่งซื้อแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ยกเลิกคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setAction(null);
    }
  };

  if (authLoading || isLoading) {
    return <CheckoutSkeleton />;
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--body-background)] py-16 text-[var(--foreground)]">
        <section className="page-shell">
          <div className="surface mx-auto max-w-xl p-8 text-center">
            <p className="admin-eyebrow">Checkout</p>
            <h1 className="mt-2 text-3xl font-black">ไม่พบคำสั่งซื้อนี้</h1>
            <p className="mt-3 text-[var(--text-muted)]">{error || 'กรุณากลับไปตรวจสอบรายการคำสั่งซื้อของคุณ'}</p>
            <Link href="/orders" className="btn-primary mt-7 inline-flex px-7">
              ไปหน้าคำสั่งซื้อ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--body-background)] py-8 text-[var(--foreground)]">
      <section className="page-shell">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--text-muted)]">
              <Link href="/cart" className="hover:text-[var(--foreground)]">ตะกร้า</Link>
              <span>/</span>
              <Link href={`/orders/${order.id}`} className="hover:text-[var(--foreground)]">{shortOrderId(order.id)}</Link>
            </div>
            <p className="admin-eyebrow mt-5">Secure Checkout</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">ชำระเงินคำสั่งซื้อ</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              เลือกช่องทางชำระเงิน ตรวจยอด แล้วส่งหลักฐานเพื่อปลดล็อก CD Key หลังยืนยันยอด
            </p>
          </div>

          <div className="surface flex items-center justify-between gap-5 px-5 py-4 lg:min-w-72">
            <div>
              <p className="text-xs font-black uppercase text-[var(--text-muted)]">ยอดชำระ</p>
              <div className="mt-1">
                <MoneyAmount value={orderTotal} size="lg" />
              </div>
            </div>
            <span className={`badge ${order.status === 'COMPLETED' ? 'badge-available' : order.status === 'FAILED' || order.status === 'CANCELLED' ? 'badge-sold' : 'badge-reserved'}`}>
              {paymentStatusLabel(order)}
            </span>
          </div>
        </div>

        {notice && <div className="admin-notice admin-notice-success mb-5">{notice}</div>}
        {error && <div className="admin-notice admin-notice-error mb-5">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-5">
            <div className="surface overflow-hidden">
              <div className="border-b border-[var(--border)] p-5">
                <p className="admin-eyebrow">Payment Method</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PaymentMethodCard
                    title="PromptPay"
                    description="สแกน QR และอัปโหลดสลิป"
                    selected={isPromptPay}
                    disabled={!canModifyOrder || isBusy}
                    loading={action === 'promptpay'}
                    onClick={() => changePaymentMethod('PROMPTPAY')}
                  />
                  <PaymentMethodCard
                    title="Stripe Card"
                    description="บัตรเครดิต/เดบิตผ่าน Stripe"
                    selected={!isPromptPay}
                    disabled={!canModifyOrder || isBusy}
                    loading={action === 'stripe'}
                    onClick={() => changePaymentMethod('CREDIT_CARD')}
                  />
                </div>
              </div>

              {canModifyOrder && isPromptPay ? (
                <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-5 xl:border-b-0 xl:border-r">
                    <div className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
                      {order.qrCodeData ? (
                        <img
                          src={order.qrCodeData}
                          alt="PromptPay QR Code"
                          className="mx-auto aspect-square w-full max-w-72 object-contain"
                        />
                      ) : (
                        <div className="grid aspect-square place-items-center rounded-lg bg-slate-100 text-center text-sm font-bold text-slate-500">
                          ยังไม่มี QR Code
                        </div>
                      )}
                    </div>
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                      <p className="text-xs font-black uppercase text-[var(--text-muted)]">PromptPay Amount</p>
                      <div className="mt-2 flex justify-center">
                        <MoneyAmount value={order.total} size="xl" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['สแกน QR', 'ตรวจยอด', 'ส่งสลิป'].map((label, index) => (
                        <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)] text-sm font-black text-[var(--primary-foreground)]">
                            {index + 1}
                          </span>
                          <p className="mt-3 font-black">{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-black text-[var(--foreground)]">อัปโหลดหลักฐานการโอน</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        รองรับ JPG, PNG, WEBP, AVIF และ GIF ขนาดไม่เกิน 5MB
                      </p>

                      {previewUrl ? (
                        <div className="mt-4 grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
                          <img src={previewUrl} alt="ตัวอย่างสลิป" className="max-h-44 w-full rounded-lg object-contain bg-black/10" />
                          <div>
                            <p className="font-black">{selectedFile?.name}</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button onClick={uploadSlip} disabled={isBusy} className="btn-primary px-5 disabled:opacity-50">
                                {action === 'upload' ? 'กำลังอัปโหลด...' : 'ส่งสลิป'}
                              </button>
                              <button onClick={clearSelectedSlip} disabled={isBusy} className="btn-secondary px-5 disabled:opacity-50">
                                เลือกใหม่
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="mt-4 block cursor-pointer rounded-lg border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-8 text-center transition hover:border-[var(--primary)]">
                          <span className="block text-lg font-black text-[var(--foreground)]">เลือกไฟล์สลิป</span>
                          <span className="mt-2 block text-sm text-[var(--text-muted)]">ลากไฟล์มาวางหรือคลิกเพื่อเลือกจากเครื่อง</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
                            onChange={selectSlip}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <CheckoutStatePanel
                  order={order}
                  isBusy={isBusy}
                  action={action}
                  onUsePromptPay={() => changePaymentMethod('PROMPTPAY')}
                  onUseStripe={() => changePaymentMethod('CREDIT_CARD')}
                />
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="surface p-5">
              <p className="admin-eyebrow">Order Summary</p>
              <div className="mt-4 space-y-4">
                <SummaryRow label="Order ID" value={shortOrderId(order.id)} />
                <SummaryRow label="วิธีชำระเงิน" value={paymentLabels[order.paymentMethod || 'PROMPTPAY']} />
                <SummaryRow label="สถานะ" value={paymentStatusLabel(order)} />
                <SummaryRow label="จำนวนสินค้า" value={`${order.orderItems.length} รายการ`} />
              </div>
              <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="font-black">ยอดรวม</span>
                  <MoneyAmount value={order.total} size="lg" align="right" />
                </div>
              </div>

              {canModifyOrder ? (
                <button
                  onClick={cancelOrder}
                  disabled={isBusy}
                  className="mt-4 w-full rounded-lg border border-red-400/40 px-5 py-3 font-black text-[var(--error)] transition hover:bg-red-400/10 disabled:opacity-50"
                >
                  {action === 'cancel' ? 'กำลังยกเลิก...' : 'ยกเลิกคำสั่งซื้อ'}
                </button>
              ) : (
                <Link href={`/orders/${order.id}`} className="btn-secondary mt-4 w-full px-5">
                  ดูรายละเอียดคำสั่งซื้อ
                </Link>
              )}
            </div>

            <div className="surface p-5">
              <p className="admin-eyebrow">Items</p>
              <div className="mt-4 space-y-3">
                {order.orderItems.map((item) => (
                  <OrderLine key={item.id} item={item} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PaymentMethodCard({
  title,
  description,
  selected,
  disabled,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || selected}
      className={`rounded-lg border p-4 text-left transition ${
        selected
          ? 'border-[var(--primary)] bg-teal-400/10'
          : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--primary)]'
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="text-lg font-black">{title}</span>
        <span className={`badge ${selected ? 'badge-available' : 'badge-epic'}`}>
          {loading ? 'กำลังเปลี่ยน' : selected ? 'เลือกอยู่' : 'เลือก'}
        </span>
      </span>
      <span className="mt-2 block text-sm text-[var(--text-muted)]">{description}</span>
    </button>
  );
}

function CheckoutStatePanel({
  order,
  isBusy,
  action,
  onUsePromptPay,
  onUseStripe,
}: {
  order: Order;
  isBusy: boolean;
  action: CheckoutAction;
  onUsePromptPay: () => void;
  onUseStripe: () => void;
}) {
  const canModify = order.status === 'PENDING' && order.paymentStatus === 'PENDING';
  const isCancelled = order.status === 'CANCELLED';

  if (order.status === 'COMPLETED') {
    return (
      <div className="p-8 text-center">
        <p className="admin-eyebrow">Completed</p>
        <h2 className="mt-2 text-3xl font-black">ชำระเงินสำเร็จแล้ว</h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">CD Key พร้อมดูได้จากหน้ารายละเอียดคำสั่งซื้อ</p>
        <Link href={`/orders/${order.id}`} className="btn-primary mt-7 inline-flex px-7">ดู CD Key</Link>
      </div>
    );
  }

  if (isCancelled || order.status === 'FAILED') {
    return (
      <div className="p-8 text-center">
        <p className="admin-eyebrow">Order Closed</p>
        <h2 className="mt-2 text-3xl font-black">{isCancelled ? 'คำสั่งซื้อถูกยกเลิกแล้ว' : 'คำสั่งซื้อไม่สำเร็จ'}</h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">สามารถกลับไปเลือกเกมและสร้างคำสั่งซื้อใหม่ได้</p>
        <Link href="/store" className="btn-primary mt-7 inline-flex px-7">เลือกเกมเพิ่ม</Link>
      </div>
    );
  }

  if (order.paymentStatus === 'SLIP_UPLOADED') {
    return (
      <div className="p-8 text-center">
        <p className="admin-eyebrow">Reviewing Slip</p>
        <h2 className="mt-2 text-3xl font-black">ส่งสลิปแล้ว รอตรวจสอบ</h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">หลังตรวจสอบสำเร็จ ระบบจะแสดง CD Key ในหน้าคำสั่งซื้อ</p>
        <Link href={`/orders/${order.id}`} className="btn-secondary mt-7 inline-flex px-7">ดูสถานะคำสั่งซื้อ</Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-5">
        <p className="text-sm font-black uppercase text-[var(--primary)]">Stripe Checkout</p>
        <h2 className="mt-2 text-2xl font-black">คำสั่งซื้อนี้ตั้งเป็น Stripe Card</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          กดชำระผ่าน Stripe ต่อ หรือเปลี่ยนกลับมาใช้ PromptPay ได้ตราบใดที่ยังไม่ได้ส่งยอดชำระ
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={onUseStripe} disabled={!canModify || isBusy} className="btn-primary px-5 disabled:opacity-50">
            {action === 'stripe' ? 'กำลังเปิด Stripe...' : 'ไปชำระผ่าน Stripe'}
          </button>
          <button onClick={onUsePromptPay} disabled={!canModify || isBusy} className="btn-secondary px-5 disabled:opacity-50">
            {action === 'promptpay' ? 'กำลังเปลี่ยน...' : 'เปลี่ยนเป็น PromptPay'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}

function OrderLine({ item }: { item: OrderItem }) {
  return (
    <article className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <img src={gameImage(item.game.imageUrl)} alt={item.game.title} className="aspect-video h-full w-full rounded-md object-cover" />
      <div className="min-w-0">
        <h3 className="line-clamp-2 font-black">{item.game.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="badge badge-steam">{item.game.platform}</span>
          <span className="text-sm font-black">{formatMoney(item.price)}</span>
        </div>
      </div>
    </article>
  );
}

function CheckoutSkeleton() {
  return (
    <main className="min-h-screen bg-[var(--body-background)] py-8">
      <section className="page-shell animate-pulse">
        <div className="mb-6 h-28 rounded-lg bg-[var(--surface)]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="h-[560px] rounded-lg bg-[var(--surface)]" />
          <div className="h-[460px] rounded-lg bg-[var(--surface)]" />
        </div>
      </section>
    </main>
  );
}
