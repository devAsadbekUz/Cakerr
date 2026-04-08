'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useLanguage();

    useEffect(() => {
        // Log the error to an error reporting service in production
        console.error('[Root Error Boundary]', error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'hsl(var(--color-bg-soft))'
        }}>
            <div style={{
                width: '120px',
                height: '120px',
                backgroundColor: 'hsl(var(--color-primary-light))',
                borderRadius: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                color: 'hsl(var(--color-primary))'
            }}>
                <AlertCircle size={60} />
            </div>

            <h1 style={{
                fontSize: '28px',
                fontWeight: 800,
                color: 'hsl(var(--color-text))',
                marginBottom: '12px'
            }}>
                {t('errorTitle') || 'Xatolik yuz berdi'}
            </h1>

            <p style={{
                fontSize: '16px',
                color: 'hsl(var(--color-text-light))',
                maxWidth: '450px',
                marginBottom: '32px',
                lineHeight: '1.6'
            }}>
                {t('errorMessage') || 'Nimadir noto\'g\'ri ketdi. Iltimos, qaytadan urinib ko\'ring.'}
            </p>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
                maxWidth: '300px'
            }}>
                <button
                    onClick={() => reset()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px',
                        backgroundColor: 'hsl(var(--color-primary))',
                        color: 'white',
                        borderRadius: '16px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '16px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-lg)',
                        transition: 'transform 0.1s active',
                    }}
                >
                    <RotateCcw size={20} />
                    {t('tryAgain') || 'Qaytadan urinish'}
                </button>

                <Link
                    href="/"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px',
                        backgroundColor: 'white',
                        color: 'hsl(var(--color-text))',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        fontWeight: 600,
                        fontSize: '16px',
                        textDecoration: 'none'
                    }}
                >
                    <Home size={20} />
                    {t('backToHome') || 'Asosiy sahifaga qaytish'}
                </Link>
            </div>

            {process.env.NODE_ENV === 'development' && (
                <pre style={{
                    marginTop: '40px',
                    padding: '16px',
                    backgroundColor: '#1F2937',
                    color: '#F3F4F6',
                    borderRadius: '12px',
                    fontSize: '12px',
                    textAlign: 'left',
                    width: '100%',
                    overflowX: 'auto',
                    maxWidth: '90vw'
                }}>
                    <code>{error.message}</code>
                </pre>
            )}
        </div>
    );
}
