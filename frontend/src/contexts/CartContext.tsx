'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Game, CartItem } from '@/lib/api';
import { useAuth } from './AuthContext';

interface CartContextType {
    items: CartItem[];
    itemCount: number;
    total: number;
    addItem: (game: Game) => void;
    removeItem: (gameId: string) => void;
    updateQuantity: (gameId: string, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);

    // Get cart key based on current user
    const getCartKey = () => {
        return user ? `cart_${user.id}` : 'cart_guest';
    };

    // Load cart when component mounts or user changes
    useEffect(() => {
        const cartKey = getCartKey();
        const savedCart = localStorage.getItem(cartKey);
        if (savedCart) {
            setItems(JSON.parse(savedCart));
        } else {
            setItems([]);
        }
    }, [user?.id]); // Clear cart when user changes

    // Save cart to localStorage
    useEffect(() => {
        const cartKey = getCartKey();
        localStorage.setItem(cartKey, JSON.stringify(items));
    }, [items, user?.id]);

    const addItem = (game: Game) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.game.id === game.id);
            if (existing) {
                return prev.map((item) =>
                    item.game.id === game.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { game, quantity: 1 }];
        });
    };

    const removeItem = (gameId: string) => {
        setItems((prev) => prev.filter((item) => item.game.id !== gameId));
    };

    const updateQuantity = (gameId: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(gameId);
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.game.id === gameId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.game.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                itemCount,
                total,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
