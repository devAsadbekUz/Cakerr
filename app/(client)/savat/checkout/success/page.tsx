'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Calendar, MapPin, MessageSquare, Banknote, ShoppingBag, Map as MapIcon } from 'lucide-react';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import { createClient } from '@/app/utils/supabase/client';
import { getAuthHeader } from '@/app/utils/telegram';

function formattedDateWithSlot(isoDate: string, months: string[], slot?: string) {
    const date = new Date(isoDate);
    const day = date.getDate();
    const month = months[date.getMonth()];
    const formattedDate = `${day}-${month}`;

    if (slot) {
        return `${formattedDate} || ${slot}`;
    }
    return formattedDate;
}

function SuccessContent() {
    const router = useRouter();
    const { lang, t } = useLanguage();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { deliveryAddress } = useCart();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        async function fetchOrder() {
            setLoading(true);
            try {
                const response = await fetch(`/api/user/orders/${orderId}`, {
                    headers: getAuthHeader(),
                    credentials: 'include'
                });

                if (response.ok) {
                    const { order: data } = await response.json();
                    if (data) setOrder(data);
                } else {
                    console.error('[Success] API Error:', response.status);
                }
            } catch (err) {
                console.error('[Success] Fetch fail:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();

        // Real-time subscription for this specific order
        // This ensures the page stays updated if the admin or bot changes the order status/details
        const channel = supabase
            .channel(`order-success-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    table: 'orders',
                    schema: 'public',
                    filter: `id=eq.${orderId}`
                },
                (payload: any) => {
                    // Re-fetch the full order including items when an update occurs
                    fetchOrder();
                }
            )
            .subscribe((status: string) => {
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, supabase]);

    if (loading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>{t('loading')}</div>;

    const monthNames = t('months') as unknown as string[];

    // Use fetched order or fall back to context/defaults if something went wrong
    const displayData = {
        id: order?.id || orderId || 'Noma\'lum',
        deliveryDate: order?.delivery_time
            ? formattedDateWithSlot(order.delivery_time, monthNames, order.delivery_slot)
            : t('today') || 'Bugun',
        deliveryTime: '', // Combined into deliveryDate
        address: order?.delivery_address?.street || deliveryAddress || t('noAddress'),
        comment: order?.comment || t('noNote'),
        paymentMethod: order?.payment_method === 'card' ? t('card') : t('cash'),
        total: order?.total_price || 0,
        subtotal: order?.total_price ? order.total_price - 25000 : 0,
        deliveryFee: 25000
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.push('/')}>
                    <ChevronLeft size={24} />
                </button>

                <div className={styles.successIcon}>
                    <Check size={48} />
                </div>

                <h1 className={styles.title}>{t('orderConfirmed')}</h1>
                <p className={styles.subtitle}>{t('orderReceived')}</p>
                <span className={styles.orderId}>{t('orderId')}: {displayData.id}</span>
            </header>

            <div className={styles.section}>
                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                        <Calendar size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>{t('deliveryTime')}</span>
                        <span className={styles.detailValue}>{displayData.deliveryDate}</span>
                        {displayData.deliveryTime && <span className={styles.detailValue}>{displayData.deliveryTime}</span>}
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#FFF1F2', color: '#E11D48' }}>
                        <MapPin size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>{t('deliveryAddress')}</span>
                        <span className={styles.detailValue}>{displayData.address}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                        <MessageSquare size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>{t('customerNote')}</span>
                        <span className={styles.detailValue}>{displayData.comment}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                        <Banknote size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>{t('paymentMethod')}</span>
                        <span className={styles.detailValue}>{displayData.paymentMethod}</span>
                    </div>
                </div>
            </div>

            <div className={styles.summarySection}>
                <h2 className={styles.summaryTitle}>{t('summary')} || 'Xulosa'</h2>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t('items')}</span>
                    <span className={styles.summaryValue}>{Math.max(0, displayData.subtotal).toLocaleString('uz-UZ')} {t('som')}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t('delivery')}</span>
                    <span className={styles.summaryValue}>{displayData.deliveryFee.toLocaleString('uz-UZ')} {t('som')}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                    <span>{t('total')}</span>
                    <span className={styles.totalValue}>{displayData.total.toLocaleString('uz-UZ')} {t('som')}</span>
                </div>
            </div>

            <div className={styles.thankYouNote}>
                {t('thankYou')}
            </div>

            <footer className={styles.footer}>
                <button className={styles.trackBtn} onClick={() => router.push(`/profil/buyurtmalar/${displayData.id}`)}>
                    <MapIcon size={20} />
                    {t('trackOrder')}
                </button>
                <button className={styles.continueBtn} onClick={() => router.push('/')}>
                    <ShoppingBag size={20} />
                    {t('continueShopping')}
                </button>
            </footer>
        </div>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
