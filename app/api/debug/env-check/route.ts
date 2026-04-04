import { NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const checks = {
        TELEGRAM_BOT_TOKEN: {
            exists: !!process.env.TELEGRAM_BOT_TOKEN,
            length: process.env.TELEGRAM_BOT_TOKEN?.length || 0,
            prefix: process.env.TELEGRAM_BOT_TOKEN ? (process.env.TELEGRAM_BOT_TOKEN.substring(0, 5) + '...') : 'N/A',
            formatValid: /^\d+:[\w-]+$/.test(process.env.TELEGRAM_BOT_TOKEN || '')
        },
        SUPABASE_SERVICE_ROLE_KEY: {
            exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
            prefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? (process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 3) + '...') : 'N/A'
        },
        NEXT_PUBLIC_SUPABASE_URL: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            value: process.env.NEXT_PUBLIC_SUPABASE_URL
        },
        NEXT_PUBLIC_APP_URL: {
            exists: !!process.env.NEXT_PUBLIC_APP_URL,
            value: process.env.NEXT_PUBLIC_APP_URL
        },
        NODE_ENV: process.env.NODE_ENV
    };

    return NextResponse.json({
        message: 'Auth Configuration Check',
        timestamp: new Date().toISOString(),
        checks
    });
}
