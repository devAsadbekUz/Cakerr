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
import { CategoryDonutChart, RetentionFunnel, RevenueLineChart } from '@/app/components/admin/DashboardCharts';

const supabase = createClient();

// Status display config
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
    const [categories, setCategories] = useState<any[]>([]);

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

    // ==================== ANALYTICS COMPUTATIONS ====================

    const analytics = useMemo(() => {
        const newOrders: any[] = [];
        const todaysOrders: any[] = [];
        let totalRevenue = 0;
        let completedCount = 0;
        const activeBuyerIds = new Set<string>();
        const userOrderCounts = new Map<string, number>();
        const statusCounts = new Map<string, number>();
        const hourCounts = new Array(24).fill(0);
        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
        const categoryRevenue = new Map<string, number>();

        // Revenue per day for last 6 days + Today + Next 10 days
        const today = new Date();
        const revenueDays = Array.from({ length: 17 }, (_, i) => {
            const d = subDays(today, 6 - i);
            return {
                date: d,
                label: format(d, 'dd/MM'),
                revenue: 0,
                count: 0,
                isFuture: i > 6 // 0-6 are past/today, 7-16 are future
            };
        });

        for (const o of orders) {
            // Active buyers
            if (o.user_id) {
                activeBuyerIds.add(o.user_id);
                userOrderCounts.set(o.user_id, (userOrderCounts.get(o.user_id) || 0) + 1);
            }

            // Status breakdown
            statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);

            // New orders
            if (o.status === 'new') {
                newOrders.push(o);
            }

            // Past Revenue (from completed orders, using creation date)
            const orderCreatedAt = new Date(o.created_at);
            if (o.status === 'completed') {
                const price = Number(o.total_price) || 0;
                totalRevenue += price;
                completedCount++;

                for (let i = 0; i <= 6; i++) {
                    const day = revenueDays[i];
                    if (isSameDay(orderCreatedAt, day.date)) {
                        day.revenue += price;
                        day.count++;
                        break;
                    }
                }
            }

            // Future Projection (from non-cancelled orders, using delivery date)
            const orderDeliveryDate = new Date(o.delivery_time);
            if (o.status !== 'cancelled') {
                const price = Number(o.total_price) || 0;
                // Only count for index 7 and above (future days)
                for (let i = 7; i < revenueDays.length; i++) {
                    const day = revenueDays[i];
                    if (isSameDay(orderDeliveryDate, day.date)) {
                        day.revenue += price;
                        day.count++;
                        break;
                    }
                }
            }

            // Today's active orders
            const deliveryDate = new Date(o.delivery_time);
            if (isToday(deliveryDate) && o.status !== 'completed' && o.status !== 'cancelled') {
                todaysOrders.push(o);
            }

            // Peak hours (from order creation time)
            const hour = new Date(o.created_at).getHours();
            hourCounts[hour]++;

            // Top products (from order_items)
            if (o.order_items) {
                for (const item of o.order_items) {
                    const key = item.product_id || item.name;
                    const existing = productSales.get(key);
                    const qty = item.quantity || 1;
                    const rev = (Number(item.unit_price) || 0) * qty;
                    if (existing) {
                        existing.quantity += qty;
                        existing.revenue += rev;
                    } else {
                        productSales.set(key, { name: item.name, quantity: qty, revenue: rev });
                    }

                    // Category revenue tracking
                    if (o.status === 'completed') {
                        const catId = item.products?.category_id || 'other';
                        categoryRevenue.set(catId, (categoryRevenue.get(catId) || 0) + rev);
                    }
                }
            }
        }

        // Repeat customers
        let repeatCustomers = 0;
        for (const count of userOrderCounts.values()) {
            if (count > 1) repeatCustomers++;
        }

        // AOV
        const aov = completedCount > 0 ? totalRevenue / completedCount : 0;

        // Top 5 products by quantity
        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Peak hours (only 6am to midnight for readability)
        const peakHours = hourCounts
            .map((count, hour) => ({ hour, count, label: `${hour.toString().padStart(2, '0')}:00` }))
            .filter(h => h.hour >= 6 && h.hour <= 23);

        // Status breakdown as array
        const statusBreakdown = Array.from(statusCounts.entries())
            .map(([status, count]) => ({
                status,
                count,
                ...(STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280', label: status })
            }));

        // Category revenue makeup
        const categoryColors = ['#BE185D', '#EC4899', '#DB2777', '#9D174D', '#F472B6', '#FBCFE8'];
        const categoryMix = Array.from(categoryRevenue.entries())
            .map(([id, revenue], idx) => {
                const cat = categories.find(c => c.id === id);
                return {
                    label: cat ? cat.label : (id === 'other' ? 'Boshqa' : 'Noma\'lum'),
                    value: revenue,
                    color: categoryColors[idx % categoryColors.length],
                    percent: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
                };
            })
            .sort((a, b) => b.value - a.value);

        return {
            newOrdersCount: newOrders.length,
            todaysOrdersCount: todaysOrders.length,
            totalRevenue,
            totalCustomers: totalUsers,
            activeBuyers: activeBuyerIds.size,
            aov,
            repeatCustomers,
            repeatRate: activeBuyerIds.size > 0
                ? Math.round((repeatCustomers / activeBuyerIds.size) * 100)
                : 0,
            topProducts,
            peakHours,
            statusBreakdown,
            revenueTrend: revenueDays,
            totalOrders: orders.length,
            allProductSales: Array.from(productSales.values()),
            categoryMix,
            newCustomers: activeBuyerIds.size - repeatCustomers
        };
    }, [orders, totalUsers, categories]);

    // Weekly data
    const weeklyData = useMemo(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

        return days.map(day => {
            const count = orders.filter(o => isSameDay(new Date(o.delivery_time), day)).length;
            return {
                label: format(day, 'EEE'),
                date: format(day, 'd-MMM'),
                count,
                isToday: isToday(day)
            };
        });
    }, [orders]);

    const maxWeeklyOrders = useMemo(() =>
        Math.max(...weeklyData.map(d => d.count), 5),
        [weeklyData]
    );

    const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

    // Derived max values for charts
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
                <h1 className={styles.title}>Menejer Paneli</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>Xush kelibsiz! Bugungi tahlillar bilan tanishing.</p>
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
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Peak hours</span>
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
                                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>So'nggi 7 kun</span>
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
                            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>So'nggi harakatlar</h2>
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
        </div>
    );
}
