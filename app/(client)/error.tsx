'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';

export default function ClientError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useLanguage();

    useEffect(() => {
        console.error('[ClientError]', error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            padding: '40px 20px',
            textAlign: 'center'
        }}>
            <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#FEF2F2', color: '#EF4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                {t('errorTitle')}
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0, maxWidth: 320 }}>
                {t('errorMessage')}
            </p>
            <button
                onClick={reset}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 12,
                    background: '#BE185D', color: 'white',
                    border: 'none', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', marginTop: 8
                }}
            >
                <RotateCcw size={16} />
                {t('tryAgain')}
            </button>
        </div>
    );
}
