'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface SiteSettings {
    id: string;
    storeName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    tagline: string | null;
    primaryColor: string | null;
}

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [storeName, setStoreName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [tagline, setTagline] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#8b5cf6');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/settings');
            const data = await response.json();
            setSettings(data);
            setStoreName(data.storeName || '');
            setLogoUrl(data.logoUrl || '');
            setTagline(data.tagline || '');
            setPrimaryColor(data.primaryColor || '#8b5cf6');
        } catch (err) {
            setError('ไม่สามารถโหลดการตั้งค่าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSaving(true);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:3001/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    storeName,
                    logoUrl: logoUrl || null,
                    tagline: tagline || null,
                    primaryColor,
                }),
            });

            if (response.ok) {
                setSuccess('บันทึกการตั้งค่าสำเร็จ!');
                loadSettings();
            } else {
                const data = await response.json();
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError('ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch('http://localhost:3001/api/settings/upload-logo', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setLogoUrl(`http://localhost:3001${data.url}`);
            } else {
                setError('อัพโหลดโลโก้ไม่สำเร็จ');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการอัพโหลด');
        } finally {
            setUploading(false);
        }
    };

    if (!user || user?.role !== 'ADMIN') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-red-500">Admin Access Required</h1>
                <Link href="/login" className="btn-primary mt-4 inline-block">
                    เข้าสู่ระบบ
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-700/50 rounded w-1/3" />
                    <div className="glass-card h-64" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-purple-400">⚙️ ตั้งค่าร้าน</h1>
                    <p className="text-gray-400 mt-1">จัดการชื่อร้าน โลโก้ และการตั้งค่าอื่นๆ</p>
                </div>
                <Link href="/admin" className="btn-secondary py-2 px-4">
                    ← กลับ
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 text-green-400">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="glass-card p-6 space-y-6">
                    {/* Store Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            ชื่อร้าน *
                        </label>
                        <input
                            type="text"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            className="input"
                            required
                            placeholder="CDKeys Marketplace"
                        />
                    </div>

                    {/* Tagline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            สโลแกน
                        </label>
                        <input
                            type="text"
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            className="input"
                            placeholder="Get your favorite games instantly"
                        />
                    </div>

                    {/* Logo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            โลโก้
                        </label>
                        <div className="flex items-center gap-4">
                            {logoUrl && (
                                <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="input mb-2"
                                    placeholder="URL โลโก้ หรืออัพโหลด"
                                />
                                <label className="btn-secondary py-2 px-4 cursor-pointer inline-block">
                                    {uploading ? 'กำลังอัพโหลด...' : '📤 อัพโหลดโลโก้'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Primary Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            สีหลัก
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-600"
                            />
                            <input
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="input w-32"
                                placeholder="#8b5cf6"
                            />
                            <span className="text-gray-400 text-sm">ใช้สำหรับธีมหลักของเว็บไซต์</span>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-4">👁️ ตัวอย่าง</h3>
                        <div className="bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center text-xl">
                                        🎮
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-lg" style={{ color: primaryColor }}>
                                        {storeName || 'CDKeys Marketplace'}
                                    </h4>
                                    <p className="text-gray-400 text-sm">
                                        {tagline || 'Get your favorite games instantly'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-primary py-3 px-6 disabled:opacity-50"
                        >
                            {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
