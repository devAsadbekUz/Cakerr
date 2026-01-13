import { createClient } from '@/app/utils/supabase/client';

export const orderService = {
    async getAllOrdersAdmin() {
        const supabase = createClient();
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

    async updateOrderStatus(orderId: string, status: string) {
        const supabase = createClient();
        const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        return { error };
    }
};
