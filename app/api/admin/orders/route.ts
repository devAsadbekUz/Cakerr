import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Service Role client - module-level singleton for performance
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// INSTANT admin check - just reads header set by middleware
async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}

export async function GET() {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error } = await serviceClient
        .from('orders')
        .select(`
            *,
            profiles (full_name, phone_number),
            order_items (
                *,
                products (image_url)
            )
        `)
        .order('delivery_time', { ascending: true });

    if (error) {
        console.error('[Admin Orders API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders });
}
