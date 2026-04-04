'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import styles from './AdminDashboard.module.css';

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
        <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ background: '#FEF2F2', padding: '48px', borderRadius: '24px', border: '1px solid #FCA5A5', textAlign: 'center', maxWidth: '500px' }}>
                <AlertCircle size={64} color="#EF4444" style={{ marginBottom: '24px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#991B1B', marginBottom: '12px' }}>Dashboard Error</h2>
                <p style={{ color: '#6B7280', marginBottom: '32px', fontSize: '16px' }}>
                    There was a problem loading the dashboard data. This might be a temporary connection issue.
                </p>
                <button
                    onClick={reset}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#EF4444',
                        color: 'white',
                        border: 'none',
                        padding: '12px 32px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        margin: '0 auto'
                    }}
                >
                    <RefreshCcw size={20} /> Try Again
                </button>
            </div>
        </div>
    );
}
