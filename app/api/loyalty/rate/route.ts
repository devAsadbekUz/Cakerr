import { NextResponse } from 'next/server';
import { serviceClient } from '@/app/utils/supabase/service';

// Cache the rate in memory — it almost never changes
let cachedRate: number | null = null;
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
    if (cachedRate !== null && Date.now() - cachedAt < TTL_MS) {
        return NextResponse.json({ rate: cachedRate });
    }

    const { data } = await serviceClient
        .from('app_settings')
        .select('value')
        .eq('key', 'loyalty_rate')
        .single();

    const raw = data?.value;
    const rate = raw != null ? parseFloat(String(raw)) : 0.05;
    cachedRate = isFinite(rate) && rate > 0 ? rate : 0.05;
    cachedAt = Date.now();

    return NextResponse.json({ rate: cachedRate });
}
