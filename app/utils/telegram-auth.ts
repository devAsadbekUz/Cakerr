import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        console.error('[TelegramAuth] TELEGRAM_BOT_TOKEN not configured');
        return null;
    }

    if (!initData || initData.length === 0) {
        console.error('[TelegramAuth] Empty initData');
        return null;
    }

    try {
        const params = parseInitData(initData);
        const hash = params.hash;

        if (!hash) {
            console.error('[TelegramAuth] No hash in initData');
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

        // Create secret key: HMAC_SHA256("WebAppData", bot_token)
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Calculate expected hash: HMAC_SHA256(data_check_string, secret_key)
        const expectedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Verify hash matches
        if (hash !== expectedHash) {
            console.error('[TelegramAuth] Hash verification failed');
            return null;
        }

        // Check auth_date is not too old (allow 30 days for Mini Apps)
        const authDate = parseInt(params.auth_date || '0');
        const ageSeconds = Date.now() / 1000 - authDate;
        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

        if (ageSeconds > thirtyDaysInSeconds) {
            console.error('[TelegramAuth] initData too old:', ageSeconds, 'seconds');
            return null;
        }

        // Parse user data from the 'user' JSON field
        const userJson = params.user;
        if (!userJson) {
            console.error('[TelegramAuth] No user field in initData');
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
    } catch (error) {
        console.error('[TelegramAuth] Verification error:', error);
        return null;
    }
}

/**
 * Extract initData from request headers
 * Expects: X-Telegram-Init-Data header
 */
export function getInitDataFromRequest(request: Request): string | null {
    return request.headers.get('X-Telegram-Init-Data');
}

/**
 * Verify request and return user, or null if invalid
 */
export function verifyTelegramRequest(request: Request): VerifiedTelegramUser | null {
    const initData = getInitDataFromRequest(request);

    if (!initData) {
        return null;
    }

    return verifyTelegramInitData(initData);
}

/**
 * Get verified user ID (profile ID) from request.
 * Checks for both X-Telegram-Init-Data (new) and Authorization header (legacy).
 */
export async function getVerifiedUserId(request: Request): Promise<string | null> {
    // 1. Try Telegram initData (new preferred mechanism)
    const tgUser = verifyTelegramRequest(request);
    if (tgUser) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', tgUser.telegram_id)
            .maybeSingle();

        if (data?.id) return data.id;
    }

    // 2. Try Bearer token (legacy / browser support)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: session } = await supabase
            .from('telegram_sessions')
            .select('profile_id, expires_at')
            .eq('token', token)
            .maybeSingle();

        if (session && new Date(session.expires_at) > new Date()) {
            return session.profile_id;
        }
    }

    return null;
}
