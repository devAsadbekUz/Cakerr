'use client';

import AdminSidebar from "@/app/components/admin/AdminSidebar";
import AdminBottomNav from "@/app/components/admin/AdminBottomNav";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { createClient } from "@/app/utils/supabase/client";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: authLoading } = useSupabase();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const supabase = createClient();

    const isLoginPage = pathname?.startsWith('/admin/login');
    console.log('AdminLayout pathname:', pathname, 'isLoginPage:', isLoginPage);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            console.log('No user found in admin layout, redirecting to login');
            if (!isLoginPage) router.push('/admin/login');
            setIsAuthorized(false);
            return;
        }

        async function checkRole() {
            try {
                console.log('Checking role for user:', user?.id);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user?.id)
                    .single();

                if (error) {
                    console.error('Error fetching role:', error);
                    setIsAuthorized(false);
                    if (!isLoginPage) router.push('/admin/login');
                    return;
                }

                if (data && (data.role === 'admin' || data.role === 'baker')) {
                    console.log('User authorized as:', data.role);
                    setIsAuthorized(true);
                } else {
                    console.warn('User not authorized. Role:', data?.role);
                    setIsAuthorized(false);
                    if (!isLoginPage) {
                        router.push('/admin/login');
                    }
                }
            } catch (err) {
                console.error('Exception in checkRole:', err);
                setIsAuthorized(false);
                if (!isLoginPage) router.push('/admin/login');
            }
        }

        checkRole();
    }, [user, authLoading, isLoginPage, router, supabase]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (authLoading || isAuthorized === null) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ fontSize: '18px', color: '#BE185D', fontWeight: 600 }}>Tekshirilmoqda...</div>
                <button
                    onClick={() => router.push('/admin/login')}
                    style={{ background: 'none', border: 'none', color: '#6B7280', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    Login sahifasiga o'tish
                </button>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ fontSize: '18px', color: '#991B1B', fontWeight: 600 }}>Ruxsat yo'q</div>
                <button
                    onClick={() => router.push('/admin/login')}
                    style={{ padding: '8px 16px', background: '#BE185D', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                    Login sahifasiga o'tish
                </button>
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <AdminSidebar />
            <main className={styles.mainContent}>
                {children}
            </main>
            <AdminBottomNav />
        </div>
    );
}
