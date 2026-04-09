'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Receipt, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminI18n } from '@/app/context/AdminLanguageContext';
import styles from '../../../AdminDashboard.module.css';

type PaymentLog = {
    id: string;
    event_type: 'deposit_recorded' | 'deposit_edited' | 'final_payment_recorded' | 'payment_added';
    amount: number;
    previous_amount: number | null;
    recorded_by_name: string;
    created_at: string;
};

type OrderSummary = {
    id: string;
    total_price: number;
    deposit_amount: number;
    final_payment_amount: number;
    status: string;
    refund_needed: boolean;
};

export default function PaymentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { lang, t } = useAdminI18n();
    const router = useRouter();

    const [logs, setLogs] = useState<PaymentLog[]>([]);
    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/orders/${id}/payments`, {
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setLogs(data.logs ?? []);
                setOrder(data.order ?? null);
            } catch {
                setError(lang === 'uz' ? 'Xatolik yuz berdi' : 'Произошла ошибка');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id, lang]);

    const eventDotColor = (type: PaymentLog['event_type']) => {
        if (type === 'deposit_recorded') return '#16A34A';
        if (type === 'payment_added') return '#BE185D';
        if (type === 'deposit_edited') return '#D97706';
        return '#2563EB';
    };

    const renderLogLine = (log: PaymentLog) => {
        if (log.event_type === 'deposit_recorded') {
            return t('payLog_initial').replace('{amount}', log.amount.toLocaleString());
        }
        if (log.event_type === 'payment_added') {
            return t('payLog_added').replace('{amount}', log.amount.toLocaleString());
        }
        if (log.event_type === 'deposit_edited') {
            return `${log.recorded_by_name}: ${log.previous_amount?.toLocaleString()} → ${log.amount.toLocaleString()} ${t('som')}`;
        }
        return t('payLog_final').replace('{amount}', log.amount.toLocaleString());
    };

    const remaining = order ? Math.max(0, order.total_price - order.deposit_amount) : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.back()} className={styles.modalClose} style={{ width: '40px', height: '40px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Receipt size={22} color="#BE185D" /> {t('history')}
                        </h1>
                        <Link
                            href={`/admin/orders/${id}`}
                            style={{ fontSize: '13px', color: '#BE185D', fontWeight: 700, textDecoration: 'none' }}
                        >
                            ← {lang === 'uz' ? "Buyurtmaga qaytish" : "Вернуться к заказу"} #{id.slice(0, 8)}
                        </Link>
                    </div>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: '#6B7280' }}>
                    {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                    <AlertCircle size={40} color="#EF4444" style={{ marginBottom: '12px' }} />
                    <p style={{ color: '#6B7280' }}>{error}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px' }}>

                    {/* Refund needed banner */}
                    {order?.refund_needed && (
                        <div style={{
                            padding: '14px 18px', background: '#FEF2F2',
                            border: '1.5px solid #FCA5A5', borderRadius: '14px',
                            display: 'flex', alignItems: 'flex-start', gap: '12px'
                        }}>
                            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '14px' }}>{lang === 'uz' ? "Qaytarish kerak" : "Нужен возврат"}</div>
                                <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
                                    {lang === 'uz' ? `Mijozga ${order.deposit_amount.toLocaleString()} so'm qaytarilishi kerak.` : `Нужно вернуть клиенту ${order.deposit_amount.toLocaleString()} сум.`}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order summary card */}
                    {order && (
                        <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                            <h3 style={{ fontSize: '13px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '14px' }}>
                                {lang === 'uz' ? "Buyurtma xulosasi" : "Сводка по заказу"}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                                    <span style={{ color: '#6B7280' }}>{t('total')}:</span>
                                    <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                                        {order.total_price.toLocaleString('en-US')} {t('som')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                                    <span style={{ color: '#6B7280' }}>{t('totalPaid')}:</span>
                                    <span style={{ fontWeight: 800, color: '#16A34A', fontVariantNumeric: 'tabular-nums' }}>
                                        {order.deposit_amount.toLocaleString('en-US')} {t('som')}
                                    </span>
                                </div>
                                <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                                    <span style={{ fontWeight: 700 }}>{t('remaining')}</span>
                                    {remaining === 0 ? (
                                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>
                                            {t('paid')}
                                        </span>
                                    ) : (
                                        <span style={{ fontWeight: 900, color: '#BE185D', fontVariantNumeric: 'tabular-nums' }}>
                                            {remaining.toLocaleString('en-US')} {t('som')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment log */}
                    <div className={styles.section} style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                        <h3 style={{ fontSize: '13px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '20px' }}>
                            {t('history')}
                        </h3>

                        {logs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '14px' }}>
                                {lang === 'uz' ? "To'lovlar topilmadi" : "Платежи не найдены"}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {logs.map((log, i) => (
                                    <div key={log.id} style={{ display: 'flex', gap: '16px', paddingBottom: i < logs.length - 1 ? '20px' : '0' }}>
                                        {/* Timeline dot + line */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                            <div style={{
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                background: eventDotColor(log.event_type),
                                                marginTop: '3px', flexShrink: 0
                                            }} />
                                            {i < logs.length - 1 && (
                                                <div style={{ width: '2px', flex: 1, background: '#F3F4F6', marginTop: '4px' }} />
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div style={{ flex: 1, paddingBottom: '4px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: '1.4' }}>
                                                {renderLogLine(log)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '3px' }}>
                                                {format(new Date(log.created_at), 'd MMM yyyy, HH:mm', { locale: lang === 'uz' ? uz : ru })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
