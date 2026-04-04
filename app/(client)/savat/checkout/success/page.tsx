'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, Calendar, MapPin, MessageSquare, Banknote, ShoppingBag, Map as MapIcon } from 'lucide-react';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { createClient } from '@/app/utils/supabase/client';
import { getAuthHeader } from '@/app/utils/telegram';

const LAST_ORDER_STORAGE_KEY = 'tortele_last_order';
const LAST_ORDER_MAX_AGE_MS = 15 * 60 * 1000;

interface CachedSuccessOrder {
    id: string;
    total_price: number;
    payment_method: 'cash' | 'card';
    comment: string;
    delivery_time: string;
    delivery_slot: string;
    delivery_address: {
        street: string;
        lat: number | null;
        lng: number | null;
    } | null;
    delivery_type: 'delivery' | 'pickup';
    branches?: {
        name_uz: string;
        name_ru: string;
        address_uz: string;
        address_ru: string;
        location_link?: string;
    } | null;
    branch_snapshot?: {
        name_uz: string;
        name_ru: string;
        address_uz: string;
        address_ru: string;
    } | null;
    saved_at: number;
}

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

function readCachedOrder(orderId: string): CachedSuccessOrder | null {
    try {
        const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedSuccessOrder;
        const isFresh = Date.now() - parsed.saved_at < LAST_ORDER_MAX_AGE_MS;
        if (parsed.id !== orderId || !isFresh) {
            sessionStorage.removeItem(LAST_ORDER_STORAGE_KEY);
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('[Success] Failed to read cached order:', error);
        return null;
    }
}

function SuccessContent() {
    const router = useRouter();
    const { t, lang } = useLanguage();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { deliveryAddress } = useCart();
    const [order, setOrder] = useState<CachedSuccessOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const cachedOrder = readCachedOrder(orderId);
        if (cachedOrder) {
            setOrder(cachedOrder);
            setLoading(false);
        } else {
            setLoading(true);
        }

        async function fetchOrder(showLoading: boolean) {
            if (showLoading) setLoading(true);
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
                if (showLoading || !cachedOrder) {
                    setLoading(false);
                }
            }
        }

        fetchOrder(!cachedOrder);

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
                () => {
                    // Re-fetch the full order including items when an update occurs
                    fetchOrder(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId, supabase]);

    if (loading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>{t('loading')}</div>;

    const monthNames = t('months') as unknown as string[];

    // Use fetched order or fall back to cached snapshot or context
    const isPickup = (order as any)?.delivery_type === 'pickup';
    const branch = (order as any)?.branches || (order as any)?.branch_snapshot;

    const displayData = {
        id: order?.id || orderId || 'Noma\'lum',
        deliveryDate: order?.delivery_time
            ? formattedDateWithSlot(order.delivery_time, monthNames, order.delivery_slot)
            : t('today') || 'Bugun',
        deliveryTime: '', // Combined into deliveryDate
        address: isPickup 
            ? (lang === 'uz' ? branch?.name_uz : branch?.name_ru) || t('pickup')
            : (order?.delivery_address?.street || deliveryAddress || t('noAddress')),
        comment: order?.comment || t('noNote'),
        paymentMethod: order?.payment_method === 'card' ? t('card') : t('cash'),
        total: order?.total_price || 0,
        subtotal: order?.total_price ? (order.total_price - (isPickup ? 0 : 40000)) : 0,
        deliveryFee: isPickup ? 0 : 40000,
        isPickup,
        branchAddress: isPickup ? (lang === 'uz' ? branch?.address_uz : branch?.address_ru) : null,
        branchLink: isPickup ? branch?.location_link : null
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
                        {displayData.isPickup ? <ShoppingBag size={20} /> : <MapPin size={20} />}
                    </div>
                    <div className={styles.detailInfo}>
                        <span className={styles.detailLabel}>{displayData.isPickup ? t('pickupAt') : t('deliveryAddress')}</span>
                        <span className={styles.detailValue} style={{ fontWeight: displayData.isPickup ? 700 : 400 }}>{displayData.address}</span>
                        {displayData.isPickup && displayData.branchAddress && (
                            <span className={styles.detailValue} style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{displayData.branchAddress}</span>
                        )}
                        {displayData.isPickup && displayData.branchLink && (
                            <a 
                                href={displayData.branchLink} 
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '12px', color: '#3B82F6', marginTop: '4px', textDecoration: 'none', fontWeight: 600 }}
                            >
                                {t('openInMaps') || "Xaritada ko'rish"}
                            </a>
                        )}
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
                <h2 className={styles.summaryTitle}>{t('summary') || "Xulosa"}</h2>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t('items')}</span>
                    <span className={styles.summaryValue}>{Math.max(0, displayData.subtotal).toLocaleString('uz-UZ')} {t('som')}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{t('delivery')}</span>
                    <span className={styles.summaryValue}>{displayData.deliveryFee > 0 ? `${displayData.deliveryFee.toLocaleString('uz-UZ')} ${t('som')}` : t('tayyor') || 'Bepul'}</span>
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
