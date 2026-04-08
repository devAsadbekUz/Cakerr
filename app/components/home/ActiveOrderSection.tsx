'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/app/context/AuthContext';
import { createClient } from '@/app/utils/supabase/client';
import { orderService } from '@/app/services/orderService';
import ActiveOrderCard from './ActiveOrderCard';
import { useLanguage } from '@/app/context/LanguageContext';
import { getStatusConfig } from '@/app/utils/orderConfig';
import { getLocalized } from '@/app/utils/i18n';

const getProgressValue = (status: string, isPickup: boolean = false) => {
    switch (status) {
        case 'new': return 15;
        case 'confirmed': return 35;
        case 'preparing': return 60;
        case 'ready': return isPickup ? 90 : 80;
        case 'delivering': return 95;
        case 'completed': return 100;
        default: return 0;
    }
};

export default function ActiveOrderSection() {
    const { lang, t } = useLanguage();
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const { user } = useSupabase();
    const supabase = React.useMemo(() => createClient(), []);

    const fetchActiveOrder = async () => {
        if (!user) return;
        const oData = await orderService.getUserOrders();
        const active = oData.find((o: any) => !['completed', 'cancelled'].includes(o.status));
        setActiveOrder(active || null);
    };

    useEffect(() => {
        if (!user) {
            setActiveOrder(null);
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchActiveOrder();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Use a ref-like object so the channel is accessible in cleanup
        const channelRef: { current: ReturnType<typeof supabase.channel> | null } = { current: null };

        // Delay initial fetch and subscription by 500ms to allow Auth/Hydration to settle
        const timer = setTimeout(() => {
            fetchActiveOrder();

            channelRef.current = supabase
                .channel(`user-sync-${user.id}`)
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
                            setActiveOrder((prev: any) => prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                        } else {
                            fetchActiveOrder();
                        }
                    }
                )
                .subscribe();
        }, 500);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [user?.id, supabase]);

    if (!activeOrder) return null;

    return (
        <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>{t('activeOrders')}</h3>
            <ActiveOrderCard
                orderId={activeOrder.id}
                itemName={getLocalized(activeOrder.order_items?.[0]?.name, lang) || t('order')}
                status={getStatusConfig(activeOrder.status).labels[lang]}
                progress={getProgressValue(activeOrder.status, activeOrder.delivery_type === 'pickup')}
            />
        </div>
    );
}
