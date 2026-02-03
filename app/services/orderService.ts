import { createClient } from '@/app/utils/supabase/client';

export const orderService = {
    async getAllOrdersAdmin() {
        try {
            const response = await fetch('/api/admin/orders', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('[OrderService] Admin API error:', response.status);
                return [];
            }

            const { orders } = await response.json();
            return orders || [];
        } catch (err) {
            console.error('[OrderService] Fetch error:', err);
            return [];
        }
    },

    async updateOrderStatus(orderId: string, status: string, isAdmin: boolean = false) {
        if (isAdmin) {
            try {
                const response = await fetch('/api/admin/data', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'orders',
                        id: orderId,
                        data: { status, updated_at: new Date().toISOString() }
                    })
                });

                if (!response.ok) {
                    return { error: { message: 'Update failed' } };
                }

                // Sync status to Telegram bot (fire and forget)
                console.log(`[OrderService] Syncing status to TG: ${status} for ${orderId}`);
                fetch('/api/telegram/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, newStatus: status })
                }).catch(err => console.error('[OrderService] TG Sync error:', err));

                return { error: null };
            } catch (err) {
                console.error('[OrderService] Update error:', err);
                return { error: { message: 'Update failed' } };
            }
        }

        // Client-side update (for non-admin users)
        const supabase = createClient();
        const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        return { error };
    },

    async getUserOrders() {
        try {
            const { getAuthHeader } = await import('@/app/utils/telegram');
            const response = await fetch('/api/user/orders', {
                headers: getAuthHeader()
            });

            if (!response.ok) {
                console.error('[OrderService] User orders API error:', response.status);
                return [];
            }

            const { orders } = await response.json();
            return orders || [];
        } catch (err) {
            console.error('[OrderService] Fetch user orders error:', err);
            return [];
        }
    }
};
