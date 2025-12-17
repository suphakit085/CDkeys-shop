'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi, User } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    sessionExpired: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const savedToken = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    // Listen for unauthorized events
    useEffect(() => {
        const handleUnauthorized = () => {
            // Clear auth state
            setUser(null);
            setToken(null);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Set session expired flag
            setSessionExpired(true);

            // Redirect to login
            router.push('/login');
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [router]);

    // Auto-dismiss session expired toast after 5 seconds
    useEffect(() => {
        if (sessionExpired) {
            const timer = setTimeout(() => {
                setSessionExpired(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [sessionExpired]);

    const login = async (email: string, password: string) => {
        const response = await authApi.login({ email, password });
        setUser(response.user);
        setToken(response.accessToken);
        setSessionExpired(false);
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
    };

    const register = async (email: string, password: string, name: string) => {
        const response = await authApi.register({ email, password, name });
        setUser(response.user);
        setToken(response.accessToken);
        setSessionExpired(false);
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
    };

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        setSessionExpired(false);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }, []);

    const clearSessionExpired = useCallback(() => {
        setSessionExpired(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAdmin: user?.role === 'ADMIN',
                sessionExpired,
                login,
                register,
                logout,
                clearSessionExpired,
            }}
        >
            {children}

            {/* Session Expired Toast */}
            {sessionExpired && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    <div className="bg-orange-500/90 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                        <span className="text-2xl">⏰</span>
                        <div>
                            <p className="font-bold">เซสชันหมดอายุ</p>
                            <p className="text-sm opacity-90">กรุณาเข้าสู่ระบบอีกครั้ง</p>
                        </div>
                        <button
                            onClick={clearSessionExpired}
                            className="ml-4 text-white/80 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
