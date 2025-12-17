'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gamesApi, keysApi, Game, CdKey } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminKeys() {
    const { user, token, isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>('');
    const [keys, setKeys] = useState<CdKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bulkKeys, setBulkKeys] = useState('');
    const [addResult, setAddResult] = useState<{ added: number; duplicates: number } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading) {
            if (!user || !isAdmin) {
                router.push('/');
                return;
            }
            loadGames();
        }
    }, [user, isAdmin, authLoading, router]);

    useEffect(() => {
        if (selectedGame && token) {
            loadKeys();
        }
    }, [selectedGame, token]);

    const loadGames = async () => {
        try {
            const data = await gamesApi.getAll();
            setGames(data);
            if (data.length > 0) {
                setSelectedGame(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load games:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadKeys = async () => {
        if (!token || !selectedGame) return;
        try {
            const data = await keysApi.getByGame(selectedGame, token);
            setKeys(data);
        } catch (err) {
            console.error('Failed to load keys:', err);
        }
    };

    const handleBulkAdd = async () => {
        if (!token || !selectedGame || !bulkKeys.trim()) return;
        setError('');

        const keyList = bulkKeys
            .split(/[\n,]/)
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        if (keyList.length === 0) return;

        try {
            const result = await keysApi.addKeys({ gameId: selectedGame, keys: keyList }, token);
            setAddResult(result);
            setBulkKeys('');
            await loadKeys();
        } catch (err) {
            console.error('Failed to add keys:', err);
            setError(err instanceof Error ? err.message : 'เพิ่ม keys ล้มเหลว');
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!token || !confirm('ลบ key นี้?')) return;
        setError('');
        try {
            await keysApi.delete(keyId, token);
            await loadKeys();
        } catch (err) {
            console.error('Failed to delete key:', err);
            setError(err instanceof Error ? err.message : 'ลบ key ล้มเหลว');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            AVAILABLE: 'badge-available',
            RESERVED: 'badge-reserved',
            SOLD: 'badge-sold',
        };
        return styles[status] || '';
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse glass-card h-96" />
            </div>
        );
    }

    const selectedGameData = games.find((g) => g.id === selectedGame);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">จัดการ CD Keys</h1>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {/* Game Selector */}
            <div className="glass-card p-6 mb-8">
                <label className="block text-sm text-gray-300 mb-2">เลือกเกม</label>
                <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                    className="input max-w-md"
                >
                    {games.map((game) => (
                        <option key={game.id} value={game.id}>
                            {game.title} ({game.platform}) - {game.availableKeys} available
                        </option>
                    ))}
                </select>
            </div>

            {/* Bulk Add Keys */}
            <div className="glass-card p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Add Keys (Bulk Upload)</h2>
                <p className="text-gray-400 text-sm mb-4">
                    Paste keys below (one per line or comma-separated)
                </p>
                <textarea
                    value={bulkKeys}
                    onChange={(e) => setBulkKeys(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY\n..."
                    className="input min-h-[150px] font-mono text-sm mb-4"
                />
                <div className="flex items-center gap-4">
                    <button onClick={handleBulkAdd} className="btn-primary py-2 px-6">
                        Add Keys to {selectedGameData?.title}
                    </button>
                    {addResult && (
                        <span className="text-green-400">
                            ✓ Added {addResult.added} keys ({addResult.duplicates} duplicates skipped)
                        </span>
                    )}
                </div>
            </div>

            {/* Keys List */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">
                        Keys for {selectedGameData?.title} ({keys.length} total)
                    </h2>
                    <div className="flex gap-2 text-sm">
                        <span className="badge badge-available">{keys.filter((k) => k.status === 'AVAILABLE').length} Available</span>
                        <span className="badge badge-reserved">{keys.filter((k) => k.status === 'RESERVED').length} Reserved</span>
                        <span className="badge badge-sold">{keys.filter((k) => k.status === 'SOLD').length} Sold</span>
                    </div>
                </div>

                {keys.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                    <th className="pb-3">Key Code</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Buyer</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map((key) => (
                                    <tr key={key.id} className="border-b border-gray-800 text-sm">
                                        <td className="py-3 font-mono text-white">{key.keyCode}</td>
                                        <td className="py-3">
                                            <span className={`badge ${getStatusBadge(key.status)}`}>
                                                {key.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-400">
                                            {key.orderItem?.order?.user?.email || '-'}
                                        </td>
                                        <td className="py-3">
                                            {key.status === 'AVAILABLE' && (
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">No keys yet. Add some above!</p>
                )}
            </div>
        </div>
    );
}
