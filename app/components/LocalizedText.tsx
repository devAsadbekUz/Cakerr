'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';

interface LocalizedTextProps {
    data: any;
    fallback?: string;
}

export default function LocalizedText({ data, fallback = '' }: LocalizedTextProps) {
    const { lang } = useLanguage();
    
    const text = getLocalized(data, lang);
    
    return <>{text || fallback}</>;
}
