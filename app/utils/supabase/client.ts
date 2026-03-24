import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern - reuse same client instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (!clientInstance) {
        clientInstance = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
        );
    }
    return clientInstance;
}
