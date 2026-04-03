import 'server-only';

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { AdminOrder, AdminOrderItem, AdminOrderListItem } from '@/app/types/admin-order';

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

function sanitizeOrderItem(item: AdminOrderItem): AdminOrderItem {
    if (!item.configuration) {
        return item;
    }

    const configuration = { ...item.configuration };

    if (configuration.uploaded_photo_url?.startsWith('data:image')) {
        configuration.uploaded_photo_url = null;
    }

    if (configuration.drawing?.startsWith('data:image')) {
        configuration.drawing = null;
    }

    return { ...item, configuration };
}

export function sanitizeAdminOrder(order: AdminOrder): AdminOrder {
    return {
        ...order,
        order_items: order.order_items?.map(sanitizeOrderItem),
    };
}

function applyDaysFilter<T>(query: T, filterDays?: number | null) {
    if (!filterDays) {
        return query;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterDays);
    return (query as { gte: (column: string, value: string) => T }).gte('created_at', cutoff.toISOString());
}

export async function fetchAdminOrders(filterDays?: number | null, limit = 500) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    const query = applyDaysFilter(serviceClient
        .from('orders')
        .select(`
            id, user_id, status, total_price, delivery_time, delivery_slot, created_at, comment, delivery_address,
            profiles (full_name, phone_number),
            order_items (
                id, product_id, name, quantity, unit_price, configuration,
                products (image_url, category_id)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit), filterDays);

    const { data: orders, error } = await query;

    if (error) {
        throw error;
    }

    const typedOrders = (orders as AdminOrder[] | null) ?? [];

    return typedOrders.map(sanitizeAdminOrder);
}

export async function fetchAdminOrderSummaries(filterDays?: number | null, limit = 500) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    const query = applyDaysFilter(serviceClient
        .from('orders')
        .select(`
            id, status, total_price, delivery_time, delivery_slot, created_at,
            delivery_address,
            profiles (full_name),
            order_items (
                id, name, quantity, unit_price, configuration
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit), filterDays);

    const { data: orders, error } = await query;

    if (error) {
        throw error;
    }

    const typedOrders = (orders as AdminOrder[] | null) ?? [];

    return typedOrders.map<AdminOrderListItem>(order => ({
        ...order,
        items_count: order.order_items?.length || 0,
        order_items: order.order_items?.slice(0, 2).map(item => ({
            ...sanitizeOrderItem(item),
            products: undefined,
            configuration: item.configuration?.portion
                ? { portion: item.configuration.portion }
                : null,
        })),
    }));
}
