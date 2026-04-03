'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../LoyaltyManagement.module.css';
import { ArrowLeft, Coins, TrendingUp, ShoppingBag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

import { useAdminI18n } from '@/app/context/AdminLanguageContext';

interface UserProfile {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    coins: number;
}

interface Order {
    id: string;
    created_at: string;
    total_price: number;
    status: string;
    coins_earned: number;
    coins_spent: number;
}

interface Transaction {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    order_id: string | null;
    created_at: string;
}

export default function UserLoyaltyDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = React.use(params);
    const router = useRouter();
    const { t, lang } = useAdminI18n();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSpent: 0,
        totalEarned: 0,
        totalUsed: 0
    });
    const [activeTab, setActiveTab] = useState<'orders' | 'transactions'>('orders');

    // Adjustment state
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjAmount, setAdjAmount] = useState('');
    const [adjReason, setAdjReason] = useState('');
    const [adjNotifyMessage, setAdjNotifyMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            // 1. Fetch user profile via admin API
            const profileRes = await fetch(`/api/admin/data?table=profiles&filterColumn=id&filterValue=${userId}`);
            const profileJson = await profileRes.json();

            if (profileJson.data && profileJson.data.length > 0) {
                setUser(profileJson.data[0]);
            }

            // 2. Fetch user's orders via admin API
            const ordersRes = await fetch(`/api/admin/data?table=orders&filterColumn=user_id&filterValue=${userId}&orderBy=created_at&orderAsc=false`);
            const ordersJson = await ordersRes.json();

            if (ordersJson.data) {
                setOrders(ordersJson.data);

                // Calculate order stats
                const totalSpent = ordersJson.data.reduce((acc: number, o: Order) => acc + (o.total_price || 0), 0);
                setStats(prev => ({
                    ...prev,
                    totalOrders: ordersJson.data.length,
                    totalSpent
                }));
            }

            // 3. Fetch user's coin transactions via admin API
            const txRes = await fetch(`/api/admin/data?table=coin_transactions&filterColumn=user_id&filterValue=${userId}&orderBy=created_at&orderAsc=false`);
            const txJson = await txRes.json();

            if (txJson.data) {
                setTransactions(txJson.data);

                // Calculate coin stats
                const earned = txJson.data
                    .filter((t: Transaction) => t.amount > 0)
                    .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
                const used = txJson.data
                    .filter((t: Transaction) => t.amount < 0)
                    .reduce((acc: number, t: Transaction) => acc + Math.abs(t.amount), 0);

                setStats(prev => ({
                    ...prev,
                    totalEarned: earned,
                    totalUsed: used
                }));
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [userId]);

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjAmount || !adjReason) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/loyalty/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: parseInt(adjAmount),
                    description: adjReason,
                    notifyMessage: adjNotifyMessage
                })
            });

            if (res.ok) {
                setIsAdjusting(false);
                setAdjAmount('');
                setAdjReason('');
                setAdjNotifyMessage('');
                fetchUserData(); // Refresh data
            } else {
                const error = await res.json();
                alert(error.error || t('error'));
            }
        } catch (err) {
            console.error('Adjustment failed:', err);
            alert(t('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getStatusLabel = (status: string) => {
        return t(`status_${status}` as any) || status;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <p>{t('loading')}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                    {t('back')}
                </button>
                <p>{t('userNotFound')}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <button className={styles.backBtn} onClick={() => router.back()}>
                <ArrowLeft size={18} />
                {t('back')}
            </button>

            {/* User Header */}
            <div className={styles.userHeader}>
                <div className={styles.userAvatar}>
                    {getInitials(user.full_name)}
                </div>
                <div className={styles.userInfo}>
                    <h2>{user.full_name || t('unknown')}</h2>
                    <p>{user.phone_number || t('noPhone')}</p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <span className={styles.coinBalance}>
                        <Coins size={18} style={{ marginRight: 6 }} />
                        {user.coins.toLocaleString()} {t('tanga')}
                    </span>
                    <button 
                        className={styles.adjustBtn} 
                        style={{ marginTop: 8 }}
                        onClick={() => setIsAdjusting(true)}
                    >
                        {t('adjustBalance')}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('totalOrders')}</div>
                    <div className={styles.statValue}>
                        <ShoppingBag size={20} style={{ marginRight: 8, color: '#6366F1' }} />
                        {stats.totalOrders}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('totalSpentLabel')}</div>
                    <div className={styles.statValue}>
                        {stats.totalSpent.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('totalEarnedCoinsLabel')}</div>
                    <div className={styles.statValue}>
                        <ArrowUpCircle size={20} className={styles.positive} style={{ marginRight: 8 }} />
                        +{stats.totalEarned.toLocaleString()}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('usedCoinsLabel')}</div>
                    <div className={styles.statValue}>
                        <ArrowDownCircle size={20} className={styles.negative} style={{ marginRight: 8 }} />
                        -{stats.totalUsed.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'orders' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    <ShoppingBag size={18} />
                    {t('orderHistoryTab')} ({orders.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'transactions' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    <TrendingUp size={18} />
                    {t('coinHistoryTab')} ({transactions.length})
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div>
                    {orders.length === 0 ? (
                        <div className={styles.settingsCard} style={{ textAlign: 'center', padding: 48 }}>
                            <ShoppingBag size={48} color="#D1D5DB" />
                            <p style={{ marginTop: 16, color: '#6B7280' }}>{t('noOrdersFound')}</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className={styles.orderCard}>
                                <div className={styles.orderInfo}>
                                    <span className={styles.orderId}>
                                        {t('orderLabel')} #{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={styles.orderDate}>
                                        {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')} • {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div className={styles.orderAmount}>
                                    <div className={styles.orderTotal}>
                                        {order.total_price?.toLocaleString()} {lang === 'uz' ? "so'm" : "сум"}
                                    </div>
                                    {order.coins_earned > 0 && (
                                        <div className={styles.orderCoins}>
                                            +{order.coins_earned} {t('earnedLabel')}
                                        </div>
                                    )}
                                    {order.coins_spent > 0 && (
                                        <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                                            -{order.coins_spent} {t('spentLabel')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
                <div className={styles.historyCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{t('dateCol')}</th>
                                    <th>{t('typeCol')}</th>
                                    <th>{t('amountCol')}</th>
                                    <th>{t('commentCol')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className={styles.emptyState}>
                                            {t('noHistoryFound')}
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(t_item => (
                                        <tr key={t_item.id}>
                                            <td>{format(new Date(t_item.created_at), 'dd.MM.yyyy HH:mm')}</td>
                                            <td>
                                                <span className={`${styles.badge} ${t_item.amount > 0 ? styles.earnBadge : styles.spendBadge}`}>
                                                    {t_item.type === 'earn' ? t('earn') : t_item.type === 'spend' ? t('spend') : t_item.type === 'admin_adjustment' ? t('adjustmentLabel') : t_item.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.amount} ${t_item.amount > 0 ? styles.amountEarn : styles.amountSpend}`}>
                                                    {t_item.amount > 0 ? '+' : ''}{t_item.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td>{t_item.description || (t_item.order_id ? `${t('orderLabel')} #${t_item.order_id.slice(0, 8)}` : '-')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Adjustment Modal */}
            {isAdjusting && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>
                            <Coins size={24} color="#E91E63" />
                            {t('adjustModalTitle')}
                        </h3>
                        <form onSubmit={handleAdjust}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('amountFieldLabel')}</label>
                                <input 
                                    type="number" 
                                    className={styles.formInput}
                                    placeholder={t('amountFieldPlaceholder')}
                                    required
                                    value={adjAmount}
                                    onChange={e => setAdjAmount(e.target.value)}
                                />
                                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                                    {t('amountFieldHint')}
                                </p>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('reasonFieldLabel')}</label>
                                <textarea 
                                    className={styles.formTextarea}
                                    placeholder={t('reasonFieldPlaceholder')}
                                    required
                                    value={adjReason}
                                    onChange={e => setAdjReason(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{t('notificationFieldLabel')}</label>
                                <textarea 
                                    className={styles.formTextarea}
                                    placeholder={t('notificationFieldPlaceholder')}
                                    value={adjNotifyMessage}
                                    onChange={e => setAdjNotifyMessage(e.target.value)}
                                    style={{ height: '80px' }}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button 
                                    type="button" 
                                    className={styles.cancelBtn}
                                    onClick={() => setIsAdjusting(false)}
                                    disabled={isSubmitting}
                                >
                                    {t('cancel')}
                                </button>
                                <button 
                                    type="submit" 
                                    className={styles.confirmBtn}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('confirming') : t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


