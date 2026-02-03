import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

/**
 * GET /api/user/orders/[id]
 * Fetch a specific order securely
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getVerifiedUserId(request);
    const { id: orderId } = await params;

    console.log(`[Order Detail API] Requesting order ${orderId} for user ${userId}`);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Query by ID first to see if it even exists
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
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            console.error(`[Order Detail API] Order ${orderId} NOT FOUND in database.`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check if it belongs to the user
        if (data.user_id !== userId) {
            console.error(`[Order Detail API] SECURITY MISMATCH: Order ${orderId} belongs to user ${data.user_id}, but requested by ${userId}`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 }); // Keep 404 for security (don't leak existence)
        }

        return NextResponse.json({ order: data });
    } catch (error: any) {
        console.error('[Order Detail API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
