'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from './AuthContext';
import { getAuthHeader } from '@/app/utils/telegram';

interface FavoritesContextType {
    favorites: string[];
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
    loading: boolean;
    initialLoadDone: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const { user, loading: authLoading } = useSupabase();

    // 1. Load favorites on mount or when user/auth state changes
    useEffect(() => {
        if (authLoading) return;

        async function loadFavorites() {
            setLoading(true);

            if (user) {
                try {
                    const response = await fetch('/api/user/favorites', {
                        headers: getAuthHeader(),
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Favorites] API error (${response.status}):`, errorText);
                        throw new Error(`API error: ${response.status}`);
                    }

                    const data = await response.json();
                    if (data.favorites) {
                        setFavorites(data.favorites);
                    }
                } catch (error) {
                    console.error('[Favorites] Sync failed:', error);
                    if (favorites.length === 0) {
                        const saved = localStorage.getItem('favorites');
                        if (saved) {
                            try {
                                setFavorites(JSON.parse(saved));
                            } catch (e) { }
                        }
                    }
                }
            } else {
                // Guest: Load from LocalStorage
                const saved = localStorage.getItem('favorites');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        setFavorites(parsed);
                    } catch (e) {
                        console.error('[Favorites] Failed to parse localStorage:', e);
                    }
                } else {
                }
            }
            setLoading(false);
            setInitialLoadDone(true);
        }

        loadFavorites();
    }, [user, authLoading]);

    // 2. ALWAYS save to localStorage as backup
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }, [favorites, loading]);

    const toggleFavorite = useCallback(async (productId: string) => {
        const isCurrentlyFavorite = favorites.includes(productId);
        const newFavorites = isCurrentlyFavorite
            ? favorites.filter(id => id !== productId)
            : [...favorites, productId];

        // Optimistic UI update
        setFavorites(newFavorites);

        if (user) {
            try {
                const response = await fetch('/api/user/favorites', {
                    method: isCurrentlyFavorite ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeader()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ productId })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('[Favorites] API error:', response.status, errorData);

                    if (response.status === 401) {
                        console.warn('[Favorites] Session expired, saving to localStorage as fallback');
                        localStorage.setItem('favorites', JSON.stringify(newFavorites));
                        return;
                    }

                    // For other errors, revert the optimistic update
                    setFavorites(favorites);
                }
            } catch (error) {
                console.error('[Favorites] Network error syncing favorite:', error);
                localStorage.setItem('favorites', JSON.stringify(newFavorites));
            }
        }
    }, [favorites, user]);

    const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

    const value = useMemo(() => ({
        favorites,
        toggleFavorite,
        isFavorite,
        loading,
        initialLoadDone
    }), [favorites, toggleFavorite, isFavorite, loading, initialLoadDone]);

    return (
        <FavoritesContext.Provider value={value}>
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
