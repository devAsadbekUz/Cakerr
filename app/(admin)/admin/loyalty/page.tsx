'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoyaltyManagement.module.css';
import { Coins, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, Save, Loader2, Users, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithStats {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    coins: number;
    total_earned: number;
    total_spent: number;
    order_count: number;
}

export default function LoyaltyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [rate, setRate] = useState('5');
    const [stats, setStats] = useState({
        totalEarned: 0,
        totalSpent: 0,
        inCirculation: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [activeTab, setActiveTab] = useState<'transactions' | 'users'>('users');

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch loyalty rate via admin API
            const settingsRes = await fetch('/api/admin/data?table=app_settings&filterColumn=key&filterValue=loyalty_rate');
            const settingsJson = await settingsRes.json();
            if (settingsJson.data && settingsJson.data.length > 0) {
                const rateValue = settingsJson.data[0].value;
                // Handle both string and number formats
                const rateNum = typeof rateValue === 'string' ? parseFloat(rateValue) : rateValue;
                setRate((rateNum * 100).toString());
            }

            // 2. Fetch transactions with user data via admin API
            const txRes = await fetch('/api/admin/data?table=coin_transactions&select=*&orderBy=created_at&orderAsc=false');
            const txJson = await txRes.json();

            // Also fetch profiles for names
            const profilesRes = await fetch('/api/admin/data?table=profiles&select=id,full_name,phone_number,coins');
            const profilesJson = await profilesRes.json();
            const profilesMap: { [key: string]: { full_name: string; phone_number: string } } = {};
            profilesJson.data?.forEach((p: any) => {
                profilesMap[p.id] = { full_name: p.full_name, phone_number: p.phone_number };
            });

            if (txJson.data) {
                // Attach profile info to transactions
                const txWithProfiles = txJson.data.map((t: any) => ({
                    ...t,
                    profiles: profilesMap[t.user_id] || null
                }));
                setTransactions(txWithProfiles);

                // 3. Calculate stats
                const earned = txJson.data
                    .filter((t: { amount: number }) => t.amount > 0)
                    .reduce((acc: number, t: { amount: number }) => acc + t.amount, 0);

                const spent = txJson.data
                    .filter((t: { amount: number }) => t.amount < 0)
                    .reduce((acc: number, t: { amount: number }) => acc + Math.abs(t.amount), 0);

                setStats({
                    totalEarned: earned,
                    totalSpent: spent,
                    inCirculation: earned - spent
                });
            }

            // 4. Fetch all users with their coin stats
            if (profilesJson.data) {
                // Get orders for counting
                const ordersRes = await fetch('/api/admin/data?table=orders&select=user_id');
                const ordersJson = await ordersRes.json();

                const userStatsMap: { [key: string]: { earned: number; spent: number; orders: number } } = {};

                txJson.data?.forEach((tx: { user_id: string; amount: number }) => {
                    if (!userStatsMap[tx.user_id]) {
                        userStatsMap[tx.user_id] = { earned: 0, spent: 0, orders: 0 };
                    }
                    if (tx.amount > 0) {
                        userStatsMap[tx.user_id].earned += tx.amount;
                    } else {
                        userStatsMap[tx.user_id].spent += Math.abs(tx.amount);
                    }
                });

                ordersJson.data?.forEach((order: { user_id: string }) => {
                    if (!userStatsMap[order.user_id]) {
                        userStatsMap[order.user_id] = { earned: 0, spent: 0, orders: 0 };
                    }
                    userStatsMap[order.user_id].orders += 1;
                });

                const usersWithStats: UserWithStats[] = profilesJson.data.map((p: any) => ({
                    id: p.id,
                    full_name: p.full_name,
                    phone_number: p.phone_number,
                    coins: p.coins || 0,
                    total_earned: userStatsMap[p.id]?.earned || 0,
                    total_spent: userStatsMap[p.id]?.spent || 0,
                    order_count: userStatsMap[p.id]?.orders || 0
                }));

                // Sort by coins descending
                usersWithStats.sort((a, b) => b.coins - a.coins);
                setUsers(usersWithStats);
            }
        } catch (error) {
            console.error('Error fetching loyalty data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveRate = async () => {
        setSaving(true);
        try {
            const decimalRate = parseFloat(rate) / 100;

            // Use admin API to upsert setting
            const response = await fetch('/api/admin/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: 'app_settings',
                    id: 'loyalty_rate', // Using 'key' as the ID
                    data: {
                        value: decimalRate.toString(),
                        updated_at: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                // Try inserting if update failed (row doesn't exist)
                const insertResponse = await fetch('/api/admin/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'app_settings',
                        data: {
                            key: 'loyalty_rate',
                            value: decimalRate.toString(),
                            updated_at: new Date().toISOString()
                        }
                    })
                });
                if (!insertResponse.ok) {
                    throw new Error('Failed to save rate');
                }
            }

            alert('Cashback foizi muvaffaqiyatli yangilandi!');
        } catch (error) {
            console.error('Error saving rate:', error);
            alert('Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    const handleUserClick = (userId: string) => {
        router.push(`/admin/loyalty/${userId}`);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Shirin Tangalar Management</h1>

            {/* Stats Dashboard */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Aylanmadagi tangalar</div>
                    <div className={styles.statValue}>
                        <Wallet size={20} className={styles.positive} style={{ marginRight: 8 }} />
                        {stats.inCirculation.toLocaleString('uz-UZ')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Jami berilgan (Earned)</div>
                    <div className={styles.statValue}>
                        <ArrowUpCircle size={20} className={styles.positive} style={{ marginRight: 8 }} />
                        {stats.totalEarned.toLocaleString('uz-UZ')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Jami ishlatilgan (Spent)</div>
                    <div className={styles.statValue}>
                        <ArrowDownCircle size={20} className={styles.negative} style={{ marginRight: 8 }} />
                        {stats.totalSpent.toLocaleString('uz-UZ')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Foydalanuvchilar</div>
                    <div className={styles.statValue}>
                        <Users size={20} style={{ marginRight: 8, color: '#6366F1' }} />
                        {users.length}
                    </div>
                </div>
            </div>

            {/* Settings Card */}
            <div className={styles.settingsCard}>
                <h2 className={styles.sectionTitle}>Loyallik sozlamalari</h2>
                <div className={styles.rateInputGroup}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="number"
                            className={styles.input}
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            min="0"
                            max="100"
                        />
                        <span className={styles.percentSign}>%</span>
                    </div>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSaveRate}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        <span style={{ marginLeft: 8 }}>Saqlash</span>
                    </button>
                </div>
                <p style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>
                    Yangi buyurtmalardan beriladigan keshbek foizi. Masalan: 5% = 200,000 so'mlik buyurtmaga 10,000 tanga.
                </p>
            </div>

            {/* Tabs */}
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} />
                    Foydalanuvchilar ({users.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'transactions' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    <TrendingUp size={18} />
                    Tranzaksiyalar ({transactions.length})
                </button>
            </div>

            {/* Users List */}
            {activeTab === 'users' && (
                <div className={styles.historyCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Mijoz</th>
                                    <th>Buyurtmalar</th>
                                    <th>Jami olgan</th>
                                    <th>Ishlatgan</th>
                                    <th>Balansi</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyState}>
                                            Foydalanuvchilar mavjud emas
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr
                                            key={u.id}
                                            className={styles.clickableRow}
                                            onClick={() => handleUserClick(u.id)}
                                        >
                                            <td>
                                                <div className={styles.userCell}>
                                                    <span className={styles.userName}>{u.full_name || 'Noma\'lum'}</span>
                                                    <span className={styles.userPhone}>{u.phone_number || '-'}</span>
                                                </div>
                                            </td>
                                            <td>{u.order_count}</td>
                                            <td>
                                                <span className={styles.amountEarn}>+{u.total_earned.toLocaleString('uz-UZ')}</span>
                                            </td>
                                            <td>
                                                <span className={styles.amountSpend}>-{u.total_spent.toLocaleString('uz-UZ')}</span>
                                            </td>
                                            <td>
                                                <span className={styles.coinBalance}>
                                                    <Coins size={16} style={{ marginRight: 4 }} />
                                                    {u.coins.toLocaleString('uz-UZ')}
                                                </span>
                                            </td>
                                            <td>
                                                <ChevronRight size={20} color="#9CA3AF" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            {activeTab === 'transactions' && (
                <div className={styles.historyCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Sana</th>
                                    <th>Mijoz</th>
                                    <th>Turi</th>
                                    <th>Miqdori</th>
                                    <th>Izoh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyState}>
                                            Hozircha tranzaksiyalar mavjud emas
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{format(new Date(t.created_at), 'dd.MM.yyyy HH:mm')}</td>
                                            <td>
                                                <div className={styles.userCell}>
                                                    <span className={styles.userName}>{t.profiles?.full_name || 'Noma\'lum'}</span>
                                                    <span className={styles.userPhone}>{t.profiles?.phone_number || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${t.amount > 0 ? styles.earnBadge : styles.spendBadge}`}>
                                                    {t.type === 'earn' ? 'Earn' : t.type === 'spend' ? 'Spend' : t.type}
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

