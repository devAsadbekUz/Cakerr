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

        const supabase = createClient();

        const getUser = async () => {
            // First check for legacy Telegram session (for OTP users or if initData fails)
            const tgSession = getStoredSession();
            if (tgSession) {
                console.log('[SupabaseContext] Found Telegram session:', tgSession.user.full_name);
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
            // We don't set loading false yet, as TelegramContext might still be verifying initData
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only handle Supabase auth if not a Telegram user
            if (isTelegramUser) return;

            const newUser = session?.user ?? null;

            setUser(current => {
                if (!current && !newUser) return null;
                if (current?.id === newUser?.id) return current;

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
        });

        return () => subscription.unsubscribe();
    }, [canInit, isTelegramUser]);

    // Listen for Telegram user updates
    useEffect(() => {
        const handleUserUpdate = (e: any) => {
            const tgUser = e.detail;
            console.log('[SupabaseContext] Telegram user updated:', tgUser?.full_name);

            if (tgUser) {
                setUser({
                    id: tgUser.id,
                    phone: tgUser.phone_number,
                    user_metadata: {
                        full_name: tgUser.full_name,
                        avatar_url: tgUser.avatar_url
                    }
                });
                setIsTelegramUser(true);
            } else {
                // If TG user becomes null, we don't necessarily logout Supabase user
                // but we clear the TG state
                setIsTelegramUser(false);
            }
            setLoading(false);
        };

        window.addEventListener('tg_user_updated', handleUserUpdate as EventListener);

        // Wait a bit for TelegramContext to initialize if it's going to
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => {
            window.removeEventListener('tg_user_updated', handleUserUpdate as EventListener);
            clearTimeout(timeout);
        };
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
