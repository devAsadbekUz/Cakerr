'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Package, Check, Clock, Truck, MapPin, Phone, User, AlertCircle } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/app/utils/supabase/client';
import { getAuthHeader } from '@/app/utils/telegram';

// This matches the status structure for future backend integration
import { ORDER_STATUSES as CENTRAL_STATUSES } from '@/app/utils/orderConfig';

// Map central statuses to UI Icons and display info
const ORDER_STATUSES = CENTRAL_STATUSES.filter(s => s.id !== 'cancelled').map(s => ({
    id: s.id,
    label: s.label,
    desc: s.desc,
    icon: s.id === 'new' ? Check :
        s.id === 'confirmed' ? Clock :
            s.id === 'preparing' ? Package :
                s.id === 'ready' ? Check :
                    s.id === 'delivering' ? Truck : MapPin
}));

const getStatusStep = (status: string) => {
    switch (status) {
        case 'new': return 0;
        case 'confirmed': return 1;
        case 'preparing': return 2;
        case 'ready': return 3;
        case 'delivering': return 4;
        case 'completed': return 5;
        case 'cancelled': return -1;
        default: return 0;
    }
};

export default function TrackingPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');

    const fetchOrder = async () => {
        try {
            setErrorMsg(null);
            const response = await fetch(`/api/user/orders/${orderId}`, {
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Tracking] API Error:', response.status, errorData);

                if (response.status === 404) {
                    setOrder(null);
                    setErrorMsg('Buyurtma topilmadi');
                } else if (response.status === 401) {
                    setErrorMsg('Avtorizatsiyadan o\'ting');
                    // router.push(`/profil/login?redirectTo=/profil/buyurtmalar/${orderId}`);
                } else {
                    setErrorMsg(`Xatolik: ${response.status}`);
                }
                return;
            }

            const { order: data } = await response.json();

            if (data) {
                setOrder({
                    id: data.id,
                    status: data.status,
                    currentStep: getStatusStep(data.status),
                    totalSteps: 6,
                    total: data.total_price,
                    address: {
                        label: data.delivery_address?.label || 'Manzil',
                        text: data.delivery_address?.street || 'Manzil ko\'rsatilmagan',
                        phone: data.delivery_address?.phone || ''
                    },
                    items: data.order_items.map((item: any) => ({
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
        } catch (error) {
            console.error('[Tracking] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();

        // Fallback: Refresh data periodically in case socket fails
        const pollInterval = setInterval(() => {
            fetchOrder();
        }, 5000);

        // Subscribe to real-time updates for this specific order
        // Using the same robust pattern as the success page to ensure all data stays in sync
        const channel = supabase
            .channel(`order-tracking-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // We mostly care about updates from admin/bot
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`
                },
                (payload: any) => {
                    // Instead of manual state updates, we re-fetch the whole order
                    // This ensures items, address, and status are all perfectly in sync
                    fetchOrder();
                }
            )
            .subscribe((status: string) => {
                setRealtimeStatus(status);

                if (status === 'CHANNEL_ERROR') {
                    console.error('[Realtime] Socket failed. Falling back to background polling.');
                }
            });

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [orderId, supabase]);

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
                    <p style={{ fontWeight: 500 }}>Yuklanmoqda...</p>
                </div>
            ) : !order ? (
                <div style={{ padding: '80px 40px', textAlign: 'center', color: '#6B7280' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 500 }}>{errorMsg || 'Buyurtma topilmadi'}</p>
                    <button onClick={() => router.push('/')} style={{ marginTop: '20px', color: '#BE185D', fontWeight: 600 }}>Asosiy sahifaga qaytish</button>
                    {errorMsg === 'Avtorizatsiyadan o\'ting' && (
                        <button
                            onClick={() => router.push(`/profil/login?redirectTo=/profil/buyurtmalar/${orderId}`)}
                            style={{ display: 'block', margin: '12px auto', background: '#BE185D', color: 'white', padding: '8px 16px', borderRadius: 8 }}
                        >
                            Kirish
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
                            <h1>Buyurtmani kuzatish</h1>
                            <span className={styles.orderId}>{order.id}</span>
                        </div>
                    </header>

                    {/* Progress Card */}
                    <div className={styles.progressCard}>
                        <div className={styles.progressHeader}>
                            <div>
                                <span className={styles.estimatedLabel}>Holati</span>
                                <span className={styles.estimatedTime}>
                                    {ORDER_STATUSES.find(s => s.id === order.status)?.label || order.status}
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

                    {/* Timeline */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>Buyurtma jarayoni</h2>
                        <div className={styles.timeline}>
                            {ORDER_STATUSES.map((status, index) => {
                                const isCompleted = index < order.currentStep;
                                const isActive = index === order.currentStep;
                                const Icon = status.icon;

                                return (
                                    <div key={status.id} className={`${styles.timelineItem} ${!isCompleted && !isActive ? styles.dimmed : ''}`}>
                                        {index < ORDER_STATUSES.length - 1 && (
                                            <div className={styles.timelineLine} />
                                        )}

                                        <div className={`${styles.timelineBadge} ${isActive ? styles.timelineBadgeActive : ''} ${isCompleted ? styles.timelineBadgeCompleted : ''}`}>
                                            <Icon size={18} />
                                        </div>

                                        <div className={styles.timelineInfo}>
                                            <div className={styles.timelineHeader}>
                                                <span className={styles.timelineLabel}>{status.label}</span>
                                            </div>
                                            <p className={styles.timelineDesc}>{status.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Info */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>Yetkazib berish manzili</h2>
                        <div className={styles.addressCard}>
                            <div className={styles.iconBox}>
                                <MapPin size={20} />
                            </div>
                            <div className={styles.addressDetails}>
                                <span className={styles.addressLabel}>{order.address.label}</span>
                                <span className={styles.addressText}>{order.address.text}</span>
                                <span className={styles.addressText}>{order.address.phone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>Buyurtma tarkibi</h2>
                        <div className={styles.itemsList}>
                            {order.items.map((item: any) => (
                                <div key={item.id} className={styles.productRow}>
                                    <div className={styles.productImageWrapper}>
                                        <Image src={item.image} alt={item.name} fill className={styles.productImage} sizes="60px" style={{ objectFit: 'cover' }} />
                                    </div>
                                    <div className={styles.productInfo}>
                                        <h3 className={styles.productName}>{item.name}</h3>
                                        <span className={styles.productQty}>Soni: {item.qty} ta</span>
                                    </div>
                                    <span className={styles.productPrice}>{item.price.toLocaleString('uz-UZ')} so'm</span>
                                </div>
                            ))}

                            <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>Jami</span>
                                <span className={styles.totalValue}>{order.total.toLocaleString('uz-UZ')} so'm</span>
                            </div>
                        </div>
                    </div>

                </>
            )}
        </div>
    );
}
