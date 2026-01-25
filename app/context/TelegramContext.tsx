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
    avatar_url?: string;
}

interface TelegramContextType {
    isTelegram: boolean;
    session: TelegramSession | null;
    user: TelegramUser | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    getAuthHeader: () => { Authorization: string } | Record<string, never>;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<TelegramSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTelegram, setIsTelegram] = useState(false);

    // Initialize on mount
    useEffect(() => {
        // Check if running in Telegram
        const inTelegram = isTelegramWebApp();
        setIsTelegram(inTelegram);

        // Load stored session first
        const stored = getStoredSession();
        if (stored) {
            console.log('[TelegramContext] Found stored session for:', stored.user.full_name);
            setSession(stored);
            setLoading(false);

            // Initialize Telegram Web App
            if (inTelegram) {
                const WebApp = getTelegramWebApp();
                WebApp?.ready();
                WebApp?.expand();
            }
            return;
        }

        // If in Telegram and no stored session, try auto-login
        if (inTelegram) {
            const WebApp = getTelegramWebApp();
            WebApp?.ready();
            WebApp?.expand();

            // Get telegram_id from initDataUnsafe
            const telegramUser = WebApp?.initDataUnsafe?.user;
            const telegramId = telegramUser?.id;
            const initData = getTelegramInitData();

            if (telegramId) {
                console.log('[TelegramContext] Attempting auto-login for telegram_id:', telegramId);

                // Try auto-login
                fetch('/api/auth/telegram/auto-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegramId,
                        initData
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.authenticated && data.token) {
                            console.log('[TelegramContext] Auto-login successful:', data.user.full_name);

                            const newSession: TelegramSession = {
                                token: data.token,
                                user: data.user,
                                expiresAt: data.expiresAt
                            };

                            storeSession(newSession);
                            setSession(newSession);
                        } else {
                            console.log('[TelegramContext] Auto-login not available:', data.reason);
                        }
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error('[TelegramContext] Auto-login error:', err);
                        setLoading(false);
                    });
            } else {
                console.log('[TelegramContext] No telegram_id in initDataUnsafe');
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async () => {
        // If not in Telegram, redirect to bot
        if (!isTelegramWebApp()) {
            window.location.href = 'https://t.me/moida_zakaz_bot';
            return;
        }

        const WebApp = getTelegramWebApp()!;
        const initData = getTelegramInitData();

        return new Promise<void>((resolve, reject) => {
            // Request phone number from user
            WebApp.requestContact((sent, event) => {
                if (!sent || !event) {
                    reject(new Error('Telefon raqami ulashilmadi'));
                    return;
                }

                const contact = event.responseUnsafe.contact;
                console.log('[TelegramContext] Contact received:', contact.phone_number);

                // Send to our auth API
                fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        initData,
                        phone: contact.phone_number,
                        firstName: contact.first_name,
                        lastName: contact.last_name,
                        telegramId: contact.user_id
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) {
                            console.error('[TelegramContext] Auth error:', data.error);
                            reject(new Error(data.error));
                            return;
                        }

                        const newSession: TelegramSession = {
                            token: data.token,
                            user: data.user,
                            expiresAt: data.expiresAt
                        };

                        storeSession(newSession);
                        setSession(newSession);
                        console.log('[TelegramContext] Login successful:', data.user.full_name);
                        resolve();
                    })
                    .catch(err => {
                        console.error('[TelegramContext] Fetch error:', err);
                        reject(err);
                    });
            });
        });
    }, []);

    const logout = useCallback(() => {
        // Clear local session
        clearSession();
        setSession(null);

        // Optional: Also delete server-side session
        const stored = getStoredSession();
        if (stored?.token) {
            fetch('/api/auth/me', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${stored.token}` }
            }).catch(() => { }); // Ignore errors
        }
    }, []);

    const getAuthHeader = useCallback((): { Authorization: string } | Record<string, never> => {
        if (session?.token) {
            return { Authorization: `Bearer ${session.token}` };
        }
        return {};
    }, [session]);

    const value: TelegramContextType = {
        isTelegram,
        session,
        user: session?.user || null,
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
