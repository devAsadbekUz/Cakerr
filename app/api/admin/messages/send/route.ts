import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate-limit delay between Telegram messages (ms)
const SEND_DELAY_MS = 35;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        const { recipientType, recipientId, segmentFilter, messageText } = await request.json();

        if (!messageText || !recipientType) {
            return NextResponse.json({ error: 'Missing messageText or recipientType' }, { status: 400 });
        }

        if (messageText.length > 4096) {
            return NextResponse.json({ error: 'Message too long (max 4096 characters)' }, { status: 400 });
        }

        // Resolve recipients based on type
        let recipients: { id: string; telegram_id: number; full_name: string | null }[] = [];

        if (recipientType === 'individual') {
            if (!recipientId) {
                return NextResponse.json({ error: 'recipientId required for individual messages' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, telegram_id, full_name')
                .eq('id', recipientId)
                .not('telegram_id', 'is', null)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Recipient not found or has no Telegram ID' }, { status: 404 });
            }

            recipients = [data];
        } else if (recipientType === 'broadcast') {
            // All users with a telegram_id
            const { data, error } = await supabase
                .from('profiles')
                .select('id, telegram_id, full_name')
                .not('telegram_id', 'is', null);

            if (error) {
                return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
            }

            recipients = data || [];
        } else if (recipientType === 'segment') {
            // Build query based on segment filter
            let query = supabase
                .from('profiles')
                .select('id, telegram_id, full_name')
                .not('telegram_id', 'is', null);

            if (segmentFilter?.hasOrdered) {
                // Get user IDs who have placed orders
                const { data: orderUsers } = await supabase
                    .from('orders')
                    .select('user_id')
                    .not('user_id', 'is', null);

                const userIds = [...new Set((orderUsers || []).map(o => o.user_id))];
                if (userIds.length > 0) {
                    query = query.in('id', userIds);
                } else {
                    recipients = [];
                }
            }

            if (recipients.length === 0 && segmentFilter?.hasOrdered) {
                // No users matched the segment
            } else {
                const { data, error } = await query;
                if (error) {
                    return NextResponse.json({ error: 'Failed to fetch segment recipients' }, { status: 500 });
                }
                recipients = data || [];
            }
        } else {
            return NextResponse.json({ error: 'Invalid recipientType' }, { status: 400 });
        }

        // Send messages via Telegram Bot API
        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
            try {
                const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: recipient.telegram_id,
                        text: messageText,
                        parse_mode: 'Markdown'
                    })
                });

                const result = await response.json();

                if (result.ok) {
                    successCount++;
                } else {
                    console.error(`[Admin Message] Failed for ${recipient.telegram_id}:`, result.description);
                    failCount++;
                }
            } catch (err) {
                console.error(`[Admin Message] Send error for ${recipient.telegram_id}:`, err);
                failCount++;
            }

            // Rate limiting: avoid Telegram's 30 msg/sec limit
            if (recipients.length > 1) {
                await sleep(SEND_DELAY_MS);
            }
        }

        // Log message to database
        const { error: logError } = await supabase
            .from('admin_messages')
            .insert({
                recipient_type: recipientType,
                recipient_id: recipientType === 'individual' ? recipientId : null,
                recipient_filter: recipientType === 'segment' ? segmentFilter : null,
                message_text: messageText,
                total_recipients: recipients.length,
                successful_sends: successCount,
                failed_sends: failCount
            });

        if (logError) {
            console.error('[Admin Message] Log error:', logError);
        }

        return NextResponse.json({
            success: true,
            total: recipients.length,
            sent: successCount,
            failed: failCount
        });

    } catch (error) {
        console.error('[Admin Message] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
