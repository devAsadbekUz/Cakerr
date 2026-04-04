'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, Filter, Calendar as CalendarIcon, 
    ArrowLeft, ShoppingBag, ChevronRight, User, Phone, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { orderService } from '@/app/services/orderService';
import type { AdminOrderListItem } from '@/app/types/admin-order';
import styles from '../../AdminDashboard.module.css';

export default function OrderHistoryPage() {
    const { lang, t } = useAdminI18n();
    const router = useRouter();
    const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await orderService.getAllOrdersAdmin(null); // Fetch all
        setOrders(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = 
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customer_phone || '').includes(searchQuery);
            
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchQuery, statusFilter]);

    const statusColors: Record<string, { bg: string; text: string }> = {
        new: { bg: '#FEF3C7', text: '#B45309' },
        confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
        preparing: { bg: '#FDE68A', text: '#78350F' },
        ready: { bg: '#D1FAE5', text: '#065F46' },
        delivering: { bg: '#E0E7FF', text: '#3730A3' },
        completed: { bg: '#F3F4F6', text: '#6B7280' },
        cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/admin/orders" className={styles.modalClose} style={{ width: '40px', height: '40px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className={styles.title}>{t('orderHistory')}</h1>
                </div>
            </header>

            <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input 
                            type="text" 
                            placeholder={t('searchPlaceholder') || 'Search orders...'} 
                            className={styles.filterBtn}
                            style={{ width: '100%', paddingLeft: '40px', textAlign: 'left', cursor: 'text' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <select 
                        className={styles.filterBtn}
                        style={{ height: '44px', border: '1px solid #E5E7EB' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">{t('filter_all')}</option>
                        <option value="new">{t('status_new')}</option>
                        <option value="confirmed">{t('status_confirmed')}</option>
                        <option value="preparing">{t('status_preparing')}</option>
                        <option value="ready">{t('status_ready')}</option>
                        <option value="delivering">{t('status_delivering')}</option>
                        <option value="completed">{t('status_completed')}</option>
                        <option value="cancelled">{t('status_cancelled')}</option>
                    </select>

                    <button onClick={fetchData} className={styles.filterBtn} style={{ height: '44px' }}>
                        <Clock size={18} />
                    </button>
                </div>
            </div>

            <div className={styles.orderGrid}>
                {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#6B7280' }}>{t('loading')}</div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', color: '#9CA3AF' }}>
                        <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>{t('noOrdersMatching') || 'No orders found matching your search.'}</p>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const sc = statusColors[order.status] || { bg: '#F3F4F6', text: '#374151' };
                        return (
                            <Link key={order.id} href={`/admin/orders/${order.id}`} className={styles.orderCard} style={{ textDecoration: 'none' }}>
                                <div className={styles.orderCardHeader}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>#{order.id.slice(0, 8)}</div>
                                        <div style={{ 
                                            background: sc.bg, 
                                            color: sc.text, 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '11px', 
                                            fontWeight: 800,
                                            marginTop: '4px',
                                            display: 'inline-block',
                                            textTransform: 'uppercase'
                                        }}>
                                            {t(`status_${order.status}` as any) || order.status}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#BE185D' }}>
                                            {order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                            {format(new Date(order.created_at), 'HH:mm dd.MM.yyyy')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #F3F4F6', margin: '8px 0' }}></div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                                        <User size={14} color="#9CA3AF" /> {order.customer_name || t('client')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B7280' }}>
                                        <Phone size={14} color="#9CA3AF" /> {order.customer_phone || '-'}
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{ color: 'hsl(var(--color-primary-dark))', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {t('viewFull') || 'View Full'} <ChevronRight size={14} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
