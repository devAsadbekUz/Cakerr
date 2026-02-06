'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import {
    isTelegramWebApp,
    getTelegramWebApp,
    getTelegramInitData,
    getStoredSession,
    getAuthHeader
} from '@/app/utils/telegram';

// Unified user type that works for both Supabase and Telegram users
type UnifiedUser = {
    id: string;
    phone?: string | null;
    phone_number?: string | null; // Added for Telegram consistency
    email?: string | null;
    role?: string;
    coins?: number;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
        email?: string;
    };
};

type SupabaseContext = {
    user: UnifiedUser | null;
    loading: boolean;
    isTelegramUser: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// Create client outside component (singleton)
const supabase = createClient();

const OWNER_EMAIL = 'moida.buvayda@gmail.com'.toLowerCase();

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UnifiedUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTelegramUser, setIsTelegramUser] = useState(false);

    // Use ref to track if we've already initialized
    const initializedRef = useRef(false);
    const subscriptionRef = useRef<any>(null);

    // Guard against missing environment variables
    const canInit = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Helper to set up coin subscription
    const setupCoinSubscription = (userId: string) => {
        // Clean up existing subscription
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
            subscriptionRef.current = null;
        }

        subscriptionRef.current = supabase
            .channel(`coins-sync-${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload: any) => {
                console.log('[SupabaseContext] Coins updated:', payload.new?.coins);
                setUser(current => {
                    if (!current) return null;
                    return { ...current, coins: payload.new?.coins || 0 };
                });
            })
            .subscribe();
    };

    // SINGLE AUTH EFFECT - runs once on mount
    useEffect(() => {
        if (!canInit || initializedRef.current) return;
        initializedRef.current = true;

        let isMounted = true;

        const initAuth = async () => {
            // Check for Telegram session FIRST
            const tgSession = getStoredSession();

            // If we are in Telegram (or likely to be), wait a bit for TelegramContext to settle
            if (isTelegramWebApp()) {
                console.log('[SupabaseContext] Detected Telegram, waiting for TelegramContext...');
                // We'll let the event listener handle it
                return;
            }

            if (tgSession) {
                console.log('[SupabaseContext] Found Telegram session');
                setUser({
                    ...tgSession.user,
                    role: (tgSession.user as any).role || 'customer',
                    user_metadata: {
                        full_name: tgSession.user.full_name,
                        avatar_url: tgSession.user.avatar_url
                    }
                });
                setupCoinSubscription(tgSession.user.id);
                setIsTelegramUser(true);
                setLoading(false);
                return;
            }

            // Browser auth
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (supabaseUser && isMounted) {
                const userEmail = (supabaseUser.email || '').toLowerCase().trim();
                const metadataEmail = (supabaseUser.user_metadata?.email || '').toLowerCase().trim();
                const isOwner = userEmail === OWNER_EMAIL || metadataEmail === OWNER_EMAIL;

                // For owner, skip profile fetch
                if (isOwner) {
                    setUser({
                        id: supabaseUser.id,
                        email: supabaseUser.email,
                        phone: supabaseUser.phone,
                        phone_number: supabaseUser.phone, // Map phone to phone_number
                        coins: 0,
                        role: 'admin',
                        user_metadata: supabaseUser.user_metadata as UnifiedUser['user_metadata']
                    });
                    setupCoinSubscription(supabaseUser.id);
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('coins, full_name, avatar_url, role, phone_number')
                        .eq('id', supabaseUser.id)
                        .maybeSingle();

                    setUser({
                        id: supabaseUser.id,
                        email: supabaseUser.email,
                        phone: supabaseUser.phone,
                        phone_number: profile?.phone_number || supabaseUser.phone, // Map phone to phone_number
                        coins: profile?.coins || 0,
                        role: profile?.role || 'user',
                        user_metadata: {
                            ...supabaseUser.user_metadata,
                            full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
                            avatar_url: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
                            email: (supabaseUser.user_metadata?.email as string) || supabaseUser.email
                        } as UnifiedUser['user_metadata']
                    });
                    setupCoinSubscription(supabaseUser.id);
                }
            }
            if (isMounted) setLoading(false);
        };

        initAuth();

        // Auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            if (!isMounted) return;
            const newUser = session?.user ?? null;
            if (newUser) {
                const userEmail = (newUser.email || '').toLowerCase().trim();
                const metadataEmail = (newUser.user_metadata?.email || '').toLowerCase().trim();
                const isOwner = userEmail === OWNER_EMAIL || metadataEmail === OWNER_EMAIL;

                if (isOwner) {
                    setUser({
                        id: newUser.id,
                        email: newUser.email,
                        phone: newUser.phone,
                        coins: 0,
                        role: 'admin',
                        user_metadata: newUser.user_metadata as UnifiedUser['user_metadata']
                    });
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('coins, role')
                        .eq('id', newUser.id)
                        .maybeSingle();
                    setUser({
                        id: newUser.id,
                        email: newUser.email,
                        phone: newUser.phone,
                        coins: profile?.coins || 0,
                        role: profile?.role || 'user',
                        user_metadata: newUser.user_metadata as UnifiedUser['user_metadata']
                    });
                }
                setupCoinSubscription(newUser.id);
            } else {
                setUser(null);
                if (subscriptionRef.current) {
                    supabase.removeChannel(subscriptionRef.current);
                    subscriptionRef.current = null;
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [canInit]);

    // Telegram user update listener - CRITICAL: Don't re-fetch, use details directly!
    useEffect(() => {
        const handleUserUpdate = (e: any) => {
            const profileData = e.detail;
            if (profileData) {
                console.log('[SupabaseContext] Syncing user data:', profileData.full_name);
                setUser((prev: any) => {
                    if (!prev) return {
                        ...profileData,
                        phone: profileData.phone_number,
                        user_metadata: {
                            full_name: profileData.full_name,
                            avatar_url: profileData.avatar_url
                        }
                    };

                    return {
                        ...prev,
                        ...profileData,
                        phone: profileData.phone_number || prev.phone,
                        user_metadata: {
                            ...prev.user_metadata,
                            full_name: profileData.full_name || prev.user_metadata?.full_name,
                            avatar_url: profileData.avatar_url || prev.user_metadata?.avatar_url
                        }
                    };
                });
                setupCoinSubscription(profileData.id);
            }
            setLoading(false);
        };

        window.addEventListener('tg_user_updated', handleUserUpdate as EventListener);

        // Safety timeout for loading state
        const timeout = setTimeout(() => {
            if (loading) setLoading(false);
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
