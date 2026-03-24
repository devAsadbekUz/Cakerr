import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const CartItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).optional().default(1),
    portion: z.string().optional().default(''),
    flavor: z.string().optional().default(''),
    custom_note: z.string().optional(),
    configuration: z.any().optional(),
});

const UpdateCartItemSchema = z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).optional(),
    custom_note: z.string().optional(),
    configuration: z.any().optional(),
});

const DeleteCartItemSchema = z.object({
    id: z.string().uuid().optional(),
    clearAll: z.boolean().optional(),
});

/**
 * Backend API for Cart management.
 * Optimized for Telegram Mini App and standard Web clients.
 */

export async function GET(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data: items, error } = await supabase
            .from('cart_items')
            .select(`
                *,
                products (
                    title,
                    base_price,
                    image_url
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map the joined data to a flatter structure if needed, or return as is
        return NextResponse.json({ cart: items || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const raw = await request.json();
        const parsed = CartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid cart item data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { product_id, quantity, portion, flavor, custom_note, configuration } = parsed.data;

        // Check if item already exists to merge quantity (Skip for custom cakes)
        let existing = null;
        if (product_id !== '00000000-0000-0000-0000-000000000000') {
            const { data } = await supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', userId)
                .eq('product_id', product_id)
                .eq('portion', portion || '')
                .eq('flavor', flavor || '')
                .maybeSingle();
            existing = data;
        }

        if (existing) {
            const { data: updated, error } = await supabase
                .from('cart_items')
                .update({ 
                    quantity: existing.quantity + quantity,
                    custom_note,
                    configuration
                })
                .eq('id', existing.id)
                .select(`
                    *,
                    products (
                        title,
                        base_price,
                        image_url
                    )
                `)
                .single();
            if (error) throw error;
            return NextResponse.json({ item: updated });
        } else {
            const { data: inserted, error } = await supabase
                .from('cart_items')
                .insert({
                    user_id: userId,
                    product_id,
                    quantity,
                    portion,
                    flavor,
                    custom_note,
                    configuration
                })
                .select(`
                    *,
                    products (
                        title,
                        base_price,
                        image_url
                    )
                `)
                .single();
            if (error) throw error;
            return NextResponse.json({ item: inserted });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const raw = await request.json();
        const parsed = UpdateCartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid update data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id, quantity, configuration, custom_note } = parsed.data;

        const { data: updated, error } = await supabase
            .from('cart_items')
            .update({ quantity, configuration, custom_note })
            .eq('id', id)
            .eq('user_id', userId)
            .select(`
                *,
                products (
                    title,
                    base_price,
                    image_url
                )
            `)
            .single();

        if (error) throw error;
        return NextResponse.json({ item: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const userId = await getVerifiedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const raw = await request.json();
        const parsed = DeleteCartItemSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid delete data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id, clearAll } = parsed.data;

        if (clearAll) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', userId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
