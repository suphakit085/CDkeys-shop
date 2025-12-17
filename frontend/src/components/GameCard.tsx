'use client';

import Link from 'next/link';
import { Game, Platform } from '@/lib/api';
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

export default function GameCard({ game }: GameCardProps) {
    const { addItem } = useCart();
    const inStock = game.availableKeys > 0;

    return (
        <div className="glass-card overflow-hidden flex flex-col animate-fade-in">
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
                <img
                    src={game.imageUrl || '/placeholder-game.jpg'}
                    alt={game.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute top-3 left-3">
                    <span className={`badge ${platformStyles[game.platform]}`}>
                        {game.platform}
                    </span>
                </div>
                {!inStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-red-400 font-bold text-lg">Out of Stock</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                    <Link href={`/store/${game.id}`}>
                        <h3 className="font-bold text-lg text-white hover:text-purple-400 transition-colors line-clamp-1">
                            {game.title}
                        </h3>
                    </Link>
                    <p className="text-gray-400 text-sm mt-1">{game.genre}</p>
                    {game.description && (
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                            {game.description}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                            ${Number(game.price).toFixed(2)}
                        </span>
                        {inStock && (
                            <p className="text-xs text-gray-500 mt-1">
                                {game.availableKeys} keys available
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => addItem(game)}
                        disabled={!inStock}
                        className={`btn-primary py-2 px-4 text-sm ${!inStock ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {inStock ? 'Add to Cart' : 'Sold Out'}
                    </button>
                </div>
            </div>
        </div>
    );
}
