import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

/**
 * GET /api/user/favorites
 * Fetch user's favorite product IDs
 */
export async function GET(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        console.error('[Favorites API] GET error:', error);
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { productId } = await request.json();

        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, product_id: productId });

        if (error) {
            // Ignore duplicate errors
            if (error.code !== '23505') throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Favorites API] POST error:', error);
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { productId } = await request.json();

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Favorites API] DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
