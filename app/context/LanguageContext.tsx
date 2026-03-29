'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { clientTranslations, type Language } from '@/app/utils/client-translations';

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);


export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Language>('uz');

    useEffect(() => {
        const savedLang = localStorage.getItem('client-lang') as Language;
        if (savedLang && (savedLang === 'uz' || savedLang === 'ru')) {
            setLangState(savedLang);
        }
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('client-lang', newLang);
    };

    const t = (key: string): any => {
        return clientTranslations[lang][key] || key;
    };

    const value = React.useMemo(() => ({ lang, setLang, t }), [lang]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
