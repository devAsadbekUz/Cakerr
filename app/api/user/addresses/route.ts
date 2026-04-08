import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AddressSchema = z.object({
    label: z.string().optional().default(''),
    address_text: z.string().min(1),
    apartment: z.string().optional(),
    entrance: z.string().optional(),
    floor: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    is_default: z.boolean().optional().default(false),
});

const UpdateAddressSchema = z.object({
    id: z.string().uuid(),
    setDefault: z.boolean().optional(),
}).passthrough();

const DeleteAddressSchema = z.object({
    id: z.string().uuid(),
});

/**
 * GET /api/user/addresses
 * Fetch user's saved addresses
 */
export async function GET(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ addresses: data || [] });
    } catch (error: any) {
        console.error('[Addresses API] GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/user/addresses
 * Add new address
 */
export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();

        // Batch insert path: used during guest address migration
        if (Array.isArray(raw)) {
            const parsed = z.array(AddressSchema).safeParse(raw);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Invalid batch data', details: parsed.error.flatten() }, { status: 400 });
            }
            const rows = parsed.data.map(addr => ({ ...addr, user_id: userId }));
            const { data, error } = await supabase
                .from('addresses')
                .insert(rows)
                .select();
            if (error) throw error;
            return NextResponse.json({ addresses: data });
        }

        const parsed = AddressSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid address data', details: parsed.error.flatten() }, { status: 400 });
        }
        const address = parsed.data;

        const { data, error } = await supabase
            .from('addresses')
            .insert({ ...address, user_id: userId })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ address: data });
    } catch (error: any) {
        console.error('[Addresses API] POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/user/addresses
 * Update address (e.g., set as default)
 */
export async function PUT(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = UpdateAddressSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid update data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id, setDefault, ...updates } = parsed.data;

        // Security check: ensure address belongs to user
        const { data: existing } = await supabase
            .from('addresses')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (setDefault) {
            // Unset all defaults for this user
            await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', userId);

            // Set new default
            const { error } = await supabase
                .from('addresses')
                .update({ is_default: true })
                .eq('id', id);

            if (error) throw error;
        } else if (Object.keys(updates).length > 0) {
            const { error } = await supabase
                .from('addresses')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Addresses API] PUT error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/user/addresses
 * Remove address
 */
export async function DELETE(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        const hasHeader = !!request.headers.get('x-telegram-init-data') || !!request.headers.get('X-Telegram-Init-Data');
        const hasAuth = !!request.headers.get('authorization');
        let detail = 'Authentication failed';
        if (!hasHeader && !hasAuth) detail = 'No auth headers';
        else if (!process.env.TELEGRAM_BOT_TOKEN) detail = 'Server Bot Token missing';
        else detail = 'Invalid signature or user not found';

        return NextResponse.json({ error: `Unauthorized: ${detail}` }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = DeleteAddressSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid delete data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { id } = parsed.data;

        // Security check
        const { data: existing } = await supabase
            .from('addresses')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Addresses API] DELETE error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
