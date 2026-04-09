'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';
import styles from './page.module.css';
import { useLanguage } from '@/app/context/LanguageContext';
import { useCart } from '@/app/context/CartContext';
import { useSupabase } from '@/app/context/AuthContext';
import { getAuthHeader } from '@/app/utils/telegram';
import { getStatusConfig } from '@/app/utils/orderConfig';

interface OrderItem {
    id: string;
    name: string;
    portion: string;
    flavor: string;
    price: number;
    image: string;
    quantity: number;
    productId: string;
    configuration?: any;
}

interface Order {
    id: string;
    date: string;
    total: number;
    status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
    statusLabel: string;
    items: OrderItem[];
}

export default function OrderHistoryPage() {
    const router = useRouter();
    const { lang, t } = useLanguage();
    const { reorderFromHistory } = useCart();
    const { user, loading: authLoading } = useSupabase();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

    useEffect(() => {
        if (!user) return;

        async function fetchOrders() {
            setLoading(true);
            try {
                const response = await fetch('/api/user/orders', {
                    headers: getAuthHeader(),
                    credentials: 'include'
                });

                if (!response.ok) throw new Error('Failed to fetch orders');

                const { orders: data } = await response.json();

                if (data) {
                    const mappedOrders: Order[] = data.map((o: any) => ({
                        id: o.id,
                        date: new Date(o.created_at).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
                        total: o.total_price,
                        status: o.status,
                        statusLabel: getStatusConfig(o.status).labels[lang],
                        items: o.order_items.map((item: any) => ({
                            id: item.id,
                            productId: item.product_id,
                            name: item.name,
                            portion: item.configuration?.portion || '',
                            flavor: item.configuration?.flavor || '',
                            price: item.unit_price,
                            image: item.configuration?.uploaded_photo_url || item.configuration?.image_url || '/images/cake-placeholder.jpg',
                            quantity: item.quantity,
                            configuration: item.configuration,
                        }))
                    }));
                    setOrders(mappedOrders);
                }
            } catch (error) {
                console.error('[Orders] Fetch error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [user?.id]);

    const handleReorder = async (order: Order) => {
        await reorderFromHistory(order.items.map(item => ({
            productId: item.productId,
            name: item.name,
            unitPrice: item.price,
            quantity: item.quantity,
            portion: item.portion,
            flavor: item.flavor,
            configuration: item.configuration,
        })));
        router.push('/savat');
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['new', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);
        return order.status === filter;
    });

    if (authLoading || (user && loading)) {
        return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>{t('loading')}</div>;
    }

    if (!user) {
        router.push('/profil/login');
        return null;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>{t('orderHistory')}</h1>
            </header>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('all')}
                >
                    {t('all')}
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'pending' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    {t('activeOrders') || 'Faol'}
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'completed' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('completed')}
                >
                    {t('statusCompleted')}
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('cancelled')}
                >
                    {t('statusCancelled')}
                </button>
            </div>

            <div className={styles.orderList}>
                {filteredOrders.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>{t('ordersNotFound')}</p>
                    </div>
                )}
                {filteredOrders.map((order) => (
                    <div key={order.id} className={styles.orderCard}>
                        <div className={styles.orderCardHeader}>
                            <div>
                                <h3 className={styles.orderId}>{order.id}</h3>
                                <p className={styles.orderDate}>{order.date}</p>
                            </div>
                            <div className={`${styles.statusBadge} ${['new', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status) ? styles.statusBadgePending : ''}`}>
                                <Check size={12} />
                                <span>{order.statusLabel}</span>
                            </div>
                        </div>

                        {order.items.map((item, idx) => (
                            <div key={idx} className={styles.orderContent}>
                                <div className={styles.productImageWrapper}>
                                    <Image src={item.image} alt={item.name} fill className={styles.productImage} sizes="60px" style={{ objectFit: 'cover' }} />
                                </div>
                                <div className={styles.productInfo}>
                                    <h4 className={styles.productName}>{item.name}</h4>
                                    <p className={styles.productMeta}>{t('quantity')}: {item.quantity}</p>
                                    <p className={styles.productMeta}>{t('portion')}: {item.portion}</p>
                                </div>
                                <div className={styles.productPrice}>
                                    {item.price === 0
                                        ? <span style={{ color: '#BE185D', fontStyle: 'italic', fontSize: '13px' }}>{t('negotiable')}</span>
                                        : <>{item.price.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU')} {t('som')}</>
                                    }
                                </div>
                            </div>
                        ))}

                        <div className={styles.orderFooter}>
                            <div className={styles.totalRow} onClick={() => router.push(`/profil/buyurtmalar/${order.id}`)}>
                                <span className={styles.totalLabel}>{t('total')}</span>
                                <div className={styles.totalValue}>
                                    {order.items.some(item => item.price === 0) ? (
                                        <span style={{ color: '#BE185D', fontStyle: 'italic', fontSize: '14px' }}>{t('negotiable')}</span>
                                    ) : (
                                        <>{order.total.toLocaleString('uz-UZ')} {t('som')}</>
                                    )}
                                    <ChevronRight size={18} color="#D1D5DB" />
                                </div>
                            </div>
                            <button className={styles.reorderBtn} onClick={() => handleReorder(order)}>
                                <RotateCcw size={18} />
                                {t('reorder')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
