'use client';

import { useEffect, useMemo, useState } from 'react';
import GameCard from '@/components/GameCard';
import { Game, gamesApi, Platform } from '@/lib/api';

const platforms: Array<Platform | 'ALL'> = ['ALL', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'ORIGIN', 'UPLAY', 'EPIC'];

export default function StorePage() {
    const [games, setGames] = useState<Game[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL');
    const [genre, setGenre] = useState('ALL');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    useEffect(() => {
        loadGenres();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadGames();
        }, 250);
        return () => window.clearTimeout(timer);
    }, [search, platform, genre, minPrice, maxPrice]);

    const stockCount = useMemo(() => games.reduce((sum, game) => sum + game.availableKeys, 0), [games]);

    async function loadGames() {
        setIsLoading(true);
        try {
            const min = minPrice ? Number(minPrice) : undefined;
            const max = maxPrice ? Number(maxPrice) : undefined;
            const data = await gamesApi.getAll({
                platform: platform === 'ALL' ? undefined : platform,
                genre: genre === 'ALL' ? undefined : genre,
                minPrice: Number.isFinite(min) ? min : undefined,
                maxPrice: Number.isFinite(max) ? max : undefined,
                search: search || undefined,
            });
            setGames(data);
        } catch {
            setGames([]);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadGenres() {
        try {
            const data = await gamesApi.getGenres();
            setGenres(data);
        } catch {
            setGenres([]);
        }
    }

    function clearFilters() {
        setSearch('');
        setPlatform('ALL');
        setGenre('ALL');
        setMinPrice('');
        setMaxPrice('');
    }

    return (
        <div className="page-shell py-8">
            <header className="mb-7 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-bold text-teal-200">Store</p>
                    <h1 className="mt-2 text-4xl font-black text-white">Game key catalog</h1>
                    <p className="mt-3 max-w-2xl text-gray-400">
                        Browse available keys, filter by platform, and add titles directly to checkout.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="surface px-4 py-3">
                        <p className="text-2xl font-black text-white">{games.length}</p>
                        <p className="text-xs text-gray-400">Titles</p>
                    </div>
                    <div className="surface px-4 py-3">
                        <p className="text-2xl font-black text-white">{stockCount}</p>
                        <p className="text-xs text-gray-400">Keys</p>
                    </div>
                    <div className="surface col-span-2 px-4 py-3 sm:col-span-1">
                        <p className="text-2xl font-black text-white">{genres.length}</p>
                        <p className="text-xs text-gray-400">Genres</p>
                    </div>
                </div>
            </header>

            <section className="surface mb-7 p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_190px_190px_140px_140px_auto]">
                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-gray-300">Search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by title or keyword"
                            className="input"
                        />
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-gray-300">Platform</span>
                        <select
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value as Platform | 'ALL')}
                            className="input cursor-pointer"
                        >
                            {platforms.map((item) => (
                                <option key={item} value={item} className="bg-[#111821]">
                                    {item === 'ALL' ? 'All' : item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-gray-300">Genre</span>
                        <select value={genre} onChange={(event) => setGenre(event.target.value)} className="input cursor-pointer">
                            <option value="ALL" className="bg-[#111821]">All</option>
                            {genres.map((item) => (
                                <option key={item} value={item} className="bg-[#111821]">
                                    {item}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-gray-300">Min</span>
                        <input
                            type="number"
                            min="0"
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                            placeholder="$0"
                            className="input"
                        />
                    </label>

                    <label className="grid gap-2">
                        <span className="text-sm font-bold text-gray-300">Max</span>
                        <input
                            type="number"
                            min="0"
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                            placeholder="$100"
                            className="input"
                        />
                    </label>

                    <div className="flex items-end">
                        <button onClick={clearFilters} className="btn-secondary h-11 w-full px-4 text-sm">
                            Clear
                        </button>
                    </div>
                </div>
            </section>

            <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-300">
                    {isLoading ? 'Loading catalog' : `${games.length} games found`}
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="glass-card min-h-[390px] animate-pulse overflow-hidden">
                            <div className="aspect-[16/10] bg-white/[0.08]" />
                            <div className="space-y-4 p-4">
                                <div className="h-5 w-3/4 rounded bg-white/[0.08]" />
                                <div className="h-4 w-1/2 rounded bg-white/[0.08]" />
                                <div className="h-16 rounded bg-white/[0.08]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : games.length === 0 ? (
                <div className="surface py-16 text-center">
                    <p className="text-xl font-black text-white">No games found</p>
                    <p className="mt-2 text-gray-400">Try changing the filters or search term.</p>
                    <button onClick={clearFilters} className="btn-primary mt-6 px-5">
                        Reset filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {games.map((game) => (
                        <GameCard key={game.id} game={game} />
                    ))}
                </div>
            )}
        </div>
    );
}
