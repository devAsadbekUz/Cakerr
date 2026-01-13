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

    const isLoginPage = pathname?.includes('/login');

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            if (!isLoginPage) router.push('/admin/login');
            setIsAuthorized(false);
            return;
        }

        async function checkRole() {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user?.id)
                .single();

            if (data && (data.role === 'admin' || data.role === 'baker')) {
                setIsAuthorized(true);
            } else {
                // If not authorized, redirect if not on login
                if (!isLoginPage) {
                    alert('Kirishga ruxsat yo\'q. Faqat admin yoki novvoylar uchun.');
                    router.push('/admin/login');
                }
                setIsAuthorized(false);
            }
        }

        checkRole();
    }, [user, authLoading, isLoginPage, router, supabase]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (authLoading || isAuthorized === null) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '18px', color: '#BE185D', fontWeight: 600 }}>Tekshirilmoqda...</div>
            </div>
        );
    }

    if (!isAuthorized) return null;

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
