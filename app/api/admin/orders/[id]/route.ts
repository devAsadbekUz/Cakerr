import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { sanitizeAdminOrder } from '@/app/(admin)/admin/orders/orders-data';
import { serviceClient } from '@/app/utils/supabase/service';
import { updateAdminOrderMessage } from '@/app/services/telegramNotificationService';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { item_id, unit_price } = body;

    if (!item_id || typeof unit_price !== 'number' || unit_price < 0) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Fetch the current item to find the old price and quantity
    const { data: currentItem, error: fetchError } = await serviceClient
        .from('order_items')
        .select('unit_price, quantity')
        .eq('id', item_id)
        .eq('order_id', id)
        .single();

    if (fetchError || !currentItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const oldUnitPrice = currentItem.unit_price ?? 0;
    const quantity = currentItem.quantity ?? 1;
    const priceDelta = (unit_price - oldUnitPrice) * quantity;

    // 2. Update the item price
    const { error: itemError } = await serviceClient
        .from('order_items')
        .update({ unit_price })
        .eq('id', item_id)
        .eq('order_id', id);

    if (itemError) {
        return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // 3. Adjust total_price by the delta (preserves delivery fee and any other adjustments)
    const { error: orderError } = await serviceClient.rpc('increment_order_total', {
        p_order_id: id,
        p_delta: priceDelta
    });

    // Fallback if RPC doesn't exist: manual read-then-write
    if (orderError) {
        const { data: order } = await serviceClient
            .from('orders')
            .select('total_price')
            .eq('id', id)
            .single();

        const newTotal = Math.max(0, (order?.total_price ?? 0) + priceDelta);
        const { error: fallbackError } = await serviceClient
            .from('orders')
            .update({ total_price: newTotal })
            .eq('id', id);

        if (fallbackError) {
            return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }
    }

    // 4. Sync with Telegram immediately to show updated prices
    await updateAdminOrderMessage(id);
    
    return NextResponse.json({ success: true });
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
            delivery_type, branch_id, customer_name, customer_phone, created_by_name, last_updated_by_name,
            payment_method, coins_spent, promo_discount, deposit_amount, final_payment_amount, refund_needed,
            cancellation_reason,
            profiles (full_name, phone_number),
            branches (name_uz, name_ru, address_uz, address_ru, location_link),
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
