'use client';

import React from 'react';
import Image from 'next/image';
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
import { useState, useEffect } from 'react';
import AddressesModal from '@/app/components/checkout/AddressesModal';
import ActiveOrderCard from '@/app/components/home/ActiveOrderCard';
import ComingSoonModal from '@/app/components/profile/ComingSoonModal';
import EditProfileModal from '@/app/components/profile/EditProfileModal';
import { orderService } from '@/app/services/orderService';

import { useSupabase } from '@/app/context/SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';
import { getAuthHeader } from '@/app/utils/telegram';

const getProgressValue = (status: string) => {
    switch (status) {
        case 'new': return 15;
        case 'confirmed': return 30;
        case 'preparing': return 50;
        case 'ready': return 75;
        case 'delivering': return 90;
        case 'completed': return 100;
        default: return 0;
    }
};

export default function ProfilPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useSupabase();
    const supabase = createClient();
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState({ orderCount: 0, coins: 0 });
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAddressesOpen, setIsAddressesOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        type: 'calendar' | 'preferences' | 'general';
        featureName: string;
    }>({
        isOpen: false,
        type: 'general',
        featureName: ''
    });

    const fetchProfileData = async (isInitialLoad = false) => {
        if (!user) return;
        if (isInitialLoad) setLoading(true);

        try {
            const ordersData = await orderService.getUserOrders();
            if (ordersData) {
                // Set stats - order count from ordersData, coins from SupabaseContext user object
                setStats({
                    orderCount: ordersData.length,
                    coins: user.coins || 0
                });

                const active = ordersData.find((o: any) => !['completed', 'cancelled'].includes(o.status));
                setActiveOrder(active || null);

                // Map past orders for "Tez buyurtma" (completed ones)
                const completed = ordersData
                    .filter((o: any) => o.status === 'completed')
                    .map((o: any) => {
                        const item = o.order_items?.[0];
                        return {
                            id: o.id,
                            date: new Date(o.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }),
                            items: `${item?.name || 'Mahsulot'} (${item?.configuration?.portion || ''})`,
                            price: o.total_price,
                            image: item?.configuration?.image_url || item?.configuration?.uploaded_photo_url || '/images/cake-placeholder.jpg',
                            productId: item?.product_id,
                            name: item?.name,
                            portion: item?.configuration?.portion,
                            flavor: item?.configuration?.flavor
                        };
                    });
                setOrders(completed);
            }
        } catch (err) {
            console.error('[Profile] Fetch profile data fail:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData(true); // Initial load shows loading state

        if (user?.id) {
            // Subscribe to real-time updates for user's orders to keep profile in sync
            const channel = supabase
                .channel(`profile-orders-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        console.log('[Realtime] Profile order change:', payload.eventType, payload.new?.status);

                        if (payload.eventType === 'UPDATE') {
                            // Targeted update - only change the activeOrder status if it matches
                            setActiveOrder((prev: any) => {
                                if (!prev) return null;
                                if (prev.id === payload.new.id) {
                                    return { ...prev, status: payload.new.status };
                                }
                                return prev;
                            });
                        } else if (payload.eventType === 'INSERT') {
                            // New order created - refresh profile data
                            fetchProfileData();
                        }
                    }
                )
                .subscribe((status: string, err: Error | null) => {
                    console.log('[Realtime] Profile Subscription:', status);
                    if (err) console.error('[Realtime] Error:', err);
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.id]);

    useEffect(() => {
        if (user) {
            // Update stats when user.coins changes (synced by SupabaseContext)
            setStats(prev => ({ ...prev, coins: user.coins || 0 }));
        }
    }, [user?.coins]);

    if (authLoading || (user && loading)) {
        return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Yuklanmoqda...</div>;
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Profil</h1>
                    <p className={styles.subtitle}>Buyurtmalaringizni kuzatish uchun tizimga kiring</p>
                </div>
                <button
                    className={styles.loginBtn}
                    onClick={() => router.push('/profil/login')}
                >
                    Tizimga kirish
                </button>
            </div>
        );
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    return (
        <div className={styles.container}>
            {/* Header Identity */}
            <div className={styles.header}>
                <div className={styles.userSection}>
                    <div
                        className={styles.avatar}
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        {user.user_metadata?.avatar_url ? (
                            <div className={styles.avatarImageWrapper}>
                                <Image src={user.user_metadata.avatar_url} alt="Profile" fill style={{ objectFit: 'cover' }} />
                            </div>
                        ) : (
                            user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || user.phone?.charAt(4) || 'U'
                        )}
                    </div>
                    <div className={styles.userInfo}>
                        <h2>{user.user_metadata?.full_name || 'Mijoz'}</h2>
                        <div className={styles.contactInfo}>
                            {user.email && <p className={styles.userEmail}>{user.email}</p>}
                            {(user.phone || user.phone_number) && (
                                <p className={styles.userPhone}>{user.phone || user.phone_number}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* stats */}
            <div className={styles.statsOverlay}>
                <div className={styles.statsCard}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{stats.orderCount}</span>
                        <span className={styles.statLabel}>Buyurtmalar</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{stats.coins}</span>
                        <span className={styles.statLabel}>Shirin Tangalar</span>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {activeOrder && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Faol buyurtmalar</h3>
                        <ActiveOrderCard
                            orderId={activeOrder.id}
                            itemName={activeOrder.order_items?.[0]?.name || 'Buyurtma'}
                            status={activeOrder.status === 'new' ? 'Yangi' :
                                activeOrder.status === 'confirmed' ? 'Tasdiqlandi' :
                                    activeOrder.status === 'preparing' ? 'Tayyorlanmoqda' :
                                        activeOrder.status === 'ready' ? 'Tayyor' :
                                            activeOrder.status === 'delivering' ? 'Yetkazilmoqda' : activeOrder.status}
                            progress={getProgressValue(activeOrder.status)}
                        />
                    </div>
                )}

                {/* Quick Reorder */}
                {orders.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.menuHeader}>
                            <h3 className={styles.sectionTitle}>Tez buyurtma</h3>
                            <Link href="/profil/buyurtmalar" className={styles.seeAll}>Barchasi</Link>
                        </div>
                        <div className={styles.reorderList}>
                            {orders.map(order => (
                                <OrderCard key={order.id} {...order} />
                            ))}
                        </div>
                    </div>
                )}

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
                        onClick={() => setModalState({ isOpen: true, type: 'calendar', featureName: 'Maxsus sanalar' })}
                    />
                </div>

                {/* App Settings */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Boshqalar</h3>
                    <MenuItem
                        icon={Cookie}
                        label="Mening ta'mlarim"
                        color="#EC4899"
                        onClick={() => setModalState({ isOpen: true, type: 'preferences', featureName: "Mening ta'mlarim" })}
                    />
                    <MenuItem
                        icon={Share2}
                        label="Ilovani ulashish"
                        color="#3B82F6"
                        onClick={() => router.push('/profil/ulashish')}
                    />
                    <MenuItem
                        icon={HelpCircle}
                        label="Yordam markazi"
                        color="#6B7280"
                        onClick={() => router.push('/profil/yordam')}
                    />
                    <MenuItem
                        icon={LogOut}
                        label="Chiqish"
                        color="#EF4444"
                        onClick={handleLogout}
                    />
                </div>
            </div>

            <AddressesModal
                isOpen={isAddressesOpen}
                onClose={() => setIsAddressesOpen(false)}
                onNewAddress={() => router.push('/savat/checkout/map')}
            />

            <ComingSoonModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                featureName={modalState.featureName}
                featureType={modalState.type}
            />

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={user}
                onUpdate={() => router.refresh()}
            />
        </div>
    );
}
