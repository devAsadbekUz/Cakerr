'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    ShoppingBag, Clock, AlertCircle,
    TrendingUp, Users, DollarSign,
    BarChart3, Repeat, PieChart,
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './AdminDashboard.module.css';
import { StatCard } from '@/app/components/admin/DashboardComponents';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { CategoryDonutChart, RetentionFunnel, RevenueLineChart } from '@/app/components/admin/DashboardCharts';
import { adminDashboardService } from '@/app/services/adminDashboardService';
import type { AdminDashboardData } from '@/app/types';

const ABCAnalysisModal = dynamic(() => import('@/app/components/admin/ABCAnalysisModal'), { ssr: false });
const DashboardExpandModal = dynamic(() => import('@/app/components/admin/DashboardExpandModal'), { ssr: false });

const CATEGORY_COLORS = [
    '#BE185D',
    '#1D4ED8',
    '#059669',
    '#D97706',
    '#4F46E5',
    '#7C3AED',
    '#0891B2',
    '#9333EA',
];

function parseCategoryLabel(raw: unknown, lang: string): string {
    if (!raw) {
        return '';
    }

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

export default function AdminDashboardClient({ initialData }: { initialData: AdminDashboardData }) {
    const { lang, t } = useAdminI18n();
    const supabase = createClient();
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [dashboardData, setDashboardData] = useState<AdminDashboardData>(initialData);
    const [filterDays, setFilterDays] = useState<number | null>(initialData.filterDays);
    const filterDaysRef = useRef<number | null>(initialData.filterDays);
    const [loading, setLoading] = useState(false);
    const [showABCModal, setShowABCModal] = useState(false);
    const [expandModal, setExpandModal] = useState<'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours' | null>(null);

    const statusColors = useMemo<Record<string, { bg: string; text: string; label: string }>>(() => ({
        new: { bg: '#FEF3C7', text: '#92400E', label: t('status_new') },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: t('status_confirmed') },
        preparing: { bg: '#FDE68A', text: '#78350F', label: t('status_preparing') },
        delivering: { bg: '#E0E7FF', text: '#3730A3', label: t('status_delivering') },
        completed: { bg: '#D1FAE5', text: '#065F46', label: t('status_completed') },
        cancelled: { bg: '#FEE2E2', text: '#991B1B', label: t('status_cancelled') },
    }), [t]);

    const fetchData = useCallback(async (days: number | null, showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }

        const data = await adminDashboardService.getDashboardData(days);
        setDashboardData(data);

        if (showLoading) {
            setLoading(false);
        }
    }, []);

    const scheduleRefresh = useCallback((days: number | null) => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(() => {
            fetchData(days, false);
        }, 350);
    }, [fetchData]);

    useEffect(() => {
        const ordersChannel = supabase
            .channel('admin-dashboard-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                scheduleRefresh(filterDaysRef.current);
            })
            .subscribe();

        const profilesChannel = supabase
            .channel('admin-dashboard-profiles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
                setDashboardData((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
            })
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, [scheduleRefresh, supabase]);

    useEffect(() => {
        filterDaysRef.current = filterDays;
    }, [filterDays]);

    const handleFilterChange = useCallback((days: number | null) => {
        if (days === filterDays) {
            return;
        }

        setFilterDays(days);
        fetchData(days);
    }, [fetchData, filterDays]);

    const statusBreakdown = useMemo(() => (
        dashboardData.analytics.statusBreakdown.map((item) => ({
            ...item,
            ...(statusColors[item.status] || { bg: '#F3F4F6', text: '#6B7280', label: item.status }),
        }))
    ), [dashboardData.analytics.statusBreakdown, statusColors]);

    const categoryMix = useMemo(() => (
        dashboardData.analytics.categoryRevenue.map((item, index) => {
            const category = dashboardData.categories.find((entry) => entry.id === item.id);
            let label = lang === 'ru' ? 'Неизвестно' : 'Noma\'lum';

            if (category) {
                label = parseCategoryLabel(category.label, lang);
            } else if (item.id === 'custom') {
                label = lang === 'ru' ? 'Индивидуальные заказы' : 'Maxsus buyurtmalar';
            } else if (item.id === 'other') {
                label = lang === 'ru' ? 'Другое' : 'Boshqa';
            }

            return {
                label,
                value: item.revenue,
                color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                percent: dashboardData.analytics.totalRevenue > 0
                    ? (item.revenue / dashboardData.analytics.totalRevenue) * 100
                    : 0,
            };
        })
    ), [dashboardData.analytics.categoryRevenue, dashboardData.analytics.totalRevenue, dashboardData.categories, lang]);

    const recentOrders = useMemo(() => dashboardData.recentOrders.slice(0, 8), [dashboardData.recentOrders]);

    const maxWeeklyOrders = useMemo(() => (
        Math.max(...dashboardData.weeklyData.map((day) => day.count), 5)
    ), [dashboardData.weeklyData]);

    const maxProductQty = useMemo(() => (
        Math.max(...dashboardData.analytics.topProducts.map((product) => product.quantity), 1)
    ), [dashboardData.analytics.topProducts]);

    const maxHourCount = useMemo(() => (
        Math.max(...dashboardData.analytics.peakHours.map((hour) => hour.count), 1)
    ), [dashboardData.analytics.peakHours]);

    const analyticsForModal = useMemo(() => ({
        ...dashboardData.analytics,
        statusBreakdown,
    }), [dashboardData.analytics, statusBreakdown]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('managerPanel')}</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>{t('welcomeMessage')}</p>
                </div>

                <div className={styles.filterBar}>
                    {[
                        { label: t('filter_30'), value: 30 },
                        { label: t('filter_90'), value: 90 },
                        { label: t('filter_180'), value: 180 },
                        { label: t('filter_all'), value: null },
                    ].map((option) => (
                        <button
                            key={option.label}
                            className={`${styles.filterBtn} ${filterDays === option.value ? styles.filterBtnActive : ''}`}
                            onClick={() => handleFilterChange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className={styles.statsGrid}>
                <StatCard title={t('status_new')} value={dashboardData.analytics.newOrdersCount} icon={AlertCircle} color="orange" />
                <StatCard title={t('todaysOrders')} value={dashboardData.analytics.todaysOrdersCount} icon={Clock} color="blue" />
                <StatCard title={t('revenue')} value={`${(dashboardData.analytics.totalRevenue / 1000000).toFixed(1)}M`} icon={DollarSign} color="green" />
                <StatCard
                    title={t('customers')}
                    value={dashboardData.totalUsers}
                    icon={Users}
                    color="purple"
                    subtitle={`${dashboardData.analytics.activeBuyers} ${t('activeBuyersLabel')}`}
                />
                <StatCard
                    title={t('averageCheck')}
                    value={`${(dashboardData.analytics.aov / 1000).toFixed(0)}K`}
                    icon={BarChart3}
                    color="blue"
                    subtitle={`${lang === 'uz' ? "so'm" : "сум"} / ${t('orders').toLowerCase()}`}
                />
                <StatCard
                    title={t('repeatRate')}
                    value={`${dashboardData.analytics.repeatRate}%`}
                    icon={Repeat}
                    color="green"
                    subtitle={`${dashboardData.analytics.repeatCustomers} ${t('repeatCustomersCount')}`}
                />
            </div>

            {loading ? (
                <DashboardPageFallbackInline />
            ) : (
                <>
                    <div className={styles.analyticsLayout} style={{ marginBottom: '32px' }}>
                        <RevenueLineChart
                            title={t('revenueTrendTitle')}
                            data={dashboardData.revenueTrend}
                        />
                    </div>

                    <div className={styles.analyticsLayout}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('weeklyOrdersTitle')}</h2>
                                </div>
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{t('currentWeek')}</span>
                                <button onClick={() => setExpandModal('weeklyOrders')} className={styles.miniBtn}>
                                    {t('viewAll')}
                                </button>
                            </div>

                            <div className={styles.barGraphContainer}>
                                {dashboardData.weeklyData.map((day) => {
                                    const heightPercentage = (day.count / maxWeeklyOrders) * 100;
                                    return (
                                        <div key={day.date} className={styles.barColumn}>
                                            <div className={styles.barWrapper}>
                                                <div
                                                    className={`${styles.bar} ${day.isToday ? styles.barToday : ''}`}
                                                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                                                >
                                                    {day.count > 0 && <span className={styles.barValue}>{day.count}</span>}
                                                </div>
                                            </div>
                                            <span className={styles.barLabel}>{day.label}</span>
                                            <span className={styles.barDate}>{day.date}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.recentActivity}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PieChart size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('orderStatusesTitle')}</h2>
                                </div>
                                <button onClick={() => setExpandModal('orderStatuses')} className={styles.miniBtn}>
                                    {t('viewAll')}
                                </button>
                            </div>
                            <div className={styles.statusGrid}>
                                {statusBreakdown.map((status) => (
                                    <div key={status.status} className={styles.statusCard} style={{ borderLeft: `4px solid ${status.text}` }}>
                                        <div className={styles.statusCount} style={{ color: status.text }}>{status.count}</div>
                                        <div className={styles.statusLabel}>{status.label}</div>
                                        <div className={styles.statusPercent}>
                                            {dashboardData.analytics.totalOrders > 0
                                                ? Math.round((status.count / dashboardData.analytics.totalOrders) * 100)
                                                : 0}
                                            %
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('topProductsTitle')}</h2>
                                </div>
                                <button onClick={() => setShowABCModal(true)} className={styles.miniBtn}>
                                    {t('detailedStats')}
                                </button>
                            </div>

                            {dashboardData.analytics.topProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                    {t('noData')}
                                </div>
                            ) : (
                                <div className={styles.topProductsList}>
                                    {dashboardData.analytics.topProducts.map((product, index) => (
                                        <div key={product.name} className={styles.topProductItem}>
                                            <div className={styles.topProductRank}>#{index + 1}</div>
                                            <div className={styles.topProductInfo}>
                                                <div className={styles.topProductName}>{product.name}</div>
                                                <div className={styles.topProductStats}>
                                                    {product.quantity} {t('pcs')} • {product.revenue.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                                </div>
                                            </div>
                                            <div className={styles.topProductBarOuter}>
                                                <div
                                                    className={styles.topProductBar}
                                                    style={{ width: `${(product.quantity / maxProductQty) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('hourlyStatsTitle')}</h2>
                                </div>
                                <button onClick={() => setExpandModal('peakHours')} className={styles.miniBtn}>
                                    {t('viewAll')}
                                </button>
                            </div>

                            <div className={styles.peakHoursGrid}>
                                {dashboardData.analytics.peakHours.map((hour) => {
                                    const intensity = hour.count / maxHourCount;
                                    const background = hour.count === 0 ? '#F3F4F6'
                                        : intensity > 0.7 ? 'hsl(var(--color-primary-dark))'
                                            : intensity > 0.4 ? 'hsl(var(--color-primary))'
                                                : intensity > 0.15 ? 'hsla(var(--color-primary), 0.3)' : 'hsla(var(--color-primary), 0.1)';
                                    const textColor = intensity > 0.4 && hour.count > 0 ? 'white' : '#374151';

                                    return (
                                        <div
                                            key={hour.hour}
                                            className={styles.peakHourCell}
                                            style={{ background, color: textColor }}
                                            title={`${hour.label}: ${hour.count} ${t('orders').toLowerCase()}`}
                                        >
                                            <div className={styles.peakHourLabel}>{hour.label}</div>
                                            <div className={styles.peakHourCount}>{hour.count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className={styles.chartCard} style={{ marginTop: '32px' }}>
                        <div className={styles.chartHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingBag size={20} color="hsl(var(--color-primary-dark))" />
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('recentActivityTitle')}</h2>
                            </div>
                            <button onClick={() => setExpandModal('recentActivity')} className={styles.miniBtn}>
                                {t('viewAll')}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                            {recentOrders.map((order) => (
                                <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
                                    <div style={{ padding: '10px', background: 'hsla(var(--color-primary), 0.1)', borderRadius: '12px', color: 'hsl(var(--color-primary-dark))', flexShrink: 0 }}>
                                        <ShoppingBag size={18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            #{order.id.slice(0, 6)} — {order.profiles?.full_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                            {format(new Date(order.created_at), 'HH:mm')} · {order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            flexShrink: 0,
                                            background: statusColors[order.status]?.bg || '#F3F4F6',
                                            color: statusColors[order.status]?.text || '#6B7280',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {statusColors[order.status]?.label || order.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        <CategoryDonutChart
                            title={t('categoryRevenueTitle')}
                            data={categoryMix}
                        />

                        <RetentionFunnel
                            totalActive={dashboardData.analytics.activeBuyers}
                            repeatCount={dashboardData.analytics.repeatCustomers}
                            newCount={dashboardData.analytics.newCustomers}
                        />
                    </div>
                </>
            )}

            <ABCAnalysisModal
                isOpen={showABCModal}
                onClose={() => setShowABCModal(false)}
                data={dashboardData.analytics.allProductSales}
            />

            <DashboardExpandModal
                isOpen={!!expandModal}
                onClose={() => setExpandModal(null)}
                type={expandModal || 'recentActivity'}
                recentOrders={dashboardData.recentOrders}
                revenueTrend={dashboardData.revenueTrend}
                dailyOrders30={dashboardData.dailyOrders30}
                analytics={analyticsForModal}
            />
        </div>
    );
}

function DashboardPageFallbackInline() {
    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                <div className={styles.chartCard} style={{ minHeight: '280px' }} />
                <div className={styles.analyticsLayout}>
                    <div className={styles.chartCard} style={{ minHeight: '240px' }} />
                    <div className={styles.recentActivity} style={{ minHeight: '240px' }} />
                </div>
            </div>
        </div>
    );
}
