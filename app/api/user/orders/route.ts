import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

/**
 * GET /api/user/orders
 * Fetch user's orders with items
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

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { order, items, coins_spent = 0 } = await request.json();

        // 1. If coins being spent, verify and deduct
        if (coins_spent > 0) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', userId)
                .single();

            if (profileError || !profile) throw new Error('Could not verify coin balance');
            if (profile.coins < coins_spent) {
                return NextResponse.json({ error: 'InSufficient coins balance' }, { status: 400 });
            }

            // Deduct coins
            const { error: deductError } = await supabase
                .rpc('deduct_coins', { p_user_id: userId, p_amount: coins_spent });

            // If RPC doesn't exist yet, we'll use a manual update (trigger will handle transactions if we added it, but let's be careful)
            // Actually, let's use a manual update for now to be safe, or I'll add the RPC to the migration.
            // Let's add the RPC to a new migration or update the existing one.
            // For now, I'll do a manual update + transaction insert.

            if (deductError) {
                const { error: manualError } = await supabase
                    .from('profiles')
                    .update({ coins: profile.coins - coins_spent })
                    .eq('id', userId);

                if (manualError) throw manualError;

                await supabase.from('coin_transactions').insert({
                    user_id: userId,
                    amount: -coins_spent,
                    type: 'spend',
                    description: `Spent on order checkout`
                });
            }
        }

        // 2. Create order with user_id and coins_spent
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                ...order,
                user_id: userId,
                status: 'new',
                coins_spent: coins_spent
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Update transaction with order_id if we created it
        if (coins_spent > 0) {
            await supabase
                .from('coin_transactions')
                .update({ order_id: orderData.id })
                .eq('user_id', userId)
                .eq('type', 'spend')
                .eq('order_id', null) // Target the one we just inserted
                .order('created_at', { ascending: false })
                .limit(1);
        }

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
