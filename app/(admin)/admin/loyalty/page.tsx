'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import styles from './LoyaltyManagement.module.css';
import { Coins, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function LoyaltyPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [rate, setRate] = useState('5');
    const [stats, setStats] = useState({
        totalEarned: 0,
        totalSpent: 0,
        inCirculation: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch loyalty rate
            const { data: settings } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'loyalty_rate')
                .maybeSingle();

            if (settings) {
                setRate((parseFloat(settings.value as string) * 100).toString());
            }

            // 2. Fetch transactions with user data
            const { data: txData } = await supabase
                .from('coin_transactions')
                .select(`
                    *,
                    profiles (full_name, phone_number)
                `)
                .order('created_at', { ascending: false });

            if (txData) {
                setTransactions(txData);

                // 3. Calculate stats
                const earned = txData
                    .filter((t: { amount: number }) => t.amount > 0)
                    .reduce((acc: number, t: { amount: number }) => acc + t.amount, 0);

                const spent = txData
                    .filter((t: { amount: number }) => t.amount < 0)
                    .reduce((acc: number, t: { amount: number }) => acc + Math.abs(t.amount), 0);

                setStats({
                    totalEarned: earned,
                    totalSpent: spent,
                    inCirculation: earned - spent
                });
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
            const decimalRate = (parseFloat(rate) / 100).toString();
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'loyalty_rate',
                    value: decimalRate,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            alert('Cashback foizi muvaffaqiyatli yangilandi!');
        } catch (error) {
            console.error('Error saving rate:', error);
            alert('Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
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

            {/* Transaction History */}
            <div className={styles.historyCard}>
                <div style={{ padding: 24 }}>
                    <h2 className={styles.sectionTitle}>Tranzatsiyalar tarixi</h2>
                </div>
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
                                        Hozircha tranzatsiyalar mavjud emas
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
        </div>
    );
}
