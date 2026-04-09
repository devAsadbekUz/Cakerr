import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { serviceClient } from '@/app/utils/supabase/service';
import { notifyCustomerPaymentReceived } from '@/app/services/telegramNotificationService';

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

    let payment_increment: number;
    try {
        const body = await request.json();
        payment_increment = body.payment_increment;
        if (typeof payment_increment !== 'number' || !Number.isInteger(payment_increment)) {
            return NextResponse.json({ error: 'payment_increment must be an integer' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Fetch current deposit to calculate new total
    const { data: currentOrder, error: fetchError } = await serviceClient
        .from('orders')
        .select(`
            deposit_amount, 
            final_payment_amount, 
            total_price, 
            status,
            client_tg_message_id,
            profiles (telegram_id, tg_lang)
        `)
        .eq('id', orderId)
        .single();

    if (fetchError || !currentOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const previousAmount = currentOrder.deposit_amount ?? 0;
    const newTotal = previousAmount + payment_increment;

    // Build update payload
    const updatePayload: Record<string, any> = {
        deposit_amount: newTotal,
        updated_at: new Date().toISOString(),
        last_updated_by_name: adminName
    };
    if (currentOrder.status === 'cancelled') {
        updatePayload.refund_needed = newTotal > 0;
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

    // Write primary audit log entry as 'payment_added'
    const { error: logError } = await serviceClient.from('order_payment_logs').insert({
        order_id: orderId,
        event_type: 'payment_added',
        amount: payment_increment,
        previous_amount: previousAmount, // context only
        recorded_by_name: adminName
    });

    if (logError) {
        console.error('[Deposit API] Log insert error:', logError);
    }

    // Notify Customer about the payment
    try {
        // Pass the re-fetched order object so notice function has profile info
        await notifyCustomerPaymentReceived(orderId, payment_increment, {
            ...currentOrder,
            deposit_amount: newTotal // use the updated total for display
        });
    } catch (notifErr) {
        console.error('[Deposit API] Notify error:', notifErr);
    }

    return NextResponse.json({ success: true, order: updatedOrder });
}
