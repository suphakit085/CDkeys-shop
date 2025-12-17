'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, paymentApi, Order } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PromptPayCheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params);
    const { token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [autoVerified, setAutoVerified] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && orderId) {
            loadOrder();
        }
    }, [token, authLoading, orderId]);

    const loadOrder = async () => {
        // First try to get from localStorage (cached during checkout)
        const cached = localStorage.getItem(`order_${orderId}`);
        if (cached) {
            try {
                const cachedOrder = JSON.parse(cached);
                setOrder(cachedOrder);
                setIsLoading(false);
                // Clean up after use
                localStorage.removeItem(`order_${orderId}`);
                return;
            } catch {
                // Invalid cache, continue to API
            }
        }

        // Fallback to API
        if (!token) {
            setError('กรุณาเข้าสู่ระบบ');
            setIsLoading(false);
            return;
        }

        try {
            const data = await ordersApi.getOne(orderId, token);
            setOrder(data);
        } catch (err) {
            console.error('Failed to load order:', err);
            setError('ไม่พบรายการสั่งซื้อ หรือ session หมดอายุ กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
                setError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleUploadSlip = async () => {
        if (!selectedFile || !token || !orderId) return;

        setIsUploading(true);
        setError('');

        try {
            const result = await paymentApi.uploadSlip(orderId, selectedFile, token);
            setUploadSuccess(true);
            // Store auto-verified status in state
            if (result.autoVerified) {
                setAutoVerified(true);
                setVerifyMessage(result.message);
            } else {
                setVerifyMessage(result.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'อัปโหลดล้มเหลว');
        } finally {
            setIsUploading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-700/50 rounded w-1/2 mx-auto" />
                    <div className="h-64 bg-gray-700/50 rounded-2xl" />
                    <div className="h-12 bg-gray-700/50 rounded" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6">❌</div>
                <h1 className="text-2xl font-bold text-white mb-4">{error || 'ไม่พบรายการสั่งซื้อ'}</h1>
                <Link href="/orders" className="btn-primary py-3 px-6">
                    กลับไปหน้าคำสั่งซื้อ
                </Link>
            </div>
        );
    }

    if (uploadSuccess) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="glass-card p-10">
                    <div className="text-6xl mb-6">{autoVerified ? '🎉' : '⏳'}</div>
                    <h1 className="text-2xl font-bold text-white mb-4">
                        {autoVerified ? 'ชำระเงินสำเร็จ!' : 'อัปโหลดสลิปสำเร็จ!'}
                    </h1>
                    <p className="text-gray-400 mb-8">
                        {autoVerified ? (
                            <>
                                {verifyMessage}<br />
                                <span className="text-green-400">CD Keys พร้อมใช้งานแล้ว!</span>
                            </>
                        ) : (
                            <>
                                {verifyMessage || 'กรุณารอการตรวจสอบจากระบบ (5-15 นาที)'}<br />
                                เมื่อชำระเงินสำเร็จ คุณจะได้รับ CD Key ทันที
                            </>
                        )}
                    </p>
                    <Link href={`/orders/${orderId}`} className="btn-primary py-3 px-8">
                        {autoVerified ? 'ดู CD Keys ของคุณ' : 'ดูสถานะคำสั่งซื้อ'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                ชำระเงินผ่าน PromptPay
            </h1>

            <div className="glass-card p-6 mb-6">
                {/* QR Code */}
                {order.qrCodeData && (
                    <div className="text-center mb-6">
                        <img
                            src={order.qrCodeData}
                            alt="PromptPay QR Code"
                            className="w-64 h-64 mx-auto bg-white p-4 rounded-xl"
                        />
                    </div>
                )}

                {/* Amount */}
                <div className="text-center mb-6">
                    <p className="text-gray-400 mb-2">ยอดชำระ</p>
                    <p className="text-4xl font-bold text-white">
                        ฿{Number(order.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Instructions */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-white mb-3">ขั้นตอนการชำระเงิน:</h3>
                    <ol className="text-gray-300 text-sm space-y-2">
                        <li>1. สแกน QR Code ด้วยแอปพลิเคชันธนาคารของคุณ</li>
                        <li>2. ตรวจสอบยอดเงินให้ถูกต้อง</li>
                        <li>3. กดยืนยันการโอนเงิน</li>
                        <li>4. ถ่ายภาพหน้าจอหลักฐานการโอนเงิน (Slip)</li>
                        <li>5. กดปุ่ม "อัปโหลดหลักฐาน" ด้านล่าง</li>
                    </ol>
                </div>
            </div>

            {/* Upload Section */}
            <div className="glass-card p-6">
                <h3 className="font-bold text-white mb-4 text-center">อัปโหลดหลักฐานการโอนเงิน</h3>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {previewUrl ? (
                    <div className="mb-4">
                        <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                        <button
                            onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                            }}
                            className="text-red-400 text-sm mt-2 block mx-auto hover:underline"
                        >
                            ลบและเลือกใหม่
                        </button>
                    </div>
                ) : (
                    <label className="block cursor-pointer mb-4">
                        <div className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-xl p-8 text-center transition-colors">
                            <div className="text-4xl mb-3">📷</div>
                            <p className="text-gray-400">คลิกเพื่อเลือกรูปภาพ</p>
                            <p className="text-gray-500 text-sm mt-1">(JPG, PNG, WEBP สูงสุด 5MB)</p>
                        </div>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </label>
                )}

                <button
                    onClick={handleUploadSlip}
                    disabled={!selectedFile || isUploading}
                    className={`btn-primary w-full py-4 text-lg ${!selectedFile || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {isUploading ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดหลักฐาน'}
                </button>
            </div>

            {/* Order Items */}
            <div className="glass-card p-6 mt-6">
                <h3 className="font-bold text-white mb-4">รายการสินค้า</h3>
                <div className="space-y-3">
                    {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                            <img
                                src={item.game.imageUrl || '/placeholder-game.jpg'}
                                alt={item.game.title}
                                className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                                <p className="text-white text-sm">{item.game.title}</p>
                                <p className="text-gray-400 text-xs">{item.game.platform}</p>
                            </div>
                            <p className="text-white">฿{Number(item.price).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
