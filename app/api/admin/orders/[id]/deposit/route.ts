import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { serviceClient } from '@/app/utils/supabase/service';

/**
 * PATCH /api/admin/orders/[id]/deposit
 * Edit the deposit amount on an already-confirmed order.
 * Logs the change with the previous amount for the audit trail.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const headersList = await request.headers;
    const adminName = headersList.get('x-admin-username') || 'System';

    let deposit_amount: number;
    try {
        const body = await request.json();
        deposit_amount = body.deposit_amount;
        if (typeof deposit_amount !== 'number' || !Number.isInteger(deposit_amount) || deposit_amount < 0) {
            return NextResponse.json({ error: 'deposit_amount must be a non-negative integer' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Fetch current deposit to store as previous_amount in the log
    const { data: currentOrder, error: fetchError } = await serviceClient
        .from('orders')
        .select('deposit_amount, total_price, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !currentOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const previousAmount = currentOrder.deposit_amount ?? 0;

    // Build update payload — if the order is cancelled, sync refund_needed with the new deposit amount
    const updatePayload: Record<string, any> = {
        deposit_amount,
        updated_at: new Date().toISOString(),
        last_updated_by_name: adminName
    };
    if (currentOrder.status === 'cancelled') {
        updatePayload.refund_needed = deposit_amount > 0;
    }

    // Update the deposit amount on the order
    const { data: updatedOrder, error: updateError } = await serviceClient
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select('id, deposit_amount, final_payment_amount, total_price, refund_needed, status')
        .single();

    if (updateError) {
        console.error('[Deposit API] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Write audit log entry
    const { error: logError } = await serviceClient.from('order_payment_logs').insert({
        order_id: orderId,
        event_type: 'deposit_edited',
        amount: deposit_amount,
        previous_amount: previousAmount,
        recorded_by_name: adminName
    });

    if (logError) {
        console.error('[Deposit API] Log insert error:', logError);
        // Non-fatal — the deposit was saved, just log the error
    }

    return NextResponse.json({ success: true, order: updatedOrder });
}
