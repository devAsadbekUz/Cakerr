import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    try {
        const { data, error } = await serviceClient
            .from('order_logs')
            .select('*')
            .eq('order_id', id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[Admin Order Logs] Fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ logs: data });
    } catch (err: any) {
        console.error('[Admin Order Logs] Fatal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
