'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminTranslations, AdminLang, AdminTranslationKey } from '../lib/admin-i18n';

interface AdminLanguageContextType {
    lang: AdminLang;
    setLang: (lang: AdminLang) => void;
    t: (key: AdminTranslationKey) => string;
}

const AdminLanguageContext = createContext<AdminLanguageContextType | undefined>(undefined);

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<AdminLang>('uz');

    useEffect(() => {
        const initLang = async () => {
            // 1. Check localStorage first for immediate UI response
            const savedLang = localStorage.getItem('admin_lang') as AdminLang;
            if (savedLang && adminTranslations[savedLang]) {
                setLangState(savedLang);
            }

            // 2. Fetch from DB to ensure cross-device consistency
            try {
                const res = await fetch('/api/admin/settings/language');
                if (res.ok) {
                    const data = await res.json();
                    if (data.lang && adminTranslations[data.lang as AdminLang]) {
                        const dbLang = data.lang as AdminLang;
                        setLangState(dbLang);
                        localStorage.setItem('admin_lang', dbLang);
                    }
                }
            } catch (err) {
                console.error('[AdminLanguageContext] Failed to fetch server lang:', err);
            }
        };

        initLang();
    }, []);

    const setLang = async (newLang: AdminLang) => {
        setLangState(newLang);
        localStorage.setItem('admin_lang', newLang);
        
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
