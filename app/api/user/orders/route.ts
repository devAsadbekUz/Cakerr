import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Helper: Get user ID from session token
 */
async function getUserFromToken(token: string): Promise<string | null> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session } = await supabase
        .from('telegram_sessions')
        .select('profile_id')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    return session?.profile_id || null;
}

/**
 * GET /api/user/orders
 * Fetch user's orders with items
 */
export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserFromToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (image_url, title)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ orders: data });
    } catch (error: any) {
        console.error('[Orders API] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/user/orders
 * Create new order with items
 */
export async function POST(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserFromToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { order, items } = await request.json();

        // Create order with user_id
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                ...order,
                user_id: userId,
                status: 'new'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        if (items && items.length > 0) {
            const orderItems = items.map((item: any) => ({
                ...item,
                order_id: orderData.id
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;
        }

        console.log('[Orders API] Order created:', orderData.id, 'for user:', userId);

        return NextResponse.json({ order: orderData });
    } catch (error: any) {
        console.error('[Orders API] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
