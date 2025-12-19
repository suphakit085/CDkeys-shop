'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gamesApi, Game, Platform, CreateGameDto } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/config';

const platforms: Platform[] = ['STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'ORIGIN', 'UPLAY', 'EPIC'];

export default function AdminGames() {
    const { user, token, isAdmin, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState<CreateGameDto>({
        title: '',
        description: '',
        platform: 'STEAM',
        genre: '',
        price: 0,
        imageUrl: '',
    });

    useEffect(() => {
        if (!authLoading) {
            if (!user || !isAdmin) {
                router.push('/');
                return;
            }
            loadGames();
        }
    }, [user, isAdmin, authLoading, router]);

    const loadGames = async () => {
        try {
            const data = await gamesApi.getAll();
            setGames(data);
        } catch (error) {
            console.error('Failed to load games:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            if (editingGame) {
                await gamesApi.update(editingGame.id, formData, token);
            } else {
                await gamesApi.create(formData, token);
            }
            await loadGames();
            resetForm();
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!token || !confirm('Delete this game?')) return;
        try {
            await gamesApi.delete(id, token);
            await loadGames();
        } catch (error) {
            console.error('Failed to delete game:', error);
        }
    };

    const startEdit = (game: Game) => {
        setEditingGame(game);
        setFormData({
            title: game.title,
            description: game.description || '',
            platform: game.platform,
            genre: game.genre,
            price: game.price,
            imageUrl: game.imageUrl || '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingGame(null);
        setFormData({
            title: '',
            description: '',
            platform: 'STEAM',
            genre: '',
            price: 0,
            imageUrl: '',
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);

            const response = await fetch(`${API_URL}/upload/image?folder=games`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
            });

            if (response.ok) {
                const data = await response.json();
                setFormData(prev => ({ ...prev, imageUrl: data.url }));
            } else {
                alert('อัพโหลดรูปภาพไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('เกิดข้อผิดพลาดในการอัพโหลด');
        } finally {
            setUploading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="glass-card h-24" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Manage Games</h1>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 px-4">
                    {showForm ? 'Cancel' : '+ Add Game'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-card p-6 mb-8 space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4">
                        {editingGame ? 'Edit Game' : 'New Game'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Platform</label>
                            <select
                                value={formData.platform}
                                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                                className="input"
                            >
                                {platforms.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Genre</label>
                            <input
                                type="text"
                                value={formData.genre}
                                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.price || ''}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="input"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-300 mb-1">รูปภาพเกม</label>
                            <div className="flex gap-4 items-start">
                                {/* Preview */}
                                <div className="w-32 h-32 rounded-lg bg-gray-700/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">🎮</span>
                                    )}
                                </div>
                                {/* Upload & URL */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={formData.imageUrl}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="input flex-1"
                                            placeholder="URL รูปภาพ หรือกดอัพโหลด"
                                        />
                                        <label className="btn-secondary py-2 px-4 cursor-pointer whitespace-nowrap">
                                            {uploading ? '⏳...' : '📤 อัพโหลด'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">รองรับไฟล์ JPG, PNG, GIF, WebP ขนาดไม่เกิน 5MB</p>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-300 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input min-h-[100px]"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button type="submit" className="btn-primary py-2 px-6">
                            {editingGame ? 'Update Game' : 'Create Game'}
                        </button>
                        {editingGame && (
                            <button type="button" onClick={resetForm} className="btn-secondary py-2 px-6">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {games.map((game) => (
                    <div key={game.id} className="glass-card p-4 flex items-center gap-4">
                        <img
                            src={game.imageUrl || '/placeholder-game.jpg'}
                            alt={game.title}
                            className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                            <h3 className="font-bold text-white">{game.title}</h3>
                            <p className="text-gray-400 text-sm">{game.platform} • {game.genre}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-green-400 font-bold">${Number(game.price).toFixed(2)}</p>
                            <p className="text-gray-500 text-sm">{game.availableKeys} keys</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => startEdit(game)} className="btn-secondary py-1 px-3 text-sm">
                                Edit
                            </button>
                            <button onClick={() => handleDelete(game.id)} className="btn-secondary py-1 px-3 text-sm text-red-400 border-red-500/50 hover:bg-red-500/10">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
