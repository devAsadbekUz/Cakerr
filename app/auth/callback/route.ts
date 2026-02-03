import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/profil';

    if (code) {
        // Standardize: Everyone uses the same secure client
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();

            // Centralized Admin Check (Master Backdoor)
            const OWNER_EMAIL = 'moida.buvayda@gmail.com';
            const isMasterAdmin = user?.email === OWNER_EMAIL;

            // Determine final redirect
            let finalRedirect = next;

            // If they are master admin, they can ALWAYS go to admin
            if (isMasterAdmin && next.startsWith('/admin')) {
                finalRedirect = '/admin';
            }

            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${finalRedirect}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${finalRedirect}`);
            } else {
                return NextResponse.redirect(`${origin}${finalRedirect}`);
            }
        }
    }

    // Default error redirect
    return NextResponse.redirect(`${origin}/profil/login?error=auth-code-error`);
}
