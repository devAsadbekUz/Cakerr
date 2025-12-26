'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Check, Package } from 'lucide-react';
import styles from './page.module.css';
import { useCart } from '@/app/context/CartContext';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

interface OrderItem {
    id: string;
    name: string;
    portion: string;
    flavor: string;
    price: number;
    image: string;
    quantity: number;
}

interface Order {
    id: string;
    date: string;
    total: number;
    status: 'delivered' | 'pending' | 'confirmed' | 'cancelled';
    statusLabel: string;
    items: OrderItem[];
}

const MOCK_ORDERS: Order[] = [
    {
        id: 'ORD-1096',
        date: 'Dec 19, 2025',
        total: 395500,
        status: 'delivered',
        statusLabel: 'Yetkazilgan',
        items: [
            {
                id: 'b2',
                name: 'Chocolate Delight',
                portion: '4',
                flavor: 'Shokoladli',
                price: 350000,
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
                quantity: 1
            }
        ]
    },
    {
        id: 'ORD-5137',
        date: 'Dec 18, 2025',
        total: 508500,
        status: 'delivered',
        statusLabel: 'Yetkazilgan',
        items: [
            {
                id: 'b2',
                name: 'Chocolate Delight',
                portion: '4',
                flavor: 'Shokoladli',
                price: 450000,
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
                quantity: 1
            }
        ]
    },
    {
        id: 'ORD-0746',
        date: 'Dec 18, 2025',
        total: 450000,
        status: 'delivered',
        statusLabel: 'Yetkazilgan',
        items: [
            {
                id: 'b2',
                name: 'Chocolate Delight',
                portion: '4',
                flavor: 'Shokoladli',
                price: 450000,
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
                quantity: 1
            }
        ]
    },
    {
        id: 'ORD-2241',
        date: 'Dec 15, 2025',
        total: 120000,
        status: 'cancelled',
        statusLabel: 'Bekor qilingan',
        items: [
            {
                id: 'b1',
                name: 'Rainbow Splash',
                portion: '2',
                flavor: 'Vanilli',
                price: 120000,
                image: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=800&q=80',
                quantity: 1
            }
        ]
    }
];

export default function OrderHistoryPage() {
    const router = useRouter();
    const { addItem } = useCart();
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('all');

    const handleReorder = (order: Order) => {
        order.items.forEach(item => {
            addItem({
                id: item.id,
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

    const filteredOrders = MOCK_ORDERS.filter(order => {
        if (filter === 'all') return true;
        return order.status === filter;
    });

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
                    className={`${styles.filterBtn} ${filter === 'confirmed' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('confirmed')}
                >
                    Tasdiqlangan
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'delivered' ? styles.filterBtnActive : ''}`}
                    onClick={() => setFilter('delivered')}
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
                {filteredOrders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <Package size={48} strokeWidth={1.5} />
                        </div>
                        <h3 className={styles.emptyTitle}>Buyurtmalar yo'q</h3>
                        <p className={styles.emptyText}>
                            Sizda ushbu toifadagi buyurtmalar mavjud emas
                        </p>
                        <button className={styles.browseBtn} onClick={() => router.push('/')}>
                            Menyuga o'tish
                        </button>
                    </div>
                ) : (
                    Object.entries(
                        filteredOrders.reduce((groups, order) => {
                            // Assuming order.date is parsable, for mock data it's "Dec 19, 2025"
                            // For proper date parsing in real app: new Date(order.date)
                            // Here we just extract month/year string for simplicity or keep using mock format
                            // Let's create a rough grouping key. 
                            // Since mock date is "Dec 19, 2025", we can just take the Month + Year part.

                            // Parse mock date "Dec 19, 2025"
                            const dateObj = new Date(order.date);
                            // Safely handle invalid dates if any
                            if (isNaN(dateObj.getTime())) return groups;

                            const monthKey = format(dateObj, 'LLLL yyyy', { locale: uz });
                            // Capitalize first letter
                            const displayKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

                            if (!groups[displayKey]) {
                                groups[displayKey] = [];
                            }
                            groups[displayKey].push(order);
                            return groups;
                        }, {} as Record<string, Order[]>)
                    ).map(([month, orders]) => (
                        <div key={month} className={styles.monthGroup}>
                            <h2 className={styles.monthTitle}>{month}</h2>
                            {orders.map((order) => (
                                <div key={order.id} className={styles.orderCard}>
                                    <div className={styles.orderCardHeader}>
                                        <div>
                                            <h3 className={styles.orderId}>{order.id}</h3>
                                            <p className={styles.orderDate}>{order.date}</p>
                                        </div>
                                        <div className={`${styles.statusBadge} ${order.status === 'pending' ? styles.statusBadgePending : ''}`}>
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
                    ))
                )}
            </div>
        </div>
    );
}
