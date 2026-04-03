import { NextRequest, NextResponse } from 'next/server';
import { pbkdf2Sync, timingSafeEqual } from 'crypto';
import { signStaffToken } from '@/app/utils/adminStaffToken';
import { serviceClient } from '@/app/utils/supabase/service';

function verifyPassword(password: string, stored: string): boolean {
    try {
        const [, salt, hash] = stored.split(':');
        const computed = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
        return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const { username, password } = await request.json();

    if (!username || !password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const { data: staff } = await serviceClient
        .from('admin_staff')
        .select('id, username, password_hash, permissions')
        .eq('username', username.toLowerCase().trim())
        .maybeSingle();

    if (!staff || !verifyPassword(password, staff.password_hash)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login timestamp
    await serviceClient
        .from('admin_staff')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', staff.id);

    const token = await signStaffToken({
        username: staff.username,
        permissions: staff.permissions,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const secure = isProd ? '; Secure' : '';
    const maxAge = 7 * 24 * 60 * 60;

    const response = NextResponse.json({ ok: true, permissions: staff.permissions });
    response.headers.append('Set-Cookie',
        `admin_staff_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
    );
    // Non-HTTP-only cookies for client-side UI (sidebar filtering)
    response.headers.append('Set-Cookie',
        `admin_role=staff; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
    );
    response.headers.append('Set-Cookie',
        `admin_permissions=${encodeURIComponent(JSON.stringify(staff.permissions))}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
    );
    return response;
}
