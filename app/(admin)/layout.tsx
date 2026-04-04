import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import AdminBottomNav from "@/app/components/admin/AdminBottomNav";
import { AdminLanguageProvider } from "@/app/context/AdminLanguageContext";
import { adminTranslations, type AdminLang } from "@/app/lib/admin-i18n";
import styles from "./AdminLayout.module.css";

export const metadata: Metadata = {
    title: 'Admin Dashboard | Cakerr',
    description: 'Management panel for Cakerr orders and operations.',
    robots: 'noindex, nofollow',
};

function parsePermissions(raw: string | undefined) {
    if (!raw) return [];
    return raw.split(',').map(value => value.trim()).filter(Boolean);
}

function parseLang(raw: string | undefined): AdminLang {
    if (raw && raw in adminTranslations) {
        return raw as AdminLang;
    }
    return 'uz';
}

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headerStore = await headers();
    const cookieStore = await cookies();

    const isAdminVerified = headerStore.get('x-admin-verified') === 'true';
    const roleHeader = headerStore.get('x-admin-role');
    const permissionsHeader = headerStore.get('x-admin-permissions') || undefined;
    const roleCookie = cookieStore.get('admin_role')?.value;
    const langCookie = cookieStore.get('admin_lang')?.value;

    const role: 'owner' | 'staff' = roleHeader === 'staff' || roleCookie === 'staff' ? 'staff' : 'owner';
    const permissions = role === 'staff' ? parsePermissions(permissionsHeader) : [];
    const initialLang = parseLang(langCookie);

    return (
        <AdminLanguageProvider initialLang={initialLang}>
            {isAdminVerified ? (
                <div className={styles.layout}>
                    <AdminSidebar role={role} permissions={permissions} />
                    <main className={styles.mainContent}>
                        {children}
                    </main>
                    <AdminBottomNav role={role} permissions={permissions} />
                </div>
            ) : (
                <>{children}</>
            )}
        </AdminLanguageProvider>
    );
}
