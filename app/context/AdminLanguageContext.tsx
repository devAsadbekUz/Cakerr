'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminTranslations, AdminLang, AdminTranslationKey } from '../lib/admin-i18n';

interface AdminLanguageContextType {
    lang: AdminLang;
    setLang: (lang: AdminLang) => void;
    t: (key: AdminTranslationKey) => string;
}

const AdminLanguageContext = createContext<AdminLanguageContextType | undefined>(undefined);

function isValidLang(value: string | null | undefined): value is AdminLang {
    return !!value && value in adminTranslations;
}

function persistLang(lang: AdminLang) {
    localStorage.setItem('admin_lang', lang);
    document.cookie = `admin_lang=${lang}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function getInitialLang(initialLang: AdminLang): AdminLang {
    if (typeof window === 'undefined') {
        return initialLang;
    }

    try {
        const savedLang = window.localStorage.getItem('admin_lang');
        if (isValidLang(savedLang)) {
            return savedLang;
        }
    } catch (err) {
        console.error('[AdminLanguageContext] Failed to restore saved lang:', err);
    }

    return initialLang;
}

export function AdminLanguageProvider({
    children,
    initialLang = 'uz',
}: {
    children: React.ReactNode;
    initialLang?: AdminLang;
}) {
    const [lang, setLangState] = useState<AdminLang>(() => getInitialLang(initialLang));

    useEffect(() => {
        try {
            persistLang(lang);
        } catch (err) {
            console.error('[AdminLanguageContext] Failed to persist lang:', err);
        }
    }, [lang]);

    const setLang = async (newLang: AdminLang) => {
        setLangState(newLang);
        persistLang(newLang);
        
        // Sync to database for Telegram bot persistence
        try {
            await fetch('/api/admin/settings/language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: newLang })
            });
        } catch (err) {
            console.error('[AdminLanguageContext] Sync failed:', err);
        }
    };

    const t = (key: AdminTranslationKey): string => {
        return adminTranslations[lang][key] || key;
    };

    return (
        <AdminLanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </AdminLanguageContext.Provider>
    );
}

export function useAdminI18n() {
    const context = useContext(AdminLanguageContext);
    if (!context) {
        throw new Error('useAdminI18n must be used within an AdminLanguageProvider');
    }
    return context;
}
