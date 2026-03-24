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

    async getOrderAdmin(orderId: string) {
        try {
            // Add timestamp for aggressive cache busting
            const response = await fetch(`/api/admin/orders/${orderId}?t=${Date.now()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('[OrderService] Admin Single Order API error:', response.status);
                return null;
            }

            const { order } = await response.json();
            return order || null;
        } catch (err) {
            console.error('[OrderService] Single fetch error:', err);
            return null;
        }
    },

    async updateOrderStatus(orderId: string, status: string, isAdmin: boolean = false) {
        if (isAdmin) {
            try {
                // Unified high-performance endpoint for status + TG sync
                const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    return { error: { message: data.error || 'Update failed' } };
                }

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
                headers: getAuthHeader(),
                credentials: 'include'
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
