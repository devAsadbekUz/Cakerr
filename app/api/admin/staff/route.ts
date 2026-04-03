import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { serviceClient } from '@/app/utils/supabase/service';

async function isOwner(): Promise<boolean> {
    const h = await headers();
    return h.get('x-admin-role') === 'owner';
}

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return `pbkdf2:${salt}:${hash}`;
}

// GET — fetch all staff members
export async function GET() {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data } = await serviceClient
        .from('admin_staff')
        .select('id, username, permissions, created_at, last_login_at')
        .order('created_at', { ascending: false });

    return NextResponse.json({ staff: data || [] });
}

// POST — create staff user (Limit: 10)
export async function POST(request: NextRequest) {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { username, password, permissions } = await request.json();
    if (!username?.trim() || !password || !Array.isArray(permissions)) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    // 1. Check total count
    const { count } = await serviceClient
        .from('admin_staff')
        .select('*', { count: 'exact', head: true });

    if ((count ?? 0) >= 10) {
        return NextResponse.json({ error: 'Maximum limit of 10 staff members reached' }, { status: 409 });
    }

    // 2. Check username uniqueness
    const { data: existing } = await serviceClient
        .from('admin_staff')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const { error } = await serviceClient.from('admin_staff').insert({
        username: cleanUsername,
        password_hash: hashPassword(password),
        permissions,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

// PATCH — update permissions and/or password
export async function PATCH(request: NextRequest) {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, permissions, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const update: Record<string, any> = {};
    if (Array.isArray(permissions)) update.permissions = permissions;
    if (password) update.password_hash = hashPassword(password);

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { error } = await serviceClient
        .from('admin_staff')
        .update(update)
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

// DELETE — remove staff user
export async function DELETE(request: NextRequest) {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await serviceClient
        .from('admin_staff')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
