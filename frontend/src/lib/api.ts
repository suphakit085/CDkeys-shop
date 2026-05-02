import { API_URL } from './config';

// Flag to prevent multiple refresh attempts at once
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    token?: string;
    skipRefresh?: boolean; // Skip auto-refresh for auth endpoints
}

interface FormDataRequestOptions {
    method?: 'POST' | 'PUT' | 'PATCH';
    token?: string;
    skipRefresh?: boolean;
}

function getStoredAccessToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') || undefined : undefined;
}

function resolveAccessToken(token?: string) {
    return getStoredAccessToken() || token;
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
    const token = resolveAccessToken(options.token);

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

async function requestFormData<T>(endpoint: string, formData: FormData, options: FormDataRequestOptions = {}): Promise<T> {
    const { method = 'POST', skipRefresh = false } = options;
    let token = resolveAccessToken(options.token);

    const buildHeaders = (authToken?: string) => {
        const headers: Record<string, string> = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }
        return headers;
    };

    let response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: buildHeaders(token),
        body: formData,
    });

    if (response.status === 401 && !skipRefresh && typeof window !== 'undefined') {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshAccessToken();
        }

        const newToken = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (newToken) {
            token = newToken;
            response = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers: buildHeaders(token),
                body: formData,
            });
        } else {
            window.dispatchEvent(new Event('auth:unauthorized'));
            throw new Error('เน€เธเธชเธเธฑเธเธซเธกเธ”เธญเธฒเธขเธธ เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธญเธตเธเธเธฃเธฑเนเธ');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
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

    getPage: (params?: { platform?: string; genre?: string; minPrice?: number; maxPrice?: number; search?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.platform) query.set('platform', params.platform);
        if (params?.genre) query.set('genre', params.genre);
        if (params?.minPrice !== undefined) query.set('minPrice', params.minPrice.toString());
        if (params?.maxPrice !== undefined) query.set('maxPrice', params.maxPrice.toString());
        if (params?.search) query.set('search', params.search);
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        const queryString = query.toString();
        return request<PaginatedResult<Game>>(`/games${queryString ? `?${queryString}` : ''}`);
    },

    getOne: (id: string) => request<Game>(`/games/${id}`),

    getGenres: () => request<string[]>('/games/genres'),

    searchImportCandidates: (query: string, token: string) => {
        const params = new URLSearchParams({ query, limit: '8' });
        return request<GameMetadataSearchResult[]>(`/games/import/search?${params.toString()}`, { token });
    },

    getRawgImport: (id: string, token: string) =>
        request<GameMetadataImport>(`/games/import/rawg/${id}`, { token }),

    getSteamImport: (id: string, token: string) =>
        request<GameMetadataImport>(`/games/import/steam/${id}`, { token }),

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

    create: (items: { gameId: string; quantity: number }[], token: string, paymentMethod: PaymentMethod = 'PROMPTPAY') =>
        request<Order>('/orders', { method: 'POST', body: { items, paymentMethod }, token }),

    pay: (orderId: string, token: string, simulateFail = false) =>
        request<{ success: boolean; message: string; order?: Order }>('/orders/pay', {
            method: 'POST',
            body: { orderId, simulateFail },
            token
        }),

    cancel: (id: string, token: string) =>
        request<Order>(`/orders/${id}`, { method: 'DELETE', token }),

    changePaymentMethod: (id: string, paymentMethod: PaymentMethod, token: string) =>
        request<Order>(`/orders/${id}/payment-method`, { method: 'PATCH', body: { paymentMethod }, token }),

    adminCancel: (id: string, reason: string | undefined, token: string) =>
        request<Order>(`/orders/admin/${id}/cancel`, { method: 'PATCH', body: { reason }, token }),

    // Admin
    getAll: (token: string) =>
        request<Order[]>('/orders/admin/all', { token }),

    getPage: (token: string, params?: { page?: number; limit?: number; search?: string; status?: string; paymentStatus?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.search) query.set('search', params.search);
        if (params?.status) query.set('status', params.status);
        if (params?.paymentStatus) query.set('paymentStatus', params.paymentStatus);
        const queryString = query.toString();
        return request<PaginatedResult<Order>>(`/orders/admin/all${queryString ? `?${queryString}` : ''}`, { token });
    },

    getSalesStats: (token: string) =>
        request<SalesStats>('/orders/admin/stats', { token }),
};

// Payment API
export const paymentApi = {
    uploadSlip: async (orderId: string, file: File, token: string) => {
        const formData = new FormData();
        formData.append('slip', file);

        return requestFormData<{
            message: string;
            slipUrl: string;
            autoVerified: boolean;
            slipData?: { amount?: number; transRef?: string };
        }>(`/payment/promptpay/upload-slip/${orderId}`, formData, { token });
    },

    createStripeCheckout: (orderId: string, token: string) =>
        request<{ url: string; sessionId: string }>(`/payment/stripe/checkout/${orderId}`, { method: 'POST', token }),

    getPending: (token: string) =>
        request<PendingPayment[]>('/payment/pending', { token }),

    verify: (orderId: string, token: string) =>
        request<{ message: string }>(`/payment/verify/${orderId}`, { method: 'POST', token }),

    resendKeys: (orderId: string, token: string) =>
        request<{ message: string }>(`/payment/resend-keys/${orderId}`, { method: 'POST', token }),

    reject: (orderId: string, reason: string, token: string) =>
        request<{ message: string }>(`/payment/reject/${orderId}`, { method: 'POST', body: { reason }, token }),
};

// Banners API (Admin)
export const bannersApi = {
    getAdmin: (token: string) =>
        request<Banner[]>('/banners/admin', { token }),

    create: (data: BannerInput, token: string) =>
        request<Banner>('/banners', { method: 'POST', body: data, token }),

    update: (id: string, data: BannerInput, token: string) =>
        request<Banner>(`/banners/${id}`, { method: 'PUT', body: data, token }),

    delete: (id: string, token: string) =>
        request<void>(`/banners/${id}`, { method: 'DELETE', token }),

    uploadImage: (file: File, token: string) => {
        const formData = new FormData();
        formData.append('image', file);
        return requestFormData<{ url: string; filename: string }>('/banners/upload-image', formData, { token });
    },
};

// Types
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'CUSTOMER' | 'ADMIN';
    createdAt?: string;
}

export interface Banner {
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

export type BannerInput = {
    title: string;
    subtitle?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    bgColor: string;
    link: string;
    buttonText: string;
    isActive: boolean;
    order: number;
};

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
    minimumSystemRequirements?: string;
    recommendedSystemRequirements?: string;
    features?: string[];
    supportedLanguages?: string[];
    activationRegion?: string;
    ageRating?: string;
    screenshots?: string[];
    availableKeys: number;
    createdAt: string;
}

export type Platform = 'STEAM' | 'PLAYSTATION' | 'XBOX' | 'NINTENDO' | 'ORIGIN' | 'UPLAY' | 'EPIC';

export interface GameMetadataSearchResult {
    source: 'rawg' | 'steam';
    sourceId: string;
    title: string;
    imageUrl?: string;
    releaseDate?: string;
    genres: string[];
    platforms: string[];
    rating?: number;
}

export interface GameMetadataImport {
    source: 'rawg' | 'steam';
    sourceId: string;
    sourceUrl: string;
    title: string;
    description?: string;
    platform: Platform;
    genre: string;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    minimumSystemRequirements?: string;
    recommendedSystemRequirements?: string;
    features: string[];
    supportedLanguages: string[];
    activationRegion: string;
    ageRating?: string;
    screenshots: string[];
}

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
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    paymentMethod?: PaymentMethod;
    paymentStatus?: 'PENDING' | 'SLIP_UPLOADED' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';
    paymentSlipUrl?: string;
    qrCodeData?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    stripePaymentStatus?: string;
    paidAt?: string;
    verifiedAt?: string;
    updatedAt?: string;
    promptpayRef?: string;
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
    minimumSystemRequirements?: string;
    recommendedSystemRequirements?: string;
    features?: string[];
    supportedLanguages?: string[];
    activationRegion?: string;
    ageRating?: string;
    screenshots?: string[];
}

export type PaymentMethod = 'PROMPTPAY' | 'CREDIT_CARD';

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
