'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { paymentApi, PendingPayment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/lib/config';

export default function VerifyPaymentsPage() {
    const { token, isAdmin, isLoading: authLoading } = useAuth();
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!authLoading && token && isAdmin) {
            loadPayments();
        }
    }, [token, authLoading, isAdmin]);

    const loadPayments = async () => {
        if (!token) return;
        try {
            const data = await paymentApi.getPending(token);
            setPayments(data);
        } catch (err) {
            console.error('Failed to load payments:', err);
            setError('ไม่สามารถโหลดรายการชำระเงินได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (orderId: string) => {
        if (!token) return;
        setActionLoading(orderId);
        setError('');
        setSuccess('');

        try {
            await paymentApi.verify(orderId, token);
            setSuccess(`อนุมัติคำสั่งซื้อ ${orderId.slice(0, 8)}... สำเร็จ`);
            loadPayments(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (orderId: string) => {
        if (!token) return;
        const reason = prompt('กรุณาระบุเหตุผลที่ปฏิเสธ:');
        if (!reason) return;

        setActionLoading(orderId);
        setError('');
        setSuccess('');

        try {
            await paymentApi.reject(orderId, reason, token);
            setSuccess(`ปฏิเสธคำสั่งซื้อ ${orderId.slice(0, 8)}... สำเร็จ`);
            loadPayments();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-700/50 rounded w-1/3" />
                    <div className="h-32 bg-gray-700/50 rounded-2xl" />
                    <div className="h-32 bg-gray-700/50 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6">🔒</div>
                <h1 className="text-2xl font-bold text-white mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
                <p className="text-gray-400 mb-8">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
                <Link href="/" className="btn-primary py-3 px-6">
                    กลับหน้าแรก
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    ตรวจสอบการชำระเงิน
                </h1>
                <button
                    onClick={loadPayments}
                    className="btn-secondary py-2 px-4 text-sm"
                >
                    🔄 รีเฟรช
                </button>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 text-green-400">
                    {success}
                </div>
            )}

            {payments.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        ไม่มีรายการรอตรวจสอบ
                    </h2>
                    <p className="text-gray-400">
                        รายการชำระเงินทั้งหมดได้รับการตรวจสอบแล้ว
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {payments.map((payment) => (
                        <div key={payment.id} className="glass-card p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Slip Image */}
                                <div className="lg:w-48">
                                    {payment.paymentSlipUrl ? (
                                        <a
                                            href={`${BACKEND_URL}${payment.paymentSlipUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <img
                                                src={`${BACKEND_URL}${payment.paymentSlipUrl}`}
                                                alt="Payment Slip"
                                                className="w-full rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
                                            />
                                            <p className="text-center text-sm text-gray-400 mt-2 hover:text-purple-400">
                                                คลิกเพื่อขยาย
                                            </p>
                                        </a>
                                    ) : (
                                        <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                                            <div className="text-3xl mb-2">📷</div>
                                            <p className="text-gray-500 text-sm">ไม่มีรูปภาพ</p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-white">
                                                คำสั่งซื้อ #{payment.id.slice(0, 8)}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {payment.user.name} ({payment.user.email})
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                {new Date(payment.createdAt).toLocaleString('th-TH')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-white">
                                                ฿{Number(payment.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded mt-1">
                                                รอตรวจสอบ
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                                        <p className="text-gray-400 text-sm mb-2">สินค้า:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {payment.orderItems.map((item) => (
                                                <span key={item.id} className="text-white text-sm bg-gray-700 px-2 py-1 rounded">
                                                    {item.game.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleVerify(payment.id)}
                                            disabled={actionLoading === payment.id}
                                            className="btn-primary py-2 px-6 flex-1 disabled:opacity-50"
                                        >
                                            {actionLoading === payment.id ? '⏳' : '✅'} อนุมัติ
                                        </button>
                                        <button
                                            onClick={() => handleReject(payment.id)}
                                            disabled={actionLoading === payment.id}
                                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 py-2 px-6 rounded-lg flex-1 disabled:opacity-50 transition-colors"
                                        >
                                            {actionLoading === payment.id ? '⏳' : '❌'} ปฏิเสธ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
