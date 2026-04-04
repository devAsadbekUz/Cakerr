import { NextRequest, NextResponse } from 'next/server';
import { parseLang } from '@/app/utils/orderConfig';
import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';

export async function GET() {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { data } = await serviceClient
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_tg_lang')
            .single();

        // Use the same robust parsing as the bot
        const cleanLang = parseLang(data?.value);
        return NextResponse.json({ lang: cleanLang });
    } catch (error) {
        return NextResponse.json({ lang: 'uz' });
    }
}

export async function POST(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { lang } = await request.json();
        
        await serviceClient
            .from('app_settings')
            .upsert({ 
                key: 'admin_tg_lang', 
                value: lang, // Supabase handles string vs object for JSONB correctly
                updated_at: new Date().toISOString()
            });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
