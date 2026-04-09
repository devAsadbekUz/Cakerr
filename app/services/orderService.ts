import { createClient } from '@/app/utils/supabase/client';

export const orderService = {
    async getOrderSummariesAdmin(filterDays?: number | null, limit?: number) {
        try {
            const params = new URLSearchParams();
            if (filterDays) params.set('days', String(filterDays));
            params.set('summary', '1');
            if (limit) params.set('limit', String(limit));
            const url = `/api/admin/orders?${params.toString()}`;
            const response = await fetch(url, {
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error('[OrderService] Admin summary API error:', response.status);
                return [];
            }

            const { orders } = await response.json();
            return orders || [];
        } catch (err) {
            console.error('[OrderService] Summary fetch error:', err);
            return [];
        }
    },

    async getAllOrdersAdmin(filterDays?: number | null) {
        try {
            const url = filterDays ? `/api/admin/orders?days=${filterDays}` : '/api/admin/orders';
            const response = await fetch(url, {
                credentials: 'include',
                cache: 'no-store'
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
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                credentials: 'include',
                cache: 'no-store'
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

    async getOrderLogsAdmin(orderId: string) {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/logs`, {
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error('[OrderService] Admin Order Logs API error:', response.status);
                return [];
            }

            const { logs } = await response.json();
            return logs || [];
        } catch (err) {
            console.error('[OrderService] Logs fetch error:', err);
            return [];
        }
    },

    async updateOrderStatus(orderId: string, status: string, isAdmin: boolean = false, lang: string = 'uz') {
        if (isAdmin) {
            try {
                // Unified high-performance endpoint for status + TG sync
                const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status, lang })
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
