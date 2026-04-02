import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FavoriteSchema = z.object({
    productId: z.string().uuid(),
});

/**
 * GET /api/user/favorites
 * Fetch user's favorite product IDs
 */
export async function GET(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const { data, error } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({
            favorites: data?.map(f => f.product_id) || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/user/favorites
 * Add product to favorites
 */
export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = FavoriteSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid product id', details: parsed.error.flatten() }, { status: 400 });
        }
        const { productId } = parsed.data;

        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, product_id: productId });

        if (error) {
            // Ignore duplicate errors
            if (error.code !== '23505') throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/user/favorites
 * Remove product from favorites
 */
export async function DELETE(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = FavoriteSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid product id', details: parsed.error.flatten() }, { status: 400 });
        }
        const { productId } = parsed.data;

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
