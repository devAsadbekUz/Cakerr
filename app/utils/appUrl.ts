function stripTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

function withProtocol(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}

export function normalizeAppUrl(url?: string | null): string | null {
    if (!url) return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
        return stripTrailingSlash(new URL(withProtocol(trimmed)).toString());
    } catch {
        return null;
    }
}

export function getConfiguredAppUrl(): string | null {
    return (
        normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ||
        normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    );
}

export function resolveAppUrl(fallbackOrigin?: string | null): string | null {
    return getConfiguredAppUrl() || normalizeAppUrl(fallbackOrigin);
}

export function getAppPreviewUrl(): string | null {
    const appUrl = getConfiguredAppUrl();
    return appUrl ? `${appUrl}/app-preview.jpg` : null;
}
