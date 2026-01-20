'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Calendar, MapPin, MessageSquare, Banknote, ShoppingBag, Map as MapIcon } from 'lucide-react';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { createClient } from '@/app/utils/supabase/client';

const MONTHS = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function formattedDateWithSlot(isoDate: string, slot?: string) {
    const date = new Date(isoDate);
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const formattedDate = `${day}-${month}`;

    if (slot) {
        return `${formattedDate} || ${slot}`;
    }
    return formattedDate;
}

function SuccessContent() {
    const router = useRouter();
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
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('id', orderId)
                .maybeSingle();

            if (data && !error) {
                setOrder(data);
            }
            setLoading(false);
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
                (payload) => {
                    console.log('[Realtime] Order updated:', payload);
                    // Re-fetch the full order including items when an update occurs
                    fetchOrder();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, supabase]);

    if (loading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Yuklanmoqda...</div>;

    // Use fetched order or fall back to context/defaults if something went wrong
    const displayData = {
        id: order?.id || orderId || 'Noma\'lum',
        deliveryDate: order?.delivery_time
            ? formattedDateWithSlot(order.delivery_time, order.delivery_slot)
            : 'Bugun',
        deliveryTime: '', // Combined into deliveryDate
        address: order?.delivery_address?.street || deliveryAddress || 'Manzil ko\'rsatilmagan',
        comment: order?.comment || 'Qo\'shimcha izohlar qoldirilmagan',
        paymentMethod: 'Naqd pul (yetkazib berishda)',
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

                <h1 className={styles.title}>Buyurtma tasdiqlandi!</h1>
                <p className={styles.subtitle}>Buyurtmangiz muvaffaqiyatli qabul qilindi</p>
                <span className={styles.orderId}>Buyurtma ID: {displayData.id}</span>
            </header>

            <div className={styles.section}>
                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                        <Calendar size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>Yetkazib berish vaqti</span>
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
                        <span className={styles.detailLabel}>Yetkazib berish manzili</span>
                        <span className={styles.detailValue}>{displayData.address}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                        <MessageSquare size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>Qo'shimcha izohlar</span>
                        <span className={styles.detailValue}>{displayData.comment}</span>
                    </div>
                </div>

                <div className={styles.divider} style={{ height: '1px', background: '#F3F4F6', margin: '16px 0' }} />

                <div className={styles.detailRow}>
                    <div className={`${styles.iconBox}`} style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                        <Banknote size={20} />
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>To'lov usuli</span>
                        <span className={styles.detailValue}>{displayData.paymentMethod}</span>
                    </div>
                </div>
            </div>

            <div className={styles.summarySection}>
                <h2 className={styles.summaryTitle}>Buyurtma xulasasi</h2>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Mahsulotlar</span>
                    <span className={styles.summaryValue}>{Math.max(0, displayData.subtotal).toLocaleString('uz-UZ')} so'm</span>
                </div>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Yetkazib berish</span>
                    <span className={styles.summaryValue}>{displayData.deliveryFee.toLocaleString('uz-UZ')} so'm</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                    <span>Jami</span>
                    <span className={styles.totalValue}>{displayData.total.toLocaleString('uz-UZ')} so'm</span>
                </div>
            </div>

            <div className={styles.thankYouNote}>
                🎉 Buyurtmangiz uchun rahmat! Tortingizni mehru muhabbat bilan tayyorlayapmiz.
            </div>

            <footer className={styles.footer}>
                <button className={styles.trackBtn} onClick={() => router.push(`/profil/buyurtmalar/${displayData.id}`)}>
                    <MapIcon size={20} />
                    Buyurtmani kuzatish
                </button>
                <button className={styles.continueBtn} onClick={() => router.push('/')}>
                    <ShoppingBag size={20} />
                    Xarid qilishni davom ettirish
                </button>
            </footer>
        </div>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Yuklanmoqda...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
