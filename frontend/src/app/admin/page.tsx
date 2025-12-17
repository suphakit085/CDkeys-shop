'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, keysApi, SalesStats, KeyStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
    const { user, token, isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
    const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
    }, [user, isAdmin, authLoading, router]);

    const loadStats = async () => {
        if (!token) return;
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
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-700/50 rounded w-1/4" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="glass-card h-32" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Admin Dashboard
                </h1>
                <div className="flex gap-4">
                    <Link href="/admin/settings" className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 py-2 px-4 rounded-lg transition-colors">
                        ⚙️ ตั้งค่าร้าน
                    </Link>
                    <Link href="/admin/banners" className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-400 py-2 px-4 rounded-lg transition-colors">
                        🎠 จัดการแบนเนอร์
                    </Link>
                    <Link href="/admin/verify-payments" className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 py-2 px-4 rounded-lg transition-colors">
                        💳 ตรวจสอบชำระเงิน
                    </Link>
                    <Link href="/admin/games" className="btn-secondary py-2 px-4">
                        Manage Games
                    </Link>
                    <Link href="/admin/keys" className="btn-primary py-2 px-4">
                        Manage Keys
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-2">Total Revenue</div>
                    <div className="text-3xl font-bold text-green-400">
                        ${Number(salesStats?.totalRevenue || 0).toFixed(2)}
                    </div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-2">Completed Orders</div>
                    <div className="text-3xl font-bold text-purple-400">
                        {salesStats?.completedOrders || 0}
                    </div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-2">Available Keys</div>
                    <div className="text-3xl font-bold text-cyan-400">
                        {keyStats?.available || 0}
                    </div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-2">Keys Sold</div>
                    <div className="text-3xl font-bold text-orange-400">
                        {keyStats?.sold || 0}
                    </div>
                </div>
            </div>

            {/* Key Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Key Status Distribution</h2>
                    <div className="space-y-4">
                        {keyStats && (
                            <>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Available</span>
                                        <span className="text-green-400">{keyStats.available}</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{
                                                width: `${(keyStats.available / (keyStats.available + keyStats.reserved + keyStats.sold || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Reserved</span>
                                        <span className="text-yellow-400">{keyStats.reserved}</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full"
                                            style={{
                                                width: `${(keyStats.reserved / (keyStats.available + keyStats.reserved + keyStats.sold || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Sold</span>
                                        <span className="text-red-400">{keyStats.sold}</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{
                                                width: `${(keyStats.sold / (keyStats.available + keyStats.reserved + keyStats.sold || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Order Status</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-400">
                                {salesStats?.ordersByStatus?.completed || 0}
                            </div>
                            <div className="text-gray-400 text-sm">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-400">
                                {salesStats?.ordersByStatus?.pending || 0}
                            </div>
                            <div className="text-gray-400 text-sm">Pending</div>
                        </div>
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-400">
                                {salesStats?.ordersByStatus?.failed || 0}
                            </div>
                            <div className="text-gray-400 text-sm">Failed</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
                {salesStats?.recentOrders && salesStats.recentOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                    <th className="pb-3">Order ID</th>
                                    <th className="pb-3">Customer</th>
                                    <th className="pb-3">Items</th>
                                    <th className="pb-3">Total</th>
                                    <th className="pb-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesStats.recentOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-gray-800 text-sm">
                                        <td className="py-3 font-mono text-gray-300">{order.id.slice(0, 8)}...</td>
                                        <td className="py-3 text-white">{order.user?.email}</td>
                                        <td className="py-3 text-gray-400">
                                            {order.orderItems.map((i) => i.game.title).join(', ')}
                                        </td>
                                        <td className="py-3 text-green-400 font-bold">${Number(order.total).toFixed(2)}</td>
                                        <td className="py-3 text-gray-400">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">No orders yet</p>
                )}
            </div>
        </div>
    );
}
