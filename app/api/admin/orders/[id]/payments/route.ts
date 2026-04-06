import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { serviceClient } from '@/app/utils/supabase/service';

/**
 * GET /api/admin/orders/[id]/payments
 * Returns all payment log entries for an order, oldest first.
 * Used by the payment history page.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    const { data: logs, error } = await serviceClient
        .from('order_payment_logs')
        .select('id, event_type, amount, previous_amount, recorded_by_name, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Payments API] Fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also return the order summary so the page can display totals without a second fetch
    const { data: order, error: orderError } = await serviceClient
        .from('orders')
        .select('id, total_price, deposit_amount, final_payment_amount, status, refund_needed')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ logs: logs ?? [], order });
}
