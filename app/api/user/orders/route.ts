import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';
import { uploadBase64Image } from '@/app/utils/supabase/storageUtils';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CreateOrderSchema = z.object({
    order: z.object({
        delivery_address: z.object({
            street: z.string().min(1),
            lat: z.number().nullable().optional(),
            lng: z.number().nullable().optional(),
        }),
        delivery_time: z.string(),
        delivery_slot: z.string(),
        total_price: z.number().min(0),
        comment: z.string().optional().nullable(),
        delivery_type: z.enum(['delivery', 'pickup']),
        branch_id: z.string().uuid().nullable().optional(),
        payment_method: z.enum(['cash', 'card']).optional(),
        promo_discount: z.number().optional(),
    }).passthrough(),
    items: z.array(z.object({
        product_id: z.string().uuid().nullable(),
        name: z.string(),
        quantity: z.number().int().min(1),
        unit_price: z.number().min(0),
        configuration: z.any().optional(),
    }).passthrough()).min(1),
    coins_spent: z.number().int().min(0).default(0),
    promo_code_id: z.string().uuid().optional().nullable(),
}).refine((data) => {
    if (data.order.delivery_type === 'delivery') {
        const addr = data.order.delivery_address;
        return addr && typeof addr.lat === 'number' && typeof addr.lng === 'number';
    }
    return true;
}, {
    message: "Delivery orders must include valid latitude and longitude coordinates",
    path: ["order", "delivery_address"]
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

    const supabase = supabaseService;

    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, status, total_price, delivery_time, delivery_slot,
                created_at, comment, delivery_address, coins_spent,
                order_items (
                    id, name, quantity, unit_price, configuration,
                    products (image_url, title)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Strip only the heavy base64 drawing field — all other config fields are kept
        const safeData = data?.map(order => ({
            ...order,
            order_items: order.order_items?.map((item: any) => {
                if (item.configuration?.drawing?.startsWith('data:image')) {
                    const { drawing, ...rest } = item.configuration;
                    return { ...item, configuration: rest };
                }
                return item;
            })
        }));

        return NextResponse.json({ orders: safeData });
    } catch (error: any) {
        console.error('[Orders API] GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = CreateOrderSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid order data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { order, items, coins_spent, promo_code_id } = parsed.data;

        // 1. Intercept Base64 strings and upload them to Storage before saving to DB
        // All uploads run in parallel across all items
        if (items && items.length > 0) {
            const uploadTasks: Promise<void>[] = [];
            for (const item of items) {
                if (!item.configuration) continue;
                
                // Support multiple possible photo keys from different builder modes
                const photoKeys = ['uploaded_photo_url', 'photo_ref', 'photoRef'];
                
                // 1. Process individual keys
                for (const key of photoKeys) {
                    if (item.configuration[key]?.startsWith('data:image')) {
                        uploadTasks.push(
                            uploadBase64Image(supabase, item.configuration[key], userId, 'photo')
                                .then(url => { if (url) item.configuration[key] = url; })
                        );
                    }
                }

                // 2. Process photo_refs array (New implementation)
                if (Array.isArray(item.configuration.photo_refs)) {
                    item.configuration.photo_refs.forEach((ref: any, idx: number) => {
                        if (typeof ref === 'string' && ref.startsWith('data:image')) {
                            uploadTasks.push(
                                uploadBase64Image(supabase, ref, userId, `photo_${idx}`)
                                    .then(url => { 
                                        if (url && item.configuration.photo_refs) {
                                            item.configuration.photo_refs[idx] = url;
                                        }
                                    })
                            );
                        }
                    });
                }

                if (item.configuration.drawing?.startsWith('data:image')) {
                    uploadTasks.push(
                        uploadBase64Image(supabase, item.configuration.drawing, userId, 'drawing')
                            .then(url => { if (url) item.configuration.drawing = url; })
                    );
                }
            }
            if (uploadTasks.length > 0) await Promise.all(uploadTasks);
        }

        /* --- OPTIMIZED ATOMIC CHECKOUT (V2) --- */
        const { data: orderData, error: rpcError } = await supabase.rpc('create_order_v2', {
            p_user_id: userId,
            p_order_data: order,
            p_items: items,
            p_coins_spent: coins_spent,
            p_promo_code_id: promo_code_id || null
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
        return NextResponse.json({ error: error.message || 'Order creation failed' }, { status: 500 });
    }
}
