'use client';

import React from 'react';
import styles from './AdminDashboard.module.css';

export default function AdminLoading() {
    return (
        <div className={styles.container} style={{ opacity: 0.6, pointerEvents: 'none' }}>
            <header className={styles.header}>
                <div style={{ width: '200px', height: '32px', background: '#F3F4F6', borderRadius: '8px' }} />
                <div style={{ width: '300px', height: '40px', background: '#F3F4F6', borderRadius: '10px' }} />
            </header>

            <div className={styles.statsGrid}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={styles.statCard} style={{ minHeight: '100px', background: '#F9FAFB' }} />
                ))}
            </div>

            <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                <div className={styles.chartCard} style={{ height: '340px', background: '#F9FAFB' }} />
            </div>

            <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                <div className={styles.chartCard} style={{ height: '240px', background: '#F9FAFB' }} />
                <div className={styles.recentActivity} style={{ height: '240px', background: '#F9FAFB' }} />
            </div>
        </div>
    );
}
