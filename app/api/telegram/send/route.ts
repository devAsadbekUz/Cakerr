import { NextRequest, NextResponse } from 'next/server';
import { buildOrderMessage, getTelegramButtons, resolveOrderLanguage } from '@/app/utils/orderConfig';
import fs from 'fs';

function debugLog(data: any) {
    try {
        const logPath = '/tmp/telegram_debug.log';
        const entry = `[${new Date().toISOString()}] ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
        fs.appendFileSync(logPath, entry);
    } catch (err) {
        // Fallback to console if file write fails
        console.log('[debugLog Error]', err);
    }
}

export async function POST(request: NextRequest) {
    debugLog('--- NEW TELEGRAM SEND REQUEST ---');
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    try {
        const body = await request.json();
        debugLog({ body });

        const { 
            orderId, items = [], total = 0, 
            customerName = 'Noma\'lum', customerPhone = 'Noma\'lum', 
            address = 'Noma\'lum', locationUrl = '', 
            deliveryDate = '', deliverySlot = '', 
            comment = '', lang: customerLang = 'uz' 
        } = body;

        if (!orderId) {
            debugLog('Error: Missing orderId');
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Fetch Administrative Preference for the Telegram Group
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: adminSettings, error: settingsError } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_tg_lang')
            .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
            debugLog({ settingsError });
        }

        const finalLang = resolveOrderLanguage({
            adminPreferredLang: adminSettings?.value,
            fallbackLang: customerLang
        });

        debugLog({ finalLang, adminSettingsValue: adminSettings?.value, customerLang });

        // Safely extract lat/lng
        let lat = null, lng = null;
        if (locationUrl && locationUrl.includes('q=')) {
            const coords = locationUrl.split('q=')[1]?.split(',');
            lat = coords?.[0];
            lng = coords?.[1];
        }

        // Mock an order object for buildOrderMessage
        const mockOrder = {
            id: orderId,
            status: 'new',
            total_price: total,
            comment: comment || '',
            delivery_address: { street: address, lat, lng },
            delivery_time: deliveryDate,
            delivery_slot: deliverySlot,
            profiles: { full_name: customerName, phone_number: customerPhone },
            order_items: Array.isArray(items) ? items.map((item: any) => ({
                name: item.name || 'Mahsulot',
                quantity: item.quantity || 1,
                unit_price: item.price || 0,
                configuration: { portion: item.portion || '' }
            })) : []
        };

        const messageText = buildOrderMessage(mockOrder, finalLang);
        const inline_keyboard = getTelegramButtons('new', orderId, finalLang);

        debugLog({ messageText, TELEGRAM_CHAT_ID });

        // Send message to Telegram
        const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            })
        });

        const result = await tgRes.json();
        debugLog({ tgResult: result });

        if (!result.ok) {
            debugLog('Telegram Send Failed');
            return NextResponse.json({ error: 'Telegram API Error', details: result }, { status: 502 });
        }

        // Update order with telegram message ID and language context
        try {
            // First, get the current state to avoid overwriting delivery_address details
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('delivery_address')
                .eq('id', orderId)
                .single();

            let finalAddress: any = {};
            if (existingOrder?.delivery_address) {
                if (typeof existingOrder.delivery_address === 'string') {
                    finalAddress = { street: existingOrder.delivery_address };
                } else {
                    finalAddress = { ...existingOrder.delivery_address };
                }
            } else {
                finalAddress = typeof address === 'string' ? { street: address } : (address || {});
            }

            // Set the language context definitively
            finalAddress.lang = finalLang;
            
            const { error: updateError } = await supabase.from('orders').update({
                telegram_message_id: result.result.message_id,
                telegram_chat_id: TELEGRAM_CHAT_ID,
                delivery_address: finalAddress
            }).eq('id', orderId);

            if (updateError) debugLog({ dbUpdateError: updateError });
        } catch (err) {
            debugLog({ dbUpdateException: err });
        }

        return NextResponse.json({ success: true, message_id: result.result.message_id });

    } catch (error: any) {
        debugLog({ fatalError: error.message, stack: error.stack });
        return NextResponse.json({ 
            error: 'Internal server error', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}
