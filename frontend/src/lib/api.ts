const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Flag to prevent multiple refresh attempts at once
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    token?: string;
    skipRefresh?: boolean; // Skip auto-refresh for auth endpoints
}

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (!refreshToken) {
        return null;
    }

    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // Save new tokens
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
        }

        return data.accessToken;
    } catch {
        return null;
    }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, skipRefresh = false } = options;
    let { token } = options;

    // Auto-get token from localStorage if not provided
    if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('accessToken') || undefined;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && !skipRefresh && typeof window !== 'undefined') {
        // Prevent multiple simultaneous refresh attempts
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshAccessToken();
        }

        const newToken = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (newToken) {
            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
        } else {
            // Refresh failed - trigger logout
            window.dispatchEvent(new Event('auth:unauthorized'));
            throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
}

// Auth API
export const authApi = {
    register: (data: { email: string; password: string; name: string }) =>
        request<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', { method: 'POST', body: data, skipRefresh: true }),

    login: (data: { email: string; password: string }) =>
        request<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { method: 'POST', body: data, skipRefresh: true }),

    getProfile: (token: string) =>
        request<User>('/auth/profile', { token }),

    refresh: (refreshToken: string) =>
        request<{ accessToken: string; refreshToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken }, skipRefresh: true }),
};

// Games API
export const gamesApi = {
    getAll: (params?: { platform?: string; genre?: string; minPrice?: number; maxPrice?: number; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.platform) query.set('platform', params.platform);
        if (params?.genre) query.set('genre', params.genre);
        if (params?.minPrice !== undefined) query.set('minPrice', params.minPrice.toString());
        if (params?.maxPrice !== undefined) query.set('maxPrice', params.maxPrice.toString());
        if (params?.search) query.set('search', params.search);
        const queryString = query.toString();
        return request<Game[]>(`/games${queryString ? `?${queryString}` : ''}`);
    },

    getOne: (id: string) => request<Game>(`/games/${id}`),

    getGenres: () => request<string[]>('/games/genres'),

    create: (data: CreateGameDto, token: string) =>
        request<Game>('/games', { method: 'POST', body: data, token }),

    update: (id: string, data: Partial<CreateGameDto>, token: string) =>
        request<Game>(`/games/${id}`, { method: 'PUT', body: data, token }),

    delete: (id: string, token: string) =>
        request<Game>(`/games/${id}`, { method: 'DELETE', token }),
};

// Keys API (Admin)
export const keysApi = {
    getByGame: (gameId: string, token: string) =>
        request<CdKey[]>(`/keys/game/${gameId}`, { token }),

    getStats: (token: string, gameId?: string) =>
        request<KeyStats>(`/keys/stats${gameId ? `?gameId=${gameId}` : ''}`, { token }),

    addKeys: (data: { gameId: string; keys: string[] }, token: string) =>
        request<{ added: number; duplicates: number }>('/keys', { method: 'POST', body: data, token }),

    updateStatus: (id: string, status: string, token: string) =>
        request<CdKey>(`/keys/${id}/status`, { method: 'PATCH', body: { status }, token }),

    delete: (id: string, token: string) =>
        request<void>(`/keys/${id}`, { method: 'DELETE', token }),
};

// Orders API
export const ordersApi = {
    getMy: (token: string) =>
        request<Order[]>('/orders', { token }),

    getOne: (id: string, token: string) =>
        request<Order>(`/orders/${id}`, { token }),

    create: (items: { gameId: string; quantity: number }[], token: string) =>
        request<Order>('/orders', { method: 'POST', body: { items }, token }),

    pay: (orderId: string, token: string, simulateFail = false) =>
        request<{ success: boolean; message: string; order?: Order }>('/orders/pay', {
            method: 'POST',
            body: { orderId, simulateFail },
            token
        }),

    cancel: (id: string, token: string) =>
        request<Order>(`/orders/${id}`, { method: 'DELETE', token }),

    // Admin
    getAll: (token: string) =>
        request<Order[]>('/orders/admin/all', { token }),

    getSalesStats: (token: string) =>
        request<SalesStats>('/orders/admin/stats', { token }),
};

// Payment API
export const paymentApi = {
    uploadSlip: async (orderId: string, file: File, token: string) => {
        const formData = new FormData();
        formData.append('slip', file);

        const response = await fetch(`${API_URL}/payment/promptpay/upload-slip/${orderId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message);
        }

        return response.json() as Promise<{
            message: string;
            slipUrl: string;
            autoVerified: boolean;
            slipData?: { amount?: number; transRef?: string };
        }>;
    },

    getPending: (token: string) =>
        request<PendingPayment[]>('/payment/pending', { token }),

    verify: (orderId: string, token: string) =>
        request<{ message: string }>(`/payment/verify/${orderId}`, { method: 'POST', token }),

    reject: (orderId: string, reason: string, token: string) =>
        request<{ message: string }>(`/payment/reject/${orderId}`, { method: 'POST', body: { reason }, token }),
};

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'CUSTOMER' | 'ADMIN';
    createdAt?: string;
}

export interface Game {
    id: string;
    title: string;
    description?: string;
    platform: Platform;
    genre: string;
    price: number;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    screenshots?: string[];
    availableKeys: number;
    createdAt: string;
}

export type Platform = 'STEAM' | 'PLAYSTATION' | 'XBOX' | 'NINTENDO' | 'ORIGIN' | 'UPLAY' | 'EPIC';

export interface CdKey {
    id: string;
    gameId: string;
    keyCode: string;
    status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
    game?: { title: string; platform: string };
    orderItem?: { order: { id: string; createdAt: string; user: { email: string } } };
}

export interface KeyStats {
    available: number;
    reserved: number;
    sold: number;
}

export interface Order {
    id: string;
    userId: string;
    total: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    paymentStatus?: 'PENDING' | 'SLIP_UPLOADED' | 'VERIFIED' | 'REJECTED';
    paymentSlipUrl?: string;
    qrCodeData?: string;
    paidAt?: string;
    createdAt: string;
    user?: { email: string; name: string };
    orderItems: OrderItem[];
}

export interface OrderItem {
    id: string;
    gameId: string;
    price: number;
    game: { id: string; title: string; platform: string; imageUrl?: string };
    cdKey?: { keyCode: string };
}

export interface PendingPayment {
    id: string;
    userId: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentSlipUrl?: string;
    createdAt: string;
    user: { id: string; email: string; name: string };
    orderItems: {
        id: string;
        game: { id: string; title: string; imageUrl?: string; platform: string };
    }[];
}

export interface CreateGameDto {
    title: string;
    description?: string;
    platform: Platform;
    genre: string;
    price: number;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    screenshots?: string[];
}

export interface SalesStats {
    totalRevenue: number;
    completedOrders: number;
    ordersByStatus: Record<string, number>;
    recentOrders: Order[];
}

export interface CartItem {
    game: Game;
    quantity: number;
}
