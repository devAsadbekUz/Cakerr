import { NextRequest, NextResponse } from 'next/server';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { serviceClient } from '@/app/utils/supabase/service';

// GET /api/admin/custom-options — fetch ALL options with their multi-parent relations
export async function GET() {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await serviceClient
        .from('custom_cake_options')
        .select(`
            *,
            relations:custom_cake_option_relations!custom_cake_option_relations_child_id_fkey(parent_id)
        `)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[Admin Custom Options GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map relations to a simple parent_ids array for the frontend
    const mapped = (data || []).map(opt => ({
        ...opt,
        parent_ids: opt.relations?.map((r: any) => r.parent_id) || []
    }));

    return NextResponse.json(mapped);
}

// POST /api/admin/custom-options — create a new option with relations
export async function POST(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parent_ids, relations, ...optionData } = body;

    const { data, error } = await serviceClient
        .from('custom_cake_options')
        .insert([optionData])
        .select()
        .single();

    if (error) {
        console.error('[Admin Custom Options POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle relations if provided
    if (parent_ids && Array.isArray(parent_ids) && parent_ids.length > 0) {
        const relations = parent_ids.map(pid => ({
            parent_id: pid,
            child_id: data.id
        }));
        const { error: relError } = await serviceClient
            .from('custom_cake_option_relations')
            .insert(relations);
        
        if (relError) console.error('[Admin Custom Options POST] Relation Error:', relError);
    }

    return NextResponse.json({ ...data, parent_ids: parent_ids || [] });
}

// PATCH /api/admin/custom-options — update an existing option and its relations
export async function PATCH(request: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, parent_ids, relations, ...updates } = body;

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

    // Sync multi-parent relations if provided
    if (parent_ids && Array.isArray(parent_ids)) {
        // 1. Clear old relations
        await serviceClient
            .from('custom_cake_option_relations')
            .delete()
            .eq('child_id', id);

        // 2. Insert new relations
        if (parent_ids.length > 0) {
            const relations = parent_ids.map(pid => ({
                parent_id: pid,
                child_id: id
            }));
            await serviceClient
                .from('custom_cake_option_relations')
                .insert(relations);
        }
    }

    return NextResponse.json({ ...data, parent_ids: parent_ids || [] });
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
