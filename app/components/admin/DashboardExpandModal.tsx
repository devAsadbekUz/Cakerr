'use client';

import React, { useState, useMemo } from 'react';
import { X, ShoppingBag, TrendingUp, Clock, DollarSign, PieChart, BarChart3, Package } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from './DashboardExpandModal.module.css';

// Status display config
interface ExpandModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours';
    orders: any[];
    analytics: any;
}

export default function DashboardExpandModal({ isOpen, onClose, type, orders, analytics }: ExpandModalProps) {
    const { lang, t } = useAdminI18n();
    const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
        new: { bg: '#FEF3C7', text: '#92400E', label: t('status_new') },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: t('status_confirmed') },
        preparing: { bg: '#FDE68A', text: '#78350F', label: t('status_preparing') },
        delivering: { bg: '#E0E7FF', text: '#3730A3', label: t('status_delivering') },
        completed: { bg: '#D1FAE5', text: '#065F46', label: t('status_completed') },
        cancelled: { bg: '#FEE2E2', text: '#991B1B', label: t('status_cancelled') },
    };

    const [revenuePeriod, setRevenuePeriod] = useState<7 | 30 | 90>(30);

    if (!isOpen) return null;

    const commonProps = { onClose, STATUS_COLORS, lang, t };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {type === 'recentActivity' && (
                    <RecentActivityFull orders={orders} {...commonProps} />
                )}
                {type === 'revenueTrend' && (
                    <RevenueTrendFull
                        orders={orders}
                        period={revenuePeriod}
                        setPeriod={setRevenuePeriod}
                        {...commonProps}
                    />
                )}
                {type === 'weeklyOrders' && (
                    <WeeklyOrdersFull orders={orders} {...commonProps} />
                )}
                {type === 'orderStatuses' && (
                    <OrderStatusesFull analytics={analytics} {...commonProps} />
                )}
                {type === 'peakHours' && (
                    <PeakHoursFull analytics={analytics} {...commonProps} />
                )}
            </div>
        </div>
    );
}

// ===================== RECENT ACTIVITY FULL =====================
function RecentActivityFull({ orders, onClose, STATUS_COLORS, t, lang }: any) {
    const sorted = useMemo(() =>
        [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        [orders]
    );

    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <ShoppingBag size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('allActions')}</h2>
                        <p className={styles.subtitle}>{sorted.length} {t('ordersLabel')}</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sorted.map(o => (
                        <div key={o.id} className={styles.orderRow}>
                            <div className={styles.orderIcon}>
                                <ShoppingBag size={16} />
                            </div>
                            <div className={styles.orderInfo}>
                                <div className={styles.orderTitle}>
                                    #{o.id.slice(0, 6)} - {o.profiles?.full_name || t('client')}
                                </div>
                                <div className={styles.orderMeta}>
                                    {format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')} • {o.total_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                </div>
                            </div>
                            <div
                                className={styles.statusBadge}
                                style={{
                                    background: STATUS_COLORS[o.status]?.bg || '#F3F4F6',
                                    color: STATUS_COLORS[o.status]?.text || '#6B7280'
                                }}
                            >
                                {STATUS_COLORS[o.status]?.label || o.status}
                            </div>
                        </div>
                    ))}
                    {sorted.length === 0 && (
                        <div className={styles.emptyState}>{t('noOrders')}</div>
                    )}
                </div>
            </div>
        </>
    );
}

// ===================== REVENUE TREND FULL =====================
function RevenueTrendFull({
    orders, period, setPeriod, onClose, t, lang
}: any) {
    const data = useMemo(() => {
        const today = new Date();
        const days = Array.from({ length: period }, (_, i) => {
            const d = subDays(today, period - 1 - i);
            return {
                date: d,
                label: format(d, period <= 7 ? 'EEE' : 'dd/MM'),
                revenue: 0,
                count: 0
            };
        });

        for (const o of orders) {
            if (o.status !== 'completed') continue;
            const created = new Date(o.created_at);
            const price = Number(o.total_price) || 0;
            for (const day of days) {
                if (isSameDay(created, day.date)) {
                    day.revenue += price;
                    day.count++;
                    break;
                }
            }
        }

        return days;
    }, [orders, period]);

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.count, 0);
    const maxRev = Math.max(...data.map(d => d.revenue), 1);

    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <DollarSign size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('revenueTrendTitle')}</h2>
                        <p className={styles.subtitle}>{t('completedRevenue')}</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>

            <div className={styles.tabs}>
                {([7, 30, 90] as const).map(p => (
                    <button
                        key={p}
                        className={`${styles.tab} ${period === p ? styles.tabActive : ''}`}
                        onClick={() => setPeriod(p)}
                    >
                        {p} {t('daysCount')}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <h4>{t('totalPayment')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                            {totalRevenue >= 1_000_000
                                ? `${(totalRevenue / 1_000_000).toFixed(1)}M`
                                : `${(totalRevenue / 1_000).toFixed(0)}K`
                            } {lang === 'uz' ? "so'm" : "сум"}
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('orders')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                            {totalOrders}
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('averagePerDay')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                            {period > 0 ? (totalRevenue / period / 1000).toFixed(0) : 0}K
                        </div>
                    </div>
                </div>

                <div className={styles.chartArea}>
                    {data.map((day, idx) => {
                        const widthPct = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                        return (
                            <div key={idx} className={styles.barRow}>
                                <span className={styles.barLabel}>{day.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, day.revenue > 0 ? 3 : 0)}%`,
                                            background: day.revenue > 0
                                                ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                : 'transparent'
                                        }}
                                    >
                                        {widthPct > 15 && (
                                            <span className={styles.barFillValue}>
                                                {(day.revenue / 1000).toFixed(0)}K
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={styles.barAmount}>
                                    {day.revenue > 0 ? `${(day.revenue / 1000).toFixed(0)}K` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ===================== WEEKLY ORDERS FULL =====================
function WeeklyOrdersFull({ orders, onClose, t }: any) {
    const last30 = useMemo(() => {
        const today = new Date();
        const days = Array.from({ length: 30 }, (_, i) => {
            const d = subDays(today, 29 - i);
            return {
                date: d,
                label: format(d, 'dd/MM'),
                dayName: format(d, 'EEE'),
                count: 0
            };
        });

        for (const o of orders) {
            const delivery = new Date(o.delivery_time);
            for (const day of days) {
                if (isSameDay(delivery, day.date)) {
                    day.count++;
                    break;
                }
            }
        }

        return days;
    }, [orders]);

    const maxCount = Math.max(...last30.map(d => d.count), 1);
    const totalOrders = last30.reduce((sum, d) => sum + d.count, 0);

    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <TrendingUp size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('dailyOrders')}</h2>
                        <p className={styles.subtitle}>{t('last30Days')} • {t('totalLabel')}: {totalOrders}</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div className={styles.chartArea}>
                    {last30.map((day, idx) => {
                        const widthPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                            <div key={idx} className={styles.barRow}>
                                <span className={styles.barLabel}>{day.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, day.count > 0 ? 5 : 0)}%`,
                                            background: day.count > 0
                                                ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                : 'transparent'
                                        }}
                                    >
                                        {widthPct > 20 && (
                                            <span className={styles.barFillValue}>{day.count}</span>
                                        )}
                                    </div>
                                </div>
                                <span className={styles.barAmount}>
                                    {day.count > 0 ? `${day.count} ${t('ordersLabel')}` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ===================== ORDER STATUSES FULL =====================
function OrderStatusesFull({ analytics, onClose, t }: any) {
    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <PieChart size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('orderStatusesTitle')}</h2>
                        <p className={styles.subtitle}>{t('totalLabel')} {analytics.totalOrders} {t('ordersLabel')}</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div className={styles.statusGrid}>
                    {analytics.statusBreakdown.map((s: any) => (
                        <div
                            key={s.status}
                            className={styles.statusCard}
                            style={{ borderLeft: `4px solid ${s.text}` }}
                        >
                            <div className={styles.statusCount} style={{ color: s.text }}>{s.count}</div>
                            <div className={styles.statusLabel}>{s.label}</div>
                            <div className={styles.statusPercent}>
                                {analytics.totalOrders > 0 ? Math.round((s.count / analytics.totalOrders) * 100) : 0}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ===================== PEAK HOURS FULL =====================
function PeakHoursFull({ analytics, onClose, t }: any) {
    const maxCount = Math.max(...analytics.peakHours.map((h: any) => h.count), 1);
    const totalOrders = analytics.peakHours.reduce((sum: number, h: any) => sum + h.count, 0);
    const peakHour = analytics.peakHours.reduce((max: any, h: any) => h.count > max.count ? h : max, analytics.peakHours[0]);
 
    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Clock size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('hourlyStatsTitle')}</h2>
                        <p className={styles.subtitle}>{t('everyone')}: {peakHour?.label} ({peakHour?.count} {t('ordersLabel')})</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <h4>{t('totalLabel')} {t('orders').toLowerCase()}</h4>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{totalOrders}</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('peakActiveHour')}</h4>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#BE185D' }}>{peakHour?.label}</div>
                    </div>
                </div>

                <div className={styles.chartArea}>
                    {analytics.peakHours.map((h: any, idx: number) => {
                        const widthPct = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
                        return (
                            <div key={idx} className={styles.barRow}>
                                <span className={styles.barLabel}>{h.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, h.count > 0 ? 3 : 0)}%`,
                                            background: h.count > 0
                                                ? h.count === peakHour?.count
                                                    ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                    : '#FBCFE8'
                                                : 'transparent'
                                        }}
                                    >
                                        {widthPct > 20 && (
                                            <span className={styles.barFillValue} style={{
                                                color: h.count === peakHour?.count ? 'white' : '#BE185D'
                                            }}>
                                                {h.count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={styles.barAmount}>
                                    {h.count > 0 ? `${h.count} ${t('ordersLabel')}` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
