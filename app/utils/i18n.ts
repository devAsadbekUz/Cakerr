/**
 * Utility to safe-extract translation from a JSONB field or fallback to string.
 * @param data The field from DB (can be string or {uz, ru})
 * @param lang Current active language ('uz' or 'ru')
 * @returns Translated string
 */
export function getLocalized(data: any, lang: 'uz' | 'ru'): string {
    if (data === undefined || data === null) return '';

    // If it's an object, extract the correct language
    if (typeof data === 'object') {
        const val = data[lang];
        const finalVal = (val !== undefined && val !== null && val !== '')
            ? val
            : (data['uz'] || data['ru'] || '');
        
        // If the resulting value is a string that looks like JSON, recurse deeper
        if (typeof finalVal === 'string' && finalVal.trim().startsWith('{')) {
            return getLocalized(finalVal, lang);
        }
        return finalVal;
    }

    // If it's not a string at this point, we can't do much but stringify it
    if (typeof data !== 'string') return String(data);

    // If it's a string, check if it's stringified JSON
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
