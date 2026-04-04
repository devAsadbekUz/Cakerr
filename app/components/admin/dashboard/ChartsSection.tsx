'use client';

import React, { useMemo } from 'react';
import { TrendingUp, PieChart, Clock } from 'lucide-react';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { CategoryDonutChart, RetentionFunnel, RevenueLineChart } from '../DashboardCharts';
import type { AdminDashboardData } from '@/app/types';
import styles from '@/app/(admin)/admin/AdminDashboard.module.css';

const CATEGORY_COLORS = ['#BE185D', '#1D4ED8', '#059669', '#D97706', '#4F46E5', '#7C3AED', '#0891B2', '#9333EA'];

function parseCategoryLabel(raw: unknown, lang: string): string {
    if (!raw) return '';
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
            const record = parsed as Record<string, string>;
            return record[lang] || record.uz || record.ru || String(raw);
        }
    } catch {
        return String(raw);
    }
    return String(raw);
}

export function ChartsSection({ data, statusBreakdown, onExpand }: { 
    data: AdminDashboardData; 
    statusBreakdown: any[]; 
    onExpand: (type: any) => void;
}) {
    const { lang, t } = useAdminI18n();

    const categoryMix = useMemo(() => (
        data.analytics.categoryRevenue.map((item, index) => {
            const category = data.categories.find((entry) => entry.id === item.id);
            let label = lang === 'ru' ? 'Неизвестно' : 'Noma\'lum';
            if (category) label = parseCategoryLabel(category.label, lang);
            else if (item.id === 'custom') label = lang === 'ru' ? 'Индивидуальные заказы' : 'Maxsus buyurtmalar';
            else if (item.id === 'other') label = lang === 'ru' ? 'Другое' : 'Boshqa';
            return {
                label,
                value: item.revenue,
                color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                percent: data.analytics.totalRevenue > 0 ? (item.revenue / data.analytics.totalRevenue) * 100 : 0,
            };
        })
    ), [data.analytics.categoryRevenue, data.analytics.totalRevenue, data.categories, lang]);

    const maxWeeklyOrders = useMemo(() => Math.max(...data.weeklyData.map((day) => day.count), 5), [data.weeklyData]);
    const maxHourCount = useMemo(() => Math.max(...data.analytics.peakHours.map((hour) => hour.count), 1), [data.analytics.peakHours]);

    return (
        <>
            <div className={styles.analyticsLayout} style={{ marginBottom: '32px' }}>
                <RevenueLineChart title={t('revenueTrendTitle')} data={data.revenueTrend} />
            </div>

            <div className={styles.analyticsLayout}>
                <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className={styles.chartHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={20} color="hsl(var(--color-primary-dark))" />
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('weeklyOrdersTitle')}</h2>
                        </div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{t('currentWeek')}</span>
                        <button onClick={() => onExpand('weeklyOrders')} className={styles.miniBtn}>{t('viewAll')}</button>
                    </div>
                    <div className={styles.barGraphContainer}>
                        {data.weeklyData.map((day) => (
                            <div key={day.date} className={styles.barColumn}>
                                <div className={styles.barWrapper}>
                                    <div className={`${styles.bar} ${day.isToday ? styles.barToday : ''}`} style={{ height: `${Math.max((day.count / maxWeeklyOrders) * 100, 5)}%` }}>
                                        {day.count > 0 && <span className={styles.barValue}>{day.count}</span>}
                                    </div>
                                </div>
                                <span className={styles.barLabel}>{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.recentActivity}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PieChart size={20} color="hsl(var(--color-primary-dark))" />
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('orderStatusesTitle')}</h2>
                        </div>
                        <button onClick={() => onExpand('orderStatuses')} className={styles.miniBtn}>{t('viewAll')}</button>
                    </div>
                    <div className={styles.statusGrid}>
                        {statusBreakdown.map((status) => (
                            <div key={status.status} className={styles.statusCard} style={{ borderLeft: `4px solid ${status.text}` }}>
                                <div className={styles.statusCount} style={{ color: status.text, fontVariantNumeric: 'tabular-nums' }}>{status.count}</div>
                                <div className={styles.statusLabel}>{status.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                <CategoryDonutChart title={t('categoryRevenueTitle')} data={categoryMix} />
                <div className={styles.chartCard} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div className={styles.chartHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={20} color="hsl(var(--color-primary-dark))" />
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('hourlyStatsTitle')}</h2>
                        </div>
                        <button onClick={() => onExpand('peakHours')} className={styles.miniBtn}>{t('viewAll')}</button>
                    </div>
                    <div className={styles.peakHoursGrid}>
                        {data.analytics.peakHours.map((hour) => {
                            const intensity = hour.count / maxHourCount;
                            const background = hour.count === 0 ? '#F3F4F6' : intensity > 0.7 ? 'hsl(var(--color-primary-dark))' : intensity > 0.4 ? 'hsl(var(--color-primary))' : intensity > 0.15 ? 'hsla(var(--color-primary), 0.3)' : 'hsla(var(--color-primary), 0.1)';
                            const textColor = intensity > 0.4 && hour.count > 0 ? 'white' : '#374151';
                            return (
                                <div key={hour.hour} className={styles.peakHourCell} style={{ background, color: textColor }}>
                                    <div className={styles.peakHourLabel}>{hour.label}</div>
                                    <div className={styles.peakHourCount}>{hour.count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
