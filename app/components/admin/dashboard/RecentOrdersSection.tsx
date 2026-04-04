'use client';

import React, { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminDashboardData } from '@/app/types';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

export function RecentOrdersSection({ data, statusColors, onExpand, onShowABC }: {
    data: AdminDashboardData;
    statusColors: any;
    onExpand: (type: any) => void;
    onShowABC: () => void;
}) {
    const { lang, t } = useAdminI18n();

    const recentOrders = useMemo(() => data.recentOrders.slice(0, 8), [data.recentOrders]);
    const maxProductQty = useMemo(() => Math.max(...data.analytics.topProducts.map((p) => p.quantity), 1), [data.analytics.topProducts]);

    return (
        <>
            <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className={styles.chartHeader}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('topProductsTitle')}</h2>
                        <button onClick={onShowABC} className={styles.miniBtn}>{t('detailedStats')}</button>
                    </div>
                    <div className={styles.topProductsList}>
                        {data.analytics.topProducts.map((product, idx) => (
                            <div key={product.name} className={styles.topProductItem}>
                                <div className={styles.topProductName}>{product.name}</div>
                                <div className={styles.topProductStats}>{product.quantity} {t('pcs')} • {product.revenue.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                                <div className={styles.topProductBarOuter}><div className={styles.topProductBar} style={{ width: `${(product.quantity / maxProductQty) * 100}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className={styles.chartHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShoppingBag size={20} color="hsl(var(--color-primary-dark))" />
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('recentActivityTitle')}</h2>
                        </div>
                        <button onClick={() => onExpand('recentActivity')} className={styles.miniBtn}>{t('viewAll')}</button>
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {recentOrders.map((order) => (
                            <div key={order.id} className={styles.statusCard} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{order.id.slice(0, 6)} — {order.profiles?.full_name}</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{format(new Date(order.created_at), 'HH:mm')} · {order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</div>
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: statusColors[order.status]?.bg || '#F3F4F6', color: statusColors[order.status]?.text || '#6B7280', textTransform: 'uppercase', height: 'fit-content' }}>
                                    {statusColors[order.status]?.label || order.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
