'use client';

import React from 'react';
import styles from './page.module.css';
import {
    MapPin,
    History,
    Settings,
    LogOut,
    Calendar,
    HelpCircle,
    Share2,
    Cookie
} from 'lucide-react';
import MenuItem from '@/app/components/profile/MenuItem';
import OrderCard from '@/app/components/profile/OrderCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AddressesModal from '@/app/components/checkout/AddressesModal';

export default function ProfilPage() {
    const router = useRouter();
    const [isAddressesOpen, setIsAddressesOpen] = useState(false);
    // Mock user data
    const user = {
        name: 'Aziz Toshpulatov',
        phone: '+998 90 123 45 67',
        orders: 12,
        coins: 45000
    };

    // Past orders mock
    const pastOrders = [
        {
            id: '12345',
            date: '18 Dekabr, 2025',
            items: 'Rainbow Splash (6 kishilik)',
            price: 650000,
            image: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=800&q=80',
            productId: 'b1',
            name: 'Rainbow Splash',
            portion: '6',
            flavor: 'Vanilli'
        },
        {
            id: '12346',
            date: '12 Dekabr, 2025',
            items: 'Chocolate Delight (4 kishilik)',
            price: 420000,
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
            productId: 'b2',
            name: 'Chocolate Delight',
            portion: '4',
            flavor: 'Shokoladli'
        }
    ];

    return (
        <div className={styles.container}>
            {/* Header Identity */}
            <div className={styles.header}>
                <div className={styles.userSection}>
                    <div className={styles.avatar}>A</div>
                    <div className={styles.userInfo}>
                        <h2>{user.name}</h2>
                        <p>{user.phone}</p>
                    </div>
                </div>
            </div>

            {/* Stats Overlay */}
            <div className={styles.statsOverlay}>
                <div className={styles.statsCard}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{user.orders}</span>
                        <span className={styles.statLabel}>Buyurtmalar</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{user.coins.toLocaleString()}</span>
                        <span className={styles.statLabel}>Shirin Tangalar</span>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {/* Quick Reorder */}
                <div className={styles.section}>
                    <div className={styles.menuHeader}>
                        <h3 className={styles.sectionTitle}>Tez buyurtma</h3>
                        <Link href="/profil/buyurtmalar" className={styles.seeAll}>Barchasi</Link>
                    </div>
                    <div className={styles.reorderList}>
                        {pastOrders.map(order => (
                            <OrderCard key={order.id} {...order} />
                        ))}
                    </div>
                </div>

                {/* Main Menu */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Asosiy menyu</h3>
                    <MenuItem
                        icon={History}
                        label="Buyurtmalar tarixi"
                        color="#4F46E5"
                        onClick={() => router.push('/profil/buyurtmalar')}
                    />
                    <MenuItem
                        icon={MapPin}
                        label="Saqlangan manzillar"
                        color="#10B981"
                        onClick={() => setIsAddressesOpen(true)}
                    />
                    <MenuItem
                        icon={Calendar}
                        label="Maxsus sanalar (Tug'ilgan kunlar)"
                        color="#F59E0B"
                    />
                </div>

                {/* App Settings */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Boshqalar</h3>
                    <MenuItem
                        icon={Cookie}
                        label="Mening ta'mlarim"
                        color="#EC4899"
                    />
                    <MenuItem
                        icon={Share2}
                        label="Ilovani ulashish"
                        color="#3B82F6"
                    />
                    <MenuItem
                        icon={HelpCircle}
                        label="Yordam markazi"
                        color="#6B7280"
                    />
                    <MenuItem
                        icon={Settings}
                        label="Sozlamalar"
                        color="#374151"
                    />
                    <MenuItem
                        icon={LogOut}
                        label="Chiqish"
                        color="#EF4444"
                    />
                </div>
            </div>

            <AddressesModal
                isOpen={isAddressesOpen}
                onClose={() => setIsAddressesOpen(false)}
                onNewAddress={() => router.push('/savat/checkout/map')}
            />
        </div>
    );
}
