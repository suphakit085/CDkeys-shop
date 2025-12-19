'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { gamesApi, Game, Platform } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import GameCard from '@/components/GameCard';

const platformStyles: Record<Platform, string> = {
    STEAM: 'badge-steam',
    PLAYSTATION: 'badge-playstation',
    XBOX: 'badge-xbox',
    NINTENDO: 'badge-nintendo',
    ORIGIN: 'badge-origin',
    UPLAY: 'badge-uplay',
    EPIC: 'badge-epic',
};

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { addItem, items } = useCart();
    const [game, setGame] = useState<Game | null>(null);
    const [relatedGames, setRelatedGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    const cartItem = items.find((item) => item.game.id === id);
    const inCartQty = cartItem?.quantity || 0;

    useEffect(() => {
        if (id) {
            loadGame();
        }
    }, [id]);

    const loadGame = async () => {
        try {
            const data = await gamesApi.getOne(id);
            setGame(data);
            // Load related games
            loadRelatedGames(data);
        } catch (error) {
            console.error('Failed to load game:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRelatedGames = async (currentGame: Game) => {
        try {
            // Get games from same platform or genre
            const [samePlatform, sameGenre] = await Promise.all([
                gamesApi.getAll({ platform: currentGame.platform }),
                gamesApi.getAll({ genre: currentGame.genre }),
            ]);

            // Combine and deduplicate, exclude current game
            const combined = [...samePlatform, ...sameGenre];
            const unique = combined.filter((g, index, self) =>
                g.id !== currentGame.id &&
                self.findIndex(t => t.id === g.id) === index
            ).slice(0, 4); // Show max 4 games

            setRelatedGames(unique);
        } catch (error) {
            console.error('Failed to load related games:', error);
        }
    };

    const handleAddToCart = () => {
        if (!game) return;
        for (let i = 0; i < quantity; i++) {
            addItem(game);
        }
        setQuantity(1);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700/50 rounded w-1/4 mb-8" />
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 h-96 bg-gray-700/50 rounded-2xl" />
                        <div className="space-y-4">
                            <div className="h-10 bg-gray-700/50 rounded w-3/4" />
                            <div className="h-6 bg-gray-700/50 rounded w-1/4" />
                            <div className="h-32 bg-gray-700/50 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="text-6xl mb-6"></div>
                <h1 className="text-3xl font-bold text-white mb-4">Game not found</h1>
                <p className="text-gray-400 mb-8">The game you're looking for doesn't exist.</p>
                <Link href="/store" className="btn-primary py-3 px-8">
                    Back to Store
                </Link>
            </div>
        );
    }

    const inStock = game.availableKeys > 0;
    const maxQty = Math.min(game.availableKeys - inCartQty, 10);
    const allImages = [game.imageUrl, ...(game.screenshots || [])].filter(Boolean) as string[];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6">
                <Link href="/store" className="text-gray-400 hover:text-white transition-colors">
                    ← Back to Store
                </Link>
            </nav>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column - Portrait Image */}
                <div className="flex flex-col items-center lg:items-start">
                    {/* Main Image - Portrait Style (smaller) */}
                    <div className="glass-card overflow-hidden rounded-2xl max-w-xs w-full">
                        <div className="relative aspect-[3/4] w-full">
                            <img
                                src={allImages[activeImage] || '/placeholder-game.jpg'}
                                alt={game.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Thumbnails */}
                    {allImages.length > 1 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                            {allImages.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveImage(index)}
                                    className={`flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 transition-all ${activeImage === index
                                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {game.description && (
                        <div className="glass-card p-6 mt-6">
                            <h3 className="text-xl font-bold text-white mb-4">About this game</h3>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {game.description}
                            </p>
                        </div>
                    )}

                    {/* System Requirements */}
                    {game.systemRequirements && (
                        <div className="glass-card p-6 mt-6">
                            <h3 className="text-xl font-bold text-white mb-4">System Requirements</h3>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {game.systemRequirements}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column - Info & Buy */}
                <div className="space-y-6">
                    {/* Platform Badge */}
                    <span className={`badge ${platformStyles[game.platform]} text-sm px-4 py-2`}>
                        {game.platform}
                    </span>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-white">{game.title}</h1>

                    {/* Game Info Table */}
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                {game.developer && (
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 px-4 text-gray-400">Developer</td>
                                        <td className="py-3 px-4 text-white">{game.developer}</td>
                                    </tr>
                                )}
                                {game.publisher && (
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 px-4 text-gray-400">Publisher</td>
                                        <td className="py-3 px-4 text-white">{game.publisher}</td>
                                    </tr>
                                )}
                                <tr className="border-b border-gray-700/50">
                                    <td className="py-3 px-4 text-gray-400">Platform</td>
                                    <td className="py-3 px-4 text-white">{game.platform}</td>
                                </tr>
                                <tr className="border-b border-gray-700/50">
                                    <td className="py-3 px-4 text-gray-400">Genre</td>
                                    <td className="py-3 px-4 text-white">{game.genre}</td>
                                </tr>
                                <tr className="border-b border-gray-700/50">
                                    <td className="py-3 px-4 text-gray-400">Release Date</td>
                                    <td className="py-3 px-4 text-white">{formatDate(game.releaseDate)}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-gray-400">Stock</td>
                                    <td className={`py-3 px-4 font-semibold ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                                        {inStock ? `${game.availableKeys} keys available` : 'Out of Stock'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Price & Buy Box */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400">Price</span>
                            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                                ${Number(game.price).toFixed(2)}
                            </span>
                        </div>

                        {inStock && (
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Quantity</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-10 h-10 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        −
                                    </button>
                                    <span className="w-14 h-10 flex items-center justify-center text-white font-bold text-lg bg-gray-800/50 rounded-lg">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                        disabled={quantity >= maxQty || maxQty <= 0}
                                        className="w-10 h-10 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold text-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {inCartQty > 0 && (
                            <p className="text-purple-400 text-sm mb-4 text-center">
                                ✓ {inCartQty} already in cart
                            </p>
                        )}

                        <button
                            onClick={handleAddToCart}
                            disabled={!inStock || maxQty <= 0}
                            className={`btn-primary w-full py-4 text-lg ${!inStock || maxQty <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {!inStock ? ' Out of Stock' : maxQty <= 0 ? '✓ Max in Cart' : ' Add to Cart'}
                        </button>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-300">

                            <span>Instant digital delivery</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">

                            <span>Verified authentic key</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">

                            <span>Activate on {game.platform}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Games */}
            {relatedGames.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-white mb-6"> เกมที่คุณอาจชอบ</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedGames.map((relatedGame) => (
                            <GameCard key={relatedGame.id} game={relatedGame} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
