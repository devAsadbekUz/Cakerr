'use client';

import React, { useState, useMemo } from 'react';
import { X, ShoppingBag, TrendingUp, Clock, DollarSign, PieChart, BarChart3, Package } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import styles from './DashboardExpandModal.module.css';

// Status display config
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: '#FEF3C7', text: '#92400E', label: 'Yangi' },
    confirmed: { bg: '#DBEAFE', text: '#1E40AF', label: 'Tasdiqlangan' },
    preparing: { bg: '#FDE68A', text: '#78350F', label: 'Tayyorlanmoqda' },
    delivering: { bg: '#E0E7FF', text: '#3730A3', label: 'Yetkazilmoqda' },
    completed: { bg: '#D1FAE5', text: '#065F46', label: 'Tugallangan' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Bekor qilingan' },
};

interface ExpandModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'recentActivity' | 'revenueTrend' | 'weeklyOrders' | 'orderStatuses' | 'peakHours';
    orders: any[];
    analytics: any;
}

export default function DashboardExpandModal({ isOpen, onClose, type, orders, analytics }: ExpandModalProps) {
    const [revenuePeriod, setRevenuePeriod] = useState<7 | 30 | 90>(30);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {type === 'recentActivity' && (
                    <RecentActivityFull orders={orders} onClose={onClose} />
                )}
                {type === 'revenueTrend' && (
                    <RevenueTrendFull
                        orders={orders}
                        period={revenuePeriod}
                        setPeriod={setRevenuePeriod}
                        onClose={onClose}
                    />
                )}
                {type === 'weeklyOrders' && (
                    <WeeklyOrdersFull orders={orders} onClose={onClose} />
                )}
                {type === 'orderStatuses' && (
                    <OrderStatusesFull analytics={analytics} onClose={onClose} />
                )}
                {type === 'peakHours' && (
                    <PeakHoursFull analytics={analytics} onClose={onClose} />
                )}
            </div>
        </div>
    );
}

// ===================== RECENT ACTIVITY FULL =====================
function RecentActivityFull({ orders, onClose }: { orders: any[]; onClose: () => void }) {
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
                        <h2 className={styles.title}>Barcha harakatlar</h2>
                        <p className={styles.subtitle}>{sorted.length} ta buyurtma</p>
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
                                    #{o.id.slice(0, 6)} - {o.profiles?.full_name || 'Mijoz'}
                                </div>
                                <div className={styles.orderMeta}>
                                    {format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')} • {o.total_price?.toLocaleString()} so&apos;m
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
                        <div className={styles.emptyState}>Buyurtmalar yo&apos;q</div>
                    )}
                </div>
            </div>
        </>
    );
}

// ===================== REVENUE TREND FULL =====================
function RevenueTrendFull({
    orders, period, setPeriod, onClose
}: {
    orders: any[];
    period: 7 | 30 | 90;
    setPeriod: (p: 7 | 30 | 90) => void;
    onClose: () => void;
}) {
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
                        <h2 className={styles.title}>Daromat trendi</h2>
                        <p className={styles.subtitle}>Tugallangan buyurtmalar daromadi</p>
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
                        {p} kun
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <h4>Jami daromat</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                            {totalRevenue >= 1_000_000
                                ? `${(totalRevenue / 1_000_000).toFixed(1)}M`
                                : `${(totalRevenue / 1_000).toFixed(0)}K`
                            } so&apos;m
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>Buyurtmalar</h4>
                        <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                            {totalOrders}
                        </div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>O&apos;rtacha / kun</h4>
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
function WeeklyOrdersFull({ orders, onClose }: { orders: any[]; onClose: () => void }) {
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
                        <h2 className={styles.title}>Kunlik buyurtmalar</h2>
                        <p className={styles.subtitle}>So&apos;nggi 30 kun • Jami: {totalOrders}</p>
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
                                    {day.count > 0 ? `${day.count} ta` : '—'}
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
function OrderStatusesFull({ analytics, onClose }: { analytics: any; onClose: () => void }) {
    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <PieChart size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>Buyurtma holatlari</h2>
                        <p className={styles.subtitle}>Jami {analytics.totalOrders} buyurtma</p>
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
function PeakHoursFull({ analytics, onClose }: { analytics: any; onClose: () => void }) {
    const maxCount = Math.max(...analytics.peakHours.map((h: any) => h.count), 1);
    const totalOrders = analytics.peakHours.reduce((sum: number, h: any) => sum + h.count, 0);
    const peakHour = analytics.peakHours.reduce((max: any, h: any) => h.count > max.count ? h : max, analytics.peakHours[0]);

    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Clock size={22} color="#BE185D" />
                    <div>
                        <h2 className={styles.title}>Buyurtma soatlari</h2>
                        <p className={styles.subtitle}>Eng ko&apos;p: {peakHour?.label} ({peakHour?.count} ta)</p>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>
            <div className={styles.content}>
                <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                        <h4>Jami buyurtmalar</h4>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{totalOrders}</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <h4>Eng faol soat</h4>
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
                                    {h.count > 0 ? `${h.count} ta` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
