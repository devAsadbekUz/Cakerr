import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const userId = await getVerifiedUserId(req);
        if (!userId) {
            return NextResponse.json({ error: 'Foydalanuvchi tizimga kirmagan' }, { status: 401 });
        }

        const body = await req.json();
        const { code, subtotal } = body;

        if (!code) {
            return NextResponse.json({ error: 'Promokod kiritilmagan' }, { status: 400 });
        }

        // 1. Fetch promo code
        const { data: promo, error: promoError } = await supabaseAdmin
            .from('promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (promoError || !promo) {
            return NextResponse.json({ error: 'promoErrNotFound' }, { status: 404 });
        }

        if (!promo.is_active) {
            return NextResponse.json({ error: 'promoErrInactive' }, { status: 400 });
        }

        // NEW: Check Expiration
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return NextResponse.json({ error: 'promoErrGeneric' }, { status: 400 });
        }

        // 2. Validate Global Limit
        if (promo.max_global_uses !== null && promo.total_uses >= promo.max_global_uses) {
            return NextResponse.json({ error: 'promoErrGlobalLimit' }, { status: 400 });
        }

        // 3. Validate Minimum Order Subtotal
        if (promo.min_order_amount > 0 && subtotal !== undefined && subtotal < promo.min_order_amount) {
            return NextResponse.json({ error: 'promoErrMinAmount' }, { status: 400 });
        }

        // 4. Validate First Order Only constraint
        if (promo.is_first_order_only) {
            const { count, error: orderError } = await supabaseAdmin
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed');

            if (orderError) throw orderError;
            if (count && count > 0) {
                return NextResponse.json({ error: 'promoErrFirstOrder' }, { status: 400 });
            }
        }

        // 5. Validate Uses per User
        const { data: usageData, error: usageError } = await supabaseAdmin
            .from('user_promo_usages')
            .select('usage_count')
            .eq('user_id', userId)
            .eq('promo_code_id', promo.id)
            .single();

        if (usageError && usageError.code !== 'PGRST116') {
            throw usageError; // Rethrow unless it's just "not found"
        }

        const currentUsageCount = usageData?.usage_count || 0;
        if (currentUsageCount >= promo.uses_per_user) {
            return NextResponse.json({ error: 'promoErrUserLimit' }, { status: 400 });
        }

        // 6. Valid! Return necessary discount details.
        return NextResponse.json({
            id: promo.id,
            discount_amount: promo.discount_amount,
            code: promo.code
        });

    } catch (error: any) {
        console.error('[Promo Validate API] error:', error);
        return NextResponse.json({ error: 'Xatolik yuz berdi' }, { status: 500 });
    }
}
