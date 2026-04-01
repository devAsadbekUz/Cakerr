'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ShoppingBag, Clock, AlertCircle,
    TrendingUp, Users, DollarSign,
    BarChart3, Repeat, PieChart
} from 'lucide-react';
import { orderService } from '@/app/services/orderService';
import { format } from 'date-fns';
import styles from './AdminDashboard.module.css';
import { StatCard } from '@/app/components/admin/DashboardComponents';
import { createClient } from '@/app/utils/supabase/client';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import ABCAnalysisModal from '@/app/components/admin/ABCAnalysisModal';
import DashboardExpandModal from '@/app/components/admin/DashboardExpandModal';
import { useAdminAnalytics } from '@/app/hooks/admin/useAdminAnalytics';
import { CategoryDonutChart, RetentionFunnel, RevenueLineChart } from '@/app/components/admin/DashboardCharts';

export default function AdminAnalyticsPage() {
    const { lang, t } = useAdminI18n();
    const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
        new: { bg: '#FEF3C7', text: '#92400E', label: t('status_new') },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: t('status_confirmed') },
        preparing: { bg: '#FDE68A', text: '#78350F', label: t('status_preparing') },
        delivering: { bg: '#E0E7FF', text: '#3730A3', label: t('status_delivering') },
        completed: { bg: '#D1FAE5', text: '#065F46', label: t('status_completed') },
        cancelled: { bg: '#FEE2E2', text: '#991B1B', label: t('status_cancelled') },
    };
    const [orders, setOrders] = useState<any[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showABCModal, setShowABCModal] = useState(false);
    const [expandModal, setExpandModal] = useState<'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours' | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [filterDays, setFilterDays] = useState<number | null>(30); // Default to 30 days
    const supabase = useMemo(() => createClient(), []);

    const { analytics, weeklyData } = useAdminAnalytics(orders, totalUsers, categories, filterDays, lang);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [data, profilesRes, categoriesRes] = await Promise.all([
            orderService.getAllOrdersAdmin(filterDays),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('categories').select('id, label')
        ]);

        setOrders(data || []);
        if (profilesRes.count !== null) setTotalUsers(profilesRes.count);
        if (categoriesRes.data) setCategories(categoriesRes.data);

        setLoading(false);
    }, [supabase, filterDays]);

    useEffect(() => {
        setMounted(true);
        fetchData();

        let updateTimeout: NodeJS.Timeout;

        const ordersChannel = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload: { new: { id: string } }) => {
                const newOrder = await orderService.getOrderAdmin(payload.new.id);
                if (newOrder) setOrders(prev => [newOrder, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: { new: { id: string } }) => {
                // Debounce rapid burst updates (e.g. bulk status changes)
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(async () => {
                    const updated = await orderService.getOrderAdmin(payload.new.id);
                    if (updated) setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                }, 300);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload: { old: { id: string } }) => {
                setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            })
            .subscribe();

        const profilesChannel = supabase
            .channel('admin-profiles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
                setTotalUsers(prev => prev + 1);
            })
            .subscribe();

        return () => {
            if (updateTimeout) clearTimeout(updateTimeout);
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, [fetchData, supabase]);

    const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

    // Derived max values for charts
    const maxWeeklyOrders = useMemo(() =>
        Math.max(...weeklyData.map(d => d.count), 5),
        [weeklyData]
    );

    const maxProductQty = useMemo(() =>
        Math.max(...analytics.topProducts.map(p => p.quantity), 1),
        [analytics.topProducts]
    );

    const maxHourCount = useMemo(() =>
        Math.max(...analytics.peakHours.map(h => h.count), 1),
        [analytics.peakHours]
    );

    if (!mounted) return null;

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
                        { label: t('filter_all'), value: null }
                    ].map((opt) => (
                        <button
                            key={opt.label}
                            className={`${styles.filterBtn} ${filterDays === opt.value ? styles.filterBtnActive : ''}`}
                            onClick={() => setFilterDays(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className={styles.statsGrid}>
                <StatCard title={t('status_new')} value={analytics.newOrdersCount} icon={AlertCircle} color="orange" />
                <StatCard title={t('todaysOrders')} value={analytics.todaysOrdersCount} icon={Clock} color="blue" />
                <StatCard title={t('revenue')} value={`${(analytics.totalRevenue / 1000000).toFixed(1)}M`} icon={DollarSign} color="green" />
                <StatCard
                    title={t('customers')}
                    value={analytics.totalCustomers}
                    icon={Users}
                    color="purple"
                    subtitle={`${analytics.activeBuyers} ${t('activeBuyersLabel')}`}
                />
                <StatCard
                    title={t('averageCheck')}
                    value={`${(analytics.aov / 1000).toFixed(0)}K`}
                    icon={BarChart3}
                    color="blue"
                    subtitle={`${lang === 'uz' ? "so'm" : "сум"} / ${t('orders').toLowerCase()}`}
                />
                <StatCard
                    title={t('repeatRate')}
                    value={`${analytics.repeatRate}%`}
                    icon={Repeat}
                    color="green"
                    subtitle={`${analytics.repeatCustomers} ${t('repeatCustomersCount')}`}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>{t('loading')}</div>
            ) : (
                <>
                    {/* ==================== ROW: Revenue & Sales Trend Line Chart ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginBottom: '32px' }}>
                        <RevenueLineChart
                            title={t('revenueTrendTitle')}
                            data={analytics.revenueTrend.map(d => ({
                                label: d.label,
                                revenue: d.revenue,
                                sales: d.count,
                                isFuture: d.isFuture
                            }))}
                            orders={orders}
                        />
                    </div>

                    {/* ==================== ROW 1: Weekly Orders + Order Status ==================== */}
                    <div className={styles.analyticsLayout}>
                        {/* Weekly Orders Bar Graph */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('weeklyOrdersTitle')}</h2>
                                </div>
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{t('currentWeek')}</span>
                                <button
                                    onClick={() => setExpandModal('weeklyOrders')}
                                    className={styles.miniBtn}
                                >
                                    {t('viewAll')}
                                </button>
                            </div>

                            <div className={styles.barGraphContainer}>
                                {weeklyData.map((day, idx) => {
                                    const heightPercentage = (day.count / maxWeeklyOrders) * 100;
                                    return (
                                        <div key={idx} className={styles.barColumn}>
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

                        {/* Order Status Breakdown */}
                        <div className={styles.recentActivity}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PieChart size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('orderStatusesTitle')}</h2>
                                </div>
                                <button
                                    onClick={() => setExpandModal('orderStatuses')}
                                    className={styles.miniBtn}
                                >
                                    {t('viewAll')}
                                </button>
                            </div>
                            <div className={styles.statusGrid}>
                                {analytics.statusBreakdown.map(s => (
                                    <div key={s.status} className={styles.statusCard} style={{ borderLeft: `4px solid ${s.text}` }}>
                                        <div className={styles.statusCount} style={{ color: s.text }}>{s.count}</div>
                                        <div className={styles.statusLabel}>{s.label}</div>
                                        <div className={styles.statusPercent}>
                                            {analytics.totalOrders > 0 ? Math.round((s.count / analytics.totalOrders) * 100) : 0}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ==================== ROW 2: Top Products + Peak Hours ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        {/* Top 5 Products */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('topProductsTitle')}</h2>
                                </div>
                                <button
                                    onClick={() => setShowABCModal(true)}
                                    className={styles.miniBtn}
                                >
                                    {t('detailedStats')}
                                </button>
                            </div>

                            {analytics.topProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                    {t('noData')}
                                </div>
                            ) : (
                                <div className={styles.topProductsList}>
                                    {analytics.topProducts.map((product, idx) => (
                                        <div key={idx} className={styles.topProductItem}>
                                            <div className={styles.topProductRank}>#{idx + 1}</div>
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

                        {/* Peak Hours */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={20} color="hsl(var(--color-primary-dark))" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('hourlyStatsTitle')}</h2>
                                </div>
                                <button
                                    onClick={() => setExpandModal('peakHours')}
                                    className={styles.miniBtn}
                                >
                                    {t('viewAll')}
                                </button>
                            </div>

                            <div className={styles.peakHoursGrid}>
                                {analytics.peakHours.map((h) => {
                                    const intensity = h.count / maxHourCount;
                                    const bg = h.count === 0 ? '#F3F4F6' :
                                        intensity > 0.7 ? 'hsl(var(--color-primary-dark))' :
                                            intensity > 0.4 ? 'hsl(var(--color-primary))' :
                                                intensity > 0.15 ? 'hsla(var(--color-primary), 0.3)' : 'hsla(var(--color-primary), 0.1)';
                                    const textColor = intensity > 0.4 && h.count > 0 ? 'white' : '#374151';

                                    return (
                                        <div
                                            key={h.hour}
                                            className={styles.peakHourCell}
                                            style={{ background: bg, color: textColor }}
                                            title={`${h.label}: ${h.count} ${t('orders').toLowerCase()}`}
                                        >
                                            <div className={styles.peakHourLabel}>{h.label}</div>
                                            <div className={styles.peakHourCount}>{h.count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ==================== ROW 3: Recent Activity (full-width) ==================== */}
                    <div className={styles.chartCard} style={{ marginTop: '32px' }}>
                        <div className={styles.chartHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingBag size={20} color="hsl(var(--color-primary-dark))" />
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('recentActivityTitle')}</h2>
                            </div>
                            <button
                                onClick={() => setExpandModal('recentActivity')}
                                className={styles.miniBtn}
                            >
                                {t('viewAll')}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                            {recentOrders.map(o => (
                                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
                                    <div style={{ padding: '10px', background: 'hsla(var(--color-primary), 0.1)', borderRadius: '12px', color: 'hsl(var(--color-primary-dark))', flexShrink: 0 }}>
                                        <ShoppingBag size={18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            #{o.id.slice(0, 6)} — {o.profiles?.full_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                            {format(new Date(o.created_at), 'HH:mm')} · {o.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', flexShrink: 0,
                                        background: STATUS_COLORS[o.status]?.bg || '#F3F4F6',
                                        color: STATUS_COLORS[o.status]?.text || '#6B7280',
                                        textTransform: 'uppercase'
                                    }}>
                                        {STATUS_COLORS[o.status]?.label || o.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ==================== ROW 4: Category Mix + Customer Retention ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        <CategoryDonutChart
                            title={t('categoryRevenueTitle')}
                            data={analytics.categoryMix}
                        />

                        <RetentionFunnel
                            totalActive={analytics.activeBuyers}
                            repeatCount={analytics.repeatCustomers}
                            newCount={analytics.newCustomers}
                        />
                    </div>
                </>
            )}

            <ABCAnalysisModal
                isOpen={showABCModal}
                onClose={() => setShowABCModal(false)}
                data={analytics.allProductSales}
            />

            <DashboardExpandModal
                isOpen={!!expandModal}
                onClose={() => setExpandModal(null)}
                type={expandModal || 'recentActivity'}
                orders={orders}
                analytics={analytics}
            />
        </div>
    );
}
