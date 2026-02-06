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
    const { user, isTelegramUser, loading: authLoading } = useSupabase();
    const supabase = createClient();

    // 1. Load favorites on mount or when user/auth state changes
    // IMPORTANT: Wait for auth loading to complete before loading favorites
    useEffect(() => {
        // Don't load favorites until auth state is determined
        if (authLoading) {
            return;
        }

        async function loadFavorites() {
            setLoading(true);

            if (user) {
                // Check if Telegram user - use API proxy
                if (isTelegramUser) {
                    try {
                        const authHeaders = getAuthHeader();
                        const hasTGHeader = !!authHeaders['X-Telegram-Init-Data'];
                        const hasAuthHeader = !!authHeaders['Authorization'];

                        console.log('[Favorites] Loading via API. Headers:', { hasTGHeader, hasAuthHeader });

                        const response = await fetch('/api/user/favorites', {
                            headers: authHeaders
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error(`[Favorites] API error (${response.status}):`, errorText);
                            throw new Error(`API error: ${response.status}`);
                        }

                        const data = await response.json();
                        if (data.favorites) {
                            console.log('[Favorites] Sync successful. Count:', data.favorites.length);
                            setFavorites(data.favorites);
                        }
                    } catch (error) {
                        console.error('[Favorites] Sync failed:', error);
                        // Only load from localStorage if we have nothing yet
                        if (favorites.length === 0) {
                            const saved = localStorage.getItem('favorites');
                            if (saved) {
                                try {
                                    setFavorites(JSON.parse(saved));
                                    console.log('[Favorites] Fallback to localStorage successful');
                                } catch (e) { }
                            }
                        }
                    }
                } else {
                    // Regular Supabase user (admin)
                    const { data, error } = await supabase
                        .from('favorites')
                        .select('product_id')
                        .eq('user_id', user.id);

                    if (data && !error) {
                        console.log('[Favorites] Loaded from Supabase:', data.length);
                        setFavorites(data.map((f: { product_id: string }) => f.product_id));
                    }
                }
            } else {
                // Load from LocalStorage (Guest)
                const saved = localStorage.getItem('favorites');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        console.log('[Favorites] Loaded from localStorage:', parsed.length);
                        setFavorites(parsed);
                    } catch (e) {
                        console.error('[Favorites] Failed to parse localStorage:', e);
                    }
                } else {
                    console.log('[Favorites] No saved favorites in localStorage');
                }
            }
            setLoading(false);
        }

        loadFavorites();
    }, [user, isTelegramUser, authLoading]);

    // 2. ALWAYS save to localStorage as backup (for both guests AND logged-in users)
    // This ensures favorites persist even if API call fails on next app load
    // Also saves empty arrays to clear stale data when user removes all favorites
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('favorites', JSON.stringify(favorites));
            if (favorites.length > 0) {
                console.log('[Favorites] Backed up to localStorage:', favorites.length);
            }
        }
    }, [favorites, loading]);

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
                    const response = await fetch('/api/user/favorites', {
                        method: isCurrentlyFavorite ? 'DELETE' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeader()
                        },
                        body: JSON.stringify({ productId })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('[Favorites] API error:', response.status, errorData);

                        // If unauthorized (session expired), fall back to localStorage
                        if (response.status === 401) {
                            console.warn('[Favorites] Session expired, saving to localStorage as fallback');
                            localStorage.setItem('favorites', JSON.stringify(newFavorites));
                            return; // Don't revert - keep local state synced with localStorage
                        }

                        // For other errors, revert the optimistic update
                        setFavorites(favorites);
                    } else {
                        console.log('[Favorites] Successfully synced to server');
                    }
                } catch (error) {
                    console.error('[Favorites] Network error syncing favorite:', error);
                    // Fall back to localStorage on network error (don't revert UI)
                    localStorage.setItem('favorites', JSON.stringify(newFavorites));
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
