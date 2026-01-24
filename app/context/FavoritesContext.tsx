'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSupabase } from './SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';
import { getStoredSession, getAuthHeader } from '@/app/utils/telegram';

interface FavoritesContextType {
    favorites: string[];
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
    loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isTelegramUser } = useSupabase();
    const supabase = createClient();

    // 1. Load favorites on mount or when user changes
    useEffect(() => {
        async function loadFavorites() {
            setLoading(true);

            if (user) {
                // Check if Telegram user - use API proxy
                if (isTelegramUser) {
                    try {
                        const response = await fetch('/api/user/favorites', {
                            headers: getAuthHeader()
                        });
                        const data = await response.json();
                        if (data.favorites) {
                            setFavorites(data.favorites);
                        }
                    } catch (error) {
                        console.error('Error loading favorites via API:', error);
                    }
                } else {
                    // Regular Supabase user (admin)
                    const { data, error } = await supabase
                        .from('favorites')
                        .select('product_id')
                        .eq('user_id', user.id);

                    if (data && !error) {
                        setFavorites(data.map(f => f.product_id));
                    }
                }
            } else {
                // Load from LocalStorage (Guest)
                const saved = localStorage.getItem('favorites');
                if (saved) {
                    try {
                        setFavorites(JSON.parse(saved));
                    } catch (e) {
                        console.error('Failed to parse favorites', e);
                    }
                }
            }
            setLoading(false);
        }

        loadFavorites();
    }, [user, isTelegramUser]);

    // 2. Save to LocalStorage if guest
    useEffect(() => {
        if (!user) {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }, [favorites, user]);

    const toggleFavorite = useCallback(async (productId: string) => {
        // Optimistic UI update
        const isCurrentlyFavorite = favorites.includes(productId);
        const newFavorites = isCurrentlyFavorite
            ? favorites.filter(id => id !== productId)
            : [...favorites, productId];

        setFavorites(newFavorites);

        if (user) {
            // Use API proxy for Telegram users
            if (isTelegramUser) {
                try {
                    if (isCurrentlyFavorite) {
                        await fetch('/api/user/favorites', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                ...getAuthHeader()
                            },
                            body: JSON.stringify({ productId })
                        });
                    } else {
                        await fetch('/api/user/favorites', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...getAuthHeader()
                            },
                            body: JSON.stringify({ productId })
                        });
                    }
                } catch (error) {
                    console.error('Error syncing favorite via API:', error);
                    // Revert on error
                    setFavorites(favorites);
                }
            } else {
                // Direct Supabase for admin users
                if (isCurrentlyFavorite) {
                    await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('product_id', productId);
                } else {
                    await supabase
                        .from('favorites')
                        .insert({ user_id: user.id, product_id: productId });
                }
            }
        }
    }, [favorites, user, isTelegramUser, supabase]);

    const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
