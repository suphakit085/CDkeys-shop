'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { API_URL } from '@/lib/config';

export default function RegisterPage() {
    const [mode, setMode] = useState<'password' | 'magic'>('password');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setIsLoading(true);

        try {
            await authApi.register({ email, password, name });
            setSuccess('สร้างบัญชีสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...');
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('กรุณากรอกชื่อ');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register-magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message || 'เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว');
                setEmail('');
                setName('');
            } else {
                setError(data.message || 'สมัครสมาชิกไม่สำเร็จ');
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="glass-card p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-purple-400">
                        สร้างบัญชี
                    </h1>
                    <p className="text-gray-400 mt-2">เข้าร่วมชุมชนเกมเมอร์</p>
                </div>

                {/* Mode Tabs */}
                <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setMode('password')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'password'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        📝 ใช้รหัสผ่าน
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('magic')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'magic'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        ✨ ใช้ลิงก์อีเมล
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
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                ชื่อ
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder="ชื่อของคุณ"
                                required
                            />
                        </div>

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
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                ยืนยันรหัสผ่าน
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 disabled:opacity-50"
                        >
                            {isLoading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                            <p className="text-sm text-purple-300">
                                ✨ <strong>สมัครด้วยลิงก์อีเมล</strong><br />
                                ไม่ต้องจำรหัสผ่าน! เราจะส่งลิงก์ไปที่อีเมลของคุณเพื่อเปิดใช้งานบัญชี
                            </p>
                        </div>

                        <div>
                            <label htmlFor="magic-name" className="block text-sm font-medium text-gray-300 mb-2">
                                ชื่อ
                            </label>
                            <input
                                id="magic-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder="ชื่อของคุณ"
                                required
                            />
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
                            {isLoading ? 'กำลังส่ง...' : '📧 ส่งลิงก์ยืนยันไปที่อีเมล'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-gray-400">
                    มีบัญชีอยู่แล้ว?{' '}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        </div>
    );
}
