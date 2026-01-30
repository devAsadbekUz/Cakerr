'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    isTelegramWebApp,
    getTelegramWebApp,
    getTelegramInitData,
    getStoredSession,
    storeSession,
    clearSession,
    TelegramSession
} from '@/app/utils/telegram';

interface TelegramUser {
    id: string;
    full_name: string;
    phone_number: string;
    telegram_id: number;
    username?: string;
    avatar_url?: string;
    role?: string;
    has_phone?: boolean;
}

interface TelegramContextType {
    isTelegram: boolean;
    session: TelegramSession | null; // Keep for legacy but marked as null
    user: TelegramUser | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    getAuthHeader: () => { 'X-Telegram-Init-Data'?: string; Authorization?: string };
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTelegram, setIsTelegram] = useState(false);

    // Initialize on mount
    useEffect(() => {
        // Check if running in Telegram
        const inTelegram = isTelegramWebApp();
        setIsTelegram(inTelegram);

        if (inTelegram) {
            const WebApp = getTelegramWebApp();
            WebApp?.ready();
            WebApp?.expand();

            const initData = getTelegramInitData();

            if (initData) {
                console.log('[TelegramContext] Attempting auth via initData');

                // Get user info and auto-register if needed
                fetch('/api/user/me', {
                    method: 'GET',
                    headers: {
                        'X-Telegram-Init-Data': initData
                    }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.authenticated && data.user) {
                            console.log('[TelegramContext] Auth successful:', data.user.full_name);
                            setUser(data.user);

                            // Dispatch event for other contexts (like SupabaseContext)
                            window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: data.user }));
                        } else {
                            console.log('[TelegramContext] Auth failed or user not found:', data.error);
                            setUser(null);
                        }
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error('[TelegramContext] Auth API error:', err);
                        setUser(null);
                        setLoading(false);
                    });
            } else {
                console.log('[TelegramContext] No initData available');
                setUser(null);
                setLoading(false);
            }
        } else {
            // Not in Telegram - check for legacy session or just stay unauthenticated
            const stored = getStoredSession();
            if (stored) {
                console.log('[TelegramContext] Found legacy session for:', stored.user.full_name);
                setUser(stored.user);
                // Dispatch event so SupabaseContext picks it up
                window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: stored.user }));
            }
            setLoading(false);
        }
    }, []);

    const login = useCallback(async () => {
        // If not in Telegram, redirect to bot to start the flow
        if (!isTelegramWebApp()) {
            window.location.href = 'https://t.me/moida_zakaz_bot';
            return;
        }

        const WebApp = getTelegramWebApp()!;
        const initData = getTelegramInitData();

        if (!initData) {
            throw new Error('Telegram maʼlumotlari topilmadi');
        }

        return new Promise<void>((resolve, reject) => {
            // Request phone number from user
            WebApp.requestContact((sent, event) => {
                if (!sent || !event) {
                    reject(new Error('Telefon raqami ulashilmadi'));
                    return;
                }

                const contact = event.responseUnsafe.contact;
                console.log('[TelegramContext] Contact received:', contact.phone_number);

                // Update user profile with phone number via webhook or special profile API
                // We'll use the existing /api/auth/telegram but update it later 
                // to just verify initData and update phone
                fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        initData,
                        phone: contact.phone_number,
                        telegramId: contact.user_id
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {
                            reject(new Error(data.error));
                            return;
                        }

                        // Refresh user data
                        fetch('/api/user/me', {
                            headers: { 'X-Telegram-Init-Data': initData }
                        })
                            .then(r => r.json())
                            .then(meData => {
                                if (meData.user) {
                                    setUser(meData.user);
                                    window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: meData.user }));
                                }
                                resolve();
                            });
                    })
                    .catch(err => {
                        console.error('[TelegramContext] Update error:', err);
                        reject(err);
                    });
            });
        });
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearSession();
    }, []);

    const getAuthHeader = useCallback((): { 'X-Telegram-Init-Data'?: string; Authorization?: string } => {
        const headers: { 'X-Telegram-Init-Data'?: string; Authorization?: string } = {};

        // 1. Add Telegram initData if we are in the bot
        const initData = getTelegramInitData();
        if (initData) {
            headers['X-Telegram-Init-Data'] = initData;
        }

        // 2. Add legacy Bearer token if we have a stored session
        const stored = getStoredSession();
        if (stored?.token) {
            headers['Authorization'] = `Bearer ${stored.token}`;
        }

        return headers;
    }, []);

    const value: TelegramContextType = {
        isTelegram,
        session: null, // Session object is deprecated in favor of direct user state
        user,
        loading,
        login,
        logout,
        getAuthHeader
    };

    return (
        <TelegramContext.Provider value={value}>
            {children}
        </TelegramContext.Provider>
    );
}

export function useTelegram() {
    const context = useContext(TelegramContext);
    if (context === undefined) {
        throw new Error('useTelegram must be used within a TelegramProvider');
    }
    return context;
}
