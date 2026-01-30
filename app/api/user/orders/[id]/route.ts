import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

/**
 * GET /api/user/orders/[id]
 * Fetch a specific order securely
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const userId = await getVerifiedUserId(request);
    const orderId = params.id;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            .eq('id', orderId)
            .eq('user_id', userId) // Security: Ensure it belongs to the user
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        return NextResponse.json({ order: data });
    } catch (error: any) {
        console.error('[Order Detail API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
