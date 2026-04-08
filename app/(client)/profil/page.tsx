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
import { useLanguage } from '@/app/context/LanguageContext';
import { getLocalized } from '@/app/utils/i18n';
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

import { useSupabase } from '@/app/context/AuthContext';
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

const getStatusLabel = (status: string, t: any) => {
    if (!status) return '';
    const s = status.toLowerCase();
    switch (s) {
        case 'new': return t('statusNew');
        case 'confirmed': return t('statusConfirmed');
        case 'preparing': return t('statusPreparing');
        case 'ready': return t('statusReady');
        case 'delivering': return t('statusDelivering');
        case 'completed': return t('statusCompleted');
        case 'cancelled': return t('statusCancelled');
        default: return status;
    }
};

export default function ProfilPage() {
    const router = useRouter();
    const { lang, t } = useLanguage();
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
                        const firstItem = o.order_items?.[0];
                        const dateObj = new Date(o.created_at);
                        const monthNames = t('months') as unknown as string[];
                        const formattedDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

                        return {
                            id: o.id,
                            date: formattedDate,
                            // Display label: first item name + count of remaining
                            displayName: getLocalized(firstItem?.name, lang) || 'Mahsulot',
                            extraItemsCount: (o.order_items?.length || 1) - 1,
                            price: o.total_price,
                            image: firstItem?.configuration?.image_url || firstItem?.configuration?.uploaded_photo_url || firstItem?.configuration?.image_url || '/images/cake-placeholder.jpg',
                            // All items for reorder
                            orderItems: (o.order_items || []).map((item: any) => ({
                                productId: item.product_id,
                                name: item.name,
                                unitPrice: item.unit_price,
                                quantity: item.quantity,
                                portion: item.configuration?.portion || '',
                                flavor: item.configuration?.flavor || '',
                                configuration: item.configuration,
                            })),
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

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchProfileData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        let channel: ReturnType<typeof supabase.channel> | null = null;

        if (user?.id) {
            // Subscribe to real-time updates for user's orders to keep profile in sync
            channel = supabase
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
                    if (err) console.error('[Realtime] Error:', err);
                });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (channel) supabase.removeChannel(channel);
        };
    }, [user?.id]);

    useEffect(() => {
        if (user) {
            // Update stats when user.coins changes (synced by SupabaseContext)
            setStats(prev => ({ ...prev, coins: user.coins || 0 }));
        }
    }, [user?.coins]);

    if (authLoading || (user && loading)) {
        return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>{t('loading')}</div>;
    }

    if (!user) {
        return (
            <div className={styles.guestContainer}>
                <div className={styles.guestHeader}>
                    <h1 className={styles.guestTitle}>{t('profileTitle')}</h1>
                    <p className={styles.guestSubtitle}>{t('loginPrompt')}</p>
                </div>
                <div className={styles.guestBody}>
                    <div className={styles.guestIconWrap}>
                        <div className={styles.guestIconRing} />
                        <div className={styles.guestIconCircle}>
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    </div>
                    <h2 className={styles.guestBodyTitle}>
                        {t('loginYourAccount')}
                    </h2>
                    <p className={styles.guestBodyDesc}>
                        {t('loginFeaturesDesc')}
                    </p>
                    <button className={styles.loginBtn} onClick={() => router.push('/profil/login')}>
                        {t('login')}
                    </button>
                </div>
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
                        <h2>{user.user_metadata?.full_name || t('defaultCustomerName')}</h2>
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
                        <span className={styles.statLabel}>{t('orders')}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{(stats.coins || 0).toLocaleString('en-US')}</span>
                        <span className={styles.statLabel}>{t('shirinTangalar')}</span>
                        <p className={styles.coinExpiryInfo}>{t('coinExpiryNotice')}</p>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {activeOrder && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t('activeOrders')}</h3>
                        <ActiveOrderCard
                            orderId={activeOrder.id}
                            itemName={getLocalized(activeOrder.order_items?.[0]?.name, lang) || t('order')}
                            status={getStatusLabel(activeOrder.status, t)}
                            progress={getProgressValue(activeOrder.status)}
                        />
                    </div>
                )}

                {/* Quick Reorder */}
                {orders.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.menuHeader}>
                            <h3 className={styles.sectionTitle}>{t('quickOrder')}</h3>
                            <Link href="/profil/buyurtmalar" className={styles.seeAll}>{t('seeAll')}</Link>
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
                    <h3 className={styles.sectionTitle}>{t('mainMenu')}</h3>
                    <MenuItem
                        icon={History}
                        label={t('orderHistory')}
                        color="#4F46E5"
                        onClick={() => router.push('/profil/buyurtmalar')}
                    />
                    <MenuItem
                        icon={MapPin}
                        label={t('savedAddresses')}
                        color="#10B981"
                        onClick={() => setIsAddressesOpen(true)}
                    />
                    <MenuItem
                        icon={Calendar}
                        label={t('specialDates')}
                        color="#F59E0B"
                        onClick={() => setModalState({ isOpen: true, type: 'calendar', featureName: t('specialDates') })}
                    />
                </div>

                {/* App Settings */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t('others')}</h3>
                    <MenuItem
                        icon={Cookie}
                        label={t('myPreferences')}
                        color="#EC4899"
                        onClick={() => setModalState({ isOpen: true, type: 'preferences', featureName: t('myPreferences') })}
                    />
                    <MenuItem
                        icon={Share2}
                        label={t('shareApp')}
                        color="#3B82F6"
                        onClick={() => router.push('/profil/ulashish')}
                    />
                    <MenuItem
                        icon={HelpCircle}
                        label={t('helpCenter')}
                        color="#6B7280"
                        onClick={() => router.push('/profil/yordam')}
                    />
                    <MenuItem
                        icon={LogOut}
                        label={t('logout')}
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
