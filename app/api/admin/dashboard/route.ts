import { NextResponse } from 'next/server';
import { fetchAdminDashboardData } from '@/app/(admin)/admin/dashboard-data';
import { isAdminVerified } from '@/app/utils/admin-auth';

export async function GET(request: Request) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const rawDays = searchParams.get('days');
        const days = rawDays === 'all'
            ? null
            : rawDays
                ? parseInt(rawDays, 10)
                : 30;
        const data = await fetchAdminDashboardData(days !== null && Number.isNaN(days) ? 30 : days);

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('[Admin Dashboard API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
