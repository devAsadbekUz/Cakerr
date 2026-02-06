'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../LoyaltyManagement.module.css';
import { ArrowLeft, Coins, TrendingUp, ShoppingBag, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

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

    useEffect(() => {
        async function fetchUserData() {
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
        }

        fetchUserData();
    }, [userId]);

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getStatusLabel = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'new': 'Yangi',
            'confirmed': 'Tasdiqlangan',
            'preparing': 'Tayyorlanmoqda',
            'ready': 'Tayyor',
            'delivering': 'Yetkazilmoqda',
            'completed': 'Yakunlangan',
            'cancelled': 'Bekor qilingan'
        };
        return statusMap[status] || status;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                    Orqaga
                </button>
                <p>Foydalanuvchi topilmadi</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <button className={styles.backBtn} onClick={() => router.back()}>
                <ArrowLeft size={18} />
                Orqaga
            </button>

            {/* User Header */}
            <div className={styles.userHeader}>
                <div className={styles.userAvatar}>
                    {getInitials(user.full_name)}
                </div>
                <div className={styles.userInfo}>
                    <h2>{user.full_name || 'Noma\'lum'}</h2>
                    <p>{user.phone_number || 'Telefon yo\'q'}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    <span className={styles.coinBalance}>
                        <Coins size={18} style={{ marginRight: 6 }} />
                        {user.coins.toLocaleString('uz-UZ')} tanga
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Jami buyurtmalar</div>
                    <div className={styles.statValue}>
                        <ShoppingBag size={20} style={{ marginRight: 8, color: '#6366F1' }} />
                        {stats.totalOrders}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Jami xarajat</div>
                    <div className={styles.statValue}>
                        {stats.totalSpent.toLocaleString('uz-UZ')} so'm
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Jami olgan tangalar</div>
                    <div className={styles.statValue}>
                        <ArrowUpCircle size={20} className={styles.positive} style={{ marginRight: 8 }} />
                        +{stats.totalEarned.toLocaleString('uz-UZ')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Ishlatgan tangalar</div>
                    <div className={styles.statValue}>
                        <ArrowDownCircle size={20} className={styles.negative} style={{ marginRight: 8 }} />
                        -{stats.totalUsed.toLocaleString('uz-UZ')}
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
                    Buyurtmalar ({orders.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'transactions' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    <TrendingUp size={18} />
                    Tanga tarixi ({transactions.length})
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div>
                    {orders.length === 0 ? (
                        <div className={styles.settingsCard} style={{ textAlign: 'center', padding: 48 }}>
                            <ShoppingBag size={48} color="#D1D5DB" />
                            <p style={{ marginTop: 16, color: '#6B7280' }}>Buyurtmalar mavjud emas</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className={styles.orderCard}>
                                <div className={styles.orderInfo}>
                                    <span className={styles.orderId}>
                                        Buyurtma #{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={styles.orderDate}>
                                        {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')} • {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div className={styles.orderAmount}>
                                    <div className={styles.orderTotal}>
                                        {order.total_price?.toLocaleString('uz-UZ')} so'm
                                    </div>
                                    {order.coins_earned > 0 && (
                                        <div className={styles.orderCoins}>
                                            +{order.coins_earned} tanga oldi
                                        </div>
                                    )}
                                    {order.coins_spent > 0 && (
                                        <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                                            -{order.coins_spent} tanga ishlatdi
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
                                    <th>Sana</th>
                                    <th>Turi</th>
                                    <th>Miqdori</th>
                                    <th>Izoh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className={styles.emptyState}>
                                            Tanga tarixi mavjud emas
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id}>
                                            <td>{format(new Date(t.created_at), 'dd.MM.yyyy HH:mm')}</td>
                                            <td>
                                                <span className={`${styles.badge} ${t.amount > 0 ? styles.earnBadge : styles.spendBadge}`}>
                                                    {t.type === 'earn' ? 'Oldi' : t.type === 'spend' ? 'Ishlatdi' : t.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.amount} ${t.amount > 0 ? styles.amountEarn : styles.amountSpend}`}>
                                                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('uz-UZ')}
                                                </span>
                                            </td>
                                            <td>{t.description || (t.order_id ? `Buyurtma #${t.order_id.slice(0, 8)}` : '-')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
