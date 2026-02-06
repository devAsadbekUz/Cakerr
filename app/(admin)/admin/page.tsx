'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag, Clock, AlertCircle,
    TrendingUp, Users, DollarSign
} from 'lucide-react';
import { orderService } from '@/app/services/orderService';
import {
    format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay
} from 'date-fns';
import styles from './AdminDashboard.module.css';
import { StatCard } from '@/app/components/admin/DashboardComponents';
import { createClient } from '@/app/utils/supabase/client';

// Move supabase client outside component (singleton pattern)
const supabase = createClient();

export default function AdminAnalyticsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchData = async () => {
        // Fetch orders for revenue and active buyers
        const data = await orderService.getAllOrdersAdmin();
        setOrders(data || []);

        // Fetch total profiles count for industry standard "Customers" metric
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
            setTotalUsers(count);
        }

        setLoading(false);
    };

    useEffect(() => {
        setMounted(true);
        fetchData();

        // Realtime Subscription for orders
        const ordersChannel = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchData();
            })
            .subscribe();

        // Realtime Subscription for new user registrations
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

    // Memoize all analytics calculations to avoid recalculating on every render
    const analytics = useMemo(() => {
        const newOrders: any[] = [];
        const todaysOrders: any[] = [];
        let totalRevenue = 0;
        const activeBuyerIds = new Set<string>();

        // Single pass through orders for all metrics
        for (const o of orders) {
            activeBuyerIds.add(o.user_id);

            if (o.status === 'new') {
                newOrders.push(o);
            }

            if (o.status === 'completed') {
                totalRevenue += Number(o.total_price) || 0;
            }

            const deliveryDate = new Date(o.delivery_time);
            if (isToday(deliveryDate) && o.status !== 'completed' && o.status !== 'cancelled') {
                todaysOrders.push(o);
            }
        }

        return {
            newOrdersCount: newOrders.length,
            todaysOrdersCount: todaysOrders.length,
            totalRevenue,
            totalCustomers: totalUsers,
            activeBuyers: activeBuyerIds.size
        };
    }, [orders, totalUsers]);

    // Memoize weekly data calculation
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

    const maxOrders = useMemo(() =>
        Math.max(...weeklyData.map(d => d.count), 5),
        [weeklyData]
    );

    // Memoize recent orders slice
    const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Menejer Paneli</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>Xush kelibsiz! Bugungi tahlillar bilan tanishing.</p>
            </header>

            {/* Main Stats Grid */}
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
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Yuklanmoqda...</div>
            ) : (
                <div className={styles.analyticsLayout}>
                    {/* Weekly Orders Bar Graph */}
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={20} color="#BE185D" />
                                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Haftalik buyurtmalar</h2>
                            </div>
                            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Joriy hafta</span>
                        </div>

                        <div className={styles.barGraphContainer}>
                            {weeklyData.map((day, idx) => {
                                const heightPercentage = (day.count / maxOrders) * 100;
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
                                    <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: '#F3F4F6', color: '#6B7280', textTransform: 'uppercase' }}>
                                        {o.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
