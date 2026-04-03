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

// GET — fetch current staff user (if any)
export async function GET() {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data } = await serviceClient
        .from('admin_staff')
        .select('id, username, permissions, created_at')
        .limit(1)
        .maybeSingle();

    return NextResponse.json({ staff: data });
}

// POST — create staff user (only if none exists)
export async function POST(request: NextRequest) {
    if (!await isOwner()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { username, password, permissions } = await request.json();
    if (!username?.trim() || !password || !Array.isArray(permissions)) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { count } = await serviceClient
        .from('admin_staff')
        .select('*', { count: 'exact', head: true });

    if ((count ?? 0) > 0) {
        return NextResponse.json({ error: 'A staff user already exists' }, { status: 409 });
    }

    const { error } = await serviceClient.from('admin_staff').insert({
        username: username.toLowerCase().trim(),
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
