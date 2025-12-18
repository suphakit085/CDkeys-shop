'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, BACKEND_URL } from '@/lib/config';

interface Banner {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    imageUrl: string | null;
    bgColor: string;
    link: string;
    buttonText: string;
    isActive: boolean;
    order: number;
}

const defaultBgColors = [
    { name: 'Purple/Pink', value: 'from-purple-600 via-pink-600 to-red-500' },
    { name: 'Blue/Indigo', value: 'from-cyan-600 via-blue-600 to-indigo-600' },
    { name: 'Green/Teal', value: 'from-green-600 via-teal-600 to-cyan-600' },
    { name: 'Orange/Red', value: 'from-orange-600 via-red-600 to-pink-600' },
    { name: 'Indigo/Purple', value: 'from-indigo-600 via-purple-600 to-pink-500' },
];

export default function AdminBannersPage() {
    const { user } = useAuth();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [bgColor, setBgColor] = useState(defaultBgColors[0].value);
    const [link, setLink] = useState('/store');
    const [buttonText, setButtonText] = useState('SHOP NOW');
    const [isActive, setIsActive] = useState(true);
    const [order, setOrder] = useState(0);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_URL}/banners/admin`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setBanners(data);
        } catch (err) {
            setError('ไม่สามารถโหลดข้อมูลแบนเนอร์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setSubtitle('');
        setDescription('');
        setImageUrl('');
        setBgColor(defaultBgColors[0].value);
        setLink('/store');
        setButtonText('SHOP NOW');
        setIsActive(true);
        setOrder(0);
        setEditingBanner(null);
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setTitle(banner.title);
        setSubtitle(banner.subtitle || '');
        setDescription(banner.description || '');
        setImageUrl(banner.imageUrl || '');
        setBgColor(banner.bgColor);
        setLink(banner.link);
        setButtonText(banner.buttonText);
        setIsActive(banner.isActive);
        setOrder(banner.order);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('accessToken');
            const url = editingBanner
                ? `${API_URL}/banners/${editingBanner.id}`
                : `${API_URL}/banners`;

            const response = await fetch(url, {
                method: editingBanner ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title,
                    subtitle: subtitle || null,
                    description: description || null,
                    imageUrl: imageUrl || null,
                    bgColor,
                    link,
                    buttonText,
                    isActive,
                    order,
                }),
            });

            if (response.ok) {
                setSuccess(editingBanner ? 'อัพเดทแบนเนอร์สำเร็จ!' : 'สร้างแบนเนอร์สำเร็จ!');
                resetForm();
                setShowForm(false);
                loadBanners();
            } else {
                const data = await response.json();
                setError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setError('ไม่สามารถบันทึกข้อมูลได้');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบแบนเนอร์นี้?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_URL}/banners/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setSuccess('ลบแบนเนอร์สำเร็จ!');
                loadBanners();
            } else {
                setError('ไม่สามารถลบแบนเนอร์ได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาด');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_URL}/banners/upload-image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setImageUrl(`${BACKEND_URL}${data.url}`);
            } else {
                setError('อัพโหลดรูปภาพไม่สำเร็จ');
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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-purple-400">🎠 จัดการแบนเนอร์</h1>
                    <p className="text-gray-400 mt-1">สร้างและแก้ไขแบนเนอร์สำหรับหน้าแรก</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/admin" className="btn-secondary py-2 px-4">
                        ← กลับ
                    </Link>
                    <button
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                        className="btn-primary py-2 px-4"
                    >
                        {showForm ? '✕ ปิด' : '+ เพิ่มแบนเนอร์'}
                    </button>
                </div>
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

            {/* Form */}
            {showForm && (
                <div className="glass-card p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">
                        {editingBanner ? '✏️ แก้ไขแบนเนอร์' : '➕ เพิ่มแบนเนอร์ใหม่'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">หัวข้อ *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input"
                                    required
                                    placeholder="เช่น 🎄 CHRISTMAS SALE"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">หัวข้อย่อย</label>
                                <input
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    className="input"
                                    placeholder="เช่น ลดสูงสุด 80%"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">รายละเอียด</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input h-20"
                                placeholder="คำอธิบายเพิ่มเติม"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">รูปภาพ</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="input flex-1"
                                        placeholder="URL รูปภาพ หรืออัพโหลด"
                                    />
                                    <label className="btn-secondary py-2 px-4 cursor-pointer">
                                        {uploading ? '...' : '📤'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {imageUrl && (
                                    <img src={imageUrl} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">สีพื้นหลัง</label>
                                <select
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="input"
                                >
                                    {defaultBgColors.map((color) => (
                                        <option key={color.value} value={color.value} className="bg-gray-900">
                                            {color.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">ลิงก์</label>
                                <input
                                    type="text"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    className="input"
                                    placeholder="/store"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">ข้อความปุ่ม</label>
                                <input
                                    type="text"
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                    className="input"
                                    placeholder="SHOP NOW"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">ลำดับ</label>
                                <input
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-5 h-5 accent-purple-500"
                                />
                                <span className="text-gray-300">เปิดใช้งาน</span>
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="submit" className="btn-primary py-2 px-6">
                                {editingBanner ? '💾 บันทึก' : '➕ สร้าง'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { resetForm(); setShowForm(false); }}
                                className="btn-secondary py-2 px-6"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Banner List */}
            {isLoading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                </div>
            ) : banners.length === 0 ? (
                <div className="text-center py-20 glass-card">
                    <div className="text-6xl mb-4">🎠</div>
                    <h3 className="text-xl font-bold text-gray-300 mb-2">ยังไม่มีแบนเนอร์</h3>
                    <p className="text-gray-500">กดปุ่ม &quot;+ เพิ่มแบนเนอร์&quot; เพื่อเริ่มต้น</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {banners.map((banner) => (
                        <div key={banner.id} className="glass-card p-4 flex items-center gap-4">
                            {/* Preview */}
                            <div
                                className={`w-40 h-24 rounded-lg bg-gradient-to-r ${banner.bgColor} flex items-center justify-center text-white text-xs font-bold text-center p-2 flex-shrink-0`}
                            >
                                {banner.imageUrl ? (
                                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    banner.title
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white">{banner.title}</h3>
                                    {!banner.isActive && (
                                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">ปิดใช้งาน</span>
                                    )}
                                </div>
                                {banner.subtitle && <p className="text-gray-400 text-sm">{banner.subtitle}</p>}
                                <p className="text-gray-500 text-xs mt-1">ลำดับ: {banner.order} | ลิงก์: {banner.link}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(banner)}
                                    className="btn-secondary py-2 px-4 text-sm"
                                >
                                    ✏️ แก้ไข
                                </button>
                                <button
                                    onClick={() => handleDelete(banner.id)}
                                    className="bg-red-600/20 border border-red-600/50 text-red-400 py-2 px-4 rounded-lg text-sm hover:bg-red-600/30"
                                >
                                    🗑️ ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
