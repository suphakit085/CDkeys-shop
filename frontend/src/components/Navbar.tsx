'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useState, useEffect } from 'react';

interface SiteSettings {
    storeName: string;
    logoUrl: string | null;
    tagline: string | null;
    primaryColor: string | null;
}

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const { itemCount } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        fetch('http://localhost:3001/api/settings')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(() => { });
    }, []);

    const storeName = settings?.storeName || 'CDKeys';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        {settings?.logoUrl ? (
                            <img
                                src={settings.logoUrl}
                                alt={storeName}
                                className="w-10 h-10 rounded-xl object-contain"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">🎮</span>
                            </div>
                        )}
                        <span
                            className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
                            style={settings?.primaryColor ? { color: settings.primaryColor, backgroundImage: 'none' } : {}}
                        >
                            {storeName}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/store"
                            className="text-gray-300 hover:text-white transition-colors font-medium"
                        >
                            Store
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/orders"
                                    className="text-gray-300 hover:text-white transition-colors font-medium"
                                >
                                    My Orders
                                </Link>

                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                                    >
                                        Admin Panel
                                    </Link>
                                )}

                                <Link
                                    href="/cart"
                                    className="relative text-gray-300 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {itemCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {itemCount}
                                        </span>
                                    )}
                                </Link>

                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 text-sm">{user.name}</span>
                                    <button
                                        onClick={logout}
                                        className="btn-secondary text-sm py-2 px-4"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link href="/login" className="btn-secondary py-2 px-4">
                                    Login
                                </Link>
                                <Link href="/register" className="btn-primary py-2 px-4">
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-gray-300 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-700">
                        <div className="flex flex-col gap-3">
                            <Link href="/store" className="text-gray-300 hover:text-white py-2">
                                Store
                            </Link>
                            {user ? (
                                <>
                                    <Link href="/orders" className="text-gray-300 hover:text-white py-2">
                                        My Orders
                                    </Link>
                                    <Link href="/cart" className="text-gray-300 hover:text-white py-2">
                                        Cart ({itemCount})
                                    </Link>
                                    {isAdmin && (
                                        <Link href="/admin" className="text-purple-400 hover:text-purple-300 py-2">
                                            Admin Panel
                                        </Link>
                                    )}
                                    <button onClick={logout} className="text-left text-gray-300 hover:text-white py-2">
                                        Logout ({user.name})
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" className="text-gray-300 hover:text-white py-2">
                                        Login
                                    </Link>
                                    <Link href="/register" className="text-gray-300 hover:text-white py-2">
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
