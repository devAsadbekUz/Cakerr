import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Fetch all promos
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ promos: data });
    } catch (error: any) {
        console.error('[Admin Promos GET] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Create a new promo
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            code, discount_amount, uses_per_user, max_global_uses, 
            is_first_order_only, min_order_amount, expires_at 
        } = body;

        // Basic validation
        if (!code || !discount_amount) {
            return NextResponse.json({ error: 'Code and Discount Amount are required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('promo_codes')
            .insert({
                code: code.toUpperCase(),
                discount_amount: parseInt(discount_amount),
                uses_per_user: parseInt(uses_per_user) || 1,
                max_global_uses: max_global_uses ? parseInt(max_global_uses) : null,
                is_first_order_only: !!is_first_order_only,
                min_order_amount: parseInt(min_order_amount) || 0,
                expires_at: expires_at ? new Date(expires_at).toISOString() : null
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Admin Promos POST] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
