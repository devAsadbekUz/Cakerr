'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[AdminError]', error);
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
                Admin xatolik
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0, maxWidth: 360 }}>
                {error.message || 'Kutilmagan xatolik yuz berdi'}
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
                Qaytadan urinish
            </button>
        </div>
    );
}
