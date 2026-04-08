'use client';

import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';
import { Home, ChefHat } from 'lucide-react';

export default function NotFound() {
    const { t } = useLanguage();

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
                <ChefHat size={60} />
            </div>
            
            <h1 style={{
                fontSize: '48px',
                fontWeight: 900,
                color: 'hsl(var(--color-primary))',
                marginBottom: '12px'
            }}>404</h1>
            
            <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'hsl(var(--color-text))',
                marginBottom: '16px'
            }}>
                {t('pageNotFound') || 'Sahifa topilmadi'}
            </h2>
            
            <p style={{
                fontSize: '16px',
                color: 'hsl(var(--color-text-light))',
                maxWidth: '400px',
                marginBottom: '32px',
                lineHeight: '1.6'
            }}>
                {t('pageNotFoundDesc') || 'Afsuski, siz qidirayotgan sahifa mavjud emas yoki nomi o\'zgargan.'}
            </p>
            
            <Link href="/" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                backgroundColor: 'hsl(var(--color-primary))',
                color: 'white',
                borderRadius: '16px',
                textDecoration: 'none',
                fontWeight: 700,
                boxShadow: 'var(--shadow-lg)',
                transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Home size={20} />
                {t('backToHome') || 'Asosiy sahifaga qaytish'}
            </Link>
        </div>
    );
}
