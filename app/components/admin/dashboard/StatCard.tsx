'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className={styles.sectionTitle}>{children}</h2>;
}

type StatCardProps = {
    title: React.ReactNode;
    value: React.ReactNode;
    icon: LucideIcon;
    color: 'orange' | 'blue' | 'purple' | 'green';
    subtitle?: React.ReactNode;
};

export function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
    const colors: Record<StatCardProps['color'], { bg: string; text: string; icon: string }> = {
        orange: { bg: '#FFF7ED', text: '#9A3412', icon: '#FB923C' },
        blue:   { bg: '#EFF6FF', text: '#1E40AF', icon: '#3B82F6' },
        purple: { bg: '#F5F3FF', text: '#5B21B6', icon: '#8B5CF6' },
        green:  { bg: '#F0FDF4', text: '#166534', icon: '#22C55E' },
    };
    
    const c = colors[color] || colors.blue;
    
    return (
        <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ background: c.bg, color: c.icon }}>
                <Icon size={24} />
            </div>
            <div className={styles.statCardInfo}>
                <p className={styles.statCardTitle}>{title}</p>
                <p className={styles.statCardValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                </p>
                {subtitle && (
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
