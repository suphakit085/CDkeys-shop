'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Game, gamesApi, Platform } from '@/lib/api';
import { getUploadUrl } from '@/lib/config';
import { useCart } from '@/contexts/CartContext';
import { formatMoney } from '@/lib/currency';

const platformStyles: Record<Platform, string> = {
    STEAM: 'badge-steam',
    PLAYSTATION: 'badge-playstation',
    XBOX: 'badge-xbox',
    NINTENDO: 'badge-nintendo',
    ORIGIN: 'badge-origin',
    UPLAY: 'badge-uplay',
    EPIC: 'badge-epic',
};

const platformLabels: Record<Platform, string> = {
    STEAM: 'Steam',
    PLAYSTATION: 'PlayStation',
    XBOX: 'Xbox',
    NINTENDO: 'Nintendo',
    ORIGIN: 'EA App / Origin',
    UPLAY: 'Ubisoft Connect',
    EPIC: 'Epic Games',
};

function fallbackInitials(title: string) {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function toLines(value?: string) {
    return (value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="border-b border-slate-100 py-3 last:border-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{value || 'ยังไม่ระบุ'}</p>
        </div>
    );
}

function RequirementList({ lines, fallback }: { lines: string[]; fallback: string }) {
    if (lines.length === 0) {
        return <p className="text-sm leading-6 text-slate-500">{fallback}</p>;
    }

    return (
        <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {lines.map((line) => (
                <li key={line} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                    <span>{line}</span>
                </li>
            ))}
        </ul>
    );
}

function RelatedGameTile({ game }: { game: Game }) {
    const imageUrl = game.imageUrl ? getUploadUrl(game.imageUrl) : '';
    const inStock = game.availableKeys > 0;

    return (
        <Link href={`/store/${game.id}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_16px_38px_rgba(15,23,42,0.1)]">
            <div className="relative aspect-[16/10] bg-slate-900">
                {imageUrl ? (
                    <img src={imageUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#101827,#243244)] text-3xl font-black text-white/30">
                        {fallbackInitials(game.title)}
                    </div>
                )}
                <div className="absolute left-3 top-3">
                    <span className={`badge ${platformStyles[game.platform]}`}>{platformLabels[game.platform]}</span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="line-clamp-2 min-h-11 text-base font-black leading-6 text-slate-950 group-hover:text-teal-700">
                    {game.title}
                </h3>
                <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold text-slate-400">{game.genre}</p>
                        <p className="mt-1 text-xl font-black text-slate-950">{formatMoney(game.price)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {inStock ? 'พร้อมส่ง' : 'หมด'}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { addItem, items } = useCart();
    const [game, setGame] = useState<Game | null>(null);
    const [relatedGames, setRelatedGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    const cartItem = items.find((item) => item.game.id === id);
    const inCartQty = cartItem?.quantity || 0;

    const allImages = useMemo(() => {
        if (!game) return [];
        return [game.imageUrl, ...(game.screenshots || [])]
            .filter(Boolean)
            .map((image) => getUploadUrl(image as string));
    }, [game]);

    const loadRelatedGames = useCallback(async (currentGame: Game) => {
        try {
            const [samePlatform, sameGenre] = await Promise.all([
                gamesApi.getAll({ platform: currentGame.platform }),
                gamesApi.getAll({ genre: currentGame.genre }),
            ]);
            const unique = [...samePlatform, ...sameGenre]
                .filter((item, index, list) => item.id !== currentGame.id && list.findIndex((match) => match.id === item.id) === index)
                .slice(0, 4);
            setRelatedGames(unique);
        } catch {
            setRelatedGames([]);
        }
    }, []);

    const loadGame = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await gamesApi.getOne(id);
            setGame(data);
            loadRelatedGames(data);
        } catch {
            setGame(null);
        } finally {
            setIsLoading(false);
        }
    }, [id, loadRelatedGames]);

    useEffect(() => {
        loadGame();
    }, [loadGame]);

    function addSelectionToCart() {
        if (!game) return;
        for (let index = 0; index < quantity; index++) {
            addItem(game);
        }
        setQuantity(1);
    }

    function formatDate(dateString?: string) {
        if (!dateString) return 'ยังไม่ระบุ';
        return new Date(dateString).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    if (isLoading) {
        return (
            <div className="product-detail-page min-h-screen bg-[#f5f7fb] py-8 text-slate-900">
                <div className="page-shell animate-pulse">
                    <div className="mb-6 h-5 w-56 rounded bg-slate-200" />
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="grid gap-6 lg:grid-cols-[430px_minmax(0,1fr)]">
                            <div className="aspect-[16/11] rounded-lg bg-slate-200" />
                            <div className="space-y-4">
                                <div className="h-10 w-4/5 rounded bg-slate-200" />
                                <div className="h-24 rounded bg-slate-200" />
                                <div className="h-44 rounded bg-slate-200" />
                            </div>
                        </div>
                        <div className="h-80 rounded-lg bg-slate-200" />
                    </div>
                </div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="product-detail-page min-h-screen bg-[#f5f7fb] py-20 text-center text-slate-900">
                <div className="page-shell">
                    <h1 className="text-3xl font-black">ไม่พบเกมนี้</h1>
                    <p className="mt-3 text-slate-500">เกมนี้อาจถูกลบหรือไม่มีในร้านแล้ว</p>
                    <Link href="/store" className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-teal-500 px-6 font-black text-white hover:bg-teal-600">
                        กลับไปร้านค้า
                    </Link>
                </div>
            </div>
        );
    }

    const inStock = game.availableKeys > 0;
    const maxQty = Math.max(0, Math.min(game.availableKeys - inCartQty, 10));
    const activeImageSrc = allImages[activeImage];
    const gameIconSrc = game.imageUrl ? getUploadUrl(game.imageUrl) : allImages[0];
    const features = game.features?.length
        ? game.features
        : ['ส่งคีย์ดิจิทัลหลังยืนยันการชำระเงิน', `เปิดใช้งานบน ${platformLabels[game.platform]}`, 'ดูคีย์ย้อนหลังได้จากหน้าคำสั่งซื้อ'];
    const languages = game.supportedLanguages || [];
    const minimumRequirements = toLines(game.minimumSystemRequirements || game.systemRequirements);
    const recommendedRequirements = toLines(game.recommendedSystemRequirements);

    return (
        <div className="product-detail-page min-h-screen bg-[#f5f7fb] pb-14 text-slate-900">
            <div className="border-b border-slate-200 bg-white">
                <div className="page-shell py-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <Link href="/" className="font-semibold hover:text-teal-600">
                            หน้าแรก
                        </Link>
                        <span>/</span>
                        <Link href="/store" className="font-semibold hover:text-teal-600">
                            เกมทั้งหมด
                        </Link>
                        <span>/</span>
                        <span className="line-clamp-1 max-w-[52ch] text-slate-900">{game.title}</span>
                    </div>
                </div>
            </div>

            <main className="page-shell py-6">
                <div className="product-hero-card grid gap-6 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.1)] xl:grid-cols-[minmax(0,1fr)_480px]">
                    <section className="min-w-0">
                        <div className="min-w-0">
                            <div className="overflow-hidden rounded-lg bg-slate-900 shadow-[0_16px_42px_rgba(15,23,42,0.16)]">
                                <div className="relative aspect-[16/10] min-h-[320px] bg-slate-900 xl:min-h-[520px]">
                                    {activeImageSrc ? (
                                        <>
                                            <img src={activeImageSrc} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
                                            <div className="absolute inset-0 bg-slate-950/45" />
                                            <img src={activeImageSrc} alt={game.title} className="absolute inset-0 z-10 h-full w-full object-contain" />
                                        </>
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#101827,#243244)] text-6xl font-black text-white/30">
                                            {fallbackInitials(game.title)}
                                        </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-black/70 to-transparent" />
                                    <div className="absolute left-4 top-4 z-30 flex flex-wrap gap-2">
                                        <span className={`badge ${platformStyles[game.platform]}`}>{platformLabels[game.platform]}</span>
                                        <span className={`badge ${inStock ? 'badge-available' : 'badge-sold'}`}>
                                            {inStock ? 'พร้อมส่ง' : 'สินค้าหมด'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {allImages.length > 1 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                    {allImages.map((image, index) => (
                                        <button
                                            key={image}
                                            onClick={() => setActiveImage(index)}
                                            className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border bg-white transition ${activeImage === index ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                                            aria-label={`เลือกภาพที่ ${index + 1}`}
                                        >
                                            <img src={image} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="hidden">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                                    Digital key
                                </span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600">
                                    {game.genre}
                                </span>
                            </div>

                            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 lg:text-4xl">{game.title}</h1>
                            {game.description && (
                                <p className="mt-4 text-sm leading-7 text-slate-600">{game.description}</p>
                            )}

                            <div className="mt-5 grid grid-cols-2 gap-x-5 border-t border-slate-100 pt-2 sm:grid-cols-3">
                                <InfoRow label="แพลตฟอร์ม" value={platformLabels[game.platform]} />
                                <InfoRow label="แนวเกม" value={game.genre} />
                                <InfoRow label="โซน" value={game.activationRegion || 'Global'} />
                                <InfoRow label="วันวางจำหน่าย" value={formatDate(game.releaseDate)} />
                                <InfoRow label="ผู้พัฒนา" value={game.developer} />
                                <InfoRow label="เรตติ้ง" value={game.ageRating} />
                            </div>
                        </div>
                    </section>

                    <aside className="product-buy-panel h-fit rounded-lg border border-slate-200 bg-slate-50 p-5 xl:sticky xl:top-24">
                        <div className="mb-5 overflow-hidden rounded-lg bg-slate-900">
                            {gameIconSrc ? (
                                <img src={gameIconSrc} alt={game.title} className="h-28 w-full object-cover" />
                            ) : (
                                <div className="flex h-28 items-center justify-center bg-[linear-gradient(135deg,#101827,#243244)] text-3xl font-black text-white/30">
                                    {fallbackInitials(game.title)}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                                Digital key
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600">
                                {game.genre}
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950">{game.title}</h1>
                        {game.description && (
                            <p className="mt-3 text-sm leading-6 text-slate-600">{game.description}</p>
                        )}

                        <div className="mt-5 rounded-lg bg-[#1d3672] p-4 text-white">
                            <p className="text-sm font-black">แพลตฟอร์มเกม</p>
                            <span className={`badge ${platformStyles[game.platform]} mt-3`}>{platformLabels[game.platform]}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-1 text-amber-400">
                                <span>★</span>
                                <span>★</span>
                                <span>★</span>
                                <span>★</span>
                                <span>★</span>
                                <span className="ml-2 font-bold text-slate-600">5.0/5</span>
                            </div>
                            <span>{Math.max(1200, game.availableKeys * 97)} views</span>
                        </div>

                        <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
                            <p><span className="font-black text-slate-900">Publisher:</span> {game.publisher || 'Not specified'}</p>
                            <p><span className="font-black text-slate-900">Developer:</span> {game.developer || 'Not specified'}</p>
                            <p><span className="font-black text-slate-900">Release Date:</span> {formatDate(game.releaseDate)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-500">ราคาสินค้า</p>
                        <div className="mt-1 flex items-end justify-between gap-4">
                            <p className="text-4xl font-black text-slate-950">{formatMoney(game.price)}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {inStock ? `${game.availableKeys} คีย์` : 'หมด'}
                            </span>
                        </div>

                        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="grid gap-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500">รูปแบบสินค้า</span>
                                    <span className="font-black text-slate-900">CD Key</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500">การจัดส่ง</span>
                                    <span className="font-black text-slate-900">หลังยืนยันชำระเงิน</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500">ชำระเงิน</span>
                                    <span className="font-black text-slate-900">PromptPay</span>
                                </div>
                            </div>
                        </div>

                        {inStock && (
                            <div className="mt-5 flex items-center justify-between gap-4">
                                <span className="text-sm font-black text-slate-700">จำนวน</span>
                                <div className="grid grid-cols-[42px_56px_42px] overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="h-11 text-lg font-black text-slate-900 hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        -
                                    </button>
                                    <span className="flex h-11 items-center justify-center border-x border-slate-200 bg-slate-50 font-black text-slate-900">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                        disabled={quantity >= maxQty || maxQty <= 0}
                                        className="h-11 text-lg font-black text-slate-900 hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {inCartQty > 0 && (
                            <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-center text-sm font-bold text-teal-700">
                                มีในตะกร้าแล้ว {inCartQty} ชิ้น
                            </p>
                        )}

                        <button
                            onClick={addSelectionToCart}
                            disabled={!inStock || maxQty <= 0}
                            className="mt-5 h-12 w-full rounded-lg bg-teal-500 px-5 text-base font-black text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {!inStock ? 'สินค้าหมด' : maxQty <= 0 ? 'ถึงจำนวนสูงสุดแล้ว' : 'เพิ่มลงตะกร้า'}
                        </button>

                        <Link href="/cart" className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 hover:bg-slate-50">
                            ไปหน้าตะกร้า
                        </Link>
                    </aside>
                </div>

                <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
                    {[
                        ['#details', 'รายละเอียด'],
                        ['#features', 'ข้อมูลสินค้า'],
                        ['#requirements', 'ระบบที่ต้องการ'],
                        ['#activation', 'วิธีเปิดใช้งาน'],
                    ].map(([href, label]) => (
                        <a key={href} href={href} className="flex h-10 flex-shrink-0 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:border-teal-300 hover:text-teal-700">
                            {label}
                        </a>
                    ))}
                </div>

                <section id="details" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                        <p className="text-sm font-black text-teal-700">รายละเอียดเกม</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-950">เกี่ยวกับเกมนี้</h2>
                        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                            {game.description || 'ยังไม่มีรายละเอียดเกมเพิ่มเติม'}
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                        <p className="text-sm font-black text-teal-700">ภาษา</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-950">รองรับภาษา</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {(languages.length ? languages : ['ยังไม่ระบุ']).map((language) => (
                                <span key={language} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                                    {language}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="features" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                    <p className="text-sm font-black text-teal-700">ข้อมูลสินค้า</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">สิ่งที่จะได้รับ</h2>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <div key={feature} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                                {feature}
                            </div>
                        ))}
                    </div>
                </section>

                <section id="requirements" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                    <p className="text-sm font-black text-teal-700">System requirements</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">ความต้องการระบบ</h2>
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                            <h3 className="text-lg font-black text-slate-950">ขั้นต่ำ</h3>
                            <div className="mt-4">
                                <RequirementList lines={minimumRequirements} fallback="ยังไม่มีข้อมูลความต้องการขั้นต่ำ" />
                            </div>
                        </div>
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
                            <h3 className="text-lg font-black text-slate-950">แนะนำ</h3>
                            <div className="mt-4">
                                <RequirementList lines={recommendedRequirements} fallback="ยังไม่มีข้อมูลสเปกแนะนำ" />
                            </div>
                        </div>
                    </div>
                </section>

                <section id="activation" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                    <p className="text-sm font-black text-teal-700">วิธีใช้งาน</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">เปิดใช้งานคีย์อย่างไร</h2>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {[
                            ['1', 'สั่งซื้อและชำระเงิน', 'เพิ่มเกมลงตะกร้า แล้วอัปโหลดสลิป PromptPay ในหน้าชำระเงิน'],
                            ['2', 'รอยืนยันคำสั่งซื้อ', 'เมื่อร้านตรวจสอบสำเร็จ สถานะคำสั่งซื้อจะเปลี่ยนเป็นสำเร็จ'],
                            ['3', `Redeem บน ${platformLabels[game.platform]}`, 'คัดลอกคีย์จากหน้าคำสั่งซื้อ แล้วนำไปเปิดใช้งานบนแพลตฟอร์มที่กำหนด'],
                        ].map(([step, title, text]) => (
                            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-black text-white">{step}</div>
                                <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {allImages.length > 1 && (
                    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                        <p className="text-sm font-black text-teal-700">Media</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-950">ภาพเพิ่มเติม</h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {allImages.slice(1).map((image) => (
                                <img key={image} src={image} alt={`${game.title} screenshot`} className="aspect-video w-full rounded-lg object-cover" />
                            ))}
                        </div>
                    </section>
                )}

                {relatedGames.length > 0 && (
                    <section className="mt-10">
                        <div className="mb-5 flex items-end justify-between">
                            <div>
                                <p className="text-sm font-black text-teal-700">เกมอื่นที่น่าสนใจ</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-950">สินค้าใกล้เคียง</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {relatedGames.map((relatedGame) => (
                                <RelatedGameTile key={relatedGame.id} game={relatedGame} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
