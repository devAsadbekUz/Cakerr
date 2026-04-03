import 'server-only';

import { headers } from 'next/headers';

export async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
}
