'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gamesApi, Game, Platform } from '@/lib/api';
import GameCard from '@/components/GameCard';

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

// Default banners (fallback if API fails or no banners in DB)
const defaultBanners: Banner[] = [
  {
    id: '1',
    title: '🎄 CHRISTMAS SALE',
    subtitle: 'ลดสูงสุด 80%',
    description: 'โปรโมชันพิเศษเฉพาะช่วงคริสต์มาส!',
    imageUrl: null,
    bgColor: 'from-purple-600 via-pink-600 to-red-500',
    link: '/store',
    buttonText: 'SHOP NOW',
  },
  {
    id: '2',
    title: '🏆 GAME OF THE YEAR',
    subtitle: '2025',
    description: 'เกมยอดเยี่ยมแห่งปี พร้อมให้คุณสัมผัส',
    imageUrl: null,
    bgColor: 'from-indigo-600 via-purple-600 to-pink-500',
    link: '/store',
    buttonText: 'ดูทั้งหมด',
  },
  {
    id: '3',
    title: '🎮 NEW RELEASES',
    subtitle: 'เกมใหม่ล่าสุด',
    description: 'เกมใหม่มาแรง อัพเดททุกสัปดาห์',
    imageUrl: null,
    bgColor: 'from-cyan-600 via-blue-600 to-indigo-600',
    link: '/store',
    buttonText: 'สำรวจเลย',
  },
];

const platforms: (Platform | 'ALL')[] = ['ALL', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'ORIGIN', 'UPLAY', 'EPIC'];

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>(defaultBanners);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL');
  const [genre, setGenre] = useState('ALL');

  // Load banners from API
  useEffect(() => {
    loadBanners();
    loadGames();
    loadGenres();
  }, []);

  // Auto-slide banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadGames();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, platform, genre]);

  const loadBanners = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/banners');
      const data = await response.json();
      if (data && data.length > 0) {
        setBanners(data);
      }
    } catch (error) {
      console.log('Using default banners');
    }
  };

  const loadGames = async () => {
    try {
      const data = await gamesApi.getAll({
        platform: platform === 'ALL' ? undefined : platform,
        genre: genre === 'ALL' ? undefined : genre,
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

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="min-h-screen">
      {/* Hero Banner Carousel */}
      <section className="relative overflow-hidden">
        <div className="relative h-[350px] md:h-[400px]">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentBanner
                  ? 'opacity-100 translate-x-0'
                  : index < currentBanner
                    ? 'opacity-0 -translate-x-full'
                    : 'opacity-0 translate-x-full'
                }`}
            >
              {banner.imageUrl ? (
                <div
                  className="h-full bg-cover bg-center flex items-center justify-center relative"
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="text-center z-10 px-4">
                    <p className="text-white/80 text-lg md:text-xl mb-2">{banner.subtitle}</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
                      {banner.title}
                    </h2>
                    <p className="text-white/90 text-lg md:text-xl mb-6">{banner.description}</p>
                    <Link
                      href={banner.link}
                      className="inline-block bg-white text-gray-900 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
                      {banner.buttonText}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className={`h-full bg-gradient-to-r ${banner.bgColor} flex items-center justify-center relative overflow-hidden`}>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                  </div>

                  <div className="text-center z-10 px-4">
                    <p className="text-white/80 text-lg md:text-xl mb-2">{banner.subtitle}</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
                      {banner.title}
                    </h2>
                    <p className="text-white/90 text-lg md:text-xl mb-6">{banner.description}</p>
                    <Link
                      href={banner.link}
                      className="inline-block bg-white text-gray-900 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
                      {banner.buttonText}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevBanner}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all z-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextBanner}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all z-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBanner(index)}
                  className={`w-3 h-3 rounded-full transition-all ${index === currentBanner ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Quick Category Chips */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 justify-center">
          {[' DEALS', ' NEW', ' TOP RATED', ' STEAM', ' PLAYSTATION', ' XBOX'].map((cat) => (
            <button
              key={cat}
              onClick={() => setPlatform(cat.includes('STEAM') ? 'STEAM' : cat.includes('PLAYSTATION') ? 'PLAYSTATION' : cat.includes('XBOX') ? 'XBOX' : 'ALL')}
              className="px-4 py-2 bg-gray-800/50 hover:bg-purple-600/50 rounded-full text-sm font-medium transition-all border border-gray-700/50 hover:border-purple-500/50"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Main Store Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="glass-card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2"> ค้นหาเกม</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเกมที่คุณต้องการ..."
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">แพลตฟอร์ม</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform | 'ALL')}
                className="input cursor-pointer"
              >
                {platforms.map((p) => (
                  <option key={p} value={p} className="bg-gray-900">
                    {p === 'ALL' ? 'ทุกแพลตฟอร์ม' : p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ประเภท</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input cursor-pointer"
              >
                <option value="ALL" className="bg-gray-900">ทุกประเภท</option>
                {genres.map((g) => (
                  <option key={g} value={g} className="bg-gray-900">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
             เกมทั้งหมด
          </h2>
          <span className="text-gray-400">{games.length} เกม</span>
        </div>

        {/* Games Grid */}
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
            <h3 className="text-2xl font-bold text-gray-300 mb-2">ไม่พบเกม</h3>
            <p className="text-gray-500">ลองปรับตัวกรองใหม่</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-gray-800 text-center text-gray-500 mt-10">
        <p>© 2024 CDKeys Marketplace. All rights reserved.</p>
        <p className="mt-2 text-sm">Demo project - No real transactions</p>
      </footer>
    </div>
  );
}
