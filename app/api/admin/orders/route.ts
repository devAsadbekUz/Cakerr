import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Service Role client - module-level singleton for performance
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// INSTANT admin check - just reads header set by middleware
async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

export async function GET() {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error } = await serviceClient
        .from('orders')
        .select(`
            id, status, total_price, delivery_time, delivery_slot, created_at, comment, delivery_address,
            profiles (full_name, phone_number),
            order_items (
                id, product_id, name, quantity, unit_price, configuration,
                products (image_url, category_id)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('[Admin Orders API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strip heavy base64 strings to keep payload tiny
    const safeOrders = orders?.map(order => {
        const safeItems = order.order_items?.map((item: any) => {
            if (item.configuration) {
                const conf = { ...item.configuration };
                if (conf.uploaded_photo_url?.startsWith('data:image')) {
                    conf.uploaded_photo_url = null;
                }
                if (conf.drawing?.startsWith('data:image')) {
                    conf.drawing = null;
                }
                return { ...item, configuration: conf };
            }
            return item;
        });
        return { ...order, order_items: safeItems };
    });

    return NextResponse.json(
        { orders: safeOrders },
        { 
            headers: { 
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            } 
        }
    );
}
