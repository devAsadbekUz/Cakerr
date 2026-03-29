import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseLang } from '@/app/utils/orderConfig';

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
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
