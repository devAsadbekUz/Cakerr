'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { User } from '@supabase/supabase-js';

type SupabaseContext = {
    user: User | null;
    loading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Guard against missing environment variables
    const canInit = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    useEffect(() => {
        if (!canInit) {
            console.warn('Supabase keys are missing. Please add them to .env.local to enable backend features.');
            setLoading(false);
            return;
        }

        const supabase = createClient();

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const newUser = session?.user ?? null;

            setUser(current => {
                // If both are null, or both have same ID, don't trigger state update
                if (!current && !newUser) return null;
                if (current?.id === newUser?.id) {
                    console.log('[Auth] State refresh (no ID change), skipping update');
                    return current;
                }
                console.log('[Auth] User changed or session initialized:', event, newUser?.id);
                return newUser;
            });

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [canInit]);

    return (
        <Context.Provider value={{ user, loading }}>
            {children}
        </Context.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error('useSupabase must be used inside SupabaseProvider');
    }
    return context;
};
