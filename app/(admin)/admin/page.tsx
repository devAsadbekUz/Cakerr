'use client';

import { useState, useEffect } from 'react';
import {
    ShoppingBag, Clock, AlertCircle, CheckCircle2,
    TrendingUp, Users, DollarSign, Calendar
} from 'lucide-react';
import { orderService } from '@/app/services/orderService';
import {
    format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay
} from 'date-fns';
import styles from './AdminDashboard.module.css';
import { StatCard } from '@/app/components/admin/DashboardComponents';

export default function AdminAnalyticsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            const data = await orderService.getAllOrdersAdmin();
            setOrders(data || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (!mounted) return null;

    // Analytics Logic
    const newOrders = orders.filter(o => o.status === 'new');
    const todaysOrders = orders.filter(o => isToday(new Date(o.delivery_time)) && o.status !== 'completed' && o.status !== 'cancelled');
    const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total_price), 0);

    // Weekly Bar Graph Logic
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const daysOfCurrentWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyData = daysOfCurrentWeek.map(day => {
        const dayOrders = orders.filter(o => isSameDay(new Date(o.delivery_time), day));
        return {
            label: format(day, 'EEE'),
            date: format(day, 'd-MMM'),
            count: dayOrders.length,
            isToday: isToday(day)
        };
    });

    const maxOrders = Math.max(...weeklyData.map(d => d.count), 5); // Minimum scale of 5

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Menejer Paneli</h1>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>Xush kelibsiz! Bugungi tahlillar bilan tanishing.</p>
            </header>

            {/* Main Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard title="Yangi" value={newOrders.length} icon={AlertCircle} color="orange" />
                <StatCard title="Bugun" value={todaysOrders.length} icon={Clock} color="blue" />
                <StatCard title="Daromat" value={`${(totalRevenue / 1000000).toFixed(1)}M`} icon={DollarSign} color="green" />
                <StatCard title="Mijozlar" value={new Set(orders.map(o => o.user_id)).size} icon={Users} color="purple" />
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

                    {/* Additional Analytics - Popular Products etc could go here */}
                    <div className={styles.recentActivity}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>So'nggi harakatlar</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {orders.slice(0, 5).map(o => (
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
