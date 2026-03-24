import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/app/utils/supabase/server';

/**
 * Verified Telegram user data extracted from initData
 */
export interface VerifiedTelegramUser {
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
    auth_date: number;
}

/**
 * Parse initData query string into object
 */
function parseInitData(initData: string): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(initData);
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

/**
 * Verify Telegram initData HMAC signature
 * 
 * Algorithm:
 * 1. Parse initData as query string
 * 2. Sort all params except 'hash' alphabetically
 * 3. Create data-check-string by joining as "key=value\n"
 * 4. Create secret_key = HMAC_SHA256(bot_token, "WebAppData")
 * 5. Verify hash = HMAC_SHA256(data_check_string, secret_key)
 */
export function verifyTelegramInitData(initData: string): VerifiedTelegramUser | null {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (!botToken) {
        console.error('[TelegramAuth] TELEGRAM_BOT_TOKEN not configured in environment');
        return null;
    }

    // Basic format check: should be "ID:Hash"
    if (!/^\d+:[\w-]+$/.test(botToken)) {
        console.warn(`[TelegramAuth] WARNING: TELEGRAM_BOT_TOKEN might be malformed. Prefix: ${botToken.substring(0, 5)}...`);
    }

    if (!initData) {
        console.error('[TelegramAuth] Empty initData provided');
        return null;
    }

    try {
        const params = parseInitData(initData);
        const hash = params.hash;

        if (!hash) {
            console.error('[TelegramAuth] No hash found in initData string');
            return null;
        }

        // Create data-check-string (all params except hash, sorted alphabetically)
        const dataCheckArr: string[] = [];
        Object.keys(params)
            .filter(key => key !== 'hash')
            .sort()
            .forEach(key => {
                dataCheckArr.push(`${key}=${params[key]}`);
            });
        const dataCheckString = dataCheckArr.join('\n');

        // Verify using the official algorithm:
        // 1. secret_key = HMAC_SHA256("WebAppData", bot_token)
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // 2. hash = HMAC_SHA256(data_check_string, secret_key)
        const expectedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (hash !== expectedHash) {
            console.error('[TelegramAuth] Signature mismatch!');
            console.error('[TelegramAuth] Received hash:', hash);
            console.error('[TelegramAuth] Calculated hash:', expectedHash);
            // DO NOT log dataCheckString in production as it contains user data, 
            // but for debugging we can log keys
            console.error('[TelegramAuth] Data keys:', Object.keys(params).sort().join(', '));
            return null;
        }

        // Check auth_date (allow 30 days for Mini Apps)
        const authDate = parseInt(params.auth_date || '0');
        const now = Math.floor(Date.now() / 1000);
        const ageSeconds = now - authDate;
        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

        if (ageSeconds > thirtyDaysInSeconds) {
            console.error('[TelegramAuth] initData expired. Age:', ageSeconds, 's');
            return null;
        }

        const userJson = params.user;
        if (!userJson) {
            console.error('[TelegramAuth] Missing user field in verified data');
            return null;
        }

        const user = JSON.parse(userJson);

        return {
            telegram_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium,
            photo_url: user.photo_url,
            auth_date: authDate
        };
    } catch (error: any) {
        console.error('[TelegramAuth] Internal verification error:', error.message);
        return null;
    }
}

/**
 * Extract initData from request headers
 * Expects: X-Telegram-Init-Data header
 */
export function getInitDataFromRequest(request: Request): string | null {
    // Check various casing just in case
    return request.headers.get('x-telegram-init-data') ||
        request.headers.get('X-Telegram-Init-Data') ||
        request.headers.get('X-TELEGRAM-INIT-DATA');
}

/**
 * Verify request and return user, or null if invalid
 */
export function verifyTelegramRequest(request: Request): VerifiedTelegramUser | null {
    const initData = getInitDataFromRequest(request);

    if (!initData) {
        // No log here, some requests might be validly without it (legacy)
        return null;
    }

    return verifyTelegramInitData(initData);
}

/**
 * Get verified user ID (profile ID) from request.
 * Checks for both X-Telegram-Init-Data (new) and Authorization header (legacy).
 */
export async function getVerifiedUserId(request: Request): Promise<string | null> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
    );

    // 1. Try Telegram initData (new preferred mechanism)
    const headerKeys = Array.from(request.headers.keys());

    const tgUser = verifyTelegramRequest(request);
    if (tgUser) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', tgUser.telegram_id)
            .maybeSingle();

        if (error) console.error('[AUTH] Profile lookup DB ERROR:', error.message);
        if (data?.id) {
            return data.id;
        }

        console.error(`[AUTH] FAIL: Telegram user ${tgUser.telegram_id} verified, but NO PROFILE in DB.`);
    } else {
        if (getInitDataFromRequest(request)) {
            console.error('[AUTH] Telegram header present but SIGNATURE INVALID. Check TELEGRAM_BOT_TOKEN.');
        }
    }

    // 2. Try Bearer token (fallback / browser / legacy)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
        const { data, error } = await supabase
            .from('telegram_sessions')
            .select('profile_id, expires_at')
            .eq('token', token)
            .maybeSingle();

        if (error) console.error('[AUTH] Legacy session DB ERROR:', error.message);

        if (data && new Date(data.expires_at) > new Date()) {
            return data.profile_id;
        } else if (data) {
            console.error(`[AUTH] FAIL: Legacy session found for ${data.profile_id} but it is EXPIRED.`);
        } else {
            console.error('[AUTH] FAIL: Legacy token not found in database.');
        }
    }

    // 3. Try standard Supabase Auth (Cookies) for standard web users
    try {
        const serverSupabase = await createServerClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user) {
            return user.id;
        }
    } catch (err: any) {
        console.error('[AUTH] Supabase server client error:', err.message);
    }

    return null;
}
