'use client';

import AdminSidebar from "@/app/components/admin/AdminSidebar";
import AdminBottomNav from "@/app/components/admin/AdminBottomNav";
import { usePathname } from "next/navigation";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();

    const isLoginPage = pathname?.startsWith('/admin/login');

    // Login page bypasses all checks
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Trust middleware - it already validated admin access
    // No need to wait for SupabaseContext loading state
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
