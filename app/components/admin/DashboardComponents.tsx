'use client';

import React from 'react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

// Re-export components from the new structure
export { StatCard, SectionTitle } from './dashboard/StatCard';
export { OrderCard } from './dashboard/OrderCard';
export { OrderDetailsModal } from './dashboard/OrderDetailsModal';

type SectionProps = {
    title: React.ReactNode;
    count: number;
    children: React.ReactNode;
    emptyMsg?: React.ReactNode;
    highlight?: boolean;
};

export function Section({ title, count, children, emptyMsg, highlight }: SectionProps) {
    const { t } = useAdminI18n();
    
    // Auto-hide sections with no items if they are "New Orders"
    if (count === 0 && emptyMsg === t('noNewOrders')) return null;
    
    return (
        <div className={`${styles.section} ${highlight ? styles.sectionHighlight : ''}`}>
            <div className={styles.sectionHeader}>
                <h2 
                    className={styles.sectionTitle} 
                    style={{ color: highlight ? 'hsl(var(--color-primary-dark))' : '#111827' }}
                >
                    {title}
                </h2>
                <span 
                    className={styles.badge} 
                    style={{ background: highlight ? 'hsl(var(--color-primary-dark))' : '#6B7280' }}
                >
                    {count}
                </span>
            </div>
            <div className={styles.orderGrid}>
                {count === 0 ? (
                    <div style={{ 
                        gridColumn: '1/-1', 
                        textAlign: 'center', 
                        padding: '48px 32px', 
                        border: '2px dashed #E5E7EB', 
                        borderRadius: '16px', 
                        color: '#9CA3AF',
                        fontSize: '14px'
                    }}>
                        {emptyMsg}
                    </div>
                ) : children}
            </div>
        </div>
    );
}
