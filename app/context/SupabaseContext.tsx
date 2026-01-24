'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { getStoredSession, TelegramSession } from '@/app/utils/telegram';

// Unified user type that works for both Supabase and Telegram users
type UnifiedUser = {
    id: string;
    phone?: string | null;
    email?: string | null;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
    };
};

type SupabaseContext = {
    user: UnifiedUser | null;
    loading: boolean;
    isTelegramUser: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UnifiedUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTelegramUser, setIsTelegramUser] = useState(false);

    // Guard against missing environment variables
    const canInit = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    useEffect(() => {
        if (!canInit) {
            console.warn('Supabase keys are missing. Please add them to .env.local to enable backend features.');
            setLoading(false);
            return;
        }

        // Check for Telegram session first
        const tgSession = getStoredSession();
        if (tgSession) {
            console.log('[Auth] Telegram session found:', tgSession.user.full_name);
            setUser({
                id: tgSession.user.id,
                phone: tgSession.user.phone_number,
                user_metadata: {
                    full_name: tgSession.user.full_name,
                    avatar_url: tgSession.user.avatar_url
                }
            });
            setIsTelegramUser(true);
            setLoading(false);
            return;
        }

        // Fall back to Supabase auth (for admin users)
        const supabase = createClient();

        const getUser = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (supabaseUser) {
                setUser({
                    id: supabaseUser.id,
                    email: supabaseUser.email,
                    phone: supabaseUser.phone,
                    user_metadata: supabaseUser.user_metadata as UnifiedUser['user_metadata']
                });
                setIsTelegramUser(false);
            }
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only handle Supabase auth if not a Telegram user
            const storedTgSession = getStoredSession();
            if (storedTgSession) {
                return; // Telegram user, ignore Supabase auth changes
            }

            const newUser = session?.user ?? null;

            setUser(current => {
                // If both are null, or both have same ID, don't trigger state update
                if (!current && !newUser) return null;
                if (current?.id === newUser?.id) {
                    return current;
                }
                console.log('[Auth] Supabase user changed:', event, newUser?.id);

                if (newUser) {
                    return {
                        id: newUser.id,
                        email: newUser.email,
                        phone: newUser.phone,
                        user_metadata: newUser.user_metadata as UnifiedUser['user_metadata']
                    };
                }
                return null;
            });

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [canInit]);

    // Re-check Telegram session on storage changes (for logout)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'tg_session') {
                const tgSession = getStoredSession();
                if (tgSession) {
                    setUser({
                        id: tgSession.user.id,
                        phone: tgSession.user.phone_number,
                        user_metadata: {
                            full_name: tgSession.user.full_name,
                            avatar_url: tgSession.user.avatar_url
                        }
                    });
                    setIsTelegramUser(true);
                } else {
                    // Session cleared, check Supabase
                    setIsTelegramUser(false);
                    setUser(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <Context.Provider value={{ user, loading, isTelegramUser }}>
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
