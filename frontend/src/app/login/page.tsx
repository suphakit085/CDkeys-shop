'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            router.push('/store');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 mt-2">Sign in to your account</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input"
                            placeholder="demo@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input"
                            placeholder="••••••••"
                            required
                        />
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-gray-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-purple-400 hover:text-purple-300">
                        Sign up
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <p className="text-center text-gray-500 text-sm mb-4">Demo Accounts:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="glass-card p-3 text-center">
                            <p className="text-gray-400">Customer</p>
                            <p className="text-white font-mono text-xs mt-1">demo@email.com</p>
                            <p className="text-gray-500 font-mono text-xs">demo123</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-purple-400">Admin</p>
                            <p className="text-white font-mono text-xs mt-1">admin@cdkeys.com</p>
                            <p className="text-gray-500 font-mono text-xs">admin123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
