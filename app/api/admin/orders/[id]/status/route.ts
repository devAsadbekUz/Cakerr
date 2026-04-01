import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getStatusConfig, getTelegramButtons, buildOrderMessage, resolveOrderLanguage, parseLang } from '@/app/utils/orderConfig';

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
    const { status: newStatus, lang = 'uz' } = await request.json();

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
                status,
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
                const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;

                // Fetch Global Admin Preference for Telegram Group
                const { data: adminSettings } = await serviceClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'admin_tg_lang')
                    .single();

                // Prioritize language stored in order.delivery_address if available
                const deliveryAddr = (order.delivery_address || {}) as any;

                const tgLang = resolveOrderLanguage({
                    orderSavedLang: deliveryAddr.lang,
                    adminPreferredLang: adminSettings?.value,
                    fallbackLang: lang
                });

                console.log(`[Admin Order Status API] Localization Audit:`, {
                    orderId: orderId,
                    orderSavedValue: deliveryAddr.lang,
                    adminPreferredValue: adminSettings?.value,
                    requestedLang: lang,
                    finalDecision: tgLang
                });
                
                // Healing logic: If language wasn't stored yet, or it's malformed, store it now for consistency
                const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
                
                if (needsHealing) {
                    console.log(`[Admin Order Status API] Healing order ${orderId} with lang ${tgLang}`);
                    let healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr } : { ...deliveryAddr };
                    healedAddress.lang = tgLang;

                    await serviceClient.from('orders').update({
                        delivery_address: healedAddress
                    }).eq('id', orderId);
                }
                
                const statusConfig = getStatusConfig(newStatus);

                const tasks = [];

                // Task A: Update Admin Group Message (Edit existing)
                if (order.telegram_message_id && order.telegram_chat_id) {
                    const messageText = buildOrderMessage(order, tgLang);
                    const inline_keyboard = getTelegramButtons(newStatus, orderId, tgLang);
                    
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

                // Task B: Status Update for Client (Delete old → Send new)
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

                    const clientLabels = {
                        uz: {
                            title: "🍰 *Buyurtma holati yangilandi*",
                            text: `Hurmatli mijoz, sizning #${order.id.slice(0,8)} raqamli buyurtmangiz holati o'zgardi:`
                        },
                        ru: {
                            title: "🍰 *Статус заказа обновлен*",
                            text: `Уважаемый клиент, статус вашего заказа #${order.id.slice(0,8)} изменился:`
                        }
                    }[tgLang];

                    const clientMessage = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${statusConfig.labels[tgLang]}*\n_${statusConfig.descs[tgLang]}_`;

                    if (newStatus === 'cancelled') {
                        // Cancelled: clear tracking, no new message
                        tasks.push(serviceClient
                            .from('orders')
                            .update({ client_tg_message_id: null, client_tg_delete_at: null })
                            .eq('id', orderId));
                    } else {
                        // All other statuses (including completed): send a status message
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
                                const isCompleted = newStatus === 'completed';
                                const deleteAt = isCompleted
                                    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                                    : null;
                                await serviceClient
                                    .from('orders')
                                    .update({
                                        client_tg_message_id: result.result.message_id,
                                        client_tg_delete_at: deleteAt
                                    })
                                    .eq('id', orderId);
                            }
                        };
                        tasks.push(sendNewMsg());
                    }
                }

                await Promise.all(tasks).catch(err => console.error('[Admin Orders Status API] Parallel Sync error:', err));
            })();

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
