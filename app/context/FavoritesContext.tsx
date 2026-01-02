'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSupabase } from './SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';

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
    const { user } = useSupabase();
    const supabase = createClient();

    // 1. Load favorites on mount or when user changes
    useEffect(() => {
        async function loadFavorites() {
            setLoading(true);
            if (user) {
                // Load from Database
                const { data, error } = await supabase
                    .from('favorites')
                    .select('product_id')
                    .eq('user_id', user.id);

                if (data && !error) {
                    setFavorites(data.map(f => f.product_id));
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
    }, [user]);

    // 2. Save to LocalStorage if guest
    useEffect(() => {
        if (!user) {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }, [favorites, user]);

    const toggleFavorite = async (productId: string) => {
        // Optimistic UI update
        const isCurrentlyFavorite = favorites.includes(productId);
        const newFavorites = isCurrentlyFavorite
            ? favorites.filter(id => id !== productId)
            : [...favorites, productId];

        setFavorites(newFavorites);

        if (user) {
            // Sync with Database
            if (isCurrentlyFavorite) {
                // Remove
                await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
            } else {
                // Add
                await supabase
                    .from('favorites')
                    .insert({ user_id: user.id, product_id: productId });
            }
        }
    };

    const isFavorite = (id: string) => favorites.includes(id);

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
