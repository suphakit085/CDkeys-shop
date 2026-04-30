'use client';

import Link from 'next/link';
import { Game, Platform } from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { useCart } from '@/contexts/CartContext';

interface GameCardProps {
    game: Game;
}

const platformStyles: Record<Platform, string> = {
    STEAM: 'badge-steam',
    PLAYSTATION: 'badge-playstation',
    XBOX: 'badge-xbox',
    NINTENDO: 'badge-nintendo',
    ORIGIN: 'badge-origin',
    UPLAY: 'badge-uplay',
    EPIC: 'badge-epic',
};

function initials(title: string) {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export default function GameCard({ game }: GameCardProps) {
    const { addItem } = useCart();
    const inStock = game.availableKeys > 0;
    const imageUrl = game.imageUrl ? getUploadUrl(game.imageUrl) : '';

    return (
        <article className="glass-card group flex h-full min-h-[390px] flex-col overflow-hidden animate-fade-in">
            <Link href={`/store/${game.id}`} className="relative block aspect-[16/10] overflow-hidden bg-[#111821]">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#111821,#203042)] text-4xl font-black text-white/[0.35]">
                        {initials(game.title)}
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute left-3 top-3">
                    <span className={`badge ${platformStyles[game.platform]}`}>{game.platform}</span>
                </div>
                <div className="absolute bottom-3 right-3">
                    <span className={`badge ${inStock ? 'badge-available' : 'badge-sold'}`}>
                        {inStock ? `${game.availableKeys} in stock` : 'Sold out'}
                    </span>
                </div>
            </Link>

            <div className="flex flex-1 flex-col p-4">
                <div className="flex-1">
                    <Link href={`/store/${game.id}`}>
                        <h3 className="line-clamp-2 text-lg font-black text-white transition-colors group-hover:text-teal-200">
                            {game.title}
                        </h3>
                    </Link>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <span>{game.genre}</span>
                        {game.developer && (
                            <>
                                <span className="text-gray-700">/</span>
                                <span className="line-clamp-1">{game.developer}</span>
                            </>
                        )}
                    </div>
                    {game.description && (
                        <p className="line-clamp-2 mt-3 text-sm leading-6 text-gray-400">{game.description}</p>
                    )}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-500">Price</p>
                        <p className="mt-1 text-2xl font-black text-white">${Number(game.price).toFixed(2)}</p>
                    </div>
                    <button
                        onClick={() => addItem(game)}
                        disabled={!inStock}
                        className="btn-primary h-11 min-w-28 px-4 text-sm"
                    >
                        {inStock ? 'Add' : 'Sold Out'}
                    </button>
                </div>
            </div>
        </article>
    );
}
