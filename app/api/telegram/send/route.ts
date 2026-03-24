import { NextRequest, NextResponse } from 'next/server';


interface OrderNotification {
    orderId: string;
    customerName: string;
    customerPhone: string;
    address: string;
    locationUrl?: string;
    deliveryDate: string;
    deliverySlot: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        portion?: string;
    }>;
    comment?: string;
    total: number;
}

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    try {
        const body: OrderNotification = await request.json();
        const { orderId, customerName, customerPhone, address, locationUrl, deliveryDate, deliverySlot, items, comment, total } = body;

        // Build the message
        let displayAddress = address;
        if (locationUrl) {
            displayAddress = `[${address}](${locationUrl})`;
        }

        let messageText = `🍰 *YANGI BUYURTMA* #${orderId.slice(0, 8)}\n\n`;
        messageText += `👤 *Mijoz:* ${customerName}\n`;
        messageText += `📞 *Telefon:* +${customerPhone}\n\n`;
        messageText += `📍 *Manzil:* ${displayAddress}\n`;
        messageText += `📅 *Vaqt:* ${deliveryDate}, ${deliverySlot}\n\n`;

        messageText += `🛒 *Mahsulotlar:*\n`;
        items.forEach(item => {
            const portionText = item.portion ? ` (${item.portion})` : '';
            messageText += `  • ${item.quantity}x ${item.name}${portionText} - ${item.price.toLocaleString()} so'm\n`;
        });

        if (comment) {
            messageText += `\n💬 *Izoh:* "${comment}"\n`;
        }

        messageText += `\n💰 *Jami:* ${total.toLocaleString()} so'm`;

        // Inline keyboard with action buttons
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Tasdiqlash', callback_data: `confirm_${orderId}` },
                    { text: '❌ Bekor qilish', callback_data: `cancel_${orderId}` }
                ]
            ]
        };

        // Send message to Telegram
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            })
        });

        const result = await response.json();

        if (!result.ok) {
            console.error('Telegram API Error:', result);
            return NextResponse.json({ error: 'Failed to send Telegram message', details: result }, { status: 500 });
        }

        // Store telegram message ID in order for future status updates
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from('orders').update({
                telegram_message_id: result.result.message_id,
                telegram_chat_id: TELEGRAM_CHAT_ID
            }).eq('id', body.orderId);
        } catch (err) {
            console.error('Failed to store telegram message ID:', err);
        }

        return NextResponse.json({ success: true, message_id: result.result.message_id });

    } catch (error) {
        console.error('Telegram send error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
