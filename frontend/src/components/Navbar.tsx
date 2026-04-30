'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_URL, getUploadUrl } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

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
        fetch(`${API_URL}/settings`)
            .then((res) => res.json())
            .then((data) => setSettings(data))
            .catch(() => undefined);
    }, []);

    const storeName = settings?.storeName || 'CDKeys';
    const navLinks = [
        { href: '/store', label: 'Store' },
        ...(user ? [{ href: '/orders', label: 'Orders' }] : []),
        ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ];

    return (
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0f14]/95 backdrop-blur-xl">
            <div className="page-shell">
                <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
                    <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setIsMenuOpen(false)}>
                        {settings?.logoUrl ? (
                            <img
                                src={getUploadUrl(settings.logoUrl)}
                                alt={storeName}
                                className="h-9 w-9 rounded-lg border border-white/10 object-contain"
                            />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300/[0.25] bg-teal-300/[0.12] text-xs font-black text-teal-200">
                                CK
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-base font-black tracking-tight text-white">{storeName}</p>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-1 lg:flex">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="btn-ghost h-9 px-3 text-sm">
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="hidden items-center gap-2 lg:flex">
                        <Link href="/cart" className="btn-secondary relative h-9 w-10 px-0" aria-label="Cart">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.5 3m0 0L7 15h10l2-9H5.5Zm3.5 15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                            </svg>
                            {itemCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-black text-black">
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        {user ? (
                            <>
                                <div className="max-w-40 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
                                    {user.name}
                                </div>
                                <button onClick={logout} className="btn-secondary h-9 px-4 text-sm">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="btn-secondary h-9 px-4 text-sm">
                                    Login
                                </Link>
                                <Link href="/register" className="btn-primary h-9 px-4 text-sm">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setIsMenuOpen((value) => !value)}
                        className="btn-secondary h-10 w-10 px-0 lg:hidden"
                        aria-label="Toggle navigation"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="border-t border-white/10 py-3 lg:hidden">
                        <div className="grid gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="rounded-lg px-3 py-3 text-gray-200 hover:bg-white/[0.06]"
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <Link
                                href="/cart"
                                onClick={() => setIsMenuOpen(false)}
                                className="rounded-lg px-3 py-3 text-gray-200 hover:bg-white/[0.06]"
                            >
                                Cart ({itemCount})
                            </Link>
                            {user ? (
                                <button onClick={logout} className="rounded-lg px-3 py-3 text-left text-gray-200 hover:bg-white/[0.06]">
                                    Logout ({user.name})
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="btn-secondary h-11 px-4">
                                        Login
                                    </Link>
                                    <Link href="/register" onClick={() => setIsMenuOpen(false)} className="btn-primary h-11 px-4">
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
