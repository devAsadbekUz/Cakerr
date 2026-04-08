'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search, ArrowLeft, ShoppingBag, ChevronRight,
    User, Phone, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import { orderService } from '@/app/services/orderService';
import type { AdminOrderListItem } from '@/app/types/admin-order';
import styles from './page.module.css';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    new:        { bg: '#FEF3C7', text: '#B45309' },
    confirmed:  { bg: '#DBEAFE', text: '#1E40AF' },
    preparing:  { bg: '#FDE68A', text: '#78350F' },
    ready:      { bg: '#D1FAE5', text: '#065F46' },
    delivering: { bg: '#E0E7FF', text: '#3730A3' },
    completed:  { bg: '#F3F4F6', text: '#6B7280' },
    cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
};

export default function OrderHistoryPage() {
    const { lang, t } = useAdminI18n();
    const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await orderService.getAllOrdersAdmin(null);
        setOrders(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase().replace(/^#/, '');
        return orders.filter(o => {
            const name  = (o.customer_name  || o.profiles?.full_name    || '').toLowerCase();
            const phone = (o.customer_phone || o.profiles?.phone_number || '');
            const matchesSearch =
                o.id.toLowerCase().includes(q) ||
                name.includes(q) ||
                phone.includes(q);
            return matchesSearch && (statusFilter === 'all' || o.status === statusFilter);
        });
    }, [orders, searchQuery, statusFilter]);

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/admin/orders" className={styles.backBtn}>
                    <ArrowLeft size={18} />
                </Link>
                <h1 className={styles.title}>{t('orderHistory')}</h1>
                <span className={styles.count}>
                    {loading ? '…' : filtered.length} {lang === 'ru' ? 'заказов' : 'buyurtma'}
                </span>
            </header>

            {/* Filter bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t('searchPlaceholder') || 'ID, ism yoki telefon...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className={styles.statusSelect}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
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

                <button className={styles.refreshBtn} onClick={fetchData} title="Refresh">
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className={styles.loading}>{t('loading')}</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    <ShoppingBag size={44} style={{ opacity: 0.25 }} />
                    <p>{t('noOrdersMatching') || 'Hech qanday buyurtma topilmadi.'}</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {filtered.map(order => {
                        const sc = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#374151' };
                        const name  = order.customer_name  || order.profiles?.full_name    || t('client');
                        const phone = order.customer_phone || order.profiles?.phone_number || '—';

                        return (
                            <Link
                                key={order.id}
                                href={`/admin/orders/${order.id}`}
                                className={styles.card}
                            >
                                {/* Top row */}
                                <div className={styles.cardTop}>
                                    <div>
                                        <div className={styles.cardId}>#{order.id.slice(0, 8)}</div>
                                        <span
                                            className={styles.statusBadge}
                                            style={{ background: sc.bg, color: sc.text }}
                                        >
                                            {t(`status_${order.status}` as any) || order.status}
                                        </span>
                                    </div>
                                    <div className={styles.cardRight}>
                                        <div className={styles.cardPrice}>
                                            {order.total_price.toLocaleString()} {lang === 'uz' ? "so'm" : 'сум'}
                                        </div>
                                        <div className={styles.cardDate}>
                                            {format(new Date(order.created_at), 'HH:mm · dd.MM.yyyy')}
                                        </div>
                                    </div>
                                </div>

                                <hr className={styles.divider} />

                                {/* Customer info */}
                                <div className={styles.cardCustomer}>
                                    <div className={styles.cardRow}>
                                        <User size={13} color="#9CA3AF" />
                                        {name}
                                    </div>
                                    <div className={`${styles.cardRow} ${styles.cardRowPhone}`}>
                                        <Phone size={13} color="#9CA3AF" />
                                        {phone}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className={styles.cardFooter}>
                                    {t('viewFull') || 'Ko\'rish'}
                                    <ChevronRight size={14} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
