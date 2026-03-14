'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/app/context/SupabaseContext';
import { createClient } from '@/app/utils/supabase/client';
import { orderService } from '@/app/services/orderService';
import ActiveOrderCard from './ActiveOrderCard';

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

const STATUS_LABELS: Record<string, string> = {
    new: 'Yangi',
    confirmed: 'Tasdiqlandi',
    preparing: 'Tayyorlanmoqda',
    ready: 'Tayyor',
    delivering: 'Yetkazilmoqda',
};

export default function ActiveOrderSection() {
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
        fetchActiveOrder();

        if (!user) return;

        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    if (!activeOrder) return null;

    return (
        <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>Faol buyurtmalar</h3>
            <ActiveOrderCard
                orderId={activeOrder.id}
                itemName={activeOrder.order_items?.[0]?.name || 'Buyurtma'}
                status={STATUS_LABELS[activeOrder.status] || activeOrder.status}
                progress={getProgressValue(activeOrder.status)}
            />
        </div>
    );
}
