'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/config';

type LoginMode = 'password' | 'magic';
function CheckIcon() {
    return (
        <svg className="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
    if (isVisible) {
        return (
            <svg className="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 8.5 4.5 9.5 8a11.2 11.2 0 0 1-2.1 3.7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 6.6A11.2 11.2 0 0 0 2.5 12c1 3.5 4.5 8 9.5 8 1.4 0 2.7-.35 3.8-.9" />
            </svg>
        );
    }

    return (
        <svg className="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg className="h-4 w-4 animate-spin" aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
        </svg>
    );
}

export default function LoginPage() {
    const [mode, setMode] = useState<LoginMode>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    function changeMode(nextMode: LoginMode) {
        setMode(nextMode);
        setError('');
        setSuccess('');
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
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
            const response = await fetch(`${API_URL}/auth/send-magic-link`, {
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
        } catch {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=2200&q=85')",
                }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,10,14,0.72)_0%,rgba(9,20,27,0.46)_46%,rgba(7,10,14,0.88)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent_0%,rgba(7,10,14,0.82)_100%)]" />
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.16]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(45, 212, 191, 0.26) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px)',
                    backgroundSize: '72px 72px',
                }}
            />

            <section className="page-shell relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center py-8 sm:py-12">
                <section className="surface w-full max-w-[500px] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-7 lg:p-8">
                    <div className="mb-7">
                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-300/30 bg-teal-300/[0.14] text-sm font-black text-[var(--primary)]">
                            CK
                        </div>
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Secure login</p>
                        <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">
                            ยินดีต้อนรับกลับ
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                            เข้าสู่ระบบเพื่อซื้อคีย์เกม ติดตามออเดอร์ และรับคีย์ของคุณทันที
                        </p>
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-white/[0.04] p-1">
                        <button
                            type="button"
                            onClick={() => changeMode('password')}
                            aria-pressed={mode === 'password'}
                            className={`min-h-11 rounded-lg px-3 text-sm font-black transition-all ${mode === 'password'
                                ? 'bg-[var(--primary)] text-[#06201c] shadow-[0_10px_28px_rgba(45,212,191,0.18)]'
                                : 'text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--foreground)]'
                                }`}
                        >
                            รหัสผ่าน
                        </button>
                        <button
                            type="button"
                            onClick={() => changeMode('magic')}
                            aria-pressed={mode === 'magic'}
                            className={`min-h-11 rounded-lg px-3 text-sm font-black transition-all ${mode === 'magic'
                                ? 'bg-[var(--primary)] text-[#06201c] shadow-[0_10px_28px_rgba(45,212,191,0.18)]'
                                : 'text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--foreground)]'
                                }`}
                        >
                            ลิงก์อีเมล
                        </button>
                    </div>

                    {error && (
                        <div className="admin-notice admin-notice-error mb-5 text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="admin-notice admin-notice-success mb-5 text-sm" role="status">
                            {success}
                        </div>
                    )}

                    {mode === 'password' ? (
                        <form onSubmit={handlePasswordSubmit} className="space-y-5">
                            <label className="grid gap-2" htmlFor="email">
                                <span className="text-sm font-bold text-[var(--text-muted)]">อีเมล</span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </label>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-[var(--text-muted)]" htmlFor="password">
                                    รหัสผ่าน
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input pr-12"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((value) => !value)}
                                        className="btn-ghost absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 px-0"
                                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                        title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                    >
                                        <EyeIcon isVisible={showPassword} />
                                    </button>
                                </div>
                                <div className="mt-3 text-right">
                                    <Link href="/forgot-password" className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                                        ลืมรหัสผ่าน?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
                            >
                                {isLoading && <LoadingIcon />}
                                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                            <div className="rounded-lg border border-teal-300/30 bg-teal-300/[0.08] p-4 text-sm leading-6 text-[var(--text-muted)]">
                                <div className="mb-2 flex items-center gap-2 font-black text-[var(--foreground)]">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-300/[0.16] text-[var(--primary)]">
                                        <CheckIcon />
                                    </span>
                                    เข้าสู่ระบบแบบไม่ต้องใช้รหัสผ่าน
                                </div>
                                เราจะส่งลิงก์ปลอดภัยไปที่อีเมลของคุณ ลิงก์นี้ใช้ได้เฉพาะการเข้าสู่ระบบครั้งนี้เท่านั้น
                            </div>

                            <label className="grid gap-2" htmlFor="magic-email">
                                <span className="text-sm font-bold text-[var(--text-muted)]">อีเมล</span>
                                <input
                                    id="magic-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
                            >
                                {isLoading && <LoadingIcon />}
                                {isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์เข้าสู่ระบบ'}
                            </button>
                        </form>
                    )}

                    <div className="mt-7 border-t border-[var(--border)] pt-5 text-center text-sm text-[var(--text-muted)]">
                        ยังไม่มีบัญชี?{' '}
                        <Link href="/register" className="font-black text-[var(--primary)] hover:text-[var(--primary-hover)]">
                            สมัครสมาชิก
                        </Link>
                    </div>
                </section>
            </section>
        </div>
    );
}
