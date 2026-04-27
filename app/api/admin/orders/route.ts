import { NextResponse } from 'next/server';
import { fetchAdminOrderSummaries, fetchAdminOrders } from '@/app/(admin)/admin/orders/orders-data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawDays = searchParams.get('days');
        const days = rawDays ? parseInt(rawDays, 10) : null;
        const rawLimit = searchParams.get('limit');
        const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
        const summary = searchParams.get('summary') === '1';
        const statusGroup = searchParams.get('status') as 'active' | 'history' | null;

        const orders = summary
            ? await fetchAdminOrderSummaries(Number.isNaN(days) ? null : days, Number.isNaN(limit) ? undefined : limit, statusGroup)
            : await fetchAdminOrders(Number.isNaN(days) ? null : days, Number.isNaN(limit) ? undefined : limit, statusGroup);

        return NextResponse.json(
            { orders },
            {
                headers: {
                    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }
        );
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('[Admin Orders API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
