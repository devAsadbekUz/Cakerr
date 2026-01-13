'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { useSupabase } from '@/app/context/SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';

interface OrderItem {
    id: string;
    name: string;
    portion: string;
    flavor: string;
    price: number;
    image: string;
    quantity: number;
    productId: string;
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
    const { addItem } = useCart();
    const { user, loading: authLoading } = useSupabase();
    const supabase = createClient();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

    useEffect(() => {
        if (!user) return;

        async function fetchOrders() {
            setLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mappedOrders: Order[] = data.map(o => ({
                    id: o.id,
                    date: new Date(o.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }),
                    total: o.total_price,
                    status: o.status,
                    statusLabel: o.status === 'new' ? 'Yangi' :
                        o.status === 'confirmed' ? 'Tasdiqlandi' :
                            o.status === 'preparing' ? 'Tayyorlanmoqda' :
                                o.status === 'ready' ? 'Tayyor' :
                                    o.status === 'delivering' ? 'Yetkazilmoqda' :
                                        o.status === 'completed' ? 'Yetkazilgan' : 'Bekor qilingan',
                    items: o.order_items.map((item: any) => ({
                        id: item.id,
                        productId: item.product_id,
                        name: item.name,
                        portion: item.configuration?.portion || '',
                        flavor: item.configuration?.flavor || '',
                        price: item.unit_price,
                        image: item.configuration?.uploaded_photo_url || '/images/cake-placeholder.jpg',
                        quantity: item.quantity
                    }))
                }));
                setOrders(mappedOrders);
            }
            setLoading(false);
        }

        fetchOrders();
    }, [user]);

    const handleReorder = (order: Order) => {
        order.items.forEach(item => {
            addItem({
                id: item.productId,
                name: item.name,
                price: item.price,
                image: item.image,
                quantity: item.quantity,
                portion: item.portion,
                flavor: item.flavor
            });
        });
        router.push('/savat');
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['new', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);
        return order.status === filter;
    });

    if (authLoading || (user && loading)) {
        return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Yuklanmoqda...</div>;
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
                <h1 className={styles.title}>Buyurtmalar tarixi</h1>
            </header>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Hammasi
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'pending' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Kutilmoqda
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'completed' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('completed')}
                >
                    Yetkazilgan
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'cancelled' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('cancelled')}
                >
                    Bekor qilingan
                </button>
            </div>

            <div className={styles.orderList}>
                {filteredOrders.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>Buyurtmalar topilmadi</p>
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
                                <img src={item.image} alt={item.name} className={styles.productImage} />
                                <div className={styles.productInfo}>
                                    <h4 className={styles.productName}>{item.name}</h4>
                                    <p className={styles.productMeta}>Soni: {item.quantity}</p>
                                    <p className={styles.productMeta}>Porsiya: {item.portion}</p>
                                </div>
                                <div className={styles.productPrice}>
                                    {item.price.toLocaleString('uz-UZ')} so'm
                                </div>
                            </div>
                        ))}

                        <div className={styles.orderFooter}>
                            <div className={styles.totalRow} onClick={() => router.push(`/profil/buyurtmalar/${order.id}`)}>
                                <span className={styles.totalLabel}>Jami</span>
                                <div className={styles.totalValue}>
                                    {order.total.toLocaleString('uz-UZ')} so'm
                                    <ChevronRight size={18} color="#D1D5DB" />
                                </div>
                            </div>
                            <button className={styles.reorderBtn} onClick={() => handleReorder(order)}>
                                <RotateCcw size={18} />
                                Qayta buyurtma qilish
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
