'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, Order } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (token && id) {
            loadOrder();
        }
    }, [user, token, authLoading, id, router]);

    const loadOrder = async () => {
        if (!token) return;
        try {
            const data = await ordersApi.getOne(id, token);
            setOrder(data);
        } catch (error) {
            console.error('Failed to load order:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            COMPLETED: 'badge-available',
            PENDING: 'badge-reserved',
            FAILED: 'badge-sold',
        };
        return styles[status] || '';
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="animate-pulse glass-card h-96" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6">❌</div>
                <h1 className="text-3xl font-bold text-white mb-4">Order not found</h1>
                <Link href="/orders" className="btn-primary py-3 px-8">
                    Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href="/orders" className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2">
                ← Back to Orders
            </Link>

            <div className="glass-card p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Order Details</h1>
                        <p className="text-gray-400 font-mono text-sm mt-1">{order.id}</p>
                    </div>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                        {order.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <div>
                        <p className="text-gray-400 text-sm">Date</p>
                        <p className="text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Items</p>
                        <p className="text-white">{order.orderItems.length}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Payment</p>
                        <p className="text-white">Mock Payment</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Total</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                            ${Number(order.total).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">Your Game Keys</h2>

            <div className="space-y-4">
                {order.orderItems.map((item) => (
                    <div key={item.id} className="glass-card p-4">
                        <div className="flex items-center gap-4 mb-4">
                            <img
                                src={item.game.imageUrl || '/placeholder-game.jpg'}
                                alt={item.game.title}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{item.game.title}</h3>
                                <p className="text-gray-400 text-sm">{item.game.platform}</p>
                            </div>
                            <p className="text-white font-bold">${Number(item.price).toFixed(2)}</p>
                        </div>

                        {order.status === 'COMPLETED' && item.cdKey ? (
                            <div className="bg-gray-800/70 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-sm mb-1">CD Key</p>
                                        <p
                                            className={`font-mono text-lg cursor-pointer ${revealedKeys.has(item.id) ? 'text-green-400' : 'key-blur text-white'
                                                }`}
                                            onClick={() => toggleKeyReveal(item.id)}
                                        >
                                            {item.cdKey.keyCode}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleKeyReveal(item.id)}
                                            className="btn-secondary py-2 px-4 text-sm"
                                        >
                                            {revealedKeys.has(item.id) ? '🙈 Hide' : '👁 Reveal'}
                                        </button>
                                        <button
                                            onClick={() => copyKey(item.cdKey!.keyCode)}
                                            className="btn-primary py-2 px-4 text-sm"
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : order.status === 'PENDING' ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                                <p className="text-yellow-400">⏳ Payment pending - key will be available after payment</p>
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                                <p className="text-red-400">❌ Order failed - key not available</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
