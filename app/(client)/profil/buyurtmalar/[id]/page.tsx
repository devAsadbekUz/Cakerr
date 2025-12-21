'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Package, Check, Clock, Truck, MapPin, Phone, User } from 'lucide-react';
import styles from './page.module.css';

// This matches the status structure for future backend integration
const ORDER_STATUSES = [
    {
        id: 'confirmed',
        label: 'Order Confirmed',
        desc: 'Your order has been received',
        icon: Check,
        time: '2025-10-23 10:30 AM'
    },
    {
        id: 'preparing',
        label: 'Preparing',
        desc: 'Your cake is being prepared',
        icon: Package,
        time: '2025-10-23 11:00 AM'
    },
    {
        id: 'delivery',
        label: 'Out for Delivery',
        desc: 'Your order is on the way',
        icon: Truck,
        time: null
    },
    {
        id: 'delivered',
        label: 'Delivered',
        desc: 'Order delivered successfully',
        icon: MapPin,
        time: null
    }
];

export default function TrackingPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string || 'ORD-8304';

    // Mock order data - would come from backend
    const order = {
        id: orderId,
        estimatedDelivery: 'Today, 3:00 PM',
        currentStep: 1, // 0 to 3
        totalSteps: 4,
        address: {
            label: 'Home',
            text: '123 Sweet Street Bakery Town, CA 90210',
            phone: '+1 (555) 123-4567'
        },
        courier: {
            name: 'Alijon',
            vehicle: 'Matiz (90 A 123 BZ)',
            phone: '+998 90 123 45 67'
        },
        items: [
            {
                id: '1',
                name: 'Chocolate Delight',
                qty: 1,
                price: 350000,
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop'
            }
        ],
        total: 395500
    };

    const progressValue = ((order.currentStep + 1) / order.totalSteps) * 100;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <div className={styles.headerInfo}>
                    <h1>Track Order</h1>
                    <span className={styles.orderId}>{order.id}</span>
                </div>
            </header>

            {/* Progress Card */}
            <div className={styles.progressCard}>
                <div className={styles.progressHeader}>
                    <div>
                        <span className={styles.estimatedLabel}>Estimated Delivery</span>
                        <span className={styles.estimatedTime}>{order.estimatedDelivery}</span>
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
                <h2 className={styles.sectionTitle}>Order Timeline</h2>
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
                                        {status.time && <span className={styles.timelineTime}>{status.time}</span>}
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
                <h2 className={styles.sectionTitle}>Delivery Address</h2>
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

            {/* Delivery Partner */}
            <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Yetkazib beruvchi</h2>
                <div className={styles.courierCard}>
                    <div className={styles.courierInfo}>
                        <div className={styles.courierAvatar}>
                            <User size={24} />
                        </div>
                        <div className={styles.courierDetails}>
                            <span className={styles.courierName}>{order.courier.name}</span>
                            <span className={styles.courierVehicle}>{order.courier.vehicle}</span>
                        </div>
                    </div>
                    <a href={`tel:${order.courier.phone}`} className={styles.callBtn}>
                        <Phone size={20} />
                        <span>Qo'ng'iroq</span>
                    </a>
                </div>
            </div>

            {/* Order Summary */}
            <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Order Items</h2>
                <div className={styles.itemsList}>
                    {order.items.map(item => (
                        <div key={item.id} className={styles.productRow}>
                            <img src={item.image} alt={item.name} className={styles.productImage} />
                            <div className={styles.productInfo}>
                                <h3 className={styles.productName}>{item.name}</h3>
                                <span className={styles.productQty}>Qty: {item.qty}</span>
                            </div>
                            <span className={styles.productPrice}>{item.price.toLocaleString('uz-UZ')} so'm</span>
                        </div>
                    ))}

                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Total</span>
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
