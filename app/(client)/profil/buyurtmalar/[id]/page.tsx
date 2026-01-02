'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Package, Check, Clock, Truck, MapPin, Phone, User } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/app/utils/supabase/client';

// This matches the status structure for future backend integration
const ORDER_STATUSES = [
    {
        id: 'new',
        label: 'Buyurtma qabul qilindi',
        desc: 'Sizning buyurtmangiz tizimga tushdi',
        icon: Check,
    },
    {
        id: 'confirmed',
        label: 'Tasdiqlandi',
        desc: 'Buyurtmangiz menejer tomonidan tasdiqlandi',
        icon: Clock,
    },
    {
        id: 'preparing',
        label: 'Tayyorlanmoqda',
        desc: 'Sizning shirinligingiz pishirilmoqda',
        icon: Package,
    },
    {
        id: 'delivering',
        label: 'Yo\'lda',
        desc: 'Buyurtmangiz kuryerga topshirildi',
        icon: Truck,
    },
    {
        id: 'completed',
        label: 'Yetkazildi',
        desc: 'Buyurtmangiz muvaffaqiyatli yetkazildi',
        icon: MapPin,
    }
];

const getStatusStep = (status: string) => {
    switch (status) {
        case 'new': return 0;
        case 'confirmed': return 1;
        case 'preparing': return 2;
        case 'delivering': return 3;
        case 'completed': return 4;
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
    const supabase = createClient();

    useEffect(() => {
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
                setOrder({
                    id: data.id,
                    status: data.status,
                    currentStep: getStatusStep(data.status),
                    totalSteps: 5,
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
                        image: item.configuration?.uploaded_photo_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&v=2'
                    }))
                });
            }
            setLoading(false);
        }
        fetchOrder();
    }, [orderId]);

    if (loading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Yuklanmoqda...</div>;
    if (!order) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Buyurtma topilmadi</div>;

    const progressValue = ((order.currentStep + 1) / order.totalSteps) * 100;

    return (
        <div className={styles.container}>
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
                            <img src={item.image} alt={item.name} className={styles.productImage} />
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

            <footer className={styles.footer}>
                <button className={styles.browseBtn} onClick={() => router.push('/')}>
                    Xarid qilishni davom ettirish
                </button>
            </footer>
        </div>
    );
}
