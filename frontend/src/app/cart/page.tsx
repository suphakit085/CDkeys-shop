'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';

export default function CartPage() {
    const { items, total, updateQuantity, removeItem, clearCart } = useCart();
    const { user, token } = useAuth();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
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
            // Create order (reserves keys and generates QR code)
            const order = await ordersApi.create(
                items.map((item) => ({ gameId: item.game.id, quantity: item.quantity })),
                token
            );

            // Store order in localStorage for checkout page
            localStorage.setItem(`order_${order.id}`, JSON.stringify(order));

            // Clear cart and redirect to PromptPay checkout
            clearCart();
            router.push(`/checkout/promptpay/${order.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
            setIsCheckingOut(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6">🛒</div>
                <h1 className="text-3xl font-bold text-white mb-4">ตะกร้าว่างเปล่า</h1>
                <p className="text-gray-400 mb-8">เพิ่มเกมเพื่อเริ่มต้น!</p>
                <Link href="/store" className="btn-primary py-3 px-8">
                    เลือกซื้อสินค้า
                </Link>
            </div>
        );
    }


    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8">
                Shopping Cart
            </h1>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-4 mb-8">
                {items.map((item) => (
                    <div key={item.game.id} className="glass-card p-4 flex items-center gap-4">
                        <img
                            src={item.game.imageUrl || '/placeholder-game.jpg'}
                            alt={item.game.title}
                            className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                            <h3 className="font-bold text-white">{item.game.title}</h3>
                            <p className="text-gray-400 text-sm">{item.game.platform}</p>
                            <p className="text-purple-400 font-bold mt-1">${Number(item.game.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => updateQuantity(item.game.id, item.quantity - 1)}
                                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white"
                            >
                                -
                            </button>
                            <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.game.id, item.quantity + 1)}
                                disabled={item.quantity >= item.game.availableKeys}
                                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white disabled:opacity-50"
                            >
                                +
                            </button>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-bold">${(Number(item.game.price) * item.quantity).toFixed(2)}</p>
                            <button
                                onClick={() => removeItem(item.game.id)}
                                className="text-red-400 hover:text-red-300 text-sm mt-1"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">Subtotal ({items.length} items)</span>
                    <span className="text-white font-bold text-xl">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="text-green-400">FREE</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <span className="text-white font-bold text-xl">Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        ${total.toFixed(2)}
                    </span>
                </div>

                {!user ? (
                    <Link href="/login" className="btn-primary w-full py-4 block text-center">
                        เข้าสู่ระบบเพื่อชำระเงิน
                    </Link>
                ) : (
                    <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="btn-primary w-full py-4 disabled:opacity-50"
                    >
                        {isCheckingOut ? '⏳ กำลังสร้างคำสั่งซื้อ...' : '💳 ชำระเงินผ่าน PromptPay'}
                    </button>
                )}

                <p className="text-center text-gray-500 text-sm mt-4">
                    🔒 ระบบการชำระเงินที่ปลอดภัย - รองรับทุกธนาคาร
                </p>
            </div>
        </div>
    );
}
