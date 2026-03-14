import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getStatusConfig, getTelegramButtons, buildOrderMessage } from '@/app/utils/orderConfig';

// Service Role client
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { status: newStatus } = await request.json();

    if (!orderId || !newStatus) {
        return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    try {
        // 1. Update Order Status and Fetch Details in one atomic step (to avoid double fetching)
        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select(`
                id,
                telegram_message_id, 
                telegram_chat_id, 
                client_tg_message_id,
                delivery_address, 
                delivery_time, 
                delivery_slot,
                total_price,
                comment,
                user_id,
                profiles (full_name, phone_number, telegram_id),
                order_items (*)
            `)
            .single();

        if (updateError) {
            console.error('[Admin Orders Status API] Update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 2. Trigger Telegram Sync (Backgrounded / Parallelized)
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (TELEGRAM_BOT_TOKEN) {
            const syncPromise = (async () => {
                const statusConfig = getStatusConfig(newStatus);
                const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;

                const tasks = [];

                // Task A: Update Admin Group Message (Edit existing)
                if (order.telegram_message_id && order.telegram_chat_id) {
                    const messageText = buildOrderMessage(order, statusConfig.tgLabel);
                    const inline_keyboard = getTelegramButtons(newStatus, orderId);
                    
                    tasks.push(fetch(`${TELEGRAM_API}/editMessageText`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: order.telegram_chat_id,
                            message_id: order.telegram_message_id,
                            text: messageText,
                            parse_mode: 'Markdown',
                            reply_markup: { inline_keyboard }
                        })
                    }).then(r => r.json()));
                }

                // Task B: Status Update for Client (Delete & Re-send strategy)
                if (profile?.telegram_id) {
                    // 1. Delete previous message if it exists
                    if (order.client_tg_message_id) {
                        tasks.push(fetch(`${TELEGRAM_API}/deleteMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: profile.telegram_id,
                                message_id: order.client_tg_message_id
                            })
                        }).catch(err => console.error('[Admin Orders Status API] Delete client msg error:', err)));
                    }

                    // 2. If not terminal (confirmed, preparing, ready, delivering), send new ping
                    // If terminal (completed, cancelled), we just leave it deleted (or could send a final receipt)
                    const isTerminal = ['completed', 'cancelled'].includes(newStatus);
                    if (!isTerminal) {
                        const clientMessage = `🍰 *Buyurtma holati yangilandi*\n\nHurmatli mijoz, sizning #${order.id.slice(0,8)} raqamli buyurtmangiz holati o'zgardi:\n\n*${statusConfig.label}*\n_${statusConfig.desc}_`;
                        
                        const sendNewMsg = async () => {
                            const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: profile.telegram_id,
                                    text: clientMessage,
                                    parse_mode: 'Markdown'
                                })
                            });
                            const result = await res.json();
                            if (result.ok) {
                                // Save new message ID for next cleanup
                                await serviceClient
                                    .from('orders')
                                    .update({ client_tg_message_id: result.result.message_id })
                                    .eq('id', orderId);
                            }
                        };
                        tasks.push(sendNewMsg());
                    } else {
                        // If it's the final step, clear the tracking ID from DB
                        tasks.push(serviceClient
                            .from('orders')
                            .update({ client_tg_message_id: null })
                            .eq('id', orderId));
                    }
                }

                await Promise.all(tasks).catch(err => console.error('[Admin Orders Status API] Parallel Sync error:', err));
            })();

            // In Next.js App Router, we can't reliably fire-and-forget without a queue, 
            // but for simple bot calls, parallelizing and then responding is enough.
            // If you want it even faster, you could remove the 'await' from syncPromise
            // but for reliability let's parallelize.
            await syncPromise; 
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
