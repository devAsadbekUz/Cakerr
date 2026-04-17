import { NextRequest, NextResponse } from 'next/server';
import { getTelegramButtons, buildOrderMessage, resolveOrderLanguage } from '@/app/utils/orderConfig';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { notifyCustomerStatusChange } from '@/app/services/telegramNotificationService';
import { serviceClient } from '@/app/utils/supabase/service';

// Cache admin_tg_lang for 5 minutes — it almost never changes
let cachedAdminLang: string | null = null;
let adminLangCachedAt = 0;
const ADMIN_LANG_TTL_MS = 5 * 60 * 1000;

async function getAdminTgLang(): Promise<string | null> {
    if (cachedAdminLang !== null && Date.now() - adminLangCachedAt < ADMIN_LANG_TTL_MS) {
        return cachedAdminLang;
    }
    const { data } = await serviceClient
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_tg_lang')
        .single();
    cachedAdminLang = data?.value ?? null;
    adminLangCachedAt = Date.now();
    return cachedAdminLang;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const {
        status: newStatus,
        lang = 'uz',
        cancellation_reason,
        deposit_amount,
        final_payment_amount,
    } = await request.json();

    if (!orderId || !newStatus) {
        return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    try {
        const headersList = await request.headers;
        const adminName = headersList.get('x-admin-username') || 'System';

        // ── Fetch current order to validate payment amounts ───────────────────
        const { data: currentOrder, error: fetchError } = await serviceClient
            .from('orders')
            .select('total_price, deposit_amount, status')
            .eq('id', orderId)
            .single();

        if (fetchError || !currentOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // ── Validate final payment amount on completion ───────────────────────
        if (newStatus === 'completed' && final_payment_amount !== undefined) {
            const remaining = currentOrder.total_price - (currentOrder.deposit_amount ?? 0);
            if (final_payment_amount !== remaining) {
                return NextResponse.json(
                    { error: `Final payment must equal remaining balance: ${remaining} so'm` },
                    { status: 400 }
                );
            }
        }

        // ── Build order update payload ────────────────────────────────────────
        const updatePayload: Record<string, any> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
            last_updated_by_name: adminName
        };

        if (newStatus === 'cancelled' && cancellation_reason) {
            updatePayload.cancellation_reason = cancellation_reason;
        }

        // Set refund_needed when cancelling an order that had a deposit
        if (newStatus === 'cancelled' && (currentOrder.deposit_amount ?? 0) > 0) {
            updatePayload.refund_needed = true;
        }

        // Record deposit when confirming
        if (newStatus === 'confirmed' && deposit_amount !== undefined) {
            updatePayload.deposit_amount = deposit_amount;
        }

        // Record final payment when completing
        if (newStatus === 'completed' && final_payment_amount !== undefined) {
            updatePayload.final_payment_amount = final_payment_amount;
        }

        // ── Update order ──────────────────────────────────────────────────────
        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            .select(`
                id,
                status,
                total_price,
                deposit_amount,
                final_payment_amount,
                refund_needed,
                telegram_message_id,
                telegram_chat_id,
                client_tg_message_id,
                delivery_address,
                delivery_time,
                delivery_slot,
                delivery_type,
                branch_id,
                comment,
                payment_method,
                coins_spent,
                promo_discount,
                created_by_name,
                user_id,
                profiles (full_name, phone_number, telegram_id, tg_lang),
                branches (name_uz, name_ru, address_uz, address_ru, location_link),
                order_items (*)
            `)
            .single();

        if (updateError) {
            console.error('[Admin Orders Status API] Update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // ── Write payment log entry ───────────────────────────────────────────
        if (newStatus === 'confirmed' && deposit_amount !== undefined) {
            await serviceClient.from('order_payment_logs').insert({
                order_id: orderId,
                event_type: 'deposit_recorded',
                amount: deposit_amount,
                previous_amount: null,
                recorded_by_name: adminName
            });
        }

        if (newStatus === 'completed' && final_payment_amount !== undefined) {
            await serviceClient.from('order_payment_logs').insert({
                order_id: orderId,
                event_type: 'final_payment_recorded',
                amount: final_payment_amount,
                previous_amount: null,
                recorded_by_name: adminName
            });
        }

        // ── Sync to Telegram ──────────────────────────────────────────────────
        try {
            // CENTRALIZED SYNC: This handles both Admin Group update AND Customer notify logic if needed
            const { updateAdminOrderMessage } = await import('@/app/services/telegramNotificationService');
            await updateAdminOrderMessage(orderId);
            
            // Still notify customer separately as that handles private chat logic
            await notifyCustomerStatusChange(orderId, newStatus, order);

            // Task C: Heal delivery_address.lang if missing (Safety check)
            const deliveryAddr = (order.delivery_address || {}) as any;
            const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
            if (needsHealing) {
                const healedAddress = typeof deliveryAddr === 'string'
                    ? { street: deliveryAddr, lang: lang }
                    : { ...deliveryAddr, lang: lang };
                await serviceClient.from('orders').update({ delivery_address: healedAddress }).eq('id', orderId);
            }
        } catch (syncErr) {
            console.error('[AdminStatusSync] Sync Error:', syncErr);
        }

        return NextResponse.json({ success: true, order });
    } catch (error: any) {
        console.error('[Admin Orders Status API] Final Catch error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error',
            details: error.stack
        }, { status: 500 });
    }
}
