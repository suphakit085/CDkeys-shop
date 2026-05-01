'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { API_URL } from '@/lib/config';

type RegisterMode = 'password' | 'magic';

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

export default function RegisterPage() {
    const [mode, setMode] = useState<RegisterMode>('password');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const passwordIsLongEnough = password.length >= 6;
    const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

    function changeMode(nextMode: RegisterMode) {
        setMode(nextMode);
        setError('');
        setSuccess('');
    }

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
            setSuccess('สร้างบัญชีสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...');
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
                    backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2200&q=85')",
                }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,10,14,0.7)_0%,rgba(9,20,27,0.48)_46%,rgba(7,10,14,0.88)_100%)]" />
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
                <section className="surface w-full max-w-[520px] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-6 lg:p-7">
                    <div className="mb-5">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-300/30 bg-teal-300/[0.14] text-sm font-black text-[var(--primary)]">
                            CK
                        </div>
                        <p className="text-sm font-black uppercase text-[var(--primary)]">Create account</p>
                        <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--foreground)]">
                            สมัครสมาชิก
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                            เริ่มต้นบัญชีของคุณเพื่อซื้อคีย์เกม ติดตามออเดอร์ และกลับมารับคีย์ได้ทุกเวลา
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
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <label className="grid gap-2" htmlFor="name">
                                <span className="text-sm font-bold text-[var(--text-muted)]">ชื่อ</span>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input"
                                    placeholder="ชื่อของคุณ"
                                    autoComplete="name"
                                    required
                                />
                            </label>

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
                                        autoComplete="new-password"
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
                                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                                    <span className={`h-2 w-2 rounded-full ${passwordIsLongEnough ? 'bg-[var(--success)]' : 'bg-[var(--text-dim)]'}`} />
                                    อย่างน้อย 6 ตัวอักษร
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-[var(--text-muted)]" htmlFor="confirmPassword">
                                    ยืนยันรหัสผ่าน
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input pr-12"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((value) => !value)}
                                        className="btn-ghost absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 px-0"
                                        aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'}
                                        title={showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'}
                                    >
                                        <EyeIcon isVisible={showConfirmPassword} />
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && (
                                    <div className={`mt-2 flex items-center gap-2 text-xs font-bold ${passwordsMatch ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                                        <span className={`h-2 w-2 rounded-full ${passwordsMatch ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
                                        {passwordsMatch ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน'}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
                            >
                                {isLoading && <LoadingIcon />}
                                {isLoading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                            <div className="rounded-lg border border-teal-300/30 bg-teal-300/[0.08] p-4 text-sm leading-6 text-[var(--text-muted)]">
                                <div className="mb-2 flex items-center gap-2 font-black text-[var(--foreground)]">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-300/[0.16] text-[var(--primary)]">
                                        <CheckIcon />
                                    </span>
                                    สมัครด้วยลิงก์อีเมล
                                </div>
                                ไม่ต้องตั้งรหัสผ่านตอนนี้ เราจะส่งลิงก์ยืนยันไปที่อีเมลของคุณเพื่อเปิดใช้งานบัญชี
                            </div>

                            <label className="grid gap-2" htmlFor="magic-name">
                                <span className="text-sm font-bold text-[var(--text-muted)]">ชื่อ</span>
                                <input
                                    id="magic-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input"
                                    placeholder="ชื่อของคุณ"
                                    autoComplete="name"
                                    required
                                />
                            </label>

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
                                {isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์ยืนยัน'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 border-t border-[var(--border)] pt-4 text-center text-sm text-[var(--text-muted)]">
                        มีบัญชีอยู่แล้ว?{' '}
                        <Link href="/login" className="font-black text-[var(--primary)] hover:text-[var(--primary-hover)]">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </section>
            </section>
        </div>
    );
}
