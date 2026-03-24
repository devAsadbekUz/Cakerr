'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag, Clock, AlertCircle,
    TrendingUp, Users, DollarSign,
    BarChart3, Repeat, Package, PieChart
} from 'lucide-react';
import { orderService } from '@/app/services/orderService';
import {
    format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
    subDays
} from 'date-fns';
import styles from './AdminDashboard.module.css';
import { StatCard } from '@/app/components/admin/DashboardComponents';
import { createClient } from '@/app/utils/supabase/client';
import ABCAnalysisModal from '@/app/components/admin/ABCAnalysisModal';
import DashboardExpandModal from '@/app/components/admin/DashboardExpandModal';
import { useAdminAnalytics } from '@/app/hooks/admin/useAdminAnalytics';
import { CategoryDonutChart, RetentionFunnel, RevenueLineChart } from '@/app/components/admin/DashboardCharts';

// Status display config (Keep for UI mapping if needed, but hook provides labels)
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: '#FEF3C7', text: '#92400E', label: 'Yangi' },
    confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: 'Tasdiqlangan' },
    preparing: { bg: '#FDE68A', text: '#78350F', label: 'Tayyorlanmoqda' },
    delivering: { bg: '#E0E7FF', text: '#3730A3', label: 'Yetkazilmoqda' },
    completed: { bg: '#D1FAE5', text: '#065F46', label: 'Tugallangan' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Bekor qilingan' },
};

export default function AdminAnalyticsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showABCModal, setShowABCModal] = useState(false);
    const [expandModal, setExpandModal] = useState<'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours' | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [filterDays, setFilterDays] = useState<number | null>(30); // Default to 30 days
    const supabase = useMemo(() => createClient(), []);

    const { analytics, weeklyData } = useAdminAnalytics(orders, totalUsers, categories, filterDays);

    const fetchData = async () => {
        const data = await orderService.getAllOrdersAdmin();
        setOrders(data || []);

        const [profilesRes, categoriesRes] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('categories').select('id, label')
        ]);

        if (profilesRes.count !== null) setTotalUsers(profilesRes.count);
        if (categoriesRes.data) setCategories(categoriesRes.data);

        setLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        fetchData();

        const ordersChannel = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchData();
            })
            .subscribe();

        const profilesChannel = supabase
            .channel('admin-profiles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, []);

    const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

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

    const maxRevenue = useMemo(() =>
        Math.max(...analytics.revenueTrend.map(d => d.revenue), 1),
        [analytics.revenueTrend]
    );

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Menejer Paneli</h1>
                    <p style={{ color: '#6B7280', marginTop: '4px' }}>Xush kelibsiz! Bugungi tahlillar bilan tanishing.</p>
                </div>

                <div className={styles.filterBar}>
                    {[
                        { label: '30 kun', value: 30 },
                        { label: '90 kun', value: 90 },
                        { label: '180 kun', value: 180 },
                        { label: 'Hammasi', value: null }
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

            {/* ==================== STAT CARDS ==================== */}
            <div className={styles.statsGrid}>
                <StatCard title="Yangi" value={analytics.newOrdersCount} icon={AlertCircle} color="orange" />
                <StatCard title="Bugun" value={analytics.todaysOrdersCount} icon={Clock} color="blue" />
                <StatCard title="Daromat" value={`${(analytics.totalRevenue / 1000000).toFixed(1)}M`} icon={DollarSign} color="green" />
                <StatCard
                    title="Mijozlar"
                    value={analytics.totalCustomers}
                    icon={Users}
                    color="purple"
                    subtitle={`${analytics.activeBuyers} faol xaridor`}
                />
                <StatCard
                    title="O'rtacha chek"
                    value={`${(analytics.aov / 1000).toFixed(0)}K`}
                    icon={BarChart3}
                    color="blue"
                    subtitle="so'm / buyurtma"
                />
                <StatCard
                    title="Qaytib keluvchi"
                    value={`${analytics.repeatRate}%`}
                    icon={Repeat}
                    color="green"
                    subtitle={`${analytics.repeatCustomers} mijoz`}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Yuklanmoqda...</div>
            ) : (
                <>
                    {/* ==================== ROW: Revenue & Sales Trend Line Chart ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginBottom: '32px' }}>
                        <RevenueLineChart
                            title="Daromad va Sotuvlar Trendi (O'tmish va Kelajak)"
                            data={analytics.revenueTrend.map(d => ({
                                label: d.label,
                                revenue: d.revenue,
                                sales: d.count,
                                isFuture: d.isFuture
                            }))}
                        />
                    </div>

                    {/* ==================== ROW 1: Weekly Orders + Order Status ==================== */}
                    <div className={styles.analyticsLayout}>
                        {/* Weekly Orders Bar Graph */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={20} color="#BE185D" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Haftalik buyurtmalar</h2>
                                </div>
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Joriy hafta</span>
                                <button
                                    onClick={() => setExpandModal('weeklyOrders')}
                                    className={styles.miniBtn}
                                >
                                    Hammasini ko&apos;rish
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <PieChart size={20} color="#BE185D" />
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Buyurtma holatlari</h2>
                            </div>
                            <button
                                onClick={() => setExpandModal('orderStatuses')}
                                className={styles.miniBtn}
                            >
                                Hammasini ko&apos;rish
                            </button>
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
                                    <Package size={20} color="#BE185D" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Eng mashhur mahsulotlar</h2>
                                </div>
                                <button
                                    onClick={() => setShowABCModal(true)}
                                    className={styles.miniBtn}
                                >
                                    Batafsil stats
                                </button>
                            </div>

                            {analytics.topProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                    Ma'lumot yo'q
                                </div>
                            ) : (
                                <div className={styles.topProductsList}>
                                    {analytics.topProducts.map((product, idx) => (
                                        <div key={idx} className={styles.topProductItem}>
                                            <div className={styles.topProductRank}>#{idx + 1}</div>
                                            <div className={styles.topProductInfo}>
                                                <div className={styles.topProductName}>{product.name}</div>
                                                <div className={styles.topProductStats}>
                                                    {product.quantity} dona • {product.revenue.toLocaleString()} so'm
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
                                    <Clock size={20} color="#BE185D" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Buyurtma soatlari</h2>
                                </div>
                                <button
                                    onClick={() => setExpandModal('peakHours')}
                                    className={styles.miniBtn}
                                >
                                    Hammasini ko&apos;rish
                                </button>
                            </div>

                            <div className={styles.peakHoursGrid}>
                                {analytics.peakHours.map((h) => {
                                    const intensity = h.count / maxHourCount;
                                    const bg = h.count === 0 ? '#F3F4F6' :
                                        intensity > 0.7 ? '#BE185D' :
                                            intensity > 0.4 ? '#EC4899' :
                                                intensity > 0.15 ? '#FBCFE8' : '#FCE7F3';
                                    const textColor = intensity > 0.4 && h.count > 0 ? 'white' : '#374151';

                                    return (
                                        <div
                                            key={h.hour}
                                            className={styles.peakHourCell}
                                            style={{ background: bg, color: textColor }}
                                            title={`${h.label}: ${h.count} buyurtma`}
                                        >
                                            <div className={styles.peakHourLabel}>{h.label}</div>
                                            <div className={styles.peakHourCount}>{h.count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ==================== ROW 3: Revenue Trend + Recent Activity ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        {/* Revenue Trend */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <DollarSign size={20} color="#BE185D" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Daromat trendi</h2>
                                </div>
                                <button
                                    onClick={() => setExpandModal('revenueTrend')}
                                    className={styles.miniBtn}
                                >
                                    Hammasini ko&apos;rish
                                </button>
                            </div>

                            <div className={styles.revenueTrendContainer}>
                                {/* Y-axis labels */}
                                <div className={styles.revenueTrendYAxis}>
                                    <span>{(maxRevenue / 1000).toFixed(0)}K</span>
                                    <span>{(maxRevenue / 2000).toFixed(0)}K</span>
                                    <span>0</span>
                                </div>
                                {/* Bars */}
                                <div className={styles.revenueTrendBars}>
                                    {analytics.revenueTrend.map((day, idx) => {
                                        const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                                        const isLast = idx === analytics.revenueTrend.length - 1;
                                        return (
                                            <div key={idx} className={styles.revenueTrendColumn}>
                                                <div className={styles.revenueTrendBarWrapper}>
                                                    {day.revenue > 0 && (
                                                        <span className={styles.revenueTrendValue}>
                                                            {(day.revenue / 1000).toFixed(0)}K
                                                        </span>
                                                    )}
                                                    <div
                                                        className={`${styles.revenueTrendBar} ${isLast ? styles.revenueTrendBarToday : ''}`}
                                                        style={{ height: `${Math.max(heightPct, 3)}%` }}
                                                    />
                                                </div>
                                                <span className={styles.revenueTrendLabel}>{day.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className={styles.recentActivity}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>So&apos;nggi harakatlar</h2>
                                <button
                                    onClick={() => setExpandModal('recentActivity')}
                                    className={styles.miniBtn}
                                >
                                    Hammasini ko&apos;rish
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {recentOrders.map(o => (
                                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
                                        <div style={{ padding: '8px', background: '#FDF2F8', borderRadius: '10px', color: '#BE185D' }}>
                                            <ShoppingBag size={16} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700 }}>#{o.id.slice(0, 6)} - {o.profiles?.full_name}</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{format(new Date(o.created_at), 'HH:mm')} • {o.total_price.toLocaleString()} so'm</div>
                                        </div>
                                        <div style={{
                                            fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
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
                    </div>

                    {/* ==================== ROW 4: Category Mix + Customer Retention ==================== */}
                    <div className={styles.analyticsLayout} style={{ marginTop: '32px' }}>
                        <CategoryDonutChart
                            title="Yo'nalishlar bo'yicha daromad"
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
