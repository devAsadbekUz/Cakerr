/**
 * Utility to safe-extract translation from a JSONB field or fallback to string.
 * @param data The field from DB (can be string or {uz, ru})
 * @param lang Current active language ('uz' or 'ru')
 * @returns Translated string
 */
export function getLocalized(data: any, lang: 'uz' | 'ru'): string {
    if (data === undefined || data === null) return '';

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
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed !== null) {
                // Recursively call to handle double-encoding or objects
                return getLocalized(parsed, lang);
            }
        } catch (e) {
            // Not valid JSON, fall through to returning as is
        }
    }

    return data;
}
