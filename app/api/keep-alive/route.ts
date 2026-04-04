import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from('categories').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[keep-alive] DB ping failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
