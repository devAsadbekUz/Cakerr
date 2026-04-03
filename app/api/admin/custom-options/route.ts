import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { serviceClient } from '@/app/utils/supabase/service';

// GET /api/admin/custom-options — fetch ALL options (including unavailable) for admin panel
export async function GET() {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await serviceClient
        .from('custom_cake_options')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[Admin Custom Options GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// POST /api/admin/custom-options — create a new option
export async function POST(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await serviceClient
        .from('custom_cake_options')
        .insert([body])
        .select()
        .single();

    if (error) {
        console.error('[Admin Custom Options POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// PATCH /api/admin/custom-options — update an existing option (including is_available toggle)
export async function PATCH(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: 'Missing option id' }, { status: 400 });
    }

    const { data, error } = await serviceClient
        .from('custom_cake_options')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[Admin Custom Options PATCH] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// DELETE /api/admin/custom-options?id=xxx
export async function DELETE(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing option id' }, { status: 400 });
    }

    const { error } = await serviceClient
        .from('custom_cake_options')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[Admin Custom Options DELETE] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
