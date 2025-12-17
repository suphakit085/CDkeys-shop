'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MagicLoginPage() {
    const params = useParams();
    const token = params.token as string;
    const router = useRouter();
    const { login: contextLogin } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyMagicLink = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/auth/verify-magic-link/${token}`);
                const data = await response.json();

                if (response.ok) {
                    // Save auth data to context
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    setStatus('success');
                    setMessage('ล็อกอินสำเร็จ!');

                    // Redirect to home after 1 second
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    setStatus('error');
                    setMessage(data.message || 'ลิงก์ล็อกอินไม่ถูกต้องหรือหมดอายุแล้ว');
                }
            } catch (err) {
                setStatus('error');
                setMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
            }
        };

        verifyMagicLink();
    }, [token, router, contextLogin]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl text-center">
                {status === 'loading' && (
                    <>
                        <div className="text-6xl mb-4">✨</div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                            กำลังล็อกอิน...
                        </h2>
                        <p className="text-gray-600 mb-6">
                            กรุณารอสักครู่
                        </p>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                            ล็อกอินสำเร็จ!
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {message}
                        </p>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                            เกิดข้อผิดพลาด
                        </h2>
                        <p className="text-red-600 mb-6">{message}</p>
                        <div className="space-y-3">
                            <a
                                href="/login"
                                className="block w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-all"
                            >
                                ไปหน้าเข้าสู่ระบบ
                            </a>
                            <a
                                href="/forgot-password"
                                className="block w-full py-3 px-4 border border-purple-600 text-sm font-medium rounded-lg text-purple-600 hover:bg-purple-50 transition-all"
                            >
                                ขอลิงก์ใหม่
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
