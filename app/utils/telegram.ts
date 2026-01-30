'use client';

// Telegram Web App detection and session helpers

/**
 * Check if the app is running inside Telegram's WebApp container
 */
export function isTelegramWebApp(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.Telegram?.WebApp?.initData);
}

/**
 * Get the Telegram WebApp instance
 */
export function getTelegramWebApp() {
    if (!isTelegramWebApp()) return null;
    return window.Telegram!.WebApp;
}

/**
 * Get the current Telegram user (from initDataUnsafe)
 */
export function getTelegramUser() {
    return getTelegramWebApp()?.initDataUnsafe?.user || null;
}

/**
 * Get the raw init_data string for signature verification
 */
export function getTelegramInitData(): string | null {
    return getTelegramWebApp()?.initData || null;
}

// ==================== Session Management ====================

const SESSION_KEY = 'tg_session';

export interface TelegramSession {
    token: string;
    user: {
        id: string;
        full_name: string;
        phone_number: string;
        telegram_id: number;
        avatar_url?: string;
    };
    expiresAt: string;
}

/**
 * Get stored session from localStorage
 * Returns null if session doesn't exist or is expired
 */
export function getStoredSession(): TelegramSession | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
        const session = JSON.parse(stored) as TelegramSession;

        // Check if expired
        if (new Date(session.expiresAt) < new Date()) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }

        return session;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

/**
 * Store session in localStorage
 */
export function storeSession(session: TelegramSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Clear stored session
 */
export function clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_KEY);
}

/**
 * Get auth header for API requests
 * Includes both Telegram initData (preferred) and legacy Bearer token
 */
export function getAuthHeader(): Record<string, string> {
    const headers: Record<string, string> = {};

    // 1. Add Telegram initData if we are in the bot
    const initData = getTelegramInitData();
    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

    // 2. Add legacy Bearer token if we have a stored session
    const session = getStoredSession();
    if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
    }

    return headers;
}
