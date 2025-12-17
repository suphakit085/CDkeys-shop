'use client';

import { useState, useEffect } from 'react';
import { gamesApi, Game, Platform } from '@/lib/api';
import GameCard from '@/components/GameCard';

const platforms: (Platform | 'ALL')[] = ['ALL', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'ORIGIN', 'UPLAY', 'EPIC'];

export default function StorePage() {
    const [games, setGames] = useState<Game[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL');
    const [genre, setGenre] = useState('ALL');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);

    useEffect(() => {
        loadGames();
        loadGenres();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            loadGames();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search, platform, genre, priceRange]);

    const loadGames = async () => {
        try {
            const data = await gamesApi.getAll({
                platform: platform === 'ALL' ? undefined : platform,
                genre: genre === 'ALL' ? undefined : genre,
                minPrice: priceRange[0] || undefined,
                maxPrice: priceRange[1] < 100 ? priceRange[1] : undefined,
                search: search || undefined,
            });
            setGames(data);
        } catch (error) {
            console.error('Failed to load games:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadGenres = async () => {
        try {
            const data = await gamesApi.getGenres();
            setGenres(data);
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Game Store
                </h1>
                <p className="text-gray-400 mt-2">Find your next adventure</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search games..."
                            className="input"
                        />
                    </div>

                    {/* Platform */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value as Platform | 'ALL')}
                            className="input cursor-pointer"
                        >
                            {platforms.map((p) => (
                                <option key={p} value={p} className="bg-gray-900">
                                    {p === 'ALL' ? 'All Platforms' : p}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Genre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                        <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="input cursor-pointer"
                        >
                            <option value="ALL" className="bg-gray-900">All Genres</option>
                            {genres.map((g) => (
                                <option key={g} value={g} className="bg-gray-900">
                                    {g}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Price Range */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price Range: ${priceRange[0]} - ${priceRange[1] >= 100 ? '100+' : priceRange[1]}
                    </label>
                    <div className="flex gap-4 items-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                            className="flex-1 accent-purple-500"
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="flex-1 accent-cyan-500"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="glass-card h-80 animate-pulse">
                            <div className="h-48 bg-gray-700/50" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                                <div className="h-3 bg-gray-700/50 rounded w-1/2" />
                                <div className="h-8 bg-gray-700/50 rounded w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">No games found</h3>
                    <p className="text-gray-500">Try adjusting your filters</p>
                </div>
            ) : (
                <>
                    <p className="text-gray-400 mb-4">{games.length} games found</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {games.map((game) => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
