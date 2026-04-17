'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import {
    isTelegramWebApp,
    getTelegramWebApp,
    getTelegramInitData,
    getStoredSession,
    storeSession,
    clearSession,
} from '@/app/utils/telegram';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';

// Unified user type
export type UnifiedUser = {
    id: string;
    phone?: string | null;
    phone_number?: string | null;
    email?: string | null;
    role?: string;
    coins?: number;
    telegram_id?: number;
    username?: string;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
        email?: string;
    };
};

interface AuthContextType {
    user: UnifiedUser | null;
    loading: boolean;
    isTelegram: boolean;
    // Common Auth Methods
    loginWithTelegram: () => Promise<void>;
    logout: () => void;
    getAuthHeader: () => Record<string, string>;
    // Legacy support
    supabase: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();
const OWNER_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'moida.buvayda@gmail.com').toLowerCase();

/**
 * Decode the `exp` Unix timestamp from a JWT payload without verifying the signature.
 * Safe to run client-side — we only need to know if the token is expired, not if it's
 * tamper-proof (the server enforces that on every API call).
 */
function decodeTokenExpiry(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded  = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UnifiedUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTelegram, setIsTelegram] = useState(false);
    const initializedRef = useRef(false);
    const subscriptionRef = useRef<any>(null);
    const coinUserIdRef = useRef<string | null>(null);
    const lastFetchedUserIdRef = useRef<string | null>(null);
    const resumeTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const setupCoinSubscription = useCallback((userId: string) => {
        coinUserIdRef.current = userId;
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
        }

        subscriptionRef.current = supabase
            .channel(`coins-sync-${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload: any) => {
                setUser(current => {
                    if (!current) return null;
                    return { ...current, coins: payload.new?.coins || 0 };
                });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Auth] Coins subscription joined');
                }
            });
    }, []);

    const updateUserIfChanged = useCallback((newData: UnifiedUser | null) => {
        setUser(prev => {
            if (!prev && !newData) return null;
            if (!prev || !newData) return newData;
            
            // Shallow compare key fields that skip re-renders if identical
            const hasChanged =
                prev.id !== newData.id ||
                prev.coins !== newData.coins ||
                prev.role !== newData.role ||
                prev.phone_number !== newData.phone_number ||
                prev.phone !== newData.phone ||
                prev.user_metadata?.full_name !== newData.user_metadata?.full_name ||
                prev.user_metadata?.avatar_url !== newData.user_metadata?.avatar_url;
            
            return hasChanged ? newData : prev;
        });
    }, []);

    const fetchProfile = useCallback(async (supabaseUser: any) => {
        const userEmail = (supabaseUser.email || '').toLowerCase().trim();
        const metadataEmail = (supabaseUser.user_metadata?.email || '').toLowerCase().trim();
        const isOwner = userEmail === OWNER_EMAIL || metadataEmail === OWNER_EMAIL;

        if (isOwner) {
            return {
                id: supabaseUser.id,
                email: supabaseUser.email,
                phone: supabaseUser.phone,
                phone_number: supabaseUser.phone,
                coins: 0,
                role: 'admin',
                user_metadata: supabaseUser.user_metadata
            };
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('coins, full_name, avatar_url, role, phone_number')
            .eq('id', supabaseUser.id)
            .maybeSingle();

        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            phone: supabaseUser.phone,
            phone_number: profile?.phone_number || supabaseUser.phone,
            coins: profile?.coins || 0,
            role: profile?.role || 'user',
            user_metadata: {
                ...supabaseUser.user_metadata,
                full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
                avatar_url: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
                email: supabaseUser.email
            }
        };
    }, []);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        let isMounted = true;

        const init = async () => {
            // Telegram WebApp script loads with `afterInteractive` strategy — it may not be
            // ready when this useEffect fires. Detect Telegram early via URL hash (Telegram
            // always appends `#tgWebAppData=...`) and wait up to 3 s for the SDK to populate
            // window.Telegram.WebApp before we decide we're "not in Telegram".
            const looksLikeTelegram =
                typeof window !== 'undefined' &&
                window.location.hash.includes('tgWebAppData');

            if (looksLikeTelegram && !window.Telegram?.WebApp?.initData) {
                await new Promise<void>((resolve) => {
                    const interval = setInterval(() => {
                        if (window.Telegram?.WebApp?.initData) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 50);
                    // Safety timeout — don't block forever
                    setTimeout(() => { clearInterval(interval); resolve(); }, 3000);
                });
            }

            // 1. Parallel Check: Telegram vs Supabase
            const inTelegram = isTelegramWebApp();
            const storedTgSession = getStoredSession();

            if (inTelegram) {
                if (!isMounted) return;
                setIsTelegram(true);
                
                const WebApp = getTelegramWebApp();
                if (WebApp) {
                    try {
                        // Mark the app as ready to prevent initial splash screen hangs
                        WebApp.ready();
                        // Expand to full view
                        WebApp.expand();
                        
                        // Disable vertical swipes to prevent accidental app closes while scrolling products
                        if (WebApp.disableVerticalSwipes) {
                            WebApp.disableVerticalSwipes();
                        }
                    } catch (e) {
                        console.error('[Auth] WebApp bridge error', e);
                    }
                }

                const initData = getTelegramInitData();
                if (initData) {
                    try {
                        const res = await fetch('/api/user/me', {
                            headers: { 'X-Telegram-Init-Data': initData }
                        });
                        const data = await res.json();
                        if (data.authenticated && data.user && isMounted) {
                            const u = {
                                ...data.user,
                                user_metadata: {
                                    full_name: data.user.full_name,
                                    avatar_url: data.user.avatar_url
                                }
                            };
                            updateUserIfChanged(u);
                            setupCoinSubscription(u.id);
                            // Keep stored session fresh so the PWA works between Telegram opens
                            storeSession({
                                token: data.token,
                                refreshToken: data.refreshToken,
                                user: data.user,
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                            });
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('[Auth] Telegram fetch failed', e);
                    }
                }

                // Fallback: API failed or initData missing — use stored session so user stays logged in
                if (storedTgSession) {
                    const u = {
                        ...storedTgSession.user,
                        user_metadata: {
                            full_name: storedTgSession.user.full_name,
                            avatar_url: storedTgSession.user.avatar_url
                        }
                    };
                    updateUserIfChanged(u);
                    setupCoinSubscription(storedTgSession.user.id);
                }

                if (isMounted) setLoading(false);
                return; // Never fall through to Supabase for Telegram users

            } else if (storedTgSession) {
                // Not in Telegram (PWA / browser) but have a stored session.
                setIsTelegram(true);

                // Check whether the access token is still valid by decoding its exp claim.
                const tokenExp = decodeTokenExpiry(storedTgSession.token);
                const isExpired = !tokenExp || Math.floor(Date.now() / 1000) > tokenExp;

                if (isExpired && storedTgSession.refreshToken) {
                    // Silently exchange the refresh token for a new access token.
                    // This is the path that keeps 2-month-gap users logged in.
                    try {
                        const refreshRes = await fetch('/api/auth/refresh', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refreshToken: storedTgSession.refreshToken }),
                        });
                        const refreshData = await refreshRes.json();

                        if (refreshData.token) {
                            // Got a new access token — update the stored session and proceed
                            const updatedSession = {
                                ...storedTgSession,
                                token: refreshData.token,
                                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            };
                            storeSession(updatedSession);
                            const u = {
                                ...updatedSession.user,
                                user_metadata: {
                                    full_name: updatedSession.user.full_name,
                                    avatar_url: updatedSession.user.avatar_url,
                                },
                            };
                            if (isMounted) {
                                updateUserIfChanged(u);
                                setupCoinSubscription(updatedSession.user.id);
                                setLoading(false);
                            }
                            return;
                        }
                    } catch (e) {
                        console.warn('[Auth] Silent refresh failed (network?):', e);
                        // Network error — trust the stored user data for now so the app
                        // remains usable offline; we'll retry on next open.
                    }

                    // Refresh token rejected by server (revoked / expired) — clear session.
                    // The user will see a logged-out state and be prompted to open via Telegram.
                    clearSession();
                    if (isMounted) setLoading(false);
                    return;
                }

                // Token is still valid (or no refresh token to try) — use stored session.
                const u = {
                    ...storedTgSession.user,
                    user_metadata: {
                        full_name: storedTgSession.user.full_name,
                        avatar_url: storedTgSession.user.avatar_url,
                    },
                };
                if (isMounted) {
                    updateUserIfChanged(u);
                    setupCoinSubscription(storedTgSession.user.id);
                    setLoading(false);
                }
                return;
            }

            // 2. Fallback to Supabase (only for non-Telegram users)
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            if (sbUser && isMounted) {
                lastFetchedUserIdRef.current = sbUser.id;
                const profile = await fetchProfile(sbUser);
                updateUserIfChanged(profile);
                setupCoinSubscription(profile.id);
            }

            if (isMounted) setLoading(false);
        };

        init();

        // On Android/Telegram, WebSocket channels drop when the screen is locked.
        // We add a 2-second "stabilization" delay before reconnecting to allow the 
        // OS to finish its primary wake-up tasks (network/bridge).
        const handleVisibilityChange = () => {
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

            if (document.visibilityState === 'visible' && coinUserIdRef.current) {
                resumeTimerRef.current = setTimeout(() => {
                    // Only re-subscribe if the channel isn't healthy
                    const currentState = subscriptionRef.current?.state;
                    if (currentState !== 'joined' && currentState !== 'joining' && coinUserIdRef.current) {
                        console.log('[Auth] Stabilized — resuming coins subscription');
                        setupCoinSubscription(coinUserIdRef.current);
                    }
                }, 2000); 
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Supabase Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
            if (!isMounted) return;
            if (session?.user) {
                // Skip re-fetching profile if it's the same user already loaded
                if (session.user.id === lastFetchedUserIdRef.current) return;
                lastFetchedUserIdRef.current = session.user.id;
                const profile = await fetchProfile(session.user);
                updateUserIfChanged(profile);
                setupCoinSubscription(profile.id);
            } else {
                // Only clear if not in Telegram mode
                if (!isTelegramWebApp()) {
                    setUser(null);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
            if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
        };
    }, [fetchProfile, setupCoinSubscription]);

    const loginWithTelegram = useCallback(async () => {
        if (!isTelegramWebApp()) {
            window.location.href = TELEGRAM_CONFIG.botLink;
            return;
        }

        const WebApp = getTelegramWebApp()!;
        const initData = getTelegramInitData();

        if (!initData) throw new Error('Telegram data not found');

        return new Promise<void>((resolve, reject) => {
            WebApp.requestContact(async (sent, event) => {
                if (!sent || !event?.responseUnsafe?.contact) {
                    reject(new Error('Phone not shared'));
                    return;
                }

                try {
                    const contact = event.responseUnsafe.contact;
                    const res = await fetch('/api/auth/telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            initData,
                            phone: contact.phone_number,
                            telegramId: contact.user_id
                        })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    // Fetch full profile from /api/user/me — it also issues a fresh token + refresh token.
                    // /api/auth/telegram only returns a minimal user subset.
                    let fullUser = data.user;
                    let accessToken: string = data.token;
                    let refreshToken: string = data.refreshToken;
                    try {
                        const meRes = await fetch('/api/user/me', {
                            headers: { 'X-Telegram-Init-Data': initData }
                        });
                        const meData = await meRes.json();
                        if (meData.authenticated && meData.user) {
                            fullUser    = meData.user;
                            accessToken = meData.token;
                            refreshToken = meData.refreshToken;
                        }
                    } catch (e) {
                        console.warn('[Auth] Could not fetch full profile after contact share, using minimal data', e);
                    }

                    storeSession({
                        token: accessToken,
                        refreshToken,
                        user: fullUser,
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    });

                    const u = {
                        ...fullUser,
                        user_metadata: {
                            full_name: fullUser.full_name,
                            avatar_url: fullUser.avatar_url
                        }
                    };
                    updateUserIfChanged(u);
                    setupCoinSubscription(u.id);
                    resolve();
                } catch (err: any) {
                    reject(err);
                }
            });
        });
    }, [setupCoinSubscription, updateUserIfChanged]);

    const logout = useCallback(() => {
        const session = getStoredSession();
        setUser(null);
        clearSession();
        supabase.auth.signOut();

        // Revoke the refresh token server-side so it can't be used to re-authenticate
        // even if someone still has a copy of it (e.g. stolen device).
        if (session?.refreshToken) {
            fetch('/api/auth/refresh', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            }).catch(() => {}); // fire-and-forget; failure is non-critical
        }
    }, []);

    const getAuthHeader = useCallback(() => {
        const headers: Record<string, string> = {};
        const initData = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initData : null;
        if (initData) headers['X-Telegram-Init-Data'] = initData;

        const session = getStoredSession();
        if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

        return headers;
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        isTelegram,
        loginWithTelegram,
        logout,
        getAuthHeader,
        supabase
    }), [user, loading, isTelegram, loginWithTelegram, logout, getAuthHeader]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

// Aliases for compatibility
export const useSupabase = () => {
    const { user, loading, isTelegram } = useAuth();
    return { user, loading, isTelegramUser: isTelegram };
};

export const useTelegram = () => {
    const { isTelegram, user, loading, loginWithTelegram, logout, getAuthHeader } = useAuth();
    return { 
        isTelegram, 
        user: user as any, 
        loading, 
        login: loginWithTelegram, 
        logout, 
        getAuthHeader,
        session: null 
    };
};
