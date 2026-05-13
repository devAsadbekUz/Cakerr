/**
 * Customer session JWT utilities (Web Crypto API).
 * Works in both Node.js API routes and Edge runtime.
 *
 * Two-token pattern:
 *   Access token  — 7-day HS256 JWT, verified in-process (no DB hit)
 *   Refresh token — 1-year random token, hashed + stored in customer_refresh_tokens table
 */

export type CustomerTokenPayload = {
    profileId: string;
    iat: number;
    exp: number;
};

const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ── helpers ──────────────────────────────────────────────────────────────────

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
    const secret = process.env.CUSTOMER_JWT_SECRET;
    if (!secret) throw new Error('CUSTOMER_JWT_SECRET environment variable is not configured');
    return secret;
}

// ── access token ──────────────────────────────────────────────────────────────

export async function signCustomerToken(profileId: string): Promise<string> {
    const secret = getSecret();
    const now = Math.floor(Date.now() / 1000);
    const payload: CustomerTokenPayload = {
        profileId,
        iat: now,
        exp: now + ACCESS_TOKEN_TTL_SECONDS,
    };

    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body   = b64urlEncode(JSON.stringify(payload));
    const toSign = new TextEncoder().encode(`${header}.${body}`);

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, toSign);
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${header}.${body}.${sig}`;
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload | null> {
    try {
        const secret = process.env.CUSTOMER_JWT_SECRET;
        if (!secret) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, sigB64] = parts;
        const toVerify  = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const sigBytes  = b64urlDecodeBytes(sigB64);

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify'],
        );
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, toVerify);
        if (!valid) return null;

        const encoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded  = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        const payload: CustomerTokenPayload = JSON.parse(atob(padded));

        if (Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

// ── refresh token ─────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random refresh token (64 bytes → 128 hex chars).
 */
export function generateRefreshToken(): string {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 hash of a refresh token for safe DB storage.
 * Only the hash is stored; the raw token is returned to the client once and never stored.
 */
export async function hashRefreshToken(token: string): Promise<string> {
    const data       = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Decode JWT exp claim client-side (no secret needed — just reads the payload).
 * Used in AuthContext to check whether the stored access token has expired
 * before deciding to call the refresh endpoint.
 */
export function decodeTokenExpiry(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded  = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
        return null;
    }
}

// ── magic token ──────────────────────────────────────────────────────────────

export async function signMagicToken(profileId: string): Promise<string> {
    const secret = getSecret();
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        profileId,
        magic: true,
        iat: now,
        exp: now + 300, // 5 minutes
    };

    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body   = b64urlEncode(JSON.stringify(payload));
    const toSign = new TextEncoder().encode(`${header}.${body}`);

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, toSign);
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${header}.${body}.${sig}`;
}

export async function verifyMagicToken(token: string): Promise<string | null> {
    try {
        const secret = process.env.CUSTOMER_JWT_SECRET;
        if (!secret) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, sigB64] = parts;
        const toVerify  = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const sigBytes  = b64urlDecodeBytes(sigB64);

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify'],
        );
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, toVerify);
        if (!valid) return null;

        const encoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded  = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));

        if (Date.now() / 1000 > payload.exp || !payload.magic) return null;
        return payload.profileId;
    } catch {
        return null;
    }
}
