import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { sanitizeAdminOrder } from '@/app/(admin)/admin/orders/orders-data';
import { serviceClient } from '@/app/utils/supabase/service';

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
            customer_name, customer_phone,
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

    return NextResponse.json(
        { order: sanitizeAdminOrder(order as any) },
        { 
            headers: { 
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            } 
        }
    );
}
