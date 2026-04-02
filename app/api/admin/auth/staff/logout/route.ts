import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ ok: true });
    const clear = 'Path=/; Max-Age=0; SameSite=Lax';
    response.headers.append('Set-Cookie', `admin_staff_token=; ${clear}; HttpOnly`);
    response.headers.append('Set-Cookie', `admin_role=; ${clear}`);
    response.headers.append('Set-Cookie', `admin_permissions=; ${clear}`);
    return response;
}
