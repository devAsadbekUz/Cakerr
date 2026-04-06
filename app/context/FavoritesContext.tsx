'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useSupabase } from './AuthContext';
import { getAuthHeader } from '@/app/utils/telegram';

// ---------------------------------------------------------------------------
// Module-level store for selective per-product rerenders.
// useSyncExternalStore bails out when the snapshot value (true/false) is unchanged,
// so toggling product A does NOT rerender cards for products B, C, D…
// ---------------------------------------------------------------------------
let _favoritesSet = new Set<string>();
const _listeners = new Set<() => void>();

function _subscribe(listener: () => void) {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
}

function _syncStore(favorites: string[]) {
    _favoritesSet = new Set(favorites);
    _listeners.forEach(l => l());
}

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
    // Always-current ref so toggleFavorite doesn't close over stale state
    const favoritesRef = useRef<string[]>([]);

    // Keep ref and module store in sync whenever favorites changes
    useEffect(() => {
        favoritesRef.current = favorites;
        _syncStore(favorites);
    }, [favorites]);

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

    // 2. Guest only: persist favorites to localStorage.
    // Logged-in users are server-authoritative; error fallbacks in toggleFavorite handle their edge cases.
    useEffect(() => {
        if (!loading && !user) {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }, [favorites, loading, user]);

    const toggleFavorite = useCallback(async (productId: string) => {
        // Use ref so this callback is stable (only recreated on user change, not every favorites change)
        const previous = favoritesRef.current;
        const isCurrentlyFavorite = previous.includes(productId);
        const newFavorites = isCurrentlyFavorite
            ? previous.filter(id => id !== productId)
            : [...previous, productId];

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

                    // Revert the optimistic update
                    setFavorites(previous);
                }
            } catch (error) {
                console.error('[Favorites] Network error syncing favorite:', error);
                localStorage.setItem('favorites', JSON.stringify(newFavorites));
            }
        }
    }, [user]); // stable — no longer depends on `favorites`

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

/**
 * Returns whether a single product is favorited.
 * Uses useSyncExternalStore so it only rerenders when THIS product's
 * favorite status flips — not when any other product is toggled.
 */
export function useIsFavorite(productId: string): boolean {
    return useSyncExternalStore(
        _subscribe,
        () => _favoritesSet.has(productId),
        () => false
    );
}
