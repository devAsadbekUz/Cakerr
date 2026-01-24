import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Helper: Get user ID from session token
 */
async function getUserFromToken(token: string): Promise<string | null> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session } = await supabase
        .from('telegram_sessions')
        .select('profile_id')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    return session?.profile_id || null;
}

/**
 * GET /api/user/addresses
 * Fetch user's saved addresses
 */
export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserFromToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/user/addresses
 * Add new address
 */
export async function POST(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserFromToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const address = await request.json();

        const { data, error } = await supabase
            .from('addresses')
            .insert({ ...address, user_id: userId })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ address: data });
    } catch (error: any) {
        console.error('[Addresses API] POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/user/addresses
 * Update address (e.g., set as default)
 */
export async function PUT(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserFromToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { id, setDefault, ...updates } = await request.json();

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/user/addresses
 * Remove address
 */
export async function DELETE(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { id } = await request.json();

        const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Addresses API] DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
