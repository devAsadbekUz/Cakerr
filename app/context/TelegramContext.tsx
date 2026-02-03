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
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 10; // 2 seconds total

        const checkTelegram = () => {
            const inTelegram = isTelegramWebApp();

            if (inTelegram) {
                setIsTelegram(true);
                const WebApp = getTelegramWebApp();
                WebApp?.ready();
                WebApp?.expand();

                const initData = getTelegramInitData();
                if (initData && isMounted) {
                    console.log('[TelegramContext] Auth via initData');
                    fetch('/api/user/me', {
                        method: 'GET',
                        headers: { 'X-Telegram-Init-Data': initData }
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.authenticated && data.user && isMounted) {
                                setUser(data.user);
                                window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: data.user }));
                            }
                            setLoading(false);
                        })
                        .catch(err => {
                            console.error('[TelegramContext] Auth error:', err);
                            setLoading(false);
                        });
                } else {
                    setLoading(false);
                }
                return true;
            }
            return false;
        };

        // Try immediate detection
        if (!checkTelegram()) {
            // Poll for Telegram object if script loads late
            const interval = setInterval(() => {
                retryCount++;
                if (checkTelegram() || retryCount >= maxRetries) {
                    clearInterval(interval);
                    if (retryCount >= maxRetries) {
                        console.log('[TelegramContext] Not in Telegram or script failed');
                        // Not in Telegram - check for legacy session
                        const stored = getStoredSession();
                        if (stored && isMounted) {
                            setUser(stored.user);
                            window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: stored.user }));
                        }
                        setLoading(false);
                    }
                }
            }, 200);
            return () => {
                isMounted = false;
                clearInterval(interval);
            };
        }

        return () => { isMounted = false; };
    }, []);

    const login = useCallback(async () => {
        if (!isTelegramWebApp()) {
            window.location.href = 'https://t.me/moida_zakaz_bot';
            return;
        }

        const WebApp = getTelegramWebApp()!;
        const initData = getTelegramInitData();

        if (!initData) throw new Error('Telegram maʼlumotlari topilmadi');

        return new Promise<void>((resolve, reject) => {
            WebApp.requestContact((sent, event) => {
                if (!sent || !event?.responseUnsafe?.contact) {
                    reject(new Error('Telefon raqami ulashilmadi'));
                    return;
                }

                const contact = event.responseUnsafe.contact;

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
                        if (data.error) throw new Error(data.error);

                        // Store session for persistence
                        storeSession({
                            token: data.token || 'tg-auto-session', // Fallback for auto-flow
                            user: data.user,
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        });

                        setUser(data.user);
                        window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: data.user }));
                        resolve();
                    })
                    .catch(err => {
                        console.error('[TelegramContext] Login error:', err);
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
