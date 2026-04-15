/**
 * Staff JWT utilities using Web Crypto API.
 * Works in both Edge runtime (middleware) and Node.js (API routes).
 */

export type StaffPayload = {
    id: string;
    username: string;
    permissions: string[];
    iat: number;
    exp: number;
};

function b64urlEncode(str: string): string {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecodeBytes(str: string): ArrayBuffer {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer as ArrayBuffer;
}

function getSecret(): string {
    const secret = process.env.ADMIN_STAFF_SECRET;
    if (!secret) throw new Error('ADMIN_STAFF_SECRET environment variable is not configured');
    return secret;
}

export async function signStaffToken(
    payload: Omit<StaffPayload, 'iat' | 'exp'>
): Promise<string> {
    const secret = getSecret();
    const now = Math.floor(Date.now() / 1000);
    const full: StaffPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 };

    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64urlEncode(JSON.stringify(full));
    const toSign = new TextEncoder().encode(`${header}.${body}`);

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, toSign);
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${header}.${body}.${sig}`;
}

export async function verifyStaffToken(token: string): Promise<StaffPayload | null> {
    try {
        const secret = process.env.ADMIN_STAFF_SECRET;
        if (!secret) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, sigB64] = parts;
        const toVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const sigBytes = b64urlDecodeBytes(sigB64);

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, toVerify);
        if (!valid) return null;

        const encoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        const payload: StaffPayload = JSON.parse(atob(padded));

        if (Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}
