'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'dark';

    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: ThemeMode) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>('dark');
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const initialTheme = getInitialTheme();
            setThemeState(initialTheme);
            applyTheme(initialTheme);
            window.localStorage.setItem('theme', initialTheme);
            setIsHydrated(true);
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        applyTheme(theme);
        window.localStorage.setItem('theme', theme);
    }, [isHydrated, theme]);

    const setTheme = useCallback((nextTheme: ThemeMode) => {
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem('theme', nextTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((currentTheme) => {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            window.localStorage.setItem('theme', nextTheme);
            return nextTheme;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
