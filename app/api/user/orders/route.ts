import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const CreateOrderSchema = z.object({
    order: z.object({
        delivery_address: z.any(),
        delivery_time: z.string(),
        delivery_slot: z.string(),
        total_price: z.number().min(0),
        comment: z.string().optional(),
    }).passthrough(),
    items: z.array(z.object({
        product_id: z.string().uuid().nullable(),
        name: z.string(),
        quantity: z.number().int().min(1),
        unit_price: z.number().min(0),
        configuration: z.any().optional(),
    }).passthrough()).min(1),
    coins_spent: z.number().int().min(0).default(0),
});

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

        // Strip heavy base64 strings from historical orders to keep payload tiny
        const safeData = data?.map(order => {
            const safeItems = order.order_items?.map((item: any) => {
                if (item.configuration) {
                    const conf = { ...item.configuration };
                    if (conf.uploaded_photo_url?.startsWith('data:image')) {
                        conf.uploaded_photo_url = null;
                    }
                    if (conf.drawing?.startsWith('data:image')) {
                        conf.drawing = null;
                    }
                    return { ...item, configuration: conf };
                }
                return item;
            });
            return { ...order, order_items: safeItems };
        });

        return NextResponse.json({ orders: safeData });
    } catch (error: any) {
        console.error('[Orders API] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper function to upload Base64 images to Supabase Storage
async function uploadBase64Image(supabase: any, base64String: string, userId: string, prefix: string): Promise<string | null> {
    try {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `${userId}/${prefix}_${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('custom-cakes')
            .upload(fileName, buffer, { contentType: mimeType, upsert: false });

        if (error) {
            console.error('[Storage Upload Error]', error);
            return null;
        }

        const { data } = supabase.storage.from('custom-cakes').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err) {
        console.error('[Storage Upload Exception]', err);
        return null;
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
        const raw = await request.json();
        const parsed = CreateOrderSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid order data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { order, items, coins_spent } = parsed.data;

        // 1. Intercept Base64 strings and upload them to Storage before saving to DB
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.configuration) {
                    if (item.configuration.uploaded_photo_url?.startsWith('data:image')) {
                        const url = await uploadBase64Image(supabase, item.configuration.uploaded_photo_url, userId, 'photo');
                        if (url) item.configuration.uploaded_photo_url = url;
                    }
                    if (item.configuration.drawing?.startsWith('data:image')) {
                        const url = await uploadBase64Image(supabase, item.configuration.drawing, userId, 'drawing');
                        if (url) item.configuration.drawing = url;
                    }
                }
            }
        }

        /* --- OPTIMIZED ATOMIC CHECKOUT (V2) --- */
        const { data: orderData, error: rpcError } = await supabase.rpc('create_order_v2', {
            p_user_id: userId,
            p_order_data: order,
            p_items: items,
            p_coins_spent: coins_spent
        });

        if (rpcError) {
            console.error('[Orders API] RPC V2 Error:', rpcError);
            throw rpcError;
        }

        return NextResponse.json({ order: orderData });

        /* --- FALLBACK: ORIGINAL MULTI-STEP LOGIC (Commented for safety) ---
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
                .eq('order_id', null)
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

        return NextResponse.json({ order: orderData });
        */
    } catch (error: any) {
        console.error('[Orders API] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
