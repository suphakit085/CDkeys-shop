'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, Order } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdersPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (token) {
            loadOrders();
        }
    }, [user, token, authLoading, router]);

    const loadOrders = async () => {
        if (!token) return;
        try {
            const data = await ordersApi.getMy(token);
            setOrders(data);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
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
                <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass-card h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6">📦</div>
                <h1 className="text-3xl font-bold text-white mb-4">No orders yet</h1>
                <p className="text-gray-400 mb-8">Start shopping to see your orders here!</p>
                <Link href="/store" className="btn-primary py-3 px-8">
                    Browse Store
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8">
                My Orders
            </h1>

            <div className="space-y-4">
                {orders.map((order) => (
                    <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block glass-card p-6 hover:border-purple-500/50 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-gray-400 text-sm">Order ID</p>
                                <p className="text-white font-mono text-sm">{order.id.slice(0, 8)}...</p>
                            </div>
                            <span className={`badge ${getStatusBadge(order.status)}`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            {order.orderItems.slice(0, 4).map((item, index) => (
                                <img
                                    key={index}
                                    src={item.game.imageUrl || '/placeholder-game.jpg'}
                                    alt={item.game.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                            ))}
                            {order.orderItems.length > 4 && (
                                <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                                    +{order.orderItems.length - 4}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString()} •{' '}
                                {order.orderItems.length} items
                            </span>
                            <span className="text-white font-bold">${Number(order.total).toFixed(2)}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
