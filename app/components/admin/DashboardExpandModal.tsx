'use client';

import { X, ShoppingBag, TrendingUp, Clock, DollarSign, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import type { AdminTranslationKey } from '@/app/lib/admin-i18n';
import type {
    AdminDashboardDayCount,
    AdminDashboardPeakHour,
    AdminDashboardRecentOrder,
    AdminDashboardRevenuePoint,
} from '@/app/types';
import styles from './DashboardExpandModal.module.css';

interface ExpandModalStatus {
    status: string;
    count: number;
    bg: string;
    text: string;
    label: string;
}

interface ExpandModalAnalytics {
    totalOrders: number;
    peakHours: AdminDashboardPeakHour[];
    statusBreakdown: ExpandModalStatus[];
}

interface ExpandModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours';
    recentOrders: AdminDashboardRecentOrder[];
    revenueTrend: AdminDashboardRevenuePoint[];
    dailyOrders30: AdminDashboardDayCount[];
    analytics: ExpandModalAnalytics;
}

type TranslateFn = (key: AdminTranslationKey) => string;

export default function DashboardExpandModal({
    isOpen,
    onClose,
    type,
    recentOrders,
    revenueTrend,
    dailyOrders30,
    analytics,
}: ExpandModalProps) {
    const { lang, t } = useAdminI18n();

    if (!isOpen) {
        return null;
    }

    const commonProps = { onClose, lang, t };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                {type === 'recentActivity' && (
                    <RecentActivityFull recentOrders={recentOrders} analytics={analytics} {...commonProps} />
                )}
                {type === 'revenueTrend' && (
                    <RevenueTrendFull revenueTrend={revenueTrend} {...commonProps} />
                )}
                {type === 'weeklyOrders' && (
                    <WeeklyOrdersFull dailyOrders30={dailyOrders30} {...commonProps} />
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

function RecentActivityFull({
    recentOrders,
    analytics,
    onClose,
    t,
    lang,
}: {
    recentOrders: AdminDashboardRecentOrder[];
    analytics: ExpandModalAnalytics;
    onClose: () => void;
    t: TranslateFn;
    lang: string;
}) {
    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <ShoppingBag size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>{t('allActions')}</h2>
                        <p className={styles.subtitle}>
                            {recentOrders.length} / {analytics.totalOrders} {t('ordersLabel')}
                        </p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentOrders.map((order) => (
                        <div key={order.id} className={styles.orderRow}>
                            <div className={styles.orderIcon}>
                                <ShoppingBag size={16} />
                            </div>
                            <div className={styles.orderInfo}>
                                <div className={styles.orderTitle}>
                                    #{order.id.slice(0, 6)} - {order.profiles?.full_name || t('client')}
                                </div>
                                <div className={styles.orderMeta}>
                                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')} • <span style={{ fontVariantNumeric: 'tabular-nums' }}>{order.total_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {recentOrders.length === 0 && (
                        <div className={styles.emptyState}>{t('noOrders')}</div>
                    )}
                </div>
            </div>
        </>
    );
}

function RevenueTrendFull({
    revenueTrend,
    onClose,
    t,
    lang,
}: {
    revenueTrend: AdminDashboardRevenuePoint[];
    onClose: () => void;
    t: TranslateFn;
    lang: string;
}) {
    const totalRevenue = revenueTrend.reduce((sum, point) => sum + point.revenue, 0);
    const totalOrders = revenueTrend.reduce((sum, point) => sum + point.sales, 0);
    const maxRevenue = Math.max(...revenueTrend.map((point) => point.revenue), 1);

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

            <div className={styles.content}>
                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <h4>{t('totalPayment')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            {totalRevenue >= 1_000_000
                                ? `${(totalRevenue / 1_000_000).toFixed(1)}M`
                                : `${(totalRevenue / 1_000).toFixed(0)}K`
                            } {lang === 'uz' ? "so'm" : "сум"}
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('orders')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            {totalOrders}
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('averagePerDay')}</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                            {revenueTrend.length > 0 ? (totalRevenue / revenueTrend.length / 1000).toFixed(0) : 0}K
                        </div>
                    </div>
                </div>

                <div className={styles.chartArea}>
                    {revenueTrend.map((point, index) => {
                        const widthPct = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                        return (
                            <div key={index} className={styles.barRow}>
                                <span className={styles.barLabel}>{point.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, point.revenue > 0 ? 3 : 0)}%`,
                                            background: point.revenue > 0
                                                ? point.isFuture
                                                    ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                                    : 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                : 'transparent',
                                        }}
                                    >
                                        {widthPct > 15 && (
                                            <span className={styles.barFillValue}>
                                                {(point.revenue / 1000).toFixed(0)}K
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={styles.barAmount} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {point.revenue > 0 ? `${(point.revenue / 1000).toFixed(0)}K` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

function WeeklyOrdersFull({
    dailyOrders30,
    onClose,
    t,
}: {
    dailyOrders30: AdminDashboardDayCount[];
    onClose: () => void;
    t: TranslateFn;
}) {
    const maxCount = Math.max(...dailyOrders30.map((day) => day.count), 1);
    const totalOrders = dailyOrders30.reduce((sum, day) => sum + day.count, 0);

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
                    {dailyOrders30.map((day, index) => {
                        const widthPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                            <div key={index} className={styles.barRow}>
                                <span className={styles.barLabel}>{day.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, day.count > 0 ? 5 : 0)}%`,
                                            background: day.count > 0
                                                ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                : 'transparent',
                                        }}
                                    >
                                        {widthPct > 20 && (
                                            <span className={styles.barFillValue} style={{ fontVariantNumeric: 'tabular-nums' }}>{day.count}</span>
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

function OrderStatusesFull({
    analytics,
    onClose,
    t,
}: {
    analytics: ExpandModalAnalytics;
    onClose: () => void;
    t: TranslateFn;
}) {
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
                    {analytics.statusBreakdown.map((status) => (
                        <div
                            key={status.status}
                            className={styles.statusCard}
                            style={{ borderLeft: `4px solid ${status.text}` }}
                        >
                            <div className={styles.statusCount} style={{ color: status.text, fontVariantNumeric: 'tabular-nums' }}>{status.count}</div>
                            <div className={styles.statusLabel}>{status.label}</div>
                            <div className={styles.statusPercent} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {analytics.totalOrders > 0 ? Math.round((status.count / analytics.totalOrders) * 100) : 0}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function PeakHoursFull({
    analytics,
    onClose,
    t,
}: {
    analytics: ExpandModalAnalytics;
    onClose: () => void;
    t: TranslateFn;
}) {
    const maxCount = Math.max(...analytics.peakHours.map((hour) => hour.count), 1);
    const totalOrders = analytics.peakHours.reduce((sum, hour) => sum + hour.count, 0);
    const peakHour = analytics.peakHours.reduce<AdminDashboardPeakHour | null>((max, hour) => {
        if (!max || hour.count > max.count) {
            return hour;
        }
        return max;
    }, analytics.peakHours[0] || null);

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
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{totalOrders}</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>{t('peakActiveHour')}</h4>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#BE185D', fontVariantNumeric: 'tabular-nums' }}>{peakHour?.label}</div>
                    </div>
                </div>

                <div className={styles.chartArea}>
                    {analytics.peakHours.map((hour, index) => {
                        const widthPct = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                        return (
                            <div key={index} className={styles.barRow}>
                                <span className={styles.barLabel}>{hour.label}</span>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${Math.max(widthPct, hour.count > 0 ? 3 : 0)}%`,
                                            background: hour.count > 0
                                                ? hour.count === peakHour?.count
                                                    ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                                                    : '#FBCFE8'
                                                : 'transparent',
                                        }}
                                    >
                                        {widthPct > 20 && (
                                            <span className={styles.barFillValue} style={{
                                                color: hour.count === peakHour?.count ? 'white' : '#BE185D',
                                            }}>
                                                {hour.count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={styles.barAmount} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {hour.count > 0 ? `${hour.count} ${t('ordersLabel')}` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
