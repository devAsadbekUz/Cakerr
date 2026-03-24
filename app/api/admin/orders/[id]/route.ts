import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Service Role client for admin queries
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: order, error } = await serviceClient
        .from('orders')
        .select(`
            id, status, total_price, delivery_time, delivery_slot, created_at, comment, delivery_address,
            profiles (full_name, phone_number),
            order_items (
                id, product_id, name, quantity, unit_price, configuration,
                products (image_url, category_id)
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error(`[Admin Custom Order API] Error fetching ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Clean payload (strip data-uri images)
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

    return NextResponse.json(
        { order: { ...order, order_items: safeItems } },
        { 
            headers: { 
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            } 
        }
    );
}
