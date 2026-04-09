'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Package, Check, Clock, Truck, MapPin, AlertCircle, Banknote } from 'lucide-react';
import styles from './page.module.css';
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
import { createClient } from '@/app/utils/supabase/client';
import { getAuthHeader } from '@/app/utils/telegram';
import { useSupabase } from '@/app/context/AuthContext';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';

// This matches the status structure for future backend integration
import { ORDER_STATUSES as CENTRAL_STATUSES, getStatusConfig } from '@/app/utils/orderConfig';

// Map central statuses to UI Icons and display info
const ORDER_STATUSES = CENTRAL_STATUSES.filter(s => s.id !== 'cancelled').map(s => ({
    id: s.id,
    icon: s.id === 'new' ? Check :
        s.id === 'confirmed' ? Clock :
            s.id === 'preparing' ? Package :
                s.id === 'ready' ? Check :
                    s.id === 'delivering' ? Truck : MapPin
}));

const getStatusStep = (status: string, isPickup: boolean) => {
    switch (status) {
        case 'new': return 0;
        case 'confirmed': return 1;
        case 'preparing': return 2;
        case 'ready': return 3;
        case 'delivering': return isPickup ? 3 : 4;
        case 'completed': return isPickup ? 4 : 5;
        case 'cancelled': return -1;
        default: return 0;
    }
};

export default function TrackingPage() {
    const router = useRouter();
    const { lang, t } = useLanguage();
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const { loading: authLoading } = useSupabase();
    const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');

    const fetchOrder = async (signal?: AbortSignal) => {
        try {
            setErrorMsg(null);
            const response = await fetch(`/api/user/orders/${orderId}`, {
                headers: getAuthHeader(),
                credentials: 'include',
                signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Tracking] API Error:', response.status, errorData);

                if (response.status === 404) {
                    setOrder(null);
                    setErrorMsg(t('orderNotFound'));
                } else if (response.status === 401) {
                    setErrorMsg(t('authRequired'));
                    // router.push(`/profil/login?redirectTo=/profil/buyurtmalar/${orderId}`);
                } else {
                    setErrorMsg(`${t('errorOccurred')}: ${response.status}`);
                }
                return;
            }

            const { order: data } = await response.json();

            if (data) {
                const isPickup = data.delivery_type === 'pickup';
                const currentStep = getStatusStep(data.status, isPickup);
                const filteredStatuses = isPickup 
                    ? ORDER_STATUSES.filter(s => s.id !== 'delivering') 
                    : ORDER_STATUSES;

                setOrder({
                    id: data.id,
                    status: data.status,
                    delivery_type: data.delivery_type,
                    branch: data.branches,
                    currentStep,
                    totalSteps: filteredStatuses.length,
                    filteredStatuses,
                    total: data.total_price,
                    deposit_amount: data.deposit_amount ?? 0,
                    delivery_time: data.delivery_time ?? null,
                    delivery_slot: typeof data.delivery_slot === 'string' ? data.delivery_slot.trim() : '',
                    address: {
                        label: data.delivery_address?.label || t('address'),
                        text: data.delivery_address?.street || t('addressNotProvided'),
                        phone: data.delivery_address?.phone || '',
                        lat: data.delivery_address?.lat || null,
                        lng: data.delivery_address?.lng || null,
                    },
                    items: (data.order_items ?? []).map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        qty: item.quantity,
                        price: item.unit_price,
                        image: item.configuration?.uploaded_photo_url ||
                               item.configuration?.drawing ||
                               item.configuration?.image_url ||
                               item.products?.image_url ||
                               '/images/cake-placeholder.jpg'
                    }))
                });
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            console.error('[Tracking] Fetch error:', error);
            setErrorMsg(t('errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Wait for auth context to finish resolving before fetching.
        // Without this, getAuthHeader() returns empty headers on first render
        // (Telegram initData not yet populated) → 401 → spurious auth error.
        if (authLoading) return;

        let abortController = new AbortController();
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const fetchOrderSafe = () => {
            abortController.abort();
            abortController = new AbortController();
            fetchOrder(abortController.signal);
        };

        const startPolling = () => {
            if (pollInterval) return;
            pollInterval = setInterval(fetchOrderSafe, 5000);
        };

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            abortController.abort();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchOrderSafe();
                startPolling();
            } else {
                stopPolling();
            }
        };

        fetchOrder(abortController.signal);
        startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const channel = supabase
            .channel(`order-tracking-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`
                },
                () => {
                    fetchOrderSafe();
                }
            )
            .subscribe((status: string) => {
                setRealtimeStatus(status);

                if (status === 'CHANNEL_ERROR') {
                    console.error('[Realtime] Socket failed. Falling back to background polling.');
                }
            });

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            supabase.removeChannel(channel);
        };
    }, [orderId, supabase, authLoading]);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const progressValue = order ? ((order.currentStep + 1) / order.totalSteps) * 100 : 0;

    return (
        <div className={styles.container}>
            {/* Debug: Realtime Status Indicator */}
            {mounted && process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'fixed', bottom: 80, right: 10,
                    background: realtimeStatus === 'SUBSCRIBED' ? '#10B981' : realtimeStatus === 'CHANNEL_ERROR' ? '#EF4444' : '#F59E0B',
                    color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, zIndex: 9999,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                    RT: {realtimeStatus}
                </div>
            )}

            {loading && !order ? (
                <div style={{ padding: '80px 40px', textAlign: 'center', color: '#6B7280' }}>
                    <Clock className={styles.loadingIcon} size={48} style={{ margin: '0 auto 16px', opacity: 0.5, animation: 'spin 2s linear infinite' }} />
                    <p style={{ fontWeight: 500 }}>{t('loading')}</p>
                </div>
            ) : !order ? (
                <div style={{ padding: '80px 40px', textAlign: 'center', color: '#6B7280' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 500 }}>{errorMsg || t('noProducts')}</p>
                    <button onClick={() => router.push('/')} style={{ marginTop: '20px', color: '#BE185D', fontWeight: 600 }}>{t('back')}</button>
                    {errorMsg === t('authRequired') && (
                        <button
                            onClick={() => router.push(`/profil/login?redirectTo=/profil/buyurtmalar/${orderId}`)}
                            style={{ display: 'block', margin: '12px auto', background: '#BE185D', color: 'white', padding: '8px 16px', borderRadius: 8 }}
                        >
                            {t('login')}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <header className={styles.header}>
                        <button className={styles.backBtn} onClick={() => router.back()}>
                            <ChevronLeft size={24} />
                        </button>
                        <div className={styles.headerInfo}>
                            <h1>{t('trackOrder')}</h1>
                            <span className={styles.orderId}>{order.id}</span>
                        </div>
                    </header>

                    {/* Progress Card */}
                    <div className={styles.progressCard}>
                        <div className={styles.progressHeader}>
                            <div>
                                <span className={styles.estimatedLabel}>{t('status')}</span>
                                <span className={styles.estimatedTime}>
                                    {getStatusConfig(order.status).labels[lang]}
                                </span>
                            </div>
                            <div className={styles.statusIcon}>
                                <Package size={24} />
                            </div>
                        </div>

                        <div className={styles.progressBarContainer}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progressValue}%` }}
                                />
                            </div>
                            <div className={styles.progressText}>
                                {order.currentStep + 1} / {order.totalSteps}
                            </div>
                        </div>
                    </div>

                    {/* Dedicated Support Card */}
                    <div className={styles.card} style={{ border: '1px solid #FECDD3', background: 'linear-gradient(to right, #FFF1F2, #FFE4E6)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: '#BE185D', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#9D174D', margin: '0 0 4px' }}>
                                    {t('needHelpTitle')}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <a 
                                        href={TELEGRAM_CONFIG.supportLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: 'white', border: '1px solid #FDA4AF', borderRadius: '10px', color: '#BE185D', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                                    >
                                        {t('contactTelegram')}
                                    </a>
                                    <a 
                                        href="tel:+998901234567"
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: '#BE185D', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                                    >
                                        {t('contactPhone')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>{t('summary')}</h2>
                        <div className={styles.timeline}>
                            {(order.filteredStatuses || ORDER_STATUSES).map((status: any, index: number) => {
                                const isCompleted = index < order.currentStep;
                                const isActive = index === order.currentStep;
                                const Icon = status.icon;

                                return (
                                    <div key={status.id} className={`${styles.timelineItem} ${!isCompleted && !isActive ? styles.dimmed : ''}`}>
                                        {index < (order.filteredStatuses?.length || ORDER_STATUSES.length) - 1 && (
                                            <div className={styles.timelineLine} />
                                        )}

                                        <div className={`${styles.timelineBadge} ${isActive ? styles.timelineBadgeActive : ''} ${isCompleted ? styles.timelineBadgeCompleted : ''}`}>
                                            <Icon size={18} />
                                        </div>

                                        <div className={styles.timelineInfo}>
                                            <div className={styles.timelineHeader}>
                                                <span className={styles.timelineLabel}>{getStatusConfig(status.id).labels[lang]}</span>
                                            </div>
                                            <p className={styles.timelineDesc}>{getStatusConfig(status.id).descs[lang]}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Date */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>{t('deliveryTime')}</h2>
                        <div className={styles.addressCard}>
                            <div className={styles.iconBox}>
                                <Clock size={20} />
                            </div>
                            <div className={styles.addressDetails}>
                                <span className={styles.addressLabel}>
                                    {(() => {
                                        if (!order.delivery_time) return '—';
                                        try {
                                            const d = new Date(order.delivery_time);
                                            if (isNaN(d.getTime())) return '—';
                                            const formatted = d.toLocaleDateString(
                                                lang === 'uz' ? 'uz-UZ' : 'ru-RU',
                                                { day: 'numeric', month: 'long', year: 'numeric' }
                                            );
                                            return order.delivery_slot ? `${formatted}, ${order.delivery_slot}` : formatted;
                                        } catch {
                                            return '—';
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Fulfillment Info */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>
                            {order.delivery_type === 'pickup' ? t('pickupLocation') : t('deliveryAddress')}
                        </h2>
                        <div className={styles.addressCard}>
                            <div className={styles.iconBox}>
                                <MapPin size={20} />
                            </div>
                            <div className={styles.addressDetails}>
                                {order.delivery_type === 'pickup' ? (
                                    <>
                                        <span className={styles.addressLabel}>
                                            {lang === 'uz' ? order.branch?.name_uz : order.branch?.name_ru}
                                        </span>
                                        <span className={styles.addressText}>
                                            {lang === 'uz' ? order.branch?.address_uz : order.branch?.address_ru}
                                        </span>
                                        {order.branch?.location_link && (
                                            <a 
                                                href={order.branch.location_link}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#BE185D', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}
                                            >
                                                {t('openInMaps')}
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.addressLabel}>{order.address.label}</span>
                                        <span className={styles.addressText}>{order.address.text}</span>
                                        {order.address.phone && (
                                            <span className={styles.addressText}>{order.address.phone}</span>
                                        )}
                                        {order.address.lat && order.address.lng && (
                                            <a
                                                href={`https://www.google.com/maps?q=${order.address.lat},${order.address.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '13px', color: '#BE185D', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}
                                            >
                                                {t('openInMaps')}
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Card — shown once order is confirmed or beyond */}
                    {['confirmed', 'preparing', 'ready', 'delivering', 'completed'].includes(order.status) && (() => {
                        const depositAmount: number = order.deposit_amount ?? 0;
                        const totalPrice: number = order.total ?? 0;
                        const remaining = Math.max(0, totalPrice - depositAmount);
                        const fullyPaid = remaining === 0;
                        const noDeposit = depositAmount === 0 && order.status !== 'completed';

                        return (
                            <div className={styles.card}>
                                <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Banknote size={18} color="#BE185D" />
                                    {t('paymentStatus')}
                                </h2>

                                {noDeposit ? (
                                    <div style={{
                                        padding: '12px 14px',
                                        background: '#FFFBEB',
                                        border: '1px solid #FDE68A',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        color: '#92400E',
                                        lineHeight: '1.5',
                                        marginTop: '10px'
                                    }}>
                                        {t('paymentInfoPending')}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6B7280' }}>
                                                {t('total')}:
                                            </span>
                                            <span style={{ fontWeight: 700, color: '#111827' }}>
                                                {totalPrice.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#6B7280' }}>
                                                {t('paid')}:
                                            </span>
                                            <span style={{ fontWeight: 700, color: '#16A34A' }}>
                                                {depositAmount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                            </span>
                                        </div>
                                        <div style={{ height: '1px', background: '#F3F4F6' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, color: '#111827' }}>
                                                {t('remainingBalance')}:
                                            </span>
                                            {fullyPaid ? (
                                                <span style={{
                                                    background: '#D1FAE5', color: '#065F46',
                                                    padding: '3px 10px', borderRadius: '8px',
                                                    fontSize: '12px', fontWeight: 700
                                                }}>
                                                    {t('fullyPaid')}
                                                </span>
                                            ) : (
                                                <span style={{ fontWeight: 800, color: '#BE185D', fontSize: '16px' }}>
                                                    {remaining.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}
                                                </span>
                                            )}
                                        </div>
                                        {!fullyPaid && (
                                            <p style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                color: '#9CA3AF',
                                                lineHeight: '1.5',
                                                padding: '8px 10px',
                                                background: '#F9FAFB',
                                                borderRadius: '8px'
                                            }}>
                                                {t('remainingBalanceNote')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Order Summary */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>{t('items')}</h2>
                        <div className={styles.itemsList}>
                            {order.items.map((item: any) => (
                                <div key={item.id} className={styles.productRow}>
                                    <div className={styles.productImageWrapper}>
                                        <Image src={item.image} alt={item.name} fill className={styles.productImage} sizes="60px" style={{ objectFit: 'cover' }} />
                                    </div>
                                    <div className={styles.productInfo}>
                                        <h3 className={styles.productName}>{item.name}</h3>
                                        <span className={styles.productQty}>{t('quantity')}: {item.qty} {t('pieceUnit')}</span>
                                    </div>
                                    <span className={styles.productPrice}>
                                        {item.price === 0
                                            ? <span style={{ color: '#BE185D', fontStyle: 'italic' }}>{t('negotiable')}</span>
                                            : <>{item.price.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</>
                                        }
                                    </span>
                                </div>
                            ))}

                            <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>{t('total')}</span>
                                {order.items.some((item: any) => item.price === 0) ? (
                                    <span className={styles.totalValue} style={{ color: '#BE185D', fontStyle: 'italic', fontSize: '14px' }}>
                                        {t('negotiable')}
                                    </span>
                                ) : (
                                    <span className={styles.totalValue}>{order.total.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</span>
                                )}
                            </div>
                        </div>
                    </div>

                </>
            )}
        </div>
    );
}
