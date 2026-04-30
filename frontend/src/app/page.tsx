'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import { API_URL, getUploadUrl } from '@/lib/config';
import { Game, gamesApi, Platform } from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  bgColor: string;
  link: string;
  buttonText: string;
}

const defaultBanners: Banner[] = [
  {
    id: 'featured',
    title: 'CDKeys Marketplace',
    subtitle: 'Digital game keys',
    description: 'Browse PC and console keys with instant checkout and order history.',
    imageUrl: null,
    bgColor: '',
    link: '/store',
    buttonText: 'Browse Store',
  },
];

const platforms: Array<Platform | 'ALL'> = ['ALL', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'EPIC'];

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>(defaultBanners);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL');
  const [genre, setGenre] = useState('ALL');

  useEffect(() => {
    loadBanners();
    loadGenres();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadGames();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, platform, genre]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentBanner((value) => (value + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const activeBanner = banners[currentBanner] || defaultBanners[0];
  const heroGame = games[0];
  const heroImage = activeBanner.imageUrl
    ? getUploadUrl(activeBanner.imageUrl)
    : heroGame?.imageUrl
      ? getUploadUrl(heroGame.imageUrl)
      : 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0c?w=1800&q=85';

  const featuredGames = useMemo(() => games.slice(0, 8), [games]);
  const availableCount = games.reduce((sum, game) => sum + game.availableKeys, 0);

  async function loadBanners() {
    try {
      const response = await fetch(`${API_URL}/banners`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
      }
    } catch {
      setBanners(defaultBanners);
    }
  }

  async function loadGames() {
    setIsLoading(true);
    try {
      const data = await gamesApi.getAll({
        platform: platform === 'ALL' ? undefined : platform,
        genre: genre === 'ALL' ? undefined : genre,
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

  return (
    <div>
      <section className="relative min-h-[460px] overflow-hidden border-b border-white/10 md:min-h-[540px]">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,14,0.94)_0%,rgba(7,10,14,0.76)_48%,rgba(7,10,14,0.34)_100%)]" />

        <div className="page-shell relative z-10 flex min-h-[460px] items-center py-12 md:min-h-[540px]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-black uppercase text-teal-200">{activeBanner.subtitle || 'Digital game keys'}</p>
            <h1 className="max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              {activeBanner.title}
            </h1>
            {activeBanner.description && (
              <p className="mt-5 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">
                {activeBanner.description}
              </p>
            )}

            <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games, genres, platforms"
                className="input h-12 flex-1"
              />
              <Link href={activeBanner.link || '/store'} className="btn-primary h-12 px-6">
                {activeBanner.buttonText || 'Browse Store'}
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              <div className="border-l border-white/[0.16] pl-4">
                <p className="text-2xl font-black text-white">{games.length}</p>
                <p className="text-xs text-gray-400">Titles</p>
              </div>
              <div className="border-l border-white/[0.16] pl-4">
                <p className="text-2xl font-black text-white">{availableCount}</p>
                <p className="text-xs text-gray-400">Keys</p>
              </div>
              <div className="border-l border-white/[0.16] pl-4">
                <p className="text-2xl font-black text-white">{genres.length}</p>
                <p className="text-xs text-gray-400">Genres</p>
              </div>
            </div>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                onClick={() => setCurrentBanner(index)}
                className={`h-2 rounded-full transition-all ${index === currentBanner ? 'w-8 bg-teal-300' : 'w-2 bg-white/[0.45] hover:bg-white/70'}`}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="page-shell py-8">
        <div className="flex flex-wrap gap-2">
          {platforms.map((item) => (
            <button
              key={item}
              onClick={() => setPlatform(item)}
              className={`h-10 rounded-lg border px-4 text-sm font-bold transition-colors ${platform === item
                ? 'border-teal-300/70 bg-teal-300/[0.14] text-teal-100'
                : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/[0.22] hover:bg-white/[0.07]'
                }`}
            >
              {item === 'ALL' ? 'All platforms' : item}
            </button>
          ))}
        </div>
      </section>

      <section className="page-shell pb-14">
        <div className="surface mb-7 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-gray-300">Search</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try Elden Ring or RPG"
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
                    {item === 'ALL' ? 'All platforms' : item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-gray-300">Genre</span>
              <select value={genre} onChange={(event) => setGenre(event.target.value)} className="input cursor-pointer">
                <option value="ALL" className="bg-[#111821]">All genres</option>
                {genres.map((item) => (
                  <option key={item} value={item} className="bg-[#111821]">
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-teal-200">Catalog</p>
            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Featured keys</h2>
          </div>
          <Link href="/store" className="btn-secondary h-10 px-4 text-sm">
            View all
          </Link>
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
        ) : featuredGames.length === 0 ? (
          <div className="surface py-16 text-center">
            <p className="text-xl font-black text-white">No games found</p>
            <p className="mt-2 text-gray-400">Try changing the filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
