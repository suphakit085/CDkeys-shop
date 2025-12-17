'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const [mode, setMode] = useState<'password' | 'magic'>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            router.push('/store');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/send-magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message || 'เราได้ส่งลิงก์เข้าสู่ระบบไปที่อีเมลของคุณแล้ว');
                setEmail('');
            } else {
                setError(data.message || 'ไม่สามารถส่งลิงก์ได้');
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-card p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-purple-400">
                        ยินดีต้อนรับ
                    </h1>
                    <p className="text-gray-400 mt-2">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
                </div>

                {/* Mode Tabs */}
                <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => { setMode('password'); setError(''); setSuccess(''); }}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'password'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                         รหัสผ่าน
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('magic'); setError(''); setSuccess(''); }}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'magic'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                         ลิงก์อีเมล
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {mode === 'password' ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                อีเมล
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                รหัสผ่าน
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
                            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMagicLinkSubmit} className="space-y-6">
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                            <p className="text-sm text-purple-300">
                                 <strong>เข้าสู่ระบบด้วยลิงก์</strong><br />
                                ไม่ต้องจำรหัสผ่าน! เราจะส่งลิงก์ไปที่อีเมลของคุณ
                            </p>
                        </div>

                        <div>
                            <label htmlFor="magic-email" className="block text-sm font-medium text-gray-300 mb-2">
                                อีเมล
                            </label>
                            <input
                                id="magic-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 disabled:opacity-50"
                        >
                            {isLoading ? 'กำลังส่ง...' : ' ส่งลิงก์เข้าสู่ระบบ'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-gray-400">
                    ยังไม่มีบัญชี?{' '}
                    <Link href="/register" className="text-purple-400 hover:text-purple-300">
                        สมัครสมาชิก
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
