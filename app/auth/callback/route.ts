import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/profil';

    if (code) {
        const isAdminPath = next.startsWith('/admin');
        const { createAdminServerClient } = await import('@/app/utils/supabase/admin-server');

        const supabase = isAdminPath ? await createAdminServerClient() : await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            const isAdmin = user?.email === 'moida.buvayda@gmail.com';
            const finalRedirect = (isAdmin && next.startsWith('/admin')) ? '/admin' : next;

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

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/profil/login?error=auth-code-error`);
}
