import { createClient } from '@/app/utils/supabase/client';

export const orderService = {
    async getAllOrdersAdmin() {
        const { createAdminBrowserClient } = await import('@/app/utils/supabase/admin-client');
        const supabase = createAdminBrowserClient();
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles (full_name, phone_number),
                order_items (
                    *,
                    products (image_url)
                )
            `)
            .order('delivery_time', { ascending: true });

        if (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
        return data;
    },

    async updateOrderStatus(orderId: string, status: string, isAdmin: boolean = false) {
        let supabase;
        if (isAdmin) {
            const { createAdminBrowserClient } = await import('@/app/utils/supabase/admin-client');
            supabase = createAdminBrowserClient();
        } else {
            supabase = createClient();
        }

        const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        // Sync status to Telegram bot message (fire and forget)
        if (!error) {
            console.log(`[OrderService] Syncing status to TG: ${status} for ${orderId}`);
            fetch('/api/telegram/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, newStatus: status })
            })
                .then(res => res.json())
                .then(data => console.log('[OrderService] TG Sync result:', data))
                .catch(err => console.error('[OrderService] TG Sync error:', err));
        }

        return { error };
    }
};
