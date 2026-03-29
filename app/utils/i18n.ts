/**
 * Utility to safe-extract translation from a JSONB field or fallback to string.
 * @param data The field from DB (can be string or {uz, ru})
 * @param lang Current active language ('uz' or 'ru')
 * @returns Translated string
 */
export function getLocalized(data: any, lang: 'uz' | 'ru'): string {
    if (!data) return '';

    // Fast path: already an object
    if (typeof data === 'object') {
        const val = data[lang];
        if (val !== undefined && val !== null && val !== '') {
            return val;
        }
        return data['uz'] || data['ru'] || '';
    }

    // If it's not a string, we can't do much
    if (typeof data !== 'string') return String(data);

    // If it's a string, check if it's JSON (fast check)
    // Most content in our DB for bilingual fields is stored as stringified JSON or plain string
    const firstChar = data[0];
    if (firstChar === '{' || firstChar === '[') {
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                const val = parsed[lang];
                if (val !== undefined && val !== null && val !== '') {
                    return val;
                }
                return parsed['uz'] || parsed['ru'] || '';
            }
        } catch (e) {
            // Not valid JSON, fall through to returning as is
        }
    }

    return data;
}
