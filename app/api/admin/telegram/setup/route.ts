import { NextRequest, NextResponse } from 'next/server';
import { resolveAppUrl } from '@/app/utils/appUrl';

/**
 * POST /api/admin/telegram/setup
 * One-time setup: updates the bot's Chat Menu Button to the current app URL.
 * Call this once after migrating to a new domain.
 *
 * Must be called by the owner (validated via x-admin-verified middleware header).
 */
export async function POST(request: NextRequest) {
    const isAdmin = request.headers.get('x-admin-verified') === 'true';
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
    }

    const appUrl = resolveAppUrl(request.nextUrl.origin);
    if (!appUrl) {
        return NextResponse.json({ error: 'Could not resolve app URL. Set NEXT_PUBLIC_APP_URL.' }, { status: 500 });
    }

    const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

    // Update the global Chat Menu Button for all chats
    const menuRes = await fetch(`${TELEGRAM_API}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            menu_button: {
                type: 'web_app',
                text: '🍰 Buyurtma berish',
                web_app: { url: appUrl }
            }
        })
    });
    const menuResult = await menuRes.json();

    if (!menuResult.ok) {
        return NextResponse.json({ error: 'setChatMenuButton failed', details: menuResult }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        message: `Chat Menu Button updated to ${appUrl}`,
        appUrl
    });
}
